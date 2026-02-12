const supabase = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

/**
 * Lead Activities & Status Handler
 * POST /api/leads/:id/status - Update lead status + create activity
 * GET /api/activities/recent - Get recent activities
 */
async function leadsHandler(fastify, options) {
    
    // Auth helper
    async function getAuthUser(request, reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            reply.code(401).send({ error: 'Unauthorized' });
            return null;
        }
        const token = authHeader.split(' ')[1];
        const supabaseAuth = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
        );
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
        if (error || !user) {
            reply.code(401).send({ error: 'Unauthorized' });
            return null;
        }
        const { data: profile } = await supabaseAuth
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
        return { user, profile };
    }

    // ========================================
    // GET /api/leads/smart-queue
    // Get prioritized calling queue
    // ========================================
    fastify.get('/api/leads/smart-queue', async (request, reply) => {
        const auth = await getAuthUser(request, reply);
        if (!auth) return;

        const organizationId = auth.profile?.organization_id;
        if (!organizationId) {
            return reply.status(403).send({ error: 'No organization assigned' });
        }

        console.log('[SmartQueue] Fetching for org:', organizationId);

        try {
            // Fetch open leads for the org
            const { data: leads, error } = await supabase
                .from('leads')
                .select('id, name, phone, company, status, priority, source, created_at, follow_up_at, score, last_activity_at')
                .eq('organization_id', organizationId)
                .neq('status', 'Closed')
                .neq('status', 'Lost')
                .order('follow_up_at', { ascending: true, nullsFirst: false })
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[SmartQueue] Fetch failed:', error);
                return reply.status(500).send({ error: 'Failed to fetch queue' });
            }

            console.log(`[SmartQueue] Found ${leads?.length || 0} leads`);

            return reply.send({
                success: true,
                queue: leads || []
            });

        } catch (err) {
            console.error('[SmartQueue] Error:', err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ========================================
    // POST /api/leads/:id/status
    // Update lead status and create activity log
    // ========================================
    fastify.post('/api/leads/:id/status', async (request, reply) => {
        const auth = await getAuthUser(request, reply);
        if (!auth) return;

        const userOrgId = auth.profile?.organization_id;
        if (!userOrgId) {
            return reply.status(403).send({ error: 'No organization assigned' });
        }

        const { id: leadId } = request.params;
        const { status, followUpAt, notes, callSessionId, summaryJson, dealAmount } = request.body;

        console.log('[LeadStatus] Updating:', { leadId, status, followUpAt, callSessionId, dealAmount, userId: auth.user.id });

        if (!leadId || !status) {
            return reply.status(400).send({ error: 'Missing leadId or status' });
        }

        try {
            // 1. Get lead to retrieve org_id AND verify ownership
            const { data: lead, error: leadError } = await supabase
                .from('leads')
                .select('id, org_id, name')
                .eq('id', leadId)
                .single();

            if (leadError || !lead) {
                console.error('[LeadStatus] Lead not found:', leadError);
                return reply.status(404).send({ error: 'Lead not found' });
            }

            // 2. Verify lead belongs to user's organization
            if (lead.org_id !== userOrgId) {
                console.error(`[LeadStatus] IDOR attempt: user org=${userOrgId}, lead org=${lead.org_id}`);
                return reply.status(403).send({ error: 'Forbidden' });
            }

            // --- DIRECT SERVICE ROLE OPERATIONS (bypass RLS) ---

            // 3. Map status to DB format
            const dbStatus = status === 'not_relevant' ? 'Lost'
                : status === 'follow_up' ? 'Negotiation'
                    : status === 'deal_closed' ? 'Closed'
                        : status;

            // 4. Update Lead
            const updateData = {
                status: dbStatus,
                last_activity_at: new Date().toISOString()
            };

            if (status === 'follow_up' && followUpAt) {
                updateData.follow_up_at = followUpAt;
                updateData.follow_up_notes = notes || null;
            }

            if (status === 'not_relevant' && notes) {
                updateData.lost_reason = notes;
            }

            if (summaryJson) {
                updateData.last_call_summary = summaryJson;
            }

            // Update deal value if provided (from AI or manual input)
            if (dealAmount !== null && dealAmount !== undefined && typeof dealAmount === 'number' && dealAmount > 0) {
                updateData.value = dealAmount;
                console.log('[LeadStatus] Updating deal value:', dealAmount);
            }

            const { error: updateError } = await supabase
                .from('leads')
                .update(updateData)
                .eq('id', leadId);

            if (updateError) {
                console.error('[LeadStatus] Update failed:', updateError);
                return reply.status(500).send({ error: 'Failed to update lead', details: updateError.message });
            }

            console.log('[LeadStatus] Lead updated successfully');

            // 5. Create Activity Record
            const { error: activityError } = await supabase
                .from('lead_activities')
                .insert({
                    id: uuidv4(),
                    lead_id: leadId,
                    org_id: lead.org_id,
                    type: status,
                    data: {
                        followUpAt: followUpAt || null,
                        notes: notes || null,
                        callSessionId: callSessionId || null,
                        summaryJson: summaryJson || null
                    },
                    call_session_id: callSessionId || null,
                    created_at: new Date().toISOString()
                });

            if (activityError) {
                console.error('[Activity] Insert failed:', activityError);
                // Don't fail the request, just log
            } else {
                console.log('[Activity] Created successfully');
            }

            // 6. Create Task if follow_up with date
            let taskId = null;
            if (status === 'follow_up' && followUpAt) {
                // Get lead owner for task assignment
                const { data: leadFull } = await supabase
                    .from('leads')
                    .select('owner_id')
                    .eq('id', leadId)
                    .single();

                let ownerId = leadFull?.owner_id;

                // If no owner, find any user in the org
                if (!ownerId) {
                    const { data: fallbackUser } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('organization_id', lead.org_id)
                        .limit(1)
                        .single();
                    ownerId = fallbackUser?.id;
                }

                if (ownerId) {
                    const followUpDate = new Date(followUpAt);
                    const { data: task, error: taskError } = await supabase
                        .from('tasks')
                        .insert({
                            id: uuidv4(),
                            owner_id: ownerId,
                            lead_id: leadId,
                            organization_id: lead.org_id,
                            title: notes ? `המשך טיפול: ${notes.substring(0, 30)}${notes.length > 30 ? '...' : ''}` : 'שיחת המשך טיפול',
                            type: 'call',
                            status: 'open',
                            priority: 'high',
                            due_date: followUpAt,  // Full timestamp
                            notes: notes || null,
                            ai_reason: 'נוצר אוטומטית מסיכום שיחה',
                            completed: false
                        })
                        .select('id')
                        .single();

                    if (taskError) {
                        console.error('[Task] Creation failed:', taskError);
                    } else {
                        console.log('[Task] Created successfully:', task?.id);
                        taskId = task?.id;
                    }
                } else {
                    console.warn('[Task] No owner found, skipping task creation');
                }
            }

            return reply.send({
                success: true,
                message: 'Lead status updated',
                leadId,
                status,
                taskId
            });

        } catch (err) {
            console.error('[LeadStatus] Error:', err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ========================================
    // GET /api/activities/recent
    // Get recent activities for sidebar
    // ========================================
    fastify.get('/api/activities/recent', async (request, reply) => {
        const auth = await getAuthUser(request, reply);
        if (!auth) return;

        const organizationId = auth.profile?.organization_id;
        if (!organizationId) {
            return reply.status(403).send({ error: 'No organization assigned' });
        }

        const limit = Math.min(parseInt(request.query.limit, 10) || 10, 100);

        try {
            const { data, error } = await supabase
                .from('lead_activities')
                .select(`
                    id,
                    lead_id,
                    type,
                    data,
                    created_at,
                    leads (
                        id,
                        name,
                        phone,
                        source
                    )
                `)
                .eq('org_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[Activities] Fetch failed:', error);
                return reply.status(500).send({ error: 'Failed to fetch activities' });
            }

            return reply.send({
                success: true,
                activities: data || []
            });

        } catch (err) {
            console.error('[Activities] Error:', err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // ========================================
    // GET /api/leads/:id/history
    // Get full activity history for a lead
    // ========================================
    fastify.get('/api/leads/:id/history', async (request, reply) => {
        const { id: leadId } = request.params;

        try {
            const { data, error } = await supabase
                .from('lead_activities')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[LeadHistory] Fetch failed:', error);
                return reply.status(500).send({ error: 'Failed to fetch history' });
            }

            return reply.send({
                success: true,
                history: data || []
            });

        } catch (err) {
            console.error('[LeadHistory] Error:', err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // ========================================
    // POST /api/leads/:id/ai-score
    // Analyze lead with AI and update score
    // ========================================
    fastify.post('/api/leads/:id/ai-score', async (request, reply) => {
        const { id: leadId } = request.params;
        const AiScoreService = require('../services/ai-score-service');

        try {
            // 1. Fetch Lead Data
            const { data: lead, error: leadError } = await supabase
                .from('leads')
                .select('*')
                .eq('id', leadId)
                .single();

            if (leadError || !lead) {
                return reply.code(404).send({ error: 'Lead not found' });
            }

            // 2. Fetch History (Last 10 activities)
            const { data: history } = await supabase
                .from('lead_activities')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(10);

            // 3. Fetch Calls Context (Transcripts & Summaries)
            const { data: calls } = await supabase
                .from('calls')
                .select(`
                    *,
                    call_summaries (
                        summary_text,
                        ai_feedback,
                        sentiment,
                        key_points
                    )
                `)
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(5); // Last 5 calls

            // Extract summaries efficiently
            const summaries = calls?.map(c => c.call_summaries?.[0]).filter(Boolean) || [];

            // 4. Generate AI Score with Deep Context
            const analysis = await AiScoreService.generateLeadScore(lead, history, calls || [], summaries);

            if (!analysis.success) {
                return reply.code(500).send({ error: analysis.error || 'AI Analysis Failed' });
            }

            // 5. Update Lead in DB using RPC function that bypasses org trigger
            const scoreDetails = {
                fit: analysis.fit,
                activity: analysis.activity,
                intent: analysis.intent,
                reasoning: analysis.reasoning,
                recommendations: analysis.recommendations,
                generatedAt: new Date().toISOString()
            };

            const { error: updateError } = await supabase.rpc('update_lead_score', {
                p_lead_id: leadId,
                p_score: analysis.score,
                p_score_details: scoreDetails
            });

            if (updateError) {
                console.error('Failed to update lead score in DB:', updateError);
                // We still return the analysis to the user, but log the error
            }

            return {
                ...lead,
                score: analysis.score,
                scoreDetails: {
                    fit: analysis.fit,
                    activity: analysis.activity,
                    intent: analysis.intent,
                    reasoning: analysis.reasoning,
                    recommendations: analysis.recommendations,
                    generatedAt: new Date().toISOString()
                }
            };


        } catch (err) {
            console.error('[AI Score] Error:', err);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

}

// Helper to map frontend status to DB status values
function mapStatusToDbStatus(status) {
    // Maps call outcome to lead status (matches Kanban stages)
    const mapping = {
        'deal_closed': 'Closed',    // Lead closed successfully
        'follow_up': 'Negotiation', // Continue follow-up
        'not_relevant': 'Lost'      // Mark as lost/not relevant
    };
    return mapping[status] || status;
}

module.exports = leadsHandler;
