const DBService = require('../services/db-service');

/**
 * Registers generic API routes
 * @param {import('fastify').FastifyInstance} fastify 
 */
async function registerApiRoutes(fastify) {

    // --- LEADS ---
    fastify.get('/api/leads', async (request, reply) => {
        const leads = await DBService.getLeads();
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

    // --- CALLS (Existing functionality via API) ---
    fastify.get('/api/calls/recent', async (request, reply) => {
        const limit = parseInt(request.query.limit) || 10;
        const calls = await DBService.getRecentCalls(limit);
        return calls;
    });

}

module.exports = registerApiRoutes;
