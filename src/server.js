require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path = require('path');

// Plugins
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/cors'), {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Static Files (Serve Client)
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../client/dist'),
    prefix: '/',
});

// Global Auth Hook
fastify.addHook('onRequest', async (request, reply) => {
    // Only apply to API routes to avoid overhead on static files
    if (request.url.startsWith('/api') || request.url.startsWith('/voice')) {
        const authenticate = require('./middleware/authenticate');
        await authenticate(request, reply);
    }
});

// Routes
fastify.register(require('./routes/twilio-handler'));
fastify.register(require('./routes/api-handler'));
fastify.register(require('./routes/token-handler'));
fastify.register(require('./routes/client-socket'));
fastify.register(require('./routes/leads-handler')); // P0: Lead status & activities
fastify.register(require('./routes/admin-handler')); // Super Admin API
fastify.register(require('./routes/dashboard-preferences-handler')); // Dashboard customization
fastify.register(require('./routes/manager-socket')); // Manager real-time monitoring

// Health Check
fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// SPA Fallback: Serve index.html for all non-API routes (client-side routing)
fastify.setNotFoundHandler((request, reply) => {
    // Only serve index.html for non-API routes
    if (!request.url.startsWith('/api') && !request.url.startsWith('/voice') && !request.url.startsWith('/token') && !request.url.startsWith('/ws')) {
        return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
});



// Start Server
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
