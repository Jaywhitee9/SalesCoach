const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

async function registerTokenRoutes(fastify) {

    /**
     * GET /api/token
     * Returns a capability token for the browser client
     */
    fastify.get('/api/token', async (request, reply) => {
        const { identity } = request.query;

        // Use a random identity if none provided (e.g. user_123)
        const user = identity || 'user_' + Math.floor(Math.random() * 1000);

        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioApiKey = process.env.TWILIO_API_KEY_SID;
        const twilioApiSecret = process.env.TWILIO_API_KEY_SECRET;
        const outgoingApplicationSid = process.env.TWILIO_TWIML_APP_SID;

        if (!twilioApiKey || !twilioApiSecret || !outgoingApplicationSid) {
            return reply.code(500).send({
                error: 'Missing Twilio API Key/Secret or TwiML App SID in .env'
            });
        }

        const token = new AccessToken(
            twilioAccountSid,
            twilioApiKey,
            twilioApiSecret,
            { identity: user }
        );

        // Grant the token access to Voice capabilities
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: outgoingApplicationSid,
            incomingAllow: true, // Allow incoming calls to this client
        });

        token.addGrant(voiceGrant);

        // Return the token
        return {
            token: token.toJwt(),
            identity: user
        };
    });
}

module.exports = registerTokenRoutes;
