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

        if (profile?.role === 'super_admin') return true; // Super Admin can access all

        if (profile?.organization_id !== targetOrgId) {
            reply.code(403).send({ error: 'Forbidden: Organization Mismatch' });
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
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }
            const teamMembers = await DBService.getTeamMembers(organizationId);
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

}

module.exports = registerApiRoutes;
