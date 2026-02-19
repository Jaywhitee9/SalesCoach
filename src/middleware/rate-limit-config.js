/**
 * Rate Limiting Configuration
 * Protects API endpoints from abuse and DoS attacks
 */

// Default: 100 requests per minute per IP
const globalRateLimit = {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
        return request.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || request.ip
            || 'unknown';
    },
    errorResponseBuilder: (_request, context) => ({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        statusCode: 429,
        retryAfter: Math.ceil(context.ttl / 1000)
    })
};

// Strict limit for auth-sensitive endpoints (login, token generation)
const authRateLimit = {
    max: 20,
    timeWindow: '1 minute'
};

// Stricter limit for AI-powered endpoints (expensive operations)
const aiRateLimit = {
    max: 10,
    timeWindow: '1 minute'
};

// Webhook endpoint rate limit (per API key)
const webhookRateLimit = {
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
        return request.headers['x-api-key']
            || request.query.apiKey
            || request.ip
            || 'unknown';
    }
};

module.exports = {
    globalRateLimit,
    authRateLimit,
    aiRateLimit,
    webhookRateLimit
};
