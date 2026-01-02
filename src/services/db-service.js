const supabase = require('../lib/supabase'); // Corrected Path

class DBService {

    // --- CALLS ---
    async saveCall(callData) {
        try {
            // PHASE 3: Fetch organization_id from agent's profile
            let organizationId = null;
            if (callData.agentId && callData.agentId !== 'system') {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', callData.agentId)
                    .single();

                if (profileError || !profile?.organization_id) {
                    console.error('[Supabase] CRITICAL: Cannot determine organization_id', {
                        agentId: callData.agentId,
                        callSid: callData.callSid,
                        error: profileError?.message
                    });
                    throw new Error(`Missing organization_id for agent ${callData.agentId}`);
                }
                organizationId = profile.organization_id;
            } else {
                // Fallback 1: Try to get org from lead record
                if (callData.leadId) {
                    const { data: lead } = await supabase
                        .from('leads')
                        .select('org_id')
                        .eq('id', callData.leadId)
                        .single();
                    organizationId = lead?.org_id;
                    if (organizationId) {
                        console.log('[Supabase] Got organization_id from lead:', organizationId);
                    }
                }

                // Fallback 2: Try to get org from existing call record
                if (!organizationId) {
                    const { data: existingCall } = await supabase
                        .from('calls')
                        .select('organization_id')
                        .eq('id', callData.callSid)
                        .single();
                    organizationId = existingCall?.organization_id;
                }

                // Fallback 3: Get first organization (for dev/testing)
                if (!organizationId) {
                    const { data: anyOrg } = await supabase
                        .from('organizations')
                        .select('id')
                        .limit(1)
                        .single();
                    organizationId = anyOrg?.id;
                    if (organizationId) {
                        console.log('[Supabase] Using default organization:', organizationId);
                    }
                }
            }

            if (!organizationId) {
                throw new Error(`Cannot save call ${callData.callSid}: organization_id is required`);
            }

            // DEBUG: Log what we're looking for
            const recordingUrlToMatch = `sid:${callData.callSid}`;
            console.log(`[Supabase] Updating call with recording_url: ${recordingUrlToMatch}`);
            console.log(`[Supabase] Transcript entries: agent=${callData.transcripts?.agent?.length || 0}, customer=${callData.transcripts?.customer?.length || 0}`);

            // Update the existing call record created at start
            // Note: CallSid is stored in recording_url field as 'sid:CAxxxx'
            const { data, error } = await supabase
                .from('calls')
                .update({
                    status: 'completed',
                    duration: Math.floor((Date.now() - callData.startTime) / 1000),
                    transcript: callData.transcripts,
                })
                .eq('recording_url', recordingUrlToMatch)
                .select()
                .single();

            if (error) {
                // Fallback: Insert if missing (should not happen if call was created on start)
                console.warn('[Supabase] Warning during call update:', error.message);
                const { v4: uuidv4 } = require('uuid');
                const { error: insertError } = await supabase.from('calls').insert({
                    id: uuidv4(),
                    agent_id: callData.agentId || null,
                    lead_id: callData.leadId,
                    organization_id: organizationId,
                    org_id: organizationId,
                    status: 'completed',
                    direction: 'outbound',
                    recording_url: `sid:${callData.callSid}`,
                    duration: Math.floor((Date.now() - callData.startTime) / 1000),
                    transcript: callData.transcripts,
                    created_at: new Date(callData.startTime).toISOString()
                });
                if (insertError) throw insertError;
            }

            // Save Summary
            if (callData.summary) {
                await supabase.from('call_summaries').insert({
                    call_id: callData.callSid,
                    organization_id: organizationId, // PHASE 3: Required for RLS
                    summary_text: callData.summary.summary,
                    score: callData.summary.score || 0,
                    successful: callData.summary.success || false
                });
            }

            console.log(`[Supabase] Successfully saved/updated call ${callData.callSid} [org: ${organizationId}]`);
            return data;
        } catch (err) {
            console.error('[Supabase] Save Call Error:', err);
            return null;
        }
    }

    async getRecentCalls(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('calls')
                .select('*, call_summaries(*)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[Supabase] Get Calls Error:', err);
            return [];
        }
    }

    // Get call history for a specific lead
    async getCallsByLead(leadId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('calls')
                .select('id, agent_id, lead_id, status, duration, transcript, created_at, summary_json')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            console.log(`[Supabase] Fetched ${data?.length || 0} calls for lead ${leadId}`);
            return data || [];
        } catch (err) {
            console.error('[Supabase] Get Calls By Lead Error:', err);
            return [];
        }
    }

    // --- LEADS ---
    async getLeads(organizationId) {
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[Supabase] Get Leads Error:', err);
            return [];
        }
    }

    async seedLeads(initialLeads) {
        const userId = await getSystemUserId();

        // Transform leads to match Schema
        const dbLeads = initialLeads.map(l => ({
            owner_id: userId,
            name: l.name,
            company: l.company,
            phone: l.phone,
            email: l.email,
            status: l.status,
            priority: l.priority,
            value: parseInt(l.value.replace(/[^0-9]/g, '')) || 0, // Cleanup currency string
            tags: l.tags
        }));

        try {
            const { data, error } = await supabase
                .from('leads')
                .insert(dbLeads)
                .select();

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('[Supabase] Seed Error:', err);
            return false;
        }
    }

    // Delete a lead by ID
    async deleteLead(leadId) {
        try {
            // First check if lead exists
            const { data: existingLead, error: checkError } = await supabase
                .from('leads')
                .select('id')
                .eq('id', leadId)
                .single();

            if (checkError || !existingLead) {
                console.log(`[DB] Lead ${leadId} not found or already deleted`);
                return true; // Return true so frontend removes from list
            }

            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadId);

            if (error) throw error;
            console.log(`[DB] Lead ${leadId} deleted`);
            return true;
        } catch (err) {
            console.error('[Supabase] Delete Lead Error:', err);
            return false;
        }
    }

    // Create a new lead (used by webhook for external sources)
    async createLead(leadData) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .insert({
                    organization_id: leadData.organization_id,
                    name: leadData.name,
                    phone: leadData.phone,
                    email: leadData.email,
                    company: leadData.company,
                    source: leadData.source,
                    status: leadData.status || 'New',
                    priority: leadData.priority || 'Hot',
                    value: leadData.value ? parseInt(String(leadData.value).replace(/[^0-9]/g, '')) : 0,
                    notes: leadData.notes
                })
                .select()
                .single();

            if (error) throw error;
            console.log(`[DB] Lead created: ${data.id} - ${data.name} (${data.source})`);
            return data;
        } catch (err) {
            console.error('[Supabase] Create Lead Error:', err);
            throw err;
        }
    }

    // Update call with summary data
    async updateCallSummary(callSid, summaryData) {
        try {
            // Find call by recording_url containing the callSid
            const { data: existingCall } = await supabase
                .from('calls')
                .select('id')
                .ilike('recording_url', `%${callSid}%`)
                .single();

            if (!existingCall) {
                console.warn(`[DB] No call found for summary: ${callSid}`);
                return false;
            }

            const { error } = await supabase
                .from('calls')
                .update({
                    summary: summaryData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingCall.id);

            if (error) throw error;
            console.log(`[DB] Summary saved for call ${callSid}`);
            return true;
        } catch (err) {
            console.error('[Supabase] Update Summary Error:', err);
            return false;
        }
    }

    // Get statistics for KPIs with time range support
    async getStats(timeRange = 'day', organizationId = null) {
        const now = new Date();
        let startDate = new Date();

        // Calculate start date based on time range
        if (timeRange === 'day') {
            startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'week') {
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'month') {
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
        }

        const startISO = startDate.toISOString();

        try {
            // Get calls for the period
            let callsQuery = supabase
                .from('calls')
                .select('id, duration, status')
                .gte('created_at', startISO);

            if (organizationId) {
                callsQuery = callsQuery.eq('organization_id', organizationId);
            }

            const { data: calls, error: callsError } = await callsQuery;

            // Filter leads by organization if orgId is provided
            // Note: Ideally calls would have organization_id. 
            // If not, we rely on implicit RLS or we must fetch agent IDs.
            // For now, let's assume calls might have organization_id based on recent updates or skip strictly if not present 
            // BUT leads MUST be filtered.


            if (callsError) throw callsError;

            // Get leads created in the period
            let leadsQuery = supabase
                .from('leads')
                .select('id')
                .gte('created_at', startISO);

            if (organizationId) {
                leadsQuery = leadsQuery.eq('organization_id', organizationId);
            }

            const { data: leads, error: leadsError } = await leadsQuery;

            if (leadsError) throw leadsError;

            // Get call summaries for quality score and appointments
            let summariesQuery = supabase
                .from('call_summaries')
                .select('score, successful')
                .gte('created_at', startISO);

            if (organizationId) {
                summariesQuery = summariesQuery.eq('organization_id', organizationId);
            }

            const { data: summaries, error: summariesError } = await summariesQuery;

            // Calculate stats
            const totalCalls = calls?.length || 0;
            const answeredCalls = calls?.filter(c => c.status === 'completed').length || 0;
            const totalDuration = calls?.reduce((sum, c) => sum + (c.duration || 0), 0) || 0;
            const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
            const newLeads = leads?.length || 0;

            // Calculate appointments (successful calls) and quality score
            const successfulCalls = summaries?.filter(s => s.successful).length || 0;
            const scores = summaries?.map(s => s.score).filter(s => s > 0) || [];
            const avgQualityScore = scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : 0;

            return {
                calls: { answered: answeredCalls, total: totalCalls },
                appointments: successfulCalls,
                newLeads: newLeads,
                avgCallTime: avgDuration,
                qualityScore: avgQualityScore,
                timeRange: timeRange
            };
        } catch (err) {
            console.error('[Supabase] Stats Error:', err);
            return {
                calls: { answered: 0, total: 0 },
                appointments: 0,
                newLeads: 0,
                avgCallTime: 0,
                qualityScore: 0,
                timeRange: timeRange
            };
        }
    }

    // Keep old function for backward compatibility
    async getDailyStats() {
        return this.getStats('day');
    }

    // Get weekly performance data for chart
    async getWeeklyPerformance() {
        const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
        const result = [];

        try {
            // Get data for each of the last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);

                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                // Get calls for this day
                const { data: calls } = await supabase
                    .from('calls')
                    .select('id, status, duration')
                    .gte('created_at', date.toISOString())
                    .lt('created_at', nextDate.toISOString());

                const totalCalls = calls?.length || 0;
                const successfulCalls = calls?.filter(c => c.status === 'completed').length || 0;

                result.push({
                    name: dayNames[date.getDay()],
                    date: date.toISOString().split('T')[0],
                    calls: totalCalls,
                    successful: successfulCalls,
                    rate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0
                });
            }

            return result;
        } catch (err) {
            console.error('[Supabase] Weekly Performance Error:', err);
            // Return empty data structure
            return dayNames.map((name, i) => ({
                name,
                date: '',
                calls: 0,
                successful: 0,
                rate: 0
            }));
        }
    }
    // --- MESSAGES ---
    async saveMessage(messageData) {
        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    call_id: messageData.callId,
                    lead_id: messageData.leadId,
                    role: messageData.role,
                    text: messageData.text,
                    is_final: messageData.isFinal
                });

            if (error) throw error;
            // console.log('[DB] Message saved:', messageData.text.substring(0, 20));
        } catch (err) {
            console.error('[DB] Save Message Error:', err.message);
        }
    }

    async getMessages(leadId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: true }) // Oldest first for chat history
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[DB] Get Messages Error:', err.message);
            return [];
        }
    }

    // --- PANEL DASHBOARD FUNCTIONS ---

    // Get hot leads (priority = 'Hot')
    async getHotLeads(userId, limit = 10, organizationId) {
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .eq('priority', 'Hot')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (userId) {
                query = query.eq('owner_id', userId);
            } else if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(lead => ({
                id: lead.id,
                name: lead.name,
                company: lead.company,
                phone: lead.phone,
                score: lead.score || Math.floor(Math.random() * 20) + 80, // Fallback random score 80-100
                daysSinceCreated: Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                status: lead.status
            }));
        } catch (err) {
            console.error('[DB] Get Hot Leads Error:', err.message);
            return [];
        }
    }

    // Get leads at risk (no activity for X hours)
    async getLeadsAtRisk(userId, hoursThreshold = 48, limit = 10, organizationId) {
        try {
            const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

            let query = supabase
                .from('leads')
                .select('*')
                .lt('updated_at', cutoffTime)
                .not('status', 'eq', 'Closed')
                .order('updated_at', { ascending: true })
                .limit(limit);

            if (userId) {
                query = query.eq('owner_id', userId);
            } else if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(lead => {
                const hoursSinceActivity = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60));
                return {
                    id: lead.id,
                    name: lead.name,
                    company: lead.company,
                    phone: lead.phone,
                    timeSinceActivity: hoursSinceActivity >= 24
                        ? `${Math.floor(hoursSinceActivity / 24)} ימים`
                        : `${hoursSinceActivity} שעות`,
                    hoursSinceActivity,
                    status: lead.status
                };
            });
        } catch (err) {
            console.error('[DB] Get Leads At Risk Error:', err.message);
            return [];
        }
    }

    // Get lead queue for rep
    async getLeadQueue(userId, limit = 20, organizationId) {
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .not('status', 'eq', 'Closed')
                .order('priority', { ascending: true }) // Hot first
                .order('created_at', { ascending: false })
                .limit(limit);

            if (userId) {
                query = query.eq('owner_id', userId);
            } else if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(lead => ({
                id: lead.id,
                name: lead.name,
                company: lead.company,
                phone: lead.phone,
                status: lead.status,
                priority: lead.priority,
                lastActivity: lead.updated_at || lead.created_at,
                nextStep: lead.next_step || 'התקשר',
                source: lead.source
            }));
        } catch (err) {
            console.error('[DB] Get Lead Queue Error:', err.message);
            return [];
        }
    }

    // Get panel stats (KPIs for rep)
    async getPanelStats(userId, timeRange = 'day', organizationId) {
        try {
            const now = new Date();
            let startDate;

            switch (timeRange) {
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default: // day
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }

            const startISO = startDate.toISOString();

            // 1. Get Targets (Try fetching from user_targets)
            let targets = { calls: 15, newLeads: 12, meetings: 5, deals: 2 }; // Defaults
            let foundTargets = false;

            if (userId) {
                const { data: targetData } = await supabase
                    .from('user_targets')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('period', timeRange)
                    .single();

                if (targetData) {
                    targets = {
                        calls: targetData.calls_goal || 15,
                        newLeads: targetData.new_leads_goal || 12,
                        meetings: targetData.meetings_goal || 5,
                        deals: targetData.deals_goal || 2
                    };
                    foundTargets = true;
                }
            }

            // 2. Get calls made by user in period
            let callsQuery = supabase
                .from('calls')
                .select('id, status, lead_id')
                .gte('created_at', startISO);

            if (userId) callsQuery = callsQuery.eq('agent_id', userId);
            else if (organizationId) callsQuery = callsQuery.eq('organization_id', organizationId);

            const { data: calls } = await callsQuery;

            // 3. Get new leads assigned to user created in period
            let leadsQuery = supabase
                .from('leads')
                .select('id')
                .gte('created_at', startISO);

            if (userId) leadsQuery = leadsQuery.eq('owner_id', userId);
            else if (organizationId) leadsQuery = leadsQuery.eq('organization_id', organizationId);

            const { data: newLeads } = await leadsQuery;

            // 4. Get appointments (leads modified in period with status appointment)
            let apptQuery = supabase
                .from('leads')
                .select('id')
                .or('status.ilike.%appointment%,status.ilike.%meeting%,status.eq.Discovery')
                .gte('updated_at', startISO);

            if (userId) apptQuery = apptQuery.eq('owner_id', userId);
            else if (organizationId) apptQuery = apptQuery.eq('organization_id', organizationId);

            const { data: appointments } = await apptQuery;

            // 5. Get closed deals
            let dealsQuery = supabase
                .from('leads')
                .select('id')
                .eq('status', 'Closed')
                .gte('updated_at', startISO);

            if (userId) dealsQuery = dealsQuery.eq('owner_id', userId);
            else if (organizationId) dealsQuery = dealsQuery.eq('organization_id', organizationId);

            const { data: closedDeals } = await dealsQuery;

            const leadsContacted = calls?.length || 0;
            const newLeadsCount = newLeads?.length || 0;
            const appointmentsCount = appointments?.length || 0;
            const closedCount = closedDeals?.length || 0;

            const multiplier = foundTargets ? 1 : (timeRange === 'week' ? 5 : timeRange === 'month' ? 20 : 1);

            const finalTargets = {
                calls: targets.calls * multiplier,
                newLeads: targets.newLeads * multiplier,
                meetings: targets.meetings * multiplier,
                deals: targets.deals * multiplier
            };

            return {
                leadsContacted: {
                    current: leadsContacted,
                    target: finalTargets.calls,
                    percentage: Math.min(100, Math.round((leadsContacted / finalTargets.calls) * 100))
                },
                newLeads: {
                    current: newLeadsCount,
                    target: finalTargets.newLeads,
                    percentage: Math.min(100, Math.round((newLeadsCount / finalTargets.newLeads) * 100))
                },
                appointments: {
                    current: appointmentsCount,
                    target: finalTargets.meetings,
                    percentage: Math.min(100, Math.round((appointmentsCount / finalTargets.meetings) * 100))
                },
                closedDeals: {
                    current: closedCount,
                    target: finalTargets.deals,
                    percentage: Math.min(100, Math.round((closedCount / finalTargets.deals) * 100))
                }
            };
        } catch (err) {
            console.error('[DB] Get Panel Stats Error:', err.message);
            return {
                leadsContacted: { current: 0, target: 15, percentage: 0 },
                newLeads: { current: 0, target: 12, percentage: 0 },
                appointments: { current: 0, target: 5, percentage: 0 },
                closedDeals: { current: 0, target: 2, percentage: 0 }
            };
        }
    }

    // --- PIPELINE ANALYTICS ---

    async getPipelineFunnel(userId, timeRange = 'month', organizationId) {
        try {
            // Simplified funnel logic: Count leads by status
            // Stages: New (Lead) -> Discovery (Contact) -> Proposal/Meeting -> Negotiation -> Closed

            let query = supabase.from('leads').select('status, value');
            if (userId) query = query.eq('owner_id', userId);
            else if (organizationId) query = query.eq('organization_id', organizationId);

            // Apply Time Filtering
            const now = new Date();
            let startDate;

            if (timeRange === 'day') {
                startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            } else if (timeRange === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                startDate = weekAgo.toISOString();
            } else if (timeRange === 'month') {
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                startDate = monthAgo.toISOString();
            }

            if (startDate) {
                // For funnel, we usually care about leads ACTIVE or CREATED in the period.
                // Strict interpretation: Created in period.
                query = query.gte('created_at', startDate);
            }

            const { data: leads, error } = await query;
            if (error) throw error;

            const counts = {
                'New': 0,
                'Discovery': 0,
                'Proposal': 0,
                'Negotiation': 0,
                'Closed': 0
            };

            const values = { ...counts };

            leads.forEach(l => {
                const s = l.status || 'New';
                // Map custom statuses to standard buckets if needed
                let bucket = 'New';
                if (['New', 'חדש'].includes(s)) bucket = 'New';
                else if (['Discovery', 'Contacted', 'Qualified'].includes(s)) bucket = 'Discovery';
                else if (['Proposal', 'Quote', 'Meeting', 'Scheduled'].includes(s)) bucket = 'Proposal';
                else if (['Negotiation', 'Contract'].includes(s)) bucket = 'Negotiation';
                else if (['Closed', 'Won'].includes(s)) bucket = 'Closed';

                counts[bucket] = (counts[bucket] || 0) + 1;
                values[bucket] = (values[bucket] || 0) + (l.value || 0);
            });

            // Conversion helper
            const total = leads.length || 1;

            return [
                { id: 'f1', label: 'ליד חדש', count: counts['New'], totalValue: values['New'], percentage: 100, conversionRate: 100, color: '#6366f1' },
                { id: 'f2', label: 'גילוי צרכים', count: counts['Discovery'], totalValue: values['Discovery'], percentage: Math.round((counts['Discovery'] / total) * 100), conversionRate: 0, color: '#4f46e5' },
                { id: 'f3', label: 'הצעת מחיר', count: counts['Proposal'], totalValue: values['Proposal'], percentage: Math.round((counts['Proposal'] / total) * 100), conversionRate: 0, color: '#4338ca' },
                { id: 'f4', label: 'משא ומתן', count: counts['Negotiation'], totalValue: values['Negotiation'], percentage: Math.round((counts['Negotiation'] / total) * 100), conversionRate: 0, color: '#3730a3' },
                { id: 'f5', label: 'סגירה', count: counts['Closed'], totalValue: values['Closed'], percentage: Math.round((counts['Closed'] / total) * 100), conversionRate: 0, color: '#312e81' },
            ].map((stage, idx, arr) => {
                const max = Math.max(...arr.map(s => s.count)) || 1;
                stage.percentage = Math.round((stage.count / max) * 100);

                if (idx > 0) {
                    const prev = arr[idx - 1].count;
                    stage.conversionRate = prev > 0 ? Math.round((stage.count / prev) * 100) : 0;
                }
                return stage;
            });
        } catch (err) {
            console.error('[DB] Funnel Error:', err);
            return [];
        }
    }

    async getPipelineSources(userId, timeRange = 'month', organizationId) {
        try {
            let query = supabase.from('leads').select('source, status, value, created_at');
            if (userId) query = query.eq('owner_id', userId);
            else if (organizationId) query = query.eq('organization_id', organizationId);

            // Apply Time Filtering
            const now = new Date();
            let startDate;

            if (timeRange === 'day') {
                startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            } else if (timeRange === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                startDate = weekAgo.toISOString();
            } else if (timeRange === 'month') {
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                startDate = monthAgo.toISOString();
            }

            if (startDate) {
                query = query.gte('created_at', startDate);
            }

            const { data: leads, error } = await query;
            if (error) throw error;

            const counts = {};
            const revenues = {};

            leads.forEach(l => {
                const s = l.source || 'Unknown';
                counts[s] = (counts[s] || 0) + 1;
                revenues[s] = (revenues[s] || 0) + (l.value || 0);
            });

            return Object.keys(counts).map(source => ({
                name: source,
                leads: counts[source],
                revenue: revenues[source]
            })).sort((a, b) => b.leads - a.leads);

        } catch (err) {
            console.error('[DB] Sources Error:', err);
            return [];
        }
    }

    // Get Top Deals (High Value, Open)
    async getTopDeals(userId, limit = 5, organizationId) {
        try {
            let query = supabase
                .from('leads')
                .select(`
                    id, name, company, value, status, 
                    owner:owner_id(full_name, avatar_url)
                `)
                .neq('status', 'Closed') // Active deals
                .order('value', { ascending: false })
                .limit(limit);

            if (userId) query = query.eq('owner_id', userId);
            else if (organizationId) query = query.eq('organization_id', organizationId);

            const { data, error } = await query;
            if (error) throw error;

            return data.map(d => ({
                id: d.id,
                company: d.company,
                owner: d.owner?.full_name || 'N/A',
                ownerAvatar: d.owner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.owner?.full_name || 'U')}&background=random`,
                stage: d.status,
                value: `₪${(d.value || 0).toLocaleString()}`
            }));
        } catch (err) {
            console.error('[DB] Top Deals Error:', err.message);
            // Return empty array instead of mock
            return [];
        }
    }

    // Get Quality Trend (Last 7 Days)
    async getQualityTrend(userId, days = 7, organizationId) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            let query = supabase
                .from('call_summaries')
                .select('score, created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (organizationId) query = query.eq('organization_id', organizationId);
            // filtering by user would require joining calls -> agent_id, but call_summaries has no direct agent_id usually? 
            // Actually call_summaries links to calls(id). We might need a join or just trust org filter for now.

            const { data, error } = await query;
            if (error) throw error;

            // Aggregate by Day
            const dailyScores = {};
            // Initialize last 7 days with null/0
            for (let i = 0; i < days; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayKey = d.toISOString().split('T')[0];
                const dayName = d.toLocaleDateString('he-IL', { weekday: 'narrow' });
                dailyScores[dayKey] = { day: dayName, total: 0, count: 0, date: dayKey };
            }

            data.forEach(item => {
                const dayKey = new Date(item.created_at).toISOString().split('T')[0];
                if (dailyScores[dayKey]) {
                    dailyScores[dayKey].total += (item.score || 0);
                    dailyScores[dayKey].count += 1;
                }
            });

            return Object.values(dailyScores)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(d => ({
                    day: d.day,
                    score: d.count > 0 ? Math.round(d.total / d.count) : 0 // 0 will be plotted as 0. 
                }));

        } catch (err) {
            console.error('[DB] Quality Trend Error:', err.message);
            return [];
        }
    }

    async getAtRiskLeads(limit = 5, userId, organizationId) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            let query = supabase
                .from('leads')
                .select('*')
                .neq('status', 'Closed')
                .neq('status', 'Won')
                .lt('updated_at', sevenDaysAgo.toISOString())
                .order('updated_at', { ascending: true })
                .limit(limit);

            if (userId) query = query.eq('owner_id', userId);
            else if (organizationId) query = query.eq('organization_id', organizationId);

            const { data, error } = await query;
            if (error) throw error;

            return data.map(l => ({
                id: l.id,
                name: l.name,
                source: l.source,
                timeSinceActivity: '7+ ימים'
            }));
        } catch (err) {
            console.error('[DB] At Risk Error:', err);
            return [];
        }
    }

    async getUnassignedLeads(limit = 20, organizationId) {
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .is('owner_id', null)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (organizationId) query = query.eq('organization_id', organizationId);

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (err) {
            return [];
        }
    }

    // --- CHAT ---

    async getMessages(userId, contactId) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                *,
                sender: sender_id(full_name, avatar_url),
                recipient: recipient_id(full_name, avatar_url)
                `)
                .or(`and(sender_id.eq.${userId}, recipient_id.eq.${contactId}), and(sender_id.eq.${contactId}, recipient_id.eq.${userId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[DB] Get Messages Error:', err);
            return [];
        }
    }

    async sendMessage(senderId, recipientId, content) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: senderId,
                    recipient_id: recipientId,
                    content: content
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[DB] Send Message Error:', err);
            return null;
        }
    }

    // --- TEAM MEMBERS ---

    async getTeamMembers(organizationId) {
        try {
            if (!organizationId) {
                console.error('[DB] getTeamMembers: No organizationId provided');
                return [];
            }

            const { data, error } = await supabase
                .from('profiles')
                .select(`
                        id,
                full_name,
                email,
                avatar_url,
                role,
                organization_id
                    `)
                .eq('organization_id', organizationId)
                .order('full_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[DB] Get Team Members Error:', err);
            return [];
        }
    }

    // --- CAMPAIGNS ---

    // Get all campaigns for an organization
    async getCampaigns(organizationId) {
        try {
            if (!organizationId) {
                console.error('[DB] getCampaigns: No organizationId provided');
                return [];
            }

            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[DB] Get Campaigns Error:', err);
            return [];
        }
    }

    // Create a new campaign
    async createCampaign({ organizationId, name, sourceFilter, description }) {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .insert({
                    organization_id: organizationId,
                    name,
                    source_filter: sourceFilter,
                    description
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[DB] Create Campaign Error:', err);
            throw err;
        }
    }

    // Update a campaign
    async updateCampaign(id, { name, sourceFilter, description, isActive }) {
        try {
            const updates = {};
            if (name !== undefined) updates.name = name;
            if (sourceFilter !== undefined) updates.source_filter = sourceFilter;
            if (description !== undefined) updates.description = description;
            if (isActive !== undefined) updates.is_active = isActive;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[DB] Update Campaign Error:', err);
            throw err;
        }
    }

    // Delete a campaign (soft delete by setting is_active = false)
    async deleteCampaign(id) {
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('[DB] Delete Campaign Error:', err);
            throw err;
        }
    }

    // Get unique lead sources for an organization
    async getLeadSources(organizationId) {
        try {
            if (!organizationId) {
                console.error('[DB] getLeadSources: No organizationId provided');
                return [];
            }

            const { data, error } = await supabase
                .from('leads')
                .select('source')
                .eq('organization_id', organizationId)
                .not('source', 'is', null);

            if (error) throw error;

            // Extract unique sources
            const uniqueSources = [...new Set((data || []).map(l => l.source).filter(Boolean))];
            return uniqueSources.sort();
        } catch (err) {
            console.error('[DB] Get Lead Sources Error:', err);
            return [];
        }
    }

    // --- API KEYS (for secure webhooks) ---

    // Generate a new API key for an organization
    async createApiKey(organizationId, name, createdBy) {
        const crypto = require('crypto');

        // Generate secure random key: org_sk_{32 random chars}
        const randomPart = crypto.randomBytes(24).toString('base64url');
        const fullKey = `org_sk_${randomPart}`;
        const keyPrefix = fullKey.substring(0, 12); // "org_sk_xxxx"

        // Hash the key for storage (never store plain)
        const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

        try {
            const { data, error } = await supabase
                .from('api_keys')
                .insert({
                    organization_id: organizationId,
                    key_hash: keyHash,
                    key_prefix: keyPrefix,
                    name: name || 'Default Key',
                    created_by: createdBy
                })
                .select('id, key_prefix, name, is_active, created_at')
                .single();

            if (error) throw error;

            console.log(`[DB] API Key created: ${keyPrefix}... for org ${organizationId}`);

            // Return the full key ONLY on creation (will never be shown again)
            return {
                ...data,
                key: fullKey // Show full key only once!
            };
        } catch (err) {
            console.error('[DB] Create API Key Error:', err);
            throw err;
        }
    }

    // Verify an API key and return the organization ID
    async verifyApiKey(apiKey) {
        const crypto = require('crypto');

        if (!apiKey || !apiKey.startsWith('org_sk_')) {
            return null;
        }

        // Hash the provided key
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        try {
            const { data, error } = await supabase
                .from('api_keys')
                .select('id, organization_id, name, is_active')
                .eq('key_hash', keyHash)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                console.log('[DB] API Key not found or inactive');
                return null;
            }

            // Update last used timestamp
            await supabase
                .from('api_keys')
                .update({
                    last_used_at: new Date().toISOString(),
                    usage_count: supabase.sql`usage_count + 1`
                })
                .eq('id', data.id);

            console.log(`[DB] API Key verified: ${apiKey.substring(0, 12)}... -> org ${data.organization_id}`);
            return data.organization_id;
        } catch (err) {
            console.error('[DB] Verify API Key Error:', err);
            return null;
        }
    }

    // Get all API keys for an organization (without the actual key, just metadata)
    async getApiKeys(organizationId) {
        try {
            const { data, error } = await supabase
                .from('api_keys')
                .select('id, key_prefix, name, is_active, last_used_at, usage_count, created_at')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[DB] Get API Keys Error:', err);
            return [];
        }
    }

    // Revoke/delete an API key
    async revokeApiKey(keyId, organizationId) {
        try {
            const { error } = await supabase
                .from('api_keys')
                .update({ is_active: false })
                .eq('id', keyId)
                .eq('organization_id', organizationId); // Ensure org ownership

            if (error) throw error;
            console.log(`[DB] API Key revoked: ${keyId}`);
            return true;
        } catch (err) {
            console.error('[DB] Revoke API Key Error:', err);
            throw err;
        }
    }


}

module.exports = new DBService();
