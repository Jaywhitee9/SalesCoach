require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path = require('path');

// Plugins
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/websocket'));

// CORS Configuration - Environment-based whitelist
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

fastify.register(require('@fastify/cors'), {
    origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
            cb(null, true);
            return;
        }

        // Check if origin is in whitelist
        if (corsOrigins.includes(origin)) {
            cb(null, true);
        } else {
            console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
            cb(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Rate Limiting - Protect against DoS attacks
fastify.register(require('@fastify/rate-limit'), {
    global: true,
    max: 100, // 100 requests
    timeWindow: '1 minute',
    cache: 10000,
    allowList: ['127.0.0.1'], // Allow localhost
    skipOnError: true, // Continue if Redis/store fails
    keyGenerator: (request) => {
        // Use IP address as key
        return request.ip || request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown';
    },
    errorResponseBuilder: (request, context) => {
        return {
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
            retryAfter: context.ttl
        };
    }
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
