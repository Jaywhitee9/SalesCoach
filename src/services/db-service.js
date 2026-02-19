const supabase = require('../lib/supabase'); // Corrected Path
const { dashboardCache } = require('../utils/cache.js');

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
            // FIRST: Try to match by recording_url (before recording callback ran)
            // SECOND: If not found, try to find by callSid contained in recording_url (after recording callback)
            let data = null;
            let error = null;

            // Prepare accumulated signals for storage
            const accumulatedSignals = callData.accumulatedSignals || { pains: [], objections: [], gaps: [], vision: [] };
            console.log(`[Supabase] Saving accumulated signals:`, {
                pains: accumulatedSignals.pains?.length || 0,
                objections: accumulatedSignals.objections?.length || 0,
                gaps: accumulatedSignals.gaps?.length || 0,
                vision: accumulatedSignals.vision?.length || 0
            });

            // Attempt 1: Match by sid:CallSid
            const result1 = await supabase
                .from('calls')
                .update({
                    status: 'completed',
                    duration: Math.floor((Date.now() - callData.startTime) / 1000),
                    transcript: callData.transcripts,
                    coaching_tips: callData.coachingHistory || [],
                    accumulated_signals: accumulatedSignals,
                })
                .eq('recording_url', recordingUrlToMatch)
                .select()
                .single();

            data = result1.data;
            error = result1.error;

            // Attempt 2: If Attempt 1 failed, try matching by lead_id and agent_id with recent time
            if (error && callData.leadId && callData.agentId) {
                console.log(`[Supabase] Attempt 1 failed, trying by lead_id + agent_id...`);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

                const result2 = await supabase
                    .from('calls')
                    .update({
                        status: 'completed',
                        duration: Math.floor((Date.now() - callData.startTime) / 1000),
                        transcript: callData.transcripts,
                        coaching_tips: callData.coachingHistory || [],
                        accumulated_signals: accumulatedSignals,
                    })
                    .eq('lead_id', callData.leadId)
                    .eq('agent_id', callData.agentId)
                    .gte('created_at', fiveMinutesAgo)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .select()
                    .single();

                data = result2.data;
                error = result2.error;
            }

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
                    coaching_tips: callData.coachingHistory || [],
                    accumulated_signals: accumulatedSignals,
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

    async getRecentCalls(limit = 10, organizationId = null) {
        try {
            if (!organizationId) {
                throw new Error('[DB] getRecentCalls: organizationId is required for multi-tenant isolation');
            }

            const { data, error } = await supabase
                .from('calls')
                .select('*, call_summaries(*)')
                .eq('organization_id', organizationId)
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
    // Using RPC function to bypass PostgREST schema cache issues
    async createLead(leadData) {
        try {
            // Call the RPC function
            const { data, error } = await supabase.rpc('create_webhook_lead', {
                p_org_id: leadData.organization_id,
                p_name: leadData.name || 'Unknown',
                p_phone: leadData.phone || '',
                p_email: leadData.email || '',
                p_company: leadData.company || '',
                p_source: leadData.source || 'Webhook',
                p_status: leadData.status || 'New',
                p_priority: leadData.priority || 'Hot',
                p_value: leadData.value ? parseInt(String(leadData.value).replace(/[^0-9]/g, '')) : 0,
                p_tags: leadData.tags || []
            });

            if (error) {
                console.error('[DB] createLead RPC Error:', JSON.stringify(error));
                throw error;
            }

            const lead = data?.[0] || data;
            console.log(`[DB] Lead created via RPC: ${lead?.id} - ${lead?.name} (${lead?.source})`);
            return lead;
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
    async getStats(timeRange = 'day', organizationId = null, userId = null) {
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

        console.log('[DEBUG-STATS] Range:', timeRange);
        console.log('[DEBUG-STATS] StartISO:', startISO);
        console.log('[DEBUG-STATS] UserId:', userId);
        console.log('[DEBUG-STATS] OrgId:', organizationId);

        try {
            // Parallel fetch for better performance - fetch all data at once
            const queries = [];

            // Query 1: Get calls for the period (only needed columns)
            let callsQuery = supabase
                .from('calls')
                .select('duration, status', { count: 'exact' })
                .gte('created_at', startISO);

            if (organizationId) {
                callsQuery = callsQuery.eq('organization_id', organizationId);
            }
            if (userId) {
                // FIXED: Column is 'agent_id', not 'user_id'
                callsQuery = callsQuery.eq('agent_id', userId);
            }
            queries.push(callsQuery);

            // Query 2: Get leads count (only count, no data needed)
            let leadsQuery = supabase
                .from('leads')
                .select('id', { count: 'exact', head: false })
                .gte('created_at', startISO);

            if (organizationId) {
                leadsQuery = leadsQuery.eq('organization_id', organizationId);
            }
            if (userId) {
                leadsQuery = leadsQuery.eq('owner_id', userId);
            }
            queries.push(leadsQuery);

            // Query 3: Get call summaries for quality score and appointments
            let summariesQuery = supabase
                .from('call_summaries')
                .select('score, successful')
                .gte('created_at', startISO);

            if (organizationId) {
                summariesQuery = summariesQuery.eq('organization_id', organizationId);
            }
            // TODO: Add agent filtering for summaries (needs join with calls or agent_id column)
            // if (userId) {
            //    summariesQuery = summariesQuery.eq('user_id', userId); 
            // }
            queries.push(summariesQuery);

            // Execute all queries in parallel for faster results
            const [
                { data: calls, error: callsError },
                { data: leads, error: leadsError },
                { data: summaries }
            ] = await Promise.all(queries);

            if (callsError) throw callsError;
            if (leadsError) throw leadsError;

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

            // Build queries (but don't await yet)
            let callsQuery = supabase
                .from('calls')
                .select('id, status, lead_id')
                .gte('created_at', startISO);

            if (userId) callsQuery = callsQuery.eq('agent_id', userId);
            else if (organizationId) callsQuery = callsQuery.eq('organization_id', organizationId);

            let leadsQuery = supabase
                .from('leads')
                .select('id')
                .gte('created_at', startISO);

            if (userId) leadsQuery = leadsQuery.eq('owner_id', userId);
            else if (organizationId) leadsQuery = leadsQuery.eq('organization_id', organizationId);

            let apptQuery = supabase
                .from('leads')
                .select('id')
                .or('status.ilike.%appointment%,status.ilike.%meeting%,status.eq.Discovery')
                .gte('created_at', startISO);

            if (userId) apptQuery = apptQuery.eq('owner_id', userId);
            else if (organizationId) apptQuery = apptQuery.eq('organization_id', organizationId);

            let dealsQuery = supabase
                .from('leads')
                .select('id')
                .eq('status', 'Closed')
                .gte('created_at', startISO);

            if (userId) dealsQuery = dealsQuery.eq('owner_id', userId);
            else if (organizationId) dealsQuery = dealsQuery.eq('organization_id', organizationId);

            // PARALLEL EXECUTION - All queries at once
            const [callsResult, leadsResult, apptResult, dealsResult] = await Promise.all([
                callsQuery,
                leadsQuery,
                apptQuery,
                dealsQuery
            ]);

            const calls = callsResult.data;
            const newLeads = leadsResult.data;
            const appointments = apptResult.data;
            const closedDeals = dealsResult.data;

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

            // Calculate previous period for trend comparison
            let previousStartDate = new Date(startDate);
            let previousEndDate = new Date(startDate);

            const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
            previousStartDate.setDate(previousStartDate.getDate() - daysDiff);

            const previousStartISO = previousStartDate.toISOString();
            const previousEndISO = startDate.toISOString();

            // Build previous period queries
            let prevCallsQuery = supabase
                .from('calls')
                .select('id', { count: 'exact' })
                .gte('created_at', previousStartISO)
                .lte('created_at', previousEndISO);

            if (userId) prevCallsQuery = prevCallsQuery.eq('agent_id', userId);
            else if (organizationId) prevCallsQuery = prevCallsQuery.eq('organization_id', organizationId);

            let prevLeadsQuery = supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .gte('created_at', previousStartISO)
                .lte('created_at', previousEndISO);

            if (userId) prevLeadsQuery = prevLeadsQuery.eq('owner_id', userId);
            else if (organizationId) prevLeadsQuery = prevLeadsQuery.eq('organization_id', organizationId);

            let prevApptQuery = supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .or('status.ilike.%appointment%,status.ilike.%meeting%,status.eq.Discovery')
                .gte('created_at', previousStartISO)
                .lte('created_at', previousEndISO);

            if (userId) prevApptQuery = prevApptQuery.eq('owner_id', userId);
            else if (organizationId) prevApptQuery = prevApptQuery.eq('organization_id', organizationId);

            let prevDealsQuery = supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .eq('status', 'Closed')
                .gte('created_at', previousStartISO)
                .lte('created_at', previousEndISO);

            if (userId) prevDealsQuery = prevDealsQuery.eq('owner_id', userId);
            else if (organizationId) prevDealsQuery = prevDealsQuery.eq('organization_id', organizationId);

            // Execute previous period queries
            const [prevCallsResult, prevLeadsResult, prevApptResult, prevDealsResult] = await Promise.all([
                prevCallsQuery,
                prevLeadsQuery,
                prevApptQuery,
                prevDealsQuery
            ]);

            const prevLeadsContacted = prevCallsResult.data?.length || 0;
            const prevNewLeadsCount = prevLeadsResult.data?.length || 0;
            const prevAppointmentsCount = prevApptResult.data?.length || 0;
            const prevClosedCount = prevDealsResult.data?.length || 0;

            // Calculate percentage changes
            const calculatePercentageChange = (current, previous) => {
                if (previous === 0) return 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            return {
                leadsContacted: {
                    current: leadsContacted,
                    target: finalTargets.calls,
                    previous: prevLeadsContacted,
                    percentage: Math.min(100, Math.round((leadsContacted / finalTargets.calls) * 100)),
                    percentageChange: calculatePercentageChange(leadsContacted, prevLeadsContacted)
                },
                newLeads: {
                    current: newLeadsCount,
                    target: finalTargets.newLeads,
                    previous: prevNewLeadsCount,
                    percentage: Math.min(100, Math.round((newLeadsCount / finalTargets.newLeads) * 100)),
                    percentageChange: calculatePercentageChange(newLeadsCount, prevNewLeadsCount)
                },
                appointments: {
                    current: appointmentsCount,
                    target: finalTargets.meetings,
                    previous: prevAppointmentsCount,
                    percentage: Math.min(100, Math.round((appointmentsCount / finalTargets.meetings) * 100)),
                    percentageChange: calculatePercentageChange(appointmentsCount, prevAppointmentsCount)
                },
                closedDeals: {
                    current: closedCount,
                    target: finalTargets.deals,
                    previous: prevClosedCount,
                    percentage: Math.min(100, Math.round((closedCount / finalTargets.deals) * 100)),
                    percentageChange: calculatePercentageChange(closedCount, prevClosedCount)
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
            // 1. Fetch Organization Settings for Stages
            const settings = await this.getOrganizationSettings(organizationId);

            console.log('[DEBUG-FUNNEL] OrgId:', organizationId);
            console.log('[DEBUG-FUNNEL] Settings Found:', !!settings);
            console.log('[DEBUG-FUNNEL] Pipeline Statuses:', settings?.pipeline_statuses?.length);

            // Determine active stages configuration
            // Priority: pipeline_statuses (objects with id, label, color) -> stages_config (strings) -> Defaults
            let stages = [];

            if (settings?.pipeline_statuses && Array.isArray(settings.pipeline_statuses) && settings.pipeline_statuses.length > 0) {
                stages = settings.pipeline_statuses;
                console.log('[DEBUG-FUNNEL] Using Custom Pipeline Statuses');
                console.log('[DEBUG-FUNNEL] First Stage Sample:', JSON.stringify(stages[0], null, 2));
            } else if (settings?.stages_config && Array.isArray(settings.stages_config) && settings.stages_config.length > 0) {
                // Map string config to object structure
                // Assume string is both ID and Label for legacy/simple configs
                stages = settings.stages_config.map((s, i) => ({
                    id: s,
                    label: s,
                    color: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#059669'][i % 5]
                }));
                console.log('[DEBUG-FUNNEL] Using Legacy Stages Config');
            } else {
                // Hard Fallback
                console.log('[DEBUG-FUNNEL] Using Hardcoded Fallback');
                stages = [
                    { id: 'New', label: 'ליד חדש', color: '#3B82F6' },
                    { id: 'Discovery', label: 'גילוי צרכים', color: '#8B5CF6' },
                    { id: 'Proposal', label: 'הצעת מחיר', color: '#10B981' },
                    { id: 'Negotiation', label: 'משא ומתן', color: '#EC4899' },
                    { id: 'Closed', label: 'סגור', color: '#059669' }
                ];
            }

            // Optimized query: only select needed columns (status, value)
            let query = supabase
                .from('leads')
                .select('status, value', { count: 'exact' });

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

            // Execute optimized query (will use idx_leads_org_created_status index)
            const { data: leads, error } = await query;
            if (error) throw error;

            // Initialize counts
            const counts = {};
            const values = {};

            // Map by ID for easy lookup
            stages.forEach(stage => {
                counts[stage.id] = 0;
                values[stage.id] = 0;
            });

            // Allow for legacy mapping if needed (English ID -> Hebrew Label in config?)
            // If the config uses 'New' as ID, and lead has 'New', it works.
            // If config uses 'status_123' and lead has 'status_123', it works.
            // Be tolerant of 'Closed' if not in stages but commonly exists.

            leads.forEach(l => {
                const s = l.status; // This is the ID stored in DB

                // Direct Match
                if (counts.hasOwnProperty(s)) {
                    counts[s]++;
                    values[s] += (l.value || 0);
                } else {
                    // Fallback Logic
                    // 1. Try to match by Label if ID failed (legacy data might store label)
                    const stageByLabel = stages.find(st => st.label === s || st.label === l.status);
                    if (stageByLabel) {
                        counts[stageByLabel.id]++;
                        values[stageByLabel.id] += (l.value || 0);
                    } else if (['New', 'חדש', null, undefined].includes(s)) {
                        // Default to first stage
                        if (stages.length > 0) {
                            const first = stages[0].id;
                            counts[first]++;
                            values[first] += (l.value || 0);
                        }
                    } else if (['Closed', 'Won', 'סגור'].includes(s)) {
                        // If 'Closed' isn't a defined stage ID, try to find the last stage?
                        // Or just ignore if not in funnel?
                        // Let's try to find a stage with 'Closed' in ID or Label
                        const closedStage = stages.find(st => st.id === 'Closed' || st.label.includes('סגור') || st.label.includes('Closed'));
                        if (closedStage) {
                            counts[closedStage.id]++;
                            values[closedStage.id] += (l.value || 0);
                        }
                    }
                    // Else: Unknown status, maybe "Lost" or "Archived". Exclude from funnel or map to "Other"?
                    // Current behavior: Exclude.
                }
            });

            // Conversion helper
            const total = leads.length || 1;

            return stages.map((stage, idx, arr) => {
                const count = counts[stage.id] || 0;
                const value = values[stage.id] || 0;

                // Visual Percentage
                const maxCount = Math.max(...Object.values(counts)) || 1;
                const percentage = Math.round((count / maxCount) * 100);

                // Conversion Rate
                let conversionRate = 0;
                if (idx > 0) {
                    const prevStage = arr[idx - 1];
                    const prevCount = counts[prevStage.id] || 0;
                    conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
                } else {
                    conversionRate = 100;
                }

                return {
                    id: stage.id, // Use the actual Stage ID
                    label: stage.label,
                    count: count,
                    totalValue: value,
                    percentage: percentage,
                    conversionRate: conversionRate,
                    color: stage.color || '#6366f1' // Use custom color
                };
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

    async getTeamPerformance(organizationId, timeRange = 'week') {
        try {
            // OPTIMIZED: Check cache first (30 seconds TTL)
            const cacheKey = `team_perf_${organizationId}_${timeRange}`;
            const cached = dashboardCache.get(cacheKey);
            if (cached) {
                console.log('[Cache] Hit: getTeamPerformance');
                return cached;
            }

            // Calculate date range
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

            // OPTIMIZED: Query 1 - Get all team members (1 query)
            const { data: members, error: membersError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .eq('organization_id', organizationId);

            if (membersError) throw membersError;
            if (!members || members.length === 0) {
                return { success: true, performance: [] };
            }

            // OPTIMIZED: Query 2 - Get ALL calls at once (1 query instead of N)
            const { data: allCalls } = await supabase
                .from('calls')
                .select('agent_id')
                .eq('organization_id', organizationId)
                .gte('created_at', startISO);

            // OPTIMIZED: Query 3 - Get ALL meetings at once (1 query instead of N)
            const { data: allMeetings } = await supabase
                .from('leads')
                .select('owner_id')
                .eq('organization_id', organizationId)
                .or('status.ilike.%appointment%,status.ilike.%meeting%,status.eq.Discovery')
                .gte('updated_at', startISO);

            // OPTIMIZED: Query 4 - Get ALL deals at once (1 query instead of N)
            const { data: allDeals } = await supabase
                .from('leads')
                .select('owner_id, value')
                .eq('organization_id', organizationId)
                .eq('status', 'Closed')
                .gte('updated_at', startISO);

            // OPTIMIZED: Build lookup maps in-memory (fast)
            const callsMap = {};
            const meetingsMap = {};
            const dealsMap = {};

            allCalls?.forEach(call => {
                callsMap[call.agent_id] = (callsMap[call.agent_id] || 0) + 1;
            });

            allMeetings?.forEach(meeting => {
                meetingsMap[meeting.owner_id] = (meetingsMap[meeting.owner_id] || 0) + 1;
            });

            allDeals?.forEach(deal => {
                if (!dealsMap[deal.owner_id]) {
                    dealsMap[deal.owner_id] = { count: 0, revenue: 0 };
                }
                dealsMap[deal.owner_id].count++;
                dealsMap[deal.owner_id].revenue += parseFloat(deal.value) || 0;
            });

            // OPTIMIZED: Build performance array without additional queries
            const performance = members.map(member => {
                const dealStats = dealsMap[member.id] || { count: 0, revenue: 0 };

                return {
                    id: member.id,
                    name: member.full_name || 'Unknown',
                    avatar: member.avatar_url,
                    role: member.role,
                    calls: callsMap[member.id] || 0,
                    meetings: meetingsMap[member.id] || 0,
                    deals: dealStats.count,
                    revenue: dealStats.revenue
                };
            });

            // Sort by revenue desc
            performance.sort((a, b) => b.revenue - a.revenue);

            const result = { success: true, performance };

            // OPTIMIZED: Store in cache for 30 seconds
            dashboardCache.set(cacheKey, result, 30);

            return result;
        } catch (err) {
            console.error('[DB] Get Team Performance Error:', err.message);
            return { success: false, error: err.message, performance: [] };
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

    async getDailyInsights(organizationId) {
        try {
            // OPTIMIZED: Check cache first (30 seconds TTL)
            const cacheKey = `daily_insights_${organizationId}`;
            const cached = dashboardCache.get(cacheKey);
            if (cached) {
                console.log('[Cache] Hit: getDailyInsights');
                return cached;
            }

            const insights = [];
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayISO = today.toISOString();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayISO = yesterday.toISOString();

            // OPTIMIZED: Query 1 - Get team members (1 query)
            const { data: teamStats } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('organization_id', organizationId)
                .eq('role', 'agent');

            // OPTIMIZED: Query 2 - Get ALL today's calls at once (1 query instead of N)
            const { data: allTodayCalls } = await supabase
                .from('calls')
                .select('agent_id')
                .eq('organization_id', organizationId)
                .gte('created_at', todayISO);

            // Build calls count map in-memory
            const callsCountMap = {};
            allTodayCalls?.forEach(call => {
                callsCountMap[call.agent_id] = (callsCountMap[call.agent_id] || 0) + 1;
            });

            // Insight 1: Reps below target today (no additional queries)
            if (teamStats) {
                teamStats.forEach(rep => {
                    const callCount = callsCountMap[rep.id] || 0;
                    if (callCount < 10) { // Daily target = 10 calls
                        insights.push({
                            type: 'warning',
                            icon: 'AlertTriangle',
                            title: `${rep.full_name} מתחת ליעד`,
                            description: `ביצע רק ${callCount} שיחות היום (יעד: 10)`,
                            action: 'דבר איתו עכשיו',
                            priority: 'high'
                        });
                    }
                });
            }

            // OPTIMIZED: Query 3 - Hot leads not contacted (1 query)
            const { data: hotLeads } = await supabase
                .from('leads')
                .select('id, name, score')
                .eq('organization_id', organizationId)
                .gte('score', 80)
                .is('last_contact_at', null)
                .limit(3);

            if (hotLeads && hotLeads.length > 0) {
                insights.push({
                    type: 'opportunity',
                    icon: 'TrendingUp',
                    title: `${hotLeads.length} לידים חמים ממתינים`,
                    description: 'ציון גבוה אבל עדיין לא יצרתם קשר',
                    action: 'התקשר עכשיו',
                    priority: 'high'
                });
            }

            // OPTIMIZED: Query 4 - Deals closing soon (1 query)
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            const { data: closingDeals } = await supabase
                .from('leads')
                .select('id, name, value')
                .eq('organization_id', organizationId)
                .eq('status', 'Negotiation')
                .lte('expected_close_date', nextWeek.toISOString())
                .limit(3);

            if (closingDeals && closingDeals.length > 0) {
                const totalValue = closingDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
                insights.push({
                    type: 'success',
                    icon: 'Target',
                    title: `${closingDeals.length} עסקאות נסגרות השבוע`,
                    description: `סה"כ ₪${(totalValue / 1000).toFixed(0)}k - תדחוף לסגירה`,
                    action: 'עקוב אחריהן',
                    priority: 'medium'
                });
            }

            // OPTIMIZED: Query 5 - Team performance trend (1 query instead of 2)
            const { data: recentCalls } = await supabase
                .from('calls')
                .select('created_at')
                .eq('organization_id', organizationId)
                .gte('created_at', yesterdayISO);

            // Split into today vs yesterday in-memory
            const todayCount = recentCalls?.filter(c => c.created_at >= todayISO).length || 0;
            const yesterdayCount = recentCalls?.filter(c => c.created_at < todayISO).length || 0;

            if (yesterdayCount > 0) {
                const change = ((todayCount - yesterdayCount) / yesterdayCount) * 100;
                if (change < -20) {
                    insights.push({
                        type: 'warning',
                        icon: 'TrendingDown',
                        title: 'פעילות הצוות יורדת',
                        description: `${Math.abs(change).toFixed(0)}% פחות שיחות מאתמול`,
                        action: 'תעורר מוטיבציה',
                        priority: 'medium'
                    });
                } else if (change > 20) {
                    insights.push({
                        type: 'success',
                        icon: 'TrendingUp',
                        title: 'הצוות בשיא!',
                        description: `${change.toFixed(0)}% יותר שיחות מאתמול`,
                        action: 'המשיכו כך',
                        priority: 'low'
                    });
                }
            }

            // Sort by priority
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

            const result = { success: true, insights: insights.slice(0, 4) }; // Max 4 insights

            // OPTIMIZED: Store in cache for 30 seconds
            dashboardCache.set(cacheKey, result, 30);

            return result;
        } catch (err) {
            console.error('[DB] Get Daily Insights Error:', err.message);
            return { success: false, error: err.message, insights: [] };
        }
    }

    async getGoalProgress(organizationId) {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayISO = today.toISOString();

            // Get today's stats
            const { data: calls } = await supabase
                .from('calls')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .gte('created_at', todayISO);

            const { data: meetings } = await supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .or('status.ilike.%appointment%,status.ilike.%meeting%')
                .gte('updated_at', todayISO);

            const { data: deals } = await supabase
                .from('leads')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .eq('status', 'Closed')
                .gte('updated_at', todayISO);

            // Get team size for target calculation
            const { data: team } = await supabase
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .eq('role', 'agent');

            const teamSize = team?.length || 1;

            // Daily targets per rep
            const callsTarget = 10 * teamSize;
            const meetingsTarget = 3 * teamSize;
            const dealsTarget = 1 * teamSize;

            const callsCount = calls?.length || 0;
            const meetingsCount = meetings?.length || 0;
            const dealsCount = deals?.length || 0;

            return {
                success: true,
                teamProgress: {
                    calls: {
                        current: callsCount,
                        target: callsTarget,
                        percentage: Math.round((callsCount / callsTarget) * 100)
                    },
                    meetings: {
                        current: meetingsCount,
                        target: meetingsTarget,
                        percentage: Math.round((meetingsCount / meetingsTarget) * 100)
                    },
                    deals: {
                        current: dealsCount,
                        target: dealsTarget,
                        percentage: Math.round((dealsCount / dealsTarget) * 100)
                    }
                }
            };
        } catch (err) {
            console.error('[DB] Get Goal Progress Error:', err.message);
            return { success: false, error: err.message, teamProgress: null };
        }
    }

    async getLiveActivity(organizationId, limit = 10) {
        try {
            const activities = [];
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            // OPTIMIZED: Query 1 - Get active calls WITH agent info using JOIN (1 query instead of N+1)
            const { data: activeCalls } = await supabase
                .from('calls')
                .select(`
                    id,
                    agent_id,
                    created_at,
                    duration,
                    profiles!calls_agent_id_fkey (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('organization_id', organizationId)
                .is('ended_at', null)
                .gte('created_at', fiveMinutesAgo.toISOString())
                .order('created_at', { ascending: false });

            // Build activities WITHOUT additional queries
            if (activeCalls) {
                activeCalls.forEach(call => {
                    if (call.profiles) {
                        const callDuration = Math.floor((now.getTime() - new Date(call.created_at).getTime()) / 1000);
                        activities.push({
                            id: call.id,
                            agentName: call.profiles.full_name,
                            agentAvatar: call.profiles.avatar_url,
                            action: 'in_call',
                            duration: callDuration,
                            timestamp: call.created_at
                        });
                    }
                });
            }

            // OPTIMIZED: Query 2 - Get ended calls WITH agent info using JOIN (1 query instead of N+1)
            const { data: endedCalls } = await supabase
                .from('calls')
                .select(`
                    id,
                    agent_id,
                    ended_at,
                    quality_score,
                    profiles!calls_agent_id_fkey (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('organization_id', organizationId)
                .not('ended_at', 'is', null)
                .gte('ended_at', fiveMinutesAgo.toISOString())
                .order('ended_at', { ascending: false })
                .limit(limit);

            // Build activities WITHOUT additional queries
            if (endedCalls) {
                endedCalls.forEach(call => {
                    if (call.profiles) {
                        activities.push({
                            id: call.id,
                            agentName: call.profiles.full_name,
                            agentAvatar: call.profiles.avatar_url,
                            action: 'call_ended',
                            quality: call.quality_score || 0,
                            timestamp: call.ended_at
                        });
                    }
                });
            }

            // Sort by timestamp descending
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return { success: true, activities: activities.slice(0, limit) };
        } catch (err) {
            console.error('[DB] Get Live Activity Error:', err.message);
            return { success: false, error: err.message, activities: [] };
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
                    key_prefix: keyPrefix,
                    name: name || 'Default Key',
                    created_by: createdBy,
                    is_active: true
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

        if (!apiKey || !apiKey.trim().startsWith('org_sk_')) {
            return null;
        }

        const cleanKey = apiKey.trim();

        // Hash the provided key
        const keyHash = crypto.createHash('sha256').update(cleanKey).digest('hex');

        try {
            const { data, error } = await supabase
                .from('api_keys')
                .select('id, organization_id, name, is_active, usage_count')
                .eq('key_hash', keyHash)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                console.log(`[DB] WARN: Verify failed for key prefix ${cleanKey.substring(0, 10)}...`);
                if (error) console.error('[DB] Error:', error);
                return null;
            }

            // Update last used timestamp (Safe update)
            // Note: Atomic increment in Supabase JS requires RPC or ignore race condition for now
            const newCount = (data.usage_count || 0) + 1;

            await supabase
                .from('api_keys')
                .update({
                    last_used_at: new Date().toISOString(),
                    usage_count: newCount
                })
                .eq('id', data.id);

            console.log(`[DB] API Key verified: ${cleanKey.substring(0, 12)}... -> org ${data.organization_id}`);
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


    // --- ORGANIZATION SETTINGS ---

    async getOrganizationSettings(organizationId) {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('*')
                .eq('organization_id', organizationId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore not found error

            // Return defaults if not found
            if (!data) {
                return {
                    calls_config: {
                        transcription: true,
                        aiInsights: true,
                        language: 'auto',
                        aiModel: 'standard',
                        shortTips: false,
                        coachingWeights: { discovery: 70, objections: 50, closing: 85 }
                    },
                    stages_config: ["פתיחה והיכרות", "גילוי צרכים והבנת כאב", "הצגת חזון ופתרון", "טיפול בהתנגדויות", "הצעת מחיר וסגירה"]
                };
            }

            return data;
        } catch (err) {
            console.error('[DB] Get Org Settings Error:', err.message);
            throw err;
        }
    }

    async updateOrganizationSettings(organizationId, settings) {
        try {
            // Check if exists
            const { data: existing } = await supabase
                .from('organization_settings')
                .select('id')
                .eq('organization_id', organizationId)
                .single();

            let result;
            if (existing) {
                const { data, error } = await supabase
                    .from('organization_settings')
                    .update({
                        calls_config: settings.calls_config,
                        stages_config: settings.stages_config,
                        updated_at: new Date().toISOString()
                    })
                    .eq('organization_id', organizationId)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                const { data, error } = await supabase
                    .from('organization_settings')
                    .insert({
                        organization_id: organizationId,
                        calls_config: settings.calls_config,
                        stages_config: settings.stages_config
                    })
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }
            return result;
        } catch (err) {
            console.error('[DB] Update Org Settings Error:', err.message);
            throw err;
        }
    }

    // --- KNOWLEDGE BASE ---

    async getKnowledge(organizationId, domain = null) {
        try {
            let query = supabase
                .from('organization_knowledge')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (domain) {
                query = query.eq('domain', domain);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[DB] Get Knowledge Error:', err.message);
            return [];
        }
    }

    async upsertKnowledge(item) {
        try {
            const { id, organizationId, domain, knowledge_type, title, content } = item;

            if (id) {
                // Update
                const { data, error } = await supabase
                    .from('organization_knowledge')
                    .update({
                        content,
                        title,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .eq('organization_id', organizationId)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('organization_knowledge')
                    .insert({
                        organization_id: organizationId,
                        domain,
                        knowledge_type,
                        title,
                        content
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (err) {
            console.error('[DB] Upsert Knowledge Error:', err.message);
            throw err;
        }
    }

    async deleteKnowledge(id, organizationId) {
        try {
            const { error } = await supabase
                .from('organization_knowledge')
                .delete()
                .eq('id', id)
                .eq('organization_id', organizationId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('[DB] Delete Knowledge Error:', err.message);
            return false;
        }
    }

    async completeDebrief(callId, agentId) {
        try {
            const { data: call } = await supabase
                .from('calls')
                .select('id, debrief_completed')
                .eq('id', callId)
                .eq('agent_id', agentId)
                .single();

            if (!call) {
                return { xpAwarded: 0, error: 'Call not found' };
            }

            if (call.debrief_completed) {
                return { xpAwarded: 0, message: 'Already completed' };
            }

            await supabase
                .from('calls')
                .update({ debrief_completed: true })
                .eq('id', callId);

            const xpAmount = 10;
            let xpAwarded = 0;
            try {
                await supabase.rpc('add_xp', { p_agent_id: agentId, p_amount: xpAmount, p_reason: 'debrief_complete' });
                xpAwarded = xpAmount;
            } catch (xpErr) {
                console.error('[DB] add_xp rpc failed (may not exist yet):', xpErr.message);
            }

            if (xpAwarded === 0) {
                await supabase
                    .from('calls')
                    .update({ debrief_completed: false })
                    .eq('id', callId);
            }

            return { xpAwarded };
        } catch (err) {
            console.error('[DB] completeDebrief error:', err.message);
            return { xpAwarded: 0, error: err.message };
        }
    }

    async getRepAnalytics(agentId, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: calls, error } = await supabase
                .from('calls')
                .select('id, duration, created_at, coaching_tips, summary_json, status')
                .eq('agent_id', agentId)
                .eq('status', 'completed')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(100);

            if (error || !calls || calls.length === 0) {
                return { totalCalls: 0, strengths: [], weaknesses: [], objectionSuccessRate: {}, stageConversion: {}, improvementTrend: {}, topStruggles: [] };
            }

            const breakdownTotals = { discovery: [], listening: [], objection_handling: [], closing: [] };
            const objectionCounts = {};
            const stageCounts = {};
            const weekScores = { lastWeek: [], thisWeek: [] };
            const now = new Date();
            const oneWeekAgo = new Date(now); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            for (const call of calls) {
                const summary = call.summary_json;
                if (summary?.score_breakdown) {
                    for (const [key, val] of Object.entries(summary.score_breakdown)) {
                        if (breakdownTotals[key] !== undefined) {
                            breakdownTotals[key].push(Number(val) || 0);
                        }
                    }
                }

                const callDate = new Date(call.created_at);
                const callScore = summary?.score;
                if (callScore !== undefined) {
                    if (callDate >= oneWeekAgo) weekScores.thisWeek.push(callScore);
                    else if (callDate >= twoWeeksAgo) weekScores.lastWeek.push(callScore);
                }

                const tips = call.coaching_tips;
                if (Array.isArray(tips)) {
                    for (const tip of tips) {
                        if (tip.stage && typeof tip.stage === 'string') {
                            stageCounts[tip.stage] = (stageCounts[tip.stage] || 0) + 1;
                        }

                        const signals = tip.signals;
                        if (signals?.objections && Array.isArray(signals.objections)) {
                            for (const obj of signals.objections) {
                                const key = (obj.text || 'unknown').toLowerCase().trim();
                                if (!objectionCounts[key]) objectionCounts[key] = { total: 0, handled: 0 };
                                objectionCounts[key].total++;
                                if (obj.status === 'handled') objectionCounts[key].handled++;
                            }
                        }
                    }
                }
            }

            const areas = Object.entries(breakdownTotals)
                .filter(([, vals]) => vals.length > 0)
                .map(([area, vals]) => {
                    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
                    const recentAvg = vals.length > 5
                        ? Math.round(vals.slice(0, 5).reduce((s, v) => s + v, 0) / 5)
                        : avg;
                    const olderAvg = vals.length > 10
                        ? Math.round(vals.slice(5, 10).reduce((s, v) => s + v, 0) / Math.min(5, vals.length - 5))
                        : avg;
                    const trend = recentAvg > olderAvg + 3 ? 'improving' : recentAvg < olderAvg - 3 ? 'declining' : 'stable';
                    return { area, avgScore: avg, trend };
                })
                .sort((a, b) => a.avgScore - b.avgScore);

            const weaknesses = areas.filter(a => a.avgScore < 60).slice(0, 3);
            const strengths = areas.filter(a => a.avgScore >= 60).sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);

            const objectionSuccessRate = {};
            const objectionStruggles = [];
            for (const [key, data] of Object.entries(objectionCounts)) {
                if (data.total >= 2) {
                    const rate = data.handled / data.total;
                    objectionSuccessRate[key] = Number(rate.toFixed(2));
                    if (rate < 0.5) objectionStruggles.push({ text: key, rate });
                }
            }

            const topStruggles = [];
            if (weaknesses.length > 0) topStruggles.push(`${weaknesses[0].area} חלש (${weaknesses[0].avgScore})`);
            objectionStruggles.sort((a, b) => a.rate - b.rate).slice(0, 2).forEach(o => {
                topStruggles.push(`התנגדות "${o.text}" (${Math.round(o.rate * 100)}% הצלחה)`);
            });

            const avgArr = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
            const improvementTrend = {
                lastWeek: avgArr(weekScores.lastWeek),
                thisWeek: avgArr(weekScores.thisWeek),
                delta: (avgArr(weekScores.thisWeek) || 0) - (avgArr(weekScores.lastWeek) || 0)
            };

            const totalStages = Object.values(stageCounts).reduce((s, v) => s + v, 0);
            const stageConversion = {};
            for (const [stage, count] of Object.entries(stageCounts)) {
                stageConversion[stage] = totalStages > 0 ? Math.round((count / totalStages) * 100) : 0;
            }

            return {
                totalCalls: calls.length,
                strengths,
                weaknesses,
                objectionSuccessRate,
                stageConversion,
                improvementTrend,
                topStruggles: topStruggles.slice(0, 3)
            };
        } catch (err) {
            console.error('[DB] getRepAnalytics error:', err.message);
            return { totalCalls: 0, strengths: [], weaknesses: [], objectionSuccessRate: {}, stageConversion: {}, improvementTrend: {}, topStruggles: [] };
        }
    }

    async getObjectionAnalytics(organizationId, days = 60) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: calls, error } = await supabase
                .from('calls')
                .select('id, coaching_tips, summary_json, status')
                .eq('organization_id', organizationId)
                .eq('status', 'completed')
                .gte('created_at', since.toISOString())
                .limit(500);

            if (error || !calls || calls.length === 0) {
                return { objections: {} };
            }

            const objectionData = {};

            for (const call of calls) {
                const isSuccess = call.summary_json?.is_success === true;
                const tips = call.coaching_tips;
                if (!Array.isArray(tips)) continue;

                for (const tip of tips) {
                    const signals = tip.signals;
                    if (!signals?.objections || !Array.isArray(signals.objections)) continue;

                    const battleCard = tip.battle_card;
                    const battleResponse = (battleCard?.triggered && battleCard?.response) ? battleCard.response : null;

                    for (const obj of signals.objections) {
                        const type = this.classifyObjection(obj.text);
                        if (!objectionData[type]) {
                            objectionData[type] = { count: 0, handled: 0, successWhenHandled: 0, successWhenOpen: 0, handledSuccessCount: 0, openCount: 0, responses: {} };
                        }

                        const d = objectionData[type];
                        d.count++;

                        if (obj.status === 'handled') {
                            d.handled++;
                            if (isSuccess) d.successWhenHandled++;
                            d.handledSuccessCount++;
                        } else {
                            d.openCount++;
                            if (isSuccess) d.successWhenOpen++;
                        }

                        if (battleResponse && obj.status === 'handled') {
                            const key = battleResponse.substring(0, 60);
                            if (!d.responses[key]) d.responses[key] = { response: battleResponse, total: 0, success: 0 };
                            d.responses[key].total++;
                            if (isSuccess) d.responses[key].success++;
                        }
                    }
                }
            }

            const result = {};
            for (const [type, data] of Object.entries(objectionData)) {
                const handledRate = data.count > 0 ? data.handled / data.count : 0;
                const successHandled = data.handledSuccessCount > 0 ? data.successWhenHandled / data.handledSuccessCount : 0;
                const successOpen = data.openCount > 0 ? data.successWhenOpen / data.openCount : 0;

                const topResponses = Object.values(data.responses)
                    .filter(r => r.total >= 2)
                    .map(r => ({ response: r.response, successRate: r.total > 0 ? r.success / r.total : 0 }))
                    .sort((a, b) => b.successRate - a.successRate)
                    .slice(0, 3);

                result[type] = {
                    count: data.count,
                    handledRate: Number(handledRate.toFixed(2)),
                    successWhenHandled: Number(successHandled.toFixed(2)),
                    successWhenOpen: Number(successOpen.toFixed(2)),
                    topResponses
                };
            }

            return { objections: result };
        } catch (err) {
            console.error('[DB] getObjectionAnalytics error:', err.message);
            return { objections: {} };
        }
    }

    classifyObjection(text) {
        if (!text) return 'other';
        const lower = text.toLowerCase();
        if (lower.includes('יקר') || lower.includes('מחיר') || lower.includes('תקציב') || lower.includes('עלות') || lower.includes('כסף')) return 'price';
        if (lower.includes('זמן') || lower.includes('עכשיו') || lower.includes('מאוחר') || lower.includes('עתיד') || lower.includes('אחרי')) return 'timing';
        if (lower.includes('מתחר') || lower.includes('כבר יש') || lower.includes('עובדים עם') || lower.includes('ספק')) return 'competition';
        if (lower.includes('חשוב') || lower.includes('התייעץ') || lower.includes('לחשוב') || lower.includes('שותף')) return 'decision';
        if (lower.includes('לא רלוונטי') || lower.includes('לא מעניין') || lower.includes('לא צריך')) return 'need';
        return 'other';
    }

    async getOrgMinutes(organizationId, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: calls, error } = await supabase
                .from('calls')
                .select('duration, created_at')
                .eq('organization_id', organizationId)
                .gte('created_at', since.toISOString());

            if (error) {
                console.error('[DB] getOrgMinutes error:', error.message);
                return { totalMinutes: 0, totalCalls: 0, avgDuration: 0 };
            }

            const totalSeconds = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
            const totalMinutes = Math.round(totalSeconds / 60);
            const avgDuration = calls.length > 0 ? Math.round(totalSeconds / calls.length) : 0;

            return {
                totalMinutes,
                totalCalls: calls.length,
                avgDuration,
                periodDays: days
            };
        } catch (err) {
            console.error('[DB] getOrgMinutes error:', err.message);
            return { totalMinutes: 0, totalCalls: 0, avgDuration: 0 };
        }
    }

    async getRepMinutes(agentId, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: calls, error } = await supabase
                .from('calls')
                .select('duration, created_at')
                .eq('agent_id', agentId)
                .gte('created_at', since.toISOString());

            if (error) {
                console.error('[DB] getRepMinutes error:', error.message);
                return { totalMinutes: 0, totalCalls: 0, avgDuration: 0 };
            }

            const totalSeconds = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
            const totalMinutes = Math.round(totalSeconds / 60);
            const avgDuration = calls.length > 0 ? Math.round(totalSeconds / calls.length) : 0;

            return {
                totalMinutes,
                totalCalls: calls.length,
                avgDuration,
                periodDays: days
            };
        } catch (err) {
            console.error('[DB] getRepMinutes error:', err.message);
            return { totalMinutes: 0, totalCalls: 0, avgDuration: 0 };
        }
    }

    /**
     * Get aggregated signals analytics across all calls for an organization
     * This helps identify common pains, objections, gaps across all customers
     * @param {string} organizationId 
     * @param {number} days - How many days back to analyze
     * @returns {Object} Aggregated signals with frequency counts
     */
    async getSignalsAnalytics(organizationId, days = 60) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: calls, error } = await supabase
                .from('calls')
                .select('id, accumulated_signals, summary_json, created_at')
                .eq('organization_id', organizationId)
                .eq('status', 'completed')
                .gte('created_at', since.toISOString())
                .limit(1000);

            if (error || !calls || calls.length === 0) {
                return {
                    topPains: [],
                    topObjections: [],
                    topGaps: [],
                    topVisions: [],
                    totalCalls: 0
                };
            }

            // Aggregate all signals with frequency counts
            const painsMap = new Map();
            const objectionsMap = new Map();
            const gapsMap = new Map();
            const visionsMap = new Map();

            calls.forEach(call => {
                const signals = call.accumulated_signals;
                if (!signals) return;

                // Count pains
                (signals.pains || []).forEach(pain => {
                    const text = pain.text?.toLowerCase().trim();
                    if (text) {
                        const existing = painsMap.get(text) || { text: pain.text, count: 0, severity: pain.severity || 'medium' };
                        existing.count++;
                        painsMap.set(text, existing);
                    }
                });

                // Count objections
                (signals.objections || []).forEach(obj => {
                    const text = obj.text?.toLowerCase().trim();
                    if (text) {
                        const existing = objectionsMap.get(text) || { text: obj.text, count: 0, handledCount: 0 };
                        existing.count++;
                        if (obj.status === 'handled') existing.handledCount++;
                        objectionsMap.set(text, existing);
                    }
                });

                // Count gaps
                (signals.gaps || []).forEach(gap => {
                    const text = gap.text?.toLowerCase().trim();
                    if (text) {
                        const existing = gapsMap.get(text) || { text: gap.text, count: 0 };
                        existing.count++;
                        gapsMap.set(text, existing);
                    }
                });

                // Count visions
                (signals.vision || []).forEach(vision => {
                    const text = vision.text?.toLowerCase().trim();
                    if (text) {
                        const existing = visionsMap.get(text) || { text: vision.text, count: 0 };
                        existing.count++;
                        visionsMap.set(text, existing);
                    }
                });
            });

            // Sort by frequency and get top items
            const sortByCount = (a, b) => b.count - a.count;

            const topPains = Array.from(painsMap.values())
                .sort(sortByCount)
                .slice(0, 10);

            const topObjections = Array.from(objectionsMap.values())
                .map(obj => ({
                    ...obj,
                    handleRate: obj.count > 0 ? Math.round((obj.handledCount / obj.count) * 100) : 0
                }))
                .sort(sortByCount)
                .slice(0, 10);

            const topGaps = Array.from(gapsMap.values())
                .sort(sortByCount)
                .slice(0, 10);

            const topVisions = Array.from(visionsMap.values())
                .sort(sortByCount)
                .slice(0, 10);

            return {
                topPains,
                topObjections,
                topGaps,
                topVisions,
                totalCalls: calls.length,
                periodDays: days
            };
        } catch (err) {
            console.error('[DB] getSignalsAnalytics error:', err.message);
            return {
                topPains: [],
                topObjections: [],
                topGaps: [],
                topVisions: [],
                totalCalls: 0
            };
        }
    }
}

module.exports = new DBService();
