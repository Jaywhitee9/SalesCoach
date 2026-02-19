require('dotenv').config();
const fastify = require('fastify')({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined
    },
    trustProxy: true // Required for correct IP behind reverse proxy (Render, Railway)
});
const path = require('path');
const { validateEnv } = require('./config/env-validator');
const { globalRateLimit } = require('./middleware/rate-limit-config');

// ─── Validate Environment ───────────────────────────────────────
validateEnv(fastify.log);

// ─── CORS Configuration ────────────────────────────────────────
const allowedOrigins = buildAllowedOrigins();
fastify.log.info({ allowedOrigins }, 'CORS origins configured');

// ─── Plugins ────────────────────────────────────────────────────
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/websocket'));

// Security headers
fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false, // Disabled — SPA manages its own CSP
    crossOriginEmbedderPolicy: false
});

// CORS — restricted to configured origins
fastify.register(require('@fastify/cors'), {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
});

// Rate limiting
fastify.register(require('@fastify/rate-limit'), globalRateLimit);

// Static Files (Serve Client)
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../client/dist'),
    prefix: '/',
});

// ─── Global Auth Hook ───────────────────────────────────────────
const authenticate = require('./middleware/authenticate');
fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api') || request.url.startsWith('/voice')) {
        await authenticate(request, reply);
    }
});

// ─── Global Error Handler ───────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    // Log all 5xx errors fully, 4xx only as warnings
    if (statusCode >= 500) {
        request.log.error({ err: error, url: request.url, method: request.method }, 'Server error');
    } else if (statusCode !== 429) {
        request.log.warn({ statusCode, url: request.url, message: error.message }, 'Client error');
    }

    // Never expose internal details in production
    const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message;

    reply.status(statusCode).send({
        error: message,
        statusCode
    });
});

// ─── Routes ─────────────────────────────────────────────────────
fastify.register(require('./routes/twilio-handler'));
fastify.register(require('./routes/api-handler'));
fastify.register(require('./routes/token-handler'));
fastify.register(require('./routes/client-socket'));
fastify.register(require('./routes/leads-handler'));
fastify.register(require('./routes/admin-handler'));
fastify.register(require('./routes/dashboard-preferences-handler'));
fastify.register(require('./routes/manager-socket'));

// ─── Health Check ───────────────────────────────────────────────
fastify.get('/health', async (request, reply) => {
    const supabase = require('./lib/supabase');
    let dbStatus = 'unknown';

    try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        dbStatus = error ? 'degraded' : 'ok';
    } catch {
        dbStatus = 'down';
    }

    const health = {
        status: dbStatus === 'ok' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: dbStatus,
            twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not_configured',
            openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
            soniox: process.env.SONIOX_API_KEY ? 'configured' : 'not_configured'
        }
    };

    const statusCode = health.status === 'ok' ? 200 : 503;
    return reply.code(statusCode).send(health);
});

// ─── SPA Fallback ───────────────────────────────────────────────
fastify.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api') && !request.url.startsWith('/voice') && !request.url.startsWith('/token') && !request.url.startsWith('/ws')) {
        return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
});

// ─── Graceful Shutdown ──────────────────────────────────────────
async function gracefulShutdown(signal) {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
        await fastify.close();
        fastify.log.info('Server closed');
        process.exit(0);
    } catch (err) {
        fastify.log.error(err, 'Error during shutdown');
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    fastify.log.error({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
    fastify.log.fatal({ err: error }, 'Uncaught Exception — shutting down');
    process.exit(1);
});

// ─── Start Server ───────────────────────────────────────────────
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`SalesCoach server ready on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

// ─── Helper: Build CORS Allowed Origins ─────────────────────────
function buildAllowedOrigins() {
    const origins = [];

    // Always allow the configured frontend URL
    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }

    // Render.com auto-sets this
    if (process.env.RENDER_EXTERNAL_URL) {
        origins.push(process.env.RENDER_EXTERNAL_URL);
    }

    // Allow additional origins via comma-separated list
    if (process.env.CORS_ALLOWED_ORIGINS) {
        origins.push(...process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()));
    }

    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
        origins.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173');
    }

    // If no origins configured, allow same-origin requests only (return true for all in dev)
    if (origins.length === 0) {
        return process.env.NODE_ENV === 'production'
            ? false // Block all cross-origin in production if nothing configured
            : true; // Allow all in development
    }

    return origins;
}
