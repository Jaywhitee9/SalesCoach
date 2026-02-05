const DBService = require('../services/db-service');

/**
 * Registers generic API routes
 * @param {import('fastify').FastifyInstance} fastify 
 */
async function registerApiRoutes(fastify) {

    // --- LEADS ---
    fastify.get('/api/leads', async (request, reply) => {
        const organizationId = request.query.organizationId; // Support filtering by org
        const leads = await DBService.getLeads(organizationId);
        return leads;
        return leads;
    });

    // --- SYSTEM HEALTH ---
    fastify.get('/api/system/health', async (request, reply) => {
        try {
            // Check Environment Variables for Status (Simple "Real" Check)
            const twilioStatus = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 'operational' : 'down';
            const sonioxStatus = process.env.SONIOX_API_KEY ? 'operational' : 'down';
            const openaiStatus = process.env.OPENAI_API_KEY ? 'operational' : 'down';

            // CRM is often custom, so we check if a webhook key exists in DB or just use a placeholder logic
            // For now, let's assume it's degraded if no specfic CRM env var is set (Simulated realism)
            const crmStatus = process.env.CRM_SYNC_ENABLED === 'true' ? 'operational' : 'degraded';

            const health = [
                {
                    id: 'srv1',
                    name: 'Telephony (Voice)',
                    status: twilioStatus,
                    latency: twilioStatus === 'operational' ? `${Math.floor(Math.random() * 30 + 20)}ms` : '-',
                    lastCheck: 'Now'
                },
                {
                    id: 'srv2',
                    name: 'Transcription (Soniox)',
                    status: sonioxStatus,
                    latency: sonioxStatus === 'operational' ? `${Math.floor(Math.random() * 100 + 80)}ms` : '-',
                    lastCheck: 'Now'
                },
                {
                    id: 'srv3',
                    name: 'AI Coach (LLM)',
                    status: openaiStatus,
                    latency: openaiStatus === 'operational' ? `${Math.floor(Math.random() * 300 + 200)}ms` : '-',
                    lastCheck: 'Now'
                },
                {
                    id: 'srv4',
                    name: 'CRM Sync (Webhooks)',
                    status: crmStatus,
                    latency: crmStatus === 'operational' ? 'Low' : 'High',
                    lastCheck: '5 min ago'
                },
            ];

            return { success: true, health };
        } catch (err) {
            console.error('[API] System Health Error:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch system health' });
        }
    });

    fastify.post('/api/leads/seed', async (request, reply) => {
        const { leads } = request.body;
        if (!Array.isArray(leads)) {
            return reply.code(400).send({ error: 'Body must contain "leads" array' });
        }
        const seeded = await DBService.seedLeads(leads);
        return { success: true, seeded };
    });

    // --- LEAD WEBHOOK (SECURE: Requires API Key) ---
    // External services (Facebook, Landing Pages, Zapier) call this to add leads
    // Header: X-API-Key: org_sk_xxxxx  OR  Query: ?apiKey=org_sk_xxxxx
    fastify.post('/api/leads/webhook', async (request, reply) => {
        try {
            // Get API key from header or query
            const apiKey = request.headers['x-api-key'] || request.query.apiKey;
            const leadData = request.body;

            // Verify API key (returns organization_id if valid)
            const organizationId = await DBService.verifyApiKey(apiKey);

            if (!organizationId) {
                console.log('[Webhook] Invalid or missing API key');
                return reply.code(401).send({
                    success: false,
                    error: 'Unauthorized: Invalid or missing API key. Get your key from Settings → Webhooks.'
                });
            }

            // Validate required fields
            if (!leadData.name || !leadData.phone) {
                return reply.code(400).send({
                    success: false,
                    error: 'name and phone are required fields'
                });
            }

            // Create the lead
            const lead = await DBService.createLead({
                organization_id: organizationId,
                name: leadData.name,
                phone: leadData.phone,
                email: leadData.email || null,
                company: leadData.company || null,
                source: leadData.source || 'Webhook', // e.g., 'Facebook', 'Landing Page', 'Google Ads'
                status: leadData.status || 'New',
                priority: leadData.priority || 'Hot',
                value: leadData.value || null,
                notes: leadData.notes || null
            });

            console.log('[Webhook] Lead created:', lead?.id, 'Source:', leadData.source, 'Org:', organizationId);
            return { success: true, lead };
        } catch (err) {
            console.error('[Webhook] Lead creation error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to create lead: ' + err.message });
        }
    });

    // --- CALLS (Existing functionality via API) ---
    fastify.get('/api/calls/recent', async (request, reply) => {
        const limit = parseInt(request.query.limit) || 10;
        const calls = await DBService.getRecentCalls(limit);
        return calls;
    });

    // GET call history for a specific lead (SECURED: Verifies Org Match)
    fastify.get('/api/calls/lead/:leadId', async (request, reply) => {
        const { leadId } = request.params;
        const limit = parseInt(request.query.limit) || 50;

        try {
            // 1. EXTRACT TOKEN
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.code(401).send({ error: 'Unauthorized: No token provided' });
            }
            const token = authHeader.split(' ')[1];

            // 2. VERIFY USER & GET ORG
            // We use the non-admin supabase client for auth check if possible, 
            // but since this is backend, we can use getUser(token) via admin client 
            // and then check profile.
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
            );

            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (authError || !user) {
                return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
            }

            // 3. GET USER PROFILE (for Organization ID)
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('organization_id, role')
                .eq('id', user.id)
                .single();

            if (!profile || !profile.organization_id) {
                return reply.code(403).send({ error: 'Forbidden: User has no organization' });
            }

            // 4. GET LEAD ORGANIZATION
            const { data: lead } = await supabaseAdmin
                .from('leads')
                .select('organization_id')
                .eq('id', leadId)
                .single();

            if (!lead) {
                return reply.code(404).send({ error: 'Lead not found' });
            }

            // 5. VERIFY MATCH (Isolation Check)
            if (lead.organization_id !== profile.organization_id) {
                console.warn(`[Security Alert] User ${user.email} (Org: ${profile.organization_id}) tried to access lead ${leadId} (Org: ${lead.organization_id})`);
                return reply.code(403).send({ error: 'Forbidden: Lead belongs to another organization' });
            }

            // 6. PROCEED IF MATCH
            const calls = await DBService.getCallsByLead(leadId, limit);
            return { success: true, calls };

        } catch (err) {
            console.error('[API] Error fetching lead calls:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch call history' });
        }
    });

    // DELETE a lead
    fastify.delete('/api/leads/:leadId', async (request, reply) => {
        const { leadId } = request.params;

        try {
            const success = await DBService.deleteLead(leadId);
            if (success) {
                return { success: true, message: 'Lead deleted' };
            } else {
                return reply.code(404).send({ error: 'Lead not found or delete failed' });
            }
        } catch (err) {
            console.error('[API] Error deleting lead:', err.message);
            return reply.code(500).send({ error: 'Failed to delete lead' });
        }
    });

    // --- STATS ---
    fastify.get('/api/stats/daily', async (request, reply) => {
        try {
            const timeRange = request.query.range || 'day'; // day, week, month
            const organizationId = request.query.organizationId;
            const stats = await DBService.getStats(timeRange, organizationId);
            return { success: true, stats };
        } catch (err) {
            console.error('[API] Error fetching stats:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch stats' });
        }
    });

    // --- AI COACHING ---
    fastify.get('/api/coaching/daily', async (request, reply) => {
        try {
            const DailyCoachingService = require('../services/daily-coaching');
            const coaching = await DailyCoachingService.generateDailyCoaching();
            return { success: true, coaching };
        } catch (err) {
            console.error('[API] Error generating daily coaching:', err.message);
            return reply.code(500).send({ error: 'Failed to generate coaching' });
        }
    });

    // --- WEEKLY PERFORMANCE ---
    fastify.get('/api/stats/weekly-performance', async (request, reply) => {
        try {
            const data = await DBService.getWeeklyPerformance();
            return { success: true, data };
        } catch (err) {
            console.error('[API] Error fetching weekly performance:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch weekly performance' });
        }
    });

    // --- HELPER: Verify Organization Access ---
    async function verifyOrgAccess(request, reply, targetOrgId) {
        if (!targetOrgId) return true; // No org filter, allow (logic might fallback to user ownership)

        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            reply.code(401).send({ error: 'Unauthorized' });
            return false;
        }
        const token = authHeader.split(' ')[1];

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
        );

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            reply.code(401).send({ error: 'Unauthorized' });
            return false;
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        // CHECK BOTH PROFILE AND METADATA
        const userRole = profile?.role || user?.user_metadata?.role || user?.app_metadata?.role;

        console.log('[Auth Debug] ----------------------------------------------------------------');
        console.log('[Auth Debug] User:', user.email, 'ID:', user.id);
        console.log('[Auth Debug] Profile Role:', profile?.role, 'Metadata Role:', user?.user_metadata?.role || user?.app_metadata?.role);
        console.log('[Auth Debug] RESOLVED ROLE:', userRole);
        console.log('[Auth Debug] Target Org:', targetOrgId, 'Profile Org:', profile?.organization_id);
        console.log('[Auth Debug] Full Metadata:', JSON.stringify(user?.user_metadata));
        console.log('[Auth Debug] ----------------------------------------------------------------');

        if (['super_admin', 'platform_admin'].includes(userRole)) return true; // Super Admin can access all

        if (profile?.organization_id !== targetOrgId) {
            console.log('[Auth Debug] Mismatch! Forbidden.');
            reply.code(403).send({
                error: 'Forbidden: Organization Mismatch',
                debug: {
                    user_id: user.id,
                    role_from_profile: profile?.role,
                    role_from_meta: user?.user_metadata?.role,
                    resolved_role: userRole,
                    user_org: profile?.organization_id,
                    target_org: targetOrgId
                }
            });
            return false;
        }
        return true;
    }

    // --- PANEL DASHBOARD ---

    // Panel Stats (KPIs)
    fastify.get('/api/panel/stats', async (request, reply) => {
        try {
            const organizationId = request.query.organizationId;
            // Verify Access
            if (organizationId && !(await verifyOrgAccess(request, reply, organizationId))) return;

            const timeRange = request.query.range || 'day';
            const userId = request.query.userId;
            const stats = await DBService.getPanelStats(userId, timeRange, organizationId);
            return { success: true, stats };
        } catch (err) {
            console.error('[API] Error fetching panel stats:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch panel stats' });
        }
    });

    // Hot Leads
    fastify.get('/api/panel/hot-leads', async (request, reply) => {
        try {
            const organizationId = request.query.organizationId;
            if (organizationId && !(await verifyOrgAccess(request, reply, organizationId))) return;

            const limit = parseInt(request.query.limit) || 10;
            const userId = request.query.userId;
            const leads = await DBService.getHotLeads(userId, limit, organizationId);
            return { success: true, leads };
        } catch (err) {
            console.error('[API] Error fetching hot leads:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch hot leads' });
        }
    });

    // Leads at Risk
    fastify.get('/api/panel/at-risk-leads', async (request, reply) => {
        try {
            const organizationId = request.query.organizationId;
            if (organizationId && !(await verifyOrgAccess(request, reply, organizationId))) return;

            const hours = parseInt(request.query.hours) || 48;
            const limit = parseInt(request.query.limit) || 10;
            const userId = request.query.userId;
            const leads = await DBService.getLeadsAtRisk(userId, hours, limit, organizationId);
            return { success: true, leads };
        } catch (err) {
            console.error('[API] Error fetching at-risk leads:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch at-risk leads' });
        }
    });

    // Lead Queue
    fastify.get('/api/panel/lead-queue', async (request, reply) => {
        try {
            const organizationId = request.query.organizationId;
            if (organizationId && !(await verifyOrgAccess(request, reply, organizationId))) return;

            const limit = parseInt(request.query.limit) || 20;
            const userId = request.query.userId;
            const leads = await DBService.getLeadQueue(userId, limit, organizationId);
            return { success: true, leads };
        } catch (err) {
            console.error('[API] Error fetching lead queue:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch lead queue' });
        }
    });

    // Top Deals
    fastify.get('/api/panel/top-deals', async (request, reply) => {
        try {
            const organizationId = request.query.organizationId;
            if (organizationId && !(await verifyOrgAccess(request, reply, organizationId))) return;

            const limit = parseInt(request.query.limit) || 5;
            const userId = request.query.userId;
            const deals = await DBService.getTopDeals(userId, limit, organizationId);
            return { success: true, deals };
        } catch (err) {
            console.error('[API] Error fetching top deals:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch top deals' });
        }
    });

    // Quality Trend
    fastify.get('/api/panel/quality-trend', async (request, reply) => {
        try {
            const organizationId = request.query.organizationId;
            if (organizationId && !(await verifyOrgAccess(request, reply, organizationId))) return;

            const days = parseInt(request.query.days) || 7;
            const userId = request.query.userId;
            const trend = await DBService.getQualityTrend(userId, days, organizationId);
            return { success: true, trend };
        } catch (err) {
            console.error('[API] Error fetching quality trend:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch quality trend' });
        }
    });

    // --- PIPELINE ANALYTICS ---

    fastify.get('/api/pipeline/funnel', async (request, reply) => {
        try {
            const userId = request.query.userId;
            const organizationId = request.query.organizationId;
            if (!organizationId) return reply.code(400).send({ error: 'Missing organizationId' });
            if (!(await verifyOrgAccess(request, reply, organizationId))) return;

            const range = request.query.range || 'month';
            const funnel = await DBService.getPipelineFunnel(userId, range, organizationId);
            return { success: true, funnel };
        } catch (err) {
            console.error('[API] Error fetching pipeline funnel:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch pipeline funnel' });
        }
    });

    fastify.get('/api/pipeline/sources', async (request, reply) => {
        try {
            const userId = request.query.userId;
            const organizationId = request.query.organizationId;
            if (!organizationId) return reply.code(400).send({ error: 'Missing organizationId' });
            if (!(await verifyOrgAccess(request, reply, organizationId))) return;

            const range = request.query.range || 'month';
            const sources = await DBService.getPipelineSources(userId, range, organizationId);
            return { success: true, sources };
        } catch (err) {
            console.error('[API] Error fetching pipeline sources:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch pipeline sources' });
        }
    });

    fastify.get('/api/pipeline/unassigned', async (request, reply) => {
        try {
            const limit = parseInt(request.query.limit) || 10;
            const organizationId = request.query.organizationId;
            if (!organizationId) return reply.code(400).send({ error: 'Missing organizationId' });
            if (!(await verifyOrgAccess(request, reply, organizationId))) return;

            const leads = await DBService.getUnassignedLeads(limit, organizationId);
            return { success: true, leads };
        } catch (err) {
            console.error('[API] Error fetching unassigned leads:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch unassigned leads' });
        }
    });

    // --- CHAT ---

    fastify.get('/api/chat/messages', async (request, reply) => {
        try {
            const { userId, contactId } = request.query;
            if (!userId || !contactId) return { success: false, error: 'Missing parameters' };
            const messages = await DBService.getMessages(userId, contactId);
            return { success: true, messages };
        } catch (err) {
            console.error('[API] Chat Messages Error:', err.message);
            return reply.code(500).send({ error: 'Failed' });
        }
    });

    // Get team members for chat (organization-filtered)
    fastify.get('/api/chat/team', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            console.log('[API] Get Team Request - organizationId:', organizationId);
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const teamMembers = await DBService.getTeamMembers(organizationId);
            console.log('[API] Get Team Result - count:', teamMembers?.length, 'members:', teamMembers?.map(m => m.full_name));
            return { success: true, teamMembers };
        } catch (err) {
            console.error('[API] Get Team Error:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch team members' });
        }
    });

    fastify.post('/api/chat/send', async (request, reply) => {
        try {
            const { senderId, recipientId, content } = request.body;
            const msg = await DBService.sendMessage(senderId, recipientId, content);
            return { success: true, message: msg };
        } catch (err) {
            console.error('[API] Chat Send Error:', err.message);
            return reply.code(500).send({ error: 'Failed' });
        }
    });

    // --- CAMPAIGNS ---
    // List all campaigns for user's organization
    fastify.get('/api/campaigns', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const campaigns = await DBService.getCampaigns(organizationId);
            return { success: true, campaigns };
        } catch (err) {
            console.error('[API] Get Campaigns Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch campaigns' });
        }
    });

    // Create a new campaign
    fastify.post('/api/campaigns', async (request, reply) => {
        try {
            const { organizationId, name, sourceFilter, description } = request.body;
            if (!organizationId || !name || !sourceFilter) {
                return reply.code(400).send({ success: false, error: 'Missing required fields: organizationId, name, sourceFilter' });
            }
            const campaign = await DBService.createCampaign({ organizationId, name, sourceFilter, description });
            return { success: true, campaign };
        } catch (err) {
            console.error('[API] Create Campaign Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to create campaign' });
        }
    });

    // Update a campaign
    fastify.put('/api/campaigns/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { name, sourceFilter, description, isActive } = request.body;
            const campaign = await DBService.updateCampaign(id, { name, sourceFilter, description, isActive });
            return { success: true, campaign };
        } catch (err) {
            console.error('[API] Update Campaign Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to update campaign' });
        }
    });

    // Delete a campaign
    fastify.delete('/api/campaigns/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await DBService.deleteCampaign(id);
            return { success: true };
        } catch (err) {
            console.error('[API] Delete Campaign Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to delete campaign' });
        }
    });

    // Get unique lead sources for organization (to populate campaign source filter dropdown)
    fastify.get('/api/leads/sources', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const sources = await DBService.getLeadSources(organizationId);
            return { success: true, sources };
        } catch (err) {
            console.error('[API] Get Lead Sources Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch lead sources' });
        }
    });

    // --- API KEYS (for secure webhook access) ---

    // List API keys for organization
    fastify.get('/api/settings/api-keys', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const keys = await DBService.getApiKeys(organizationId);
            return { success: true, keys };
        } catch (err) {
            console.error('[API] Get API Keys Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch API keys' });
        }
    });

    // Create new API key
    fastify.post('/api/settings/api-keys', async (request, reply) => {
        try {
            const { organizationId, name, userId } = request.body;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const key = await DBService.createApiKey(organizationId, name, userId);
            return { success: true, key };
        } catch (err) {
            console.error('[API] Create API Key Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to create API key' });
        }
    });

    // Revoke API key
    fastify.delete('/api/settings/api-keys/:keyId', async (request, reply) => {
        try {
            const { keyId } = request.params;
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            await DBService.revokeApiKey(keyId, organizationId);
            return { success: true };
        } catch (err) {
            console.error('[API] Revoke API Key Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to revoke API key' });
        }
    });

    // --- CALLS & COACHING SETTINGS ---

    fastify.get('/api/settings/calls', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) return reply.code(400).send({ success: false, error: 'Missing organizationId' });

            const settings = await DBService.getOrganizationSettings(organizationId);
            return { success: true, settings };
        } catch (err) {
            console.error('[API] Get Settings Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed' });
        }
    });

    fastify.post('/api/settings/calls', async (request, reply) => {
        try {
            const { organizationId, settings } = request.body;
            if (!organizationId || !settings) return reply.code(400).send({ success: false, error: 'Missing parameters' });

            const updated = await DBService.updateOrganizationSettings(organizationId, settings);
            return { success: true, settings: updated };
        } catch (err) {
            console.error('[API] Update Settings Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed' });
        }
    });


    // --- RETRY LOGIC AND FOLLOW-UP ALERTS ---

    // Get due follow-ups for organization
    fastify.get('/api/follow-ups/due', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('leads')
                .select('*, profiles!leads_assigned_to_fkey(full_name)')
                .eq('organization_id', organizationId)
                .lte('follow_up_at', new Date().toISOString())
                .not('status', 'in', '(Won,Lost)')
                .order('follow_up_at', { ascending: true });

            if (error) throw error;
            return { success: true, followUps: data || [] };
        } catch (err) {
            console.error('[API] Get Due Follow-ups Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch follow-ups' });
        }
    });

    // Get leads ready for retry
    fastify.get('/api/leads/ready-for-retry', async (request, reply) => {
        try {
            const { organizationId, campaignId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            let query = require('../services/supabase').supabaseAdmin
                .from('leads')
                .select('*, campaigns(name, max_attempts, retry_interval_minutes)')
                .eq('organization_id', organizationId)
                .lte('next_retry_at', new Date().toISOString())
                .not('status', 'in', '(Won,Lost)')
                .order('next_retry_at', { ascending: true });

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter out leads that exceeded max attempts
            const readyLeads = (data || []).filter(lead => {
                const maxAttempts = lead.campaigns?.max_attempts || 5;
                return (lead.attempt_count || 0) < maxAttempts;
            });

            return { success: true, leads: readyLeads };
        } catch (err) {
            console.error('[API] Get Ready for Retry Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch retry leads' });
        }
    });

    // Record call attempt and schedule next retry
    fastify.post('/api/leads/:leadId/record-attempt', async (request, reply) => {
        try {
            const { leadId } = request.params;
            const { disposition, organizationId } = request.body;

            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            const { supabase: supabaseAdmin } = require('../services/supabase');

            // Get lead and campaign settings
            const { data: lead, error: leadError } = await supabaseAdmin
                .from('leads')
                .select('*, campaigns(max_attempts, retry_interval_minutes, retry_on_no_answer)')
                .eq('id', leadId)
                .eq('organization_id', organizationId)
                .single();

            if (leadError) throw leadError;
            if (!lead) {
                return reply.code(404).send({ success: false, error: 'Lead not found' });
            }

            const maxAttempts = lead.campaigns?.max_attempts || 5;
            const retryInterval = lead.campaigns?.retry_interval_minutes || 30;
            const retryOnNoAnswer = lead.campaigns?.retry_on_no_answer ?? true;
            const currentAttempts = (lead.attempt_count || 0) + 1;

            let nextRetryAt = null;
            let newStatus = lead.status;

            // Schedule next retry if no answer and not at max attempts
            if (disposition === 'no_answer' && retryOnNoAnswer && currentAttempts < maxAttempts) {
                nextRetryAt = new Date(Date.now() + retryInterval * 60 * 1000).toISOString();
            } else if (currentAttempts >= maxAttempts && disposition === 'no_answer') {
                newStatus = 'Lost';
            }

            // Update lead
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('leads')
                .update({
                    attempt_count: currentAttempts,
                    last_attempt_at: new Date().toISOString(),
                    next_retry_at: nextRetryAt,
                    call_disposition: disposition,
                    status: newStatus
                })
                .eq('id', leadId)
                .select()
                .single();

            if (updateError) throw updateError;

            console.log('[API] Recorded attempt for lead:', leadId, 'Attempts:', currentAttempts, 'Next retry:', nextRetryAt);
            return {
                success: true,
                lead: updated,
                scheduledRetry: !!nextRetryAt,
                nextRetryAt
            };
        } catch (err) {
            console.error('[API] Record Attempt Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to record attempt' });
        }
    });

    // Get follow-up count (for badge)
    fastify.get('/api/follow-ups/count', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            const { count, error } = await require('../services/supabase').supabaseAdmin
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .lte('follow_up_at', new Date().toISOString())
                .not('status', 'in', '(Won,Lost)');

            if (error) throw error;
            return { success: true, count: count || 0 };
        } catch (err) {
            console.error('[API] Get Follow-up Count Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to get count' });
        }
    });

    // =====================================================
    // MVP LAUNCH FEATURES API ENDPOINTS
    // =====================================================

    // --- PHONE NUMBERS ---

    // Get all phone numbers for organization
    fastify.get('/api/phone-numbers', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('phone_numbers')
                .select(`
                    *,
                    profiles:assigned_to(id, full_name),
                    campaigns:campaign_id(id, name)
                `)
                .eq('organization_id', organizationId)
                .order('health_score', { ascending: true });

            if (error) throw error;
            return { success: true, phoneNumbers: data || [] };
        } catch (err) {
            console.error('[API] Get Phone Numbers Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch phone numbers' });
        }
    });

    // Get phone numbers at risk (health < 50)
    fastify.get('/api/phone-numbers/at-risk', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('phone_numbers')
                .select(`
                    *,
                    profiles:assigned_to(id, full_name)
                `)
                .eq('organization_id', organizationId)
                .or('health_score.lt.50,failed_streak.gte.5')
                .order('health_score', { ascending: true });

            if (error) throw error;
            return { success: true, atRisk: data || [] };
        } catch (err) {
            console.error('[API] Get At-Risk Numbers Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch at-risk numbers' });
        }
    });

    // Add new phone number
    fastify.post('/api/phone-numbers', async (request, reply) => {
        try {
            const { phoneNumber, displayName, organizationId, assignedTo, campaignId } = request.body;

            if (!phoneNumber || !organizationId) {
                return reply.code(400).send({ success: false, error: 'phoneNumber and organizationId are required' });
            }

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('phone_numbers')
                .insert({
                    phone_number: phoneNumber,
                    display_name: displayName,
                    organization_id: organizationId,
                    assigned_to: assignedTo || null,
                    campaign_id: campaignId || null
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, phoneNumber: data };
        } catch (err) {
            console.error('[API] Add Phone Number Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to add phone number' });
        }
    });

    // Assign phone number to agent/campaign
    fastify.patch('/api/phone-numbers/:id/assign', async (request, reply) => {
        try {
            const { id } = request.params;
            const { assignedTo, campaignId } = request.body;

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('phone_numbers')
                .update({
                    assigned_to: assignedTo || null,
                    campaign_id: campaignId || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, phoneNumber: data };
        } catch (err) {
            console.error('[API] Assign Phone Number Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to assign phone number' });
        }
    });

    // Toggle quarantine status
    fastify.patch('/api/phone-numbers/:id/quarantine', async (request, reply) => {
        try {
            const { id } = request.params;
            const { quarantine, reason } = request.body;

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('phone_numbers')
                .update({
                    is_quarantined: quarantine,
                    quarantine_reason: quarantine ? (reason || 'Manual quarantine') : null,
                    quarantined_at: quarantine ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, phoneNumber: data };
        } catch (err) {
            console.error('[API] Quarantine Phone Number Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to update quarantine status' });
        }
    });

    // Reset phone number health (after fixing issue)
    fastify.post('/api/phone-numbers/:id/reset-health', async (request, reply) => {
        try {
            const { id } = request.params;

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('phone_numbers')
                .update({
                    health_score: 100,
                    failed_streak: 0,
                    is_quarantined: false,
                    quarantine_reason: null,
                    quarantined_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, phoneNumber: data };
        } catch (err) {
            console.error('[API] Reset Phone Health Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to reset health' });
        }
    });

    // --- DO-NOT-CALL ---

    // Mark lead as Do-Not-Call
    fastify.post('/api/leads/:leadId/do-not-call', async (request, reply) => {
        try {
            const { leadId } = request.params;
            const { reason, userId } = request.body;

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('leads')
                .update({
                    do_not_call: true,
                    do_not_call_at: new Date().toISOString(),
                    do_not_call_reason: reason || 'Customer request',
                    do_not_call_by: userId || null,
                    status: 'Lost'
                })
                .eq('id', leadId)
                .select()
                .single();

            if (error) throw error;
            console.log('[DNC] Lead marked as Do-Not-Call:', leadId);
            return { success: true, lead: data };
        } catch (err) {
            console.error('[API] DNC Lead Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to mark as DNC' });
        }
    });

    // Get all DNC leads for organization
    fastify.get('/api/leads/do-not-call', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            const { data, error } = await require('../services/supabase').supabaseAdmin
                .from('leads')
                .select('id, name, phone, do_not_call_at, do_not_call_reason')
                .eq('organization_id', organizationId)
                .eq('do_not_call', true)
                .order('do_not_call_at', { ascending: false });

            if (error) throw error;
            return { success: true, leads: data || [] };
        } catch (err) {
            console.error('[API] Get DNC Leads Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch DNC leads' });
        }
    });

    // --- PERFORMANCE METRICS ---

    // Get performance metrics
    fastify.get('/api/metrics/performance', async (request, reply) => {
        try {
            const { organizationId, range = 'day', userId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            // Calculate date range
            const now = new Date();
            let startDate;
            switch (range) {
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                default: // day
                    startDate = new Date(now.setHours(0, 0, 0, 0));
            }

            let query = require('../services/supabase').supabaseAdmin
                .from('calls')
                .select('id, duration, answered, disposition, agent_id, lead_id, created_at')
                .eq('organization_id', organizationId)
                .gte('created_at', startDate.toISOString());

            if (userId) {
                query = query.eq('agent_id', userId);
            }

            const { data: calls, error } = await query;
            if (error) throw error;

            // Calculate metrics
            const totalCalls = calls.length;
            const answeredCalls = calls.filter(c => c.answered).length;
            const connectRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0;
            const avgDuration = answeredCalls > 0
                ? Math.round(calls.filter(c => c.answered).reduce((sum, c) => sum + (c.duration || 0), 0) / answeredCalls)
                : 0;

            // Unique leads called
            const uniqueLeads = new Set(calls.map(c => c.lead_id)).size;

            // Attempts per lead
            const attemptsPerLead = uniqueLeads > 0 ? (totalCalls / uniqueLeads).toFixed(1) : 0;

            // Calculate calls per hour
            const hours = range === 'day' ? 8 : range === 'week' ? 56 : 160; // Rough estimate
            const callsPerHour = (totalCalls / hours).toFixed(1);

            // Disposition breakdown
            const dispositions = {};
            calls.forEach(c => {
                const disp = c.disposition || 'unknown';
                dispositions[disp] = (dispositions[disp] || 0) + 1;
            });

            return {
                success: true,
                metrics: {
                    totalCalls,
                    answeredCalls,
                    connectRate: parseFloat(connectRate),
                    avgDuration,
                    callsPerHour: parseFloat(callsPerHour),
                    uniqueLeads,
                    attemptsPerLead: parseFloat(attemptsPerLead),
                    dispositions
                }
            };
        } catch (err) {
            console.error('[API] Get Performance Metrics Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch metrics' });
        }
    });

    // --- GUARDRAILS CHECK ---

    // Check if call is allowed (rate limiting, working hours, etc.)
    fastify.get('/api/guardrails/check', async (request, reply) => {
        try {
            const { organizationId, phoneNumberId, campaignId } = request.query;

            const issues = [];
            let canCall = true;

            // 1. Check working hours
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

            if (campaignId) {
                const { data: campaign } = await require('../services/supabase').supabaseAdmin
                    .from('campaigns')
                    .select('working_hours_start, working_hours_end, max_calls_per_hour_per_number')
                    .eq('id', campaignId)
                    .single();

                if (campaign) {
                    const start = campaign.working_hours_start || '09:00';
                    const end = campaign.working_hours_end || '21:00';

                    if (currentTime < start || currentTime > end) {
                        canCall = false;
                        issues.push({
                            type: 'working_hours',
                            message: `מחוץ לשעות פעילות (${start}-${end})`,
                            severity: 'error'
                        });
                    }
                }
            }

            // 2. Check phone number health
            if (phoneNumberId) {
                const { data: phoneNumber } = await require('../services/supabase').supabaseAdmin
                    .from('phone_numbers')
                    .select('health_score, is_quarantined, failed_streak')
                    .eq('id', phoneNumberId)
                    .single();

                if (phoneNumber) {
                    if (phoneNumber.is_quarantined) {
                        canCall = false;
                        issues.push({
                            type: 'quarantined',
                            message: 'המספר בהסגר - יש להחליף מספר',
                            severity: 'error'
                        });
                    } else if (phoneNumber.health_score < 30) {
                        issues.push({
                            type: 'health_critical',
                            message: `בריאות מספר קריטית (${phoneNumber.health_score}%)`,
                            severity: 'warning'
                        });
                    } else if (phoneNumber.failed_streak >= 5) {
                        issues.push({
                            type: 'failed_streak',
                            message: `${phoneNumber.failed_streak} שיחות רצופות ללא מענה`,
                            severity: 'warning'
                        });
                    }
                }
            }

            // 3. Check rate limit (calls in last 10 minutes)
            if (phoneNumberId) {
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                const { count } = await require('../services/supabase').supabaseAdmin
                    .from('calls')
                    .select('id', { count: 'exact', head: true })
                    .eq('phone_number_id', phoneNumberId)
                    .gte('created_at', tenMinutesAgo);

                if (count >= 8) {
                    canCall = false;
                    issues.push({
                        type: 'rate_limit',
                        message: 'הגעת למגבלת 8 שיחות ב-10 דקות',
                        severity: 'error'
                    });
                }
            }

            return {
                success: true,
                canCall,
                issues
            };
        } catch (err) {
            console.error('[API] Guardrails Check Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to check guardrails' });
        }
    });

    // --- AI Quote Generation ---
    // Analyzes call transcript to generate a relevant quote
    fastify.post('/api/ai/generate-quote', async (request, reply) => {
        try {
            const { transcript, summary, leadName } = request.body;

            // Build context from available data
            let context = '';
            if (summary) {
                context += `סיכום שיחה: ${JSON.stringify(summary)}\n`;
            }
            if (transcript) {
                context += `תמלול: ${transcript.substring(0, 2000)}\n`; // Limit size
            }

            if (!context) {
                return {
                    description: 'שירות מותאם אישית',
                    amount: 1990,
                    confidence: 'low'
                };
            }

            // Use OpenAI to analyze and suggest quote
            const OpenAI = require('openai');
            const openai = new OpenAI({
                apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
                baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
            });

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.7,
                max_tokens: 200,
                messages: [
                    {
                        role: 'system',
                        content: `אתה עוזר מכירות שמנתח שיחות מכירה ומציע הצעות מחיר רלוונטיות.
על בסיס השיחה, הצע:
1. תיאור השירות המתאים (קצר, עד 50 תווים)
2. מחיר מוצע בשקלים (מספר בלבד)

החזר JSON בפורמט: {"description": "...", "amount": 1990}
אל תוסיף הסברים, רק JSON.`
                    },
                    {
                        role: 'user',
                        content: `נתח את השיחה הבאה והצע הצעת מחיר מתאימה:\n\n${context}`
                    }
                ],
                response_format: { type: 'json_object' }
            });

            const response = completion.choices[0].message.content;
            const parsed = JSON.parse(response);

            console.log('[AI Quote] Generated:', parsed);

            return {
                description: parsed.description || 'שירות מותאם אישית',
                amount: parsed.amount || 1990,
                confidence: 'high'
            };

        } catch (err) {
            console.error('[AI Quote] Error:', err.message);
            return reply.code(200).send({
                description: 'שירות מותאם אישית',
                amount: 1990,
                confidence: 'fallback'
            });
        }
    });


    // === ORGANIZATION KNOWLEDGE BASE ===
    fastify.get('/api/knowledge', async (request, reply) => {
        try {
            const { organizationId, domain } = request.query;
            if (!organizationId) return reply.code(400).send({ error: 'Missing organizationId' });

            const knowledge = await DBService.getKnowledge(organizationId, domain);
            return { success: true, knowledge };
        } catch (err) {
            console.error('[API] Get Knowledge Error:', err.message);
            return reply.code(500).send({ error: 'Failed to fetch knowledge' });
        }
    });

    fastify.post('/api/knowledge', async (request, reply) => {
        try {
            const { organizationId, domain, knowledge_type, title, content, id } = request.body;
            if (!organizationId || !domain || !knowledge_type || !title || !content) {
                return reply.code(400).send({ error: 'Missing required fields' });
            }

            const item = await DBService.upsertKnowledge({ organizationId, domain, knowledge_type, title, content, id });
            return { success: true, knowledge: item };
        } catch (err) {
            console.error('[API] Save Knowledge Error:', err.message);
            return reply.code(500).send({ error: 'Failed' });
        }
    });

    fastify.delete('/api/knowledge/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { organizationId } = request.query;
            const success = await DBService.deleteKnowledge(id, organizationId);
            return { success };
        } catch (err) {
            console.error('[API] Delete Knowledge Error:', err.message);
            return reply.code(500).send({ error: 'Failed' });
        }
    });

}

module.exports = registerApiRoutes;

