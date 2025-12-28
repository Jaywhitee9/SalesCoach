const twilio = require('twilio');

/**
 * Outbound Call API Route
 * This route initiates an outbound call via Twilio
 */
async function registerOutboundRoutes(fastify) {
    const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );

    /**
     * POST /api/make-call
     * Body: { to: "+972XXXXXXXXX" }
     * 
     * Initiates an outbound call from Twilio to the target number
     */
    fastify.post('/api/make-call', async (request, reply) => {
        let { to } = request.body;

        if (!to) {
            return reply.code(400).send({ error: 'Missing "to" phone number' });
        }

        // --- PHONE NUMBER FORMATTING ---
        // Clean non-digit characters (e.g., dashes, spaces)
        to = to.replace(/\D/g, '');

        // Check for Israeli local format (starts with 0, 10 digits total usually)
        if (to.startsWith('0') && to.length >= 9) {
            // Remove leading zero and add +972
            to = '+972' + to.substring(1);
        } else if (!to.startsWith('+')) {
            // Assume it's a number without + but might have country code or needs it
            // For safety, if it looks like a local number without leading 0 (rare but possible), treat cautiously.
            // But if user sends 97250..., just add +
            if (to.startsWith('972')) {
                to = '+' + to;
            }
        }

        fastify.log.info(`[Outbound] Formatting number: ${request.body.to} -> ${to}`);

        // Use PUBLIC_URL from env if available, otherwise fall back to request host
        const baseUrl = process.env.PUBLIC_URL || `https://${request.headers.host}`;
        const voiceUrl = `${baseUrl}/voice`;
        fastify.log.info(`[Outbound] Using Voice URL: ${voiceUrl}`);

        try {
            // Create the call
            const call = await client.calls.create({
                to: to,
                from: process.env.TWILIO_PHONE_NUMBER,
                url: voiceUrl, // Must be publicly accessible!
                statusCallback: `${baseUrl}/call-status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST'
            });

            fastify.log.info(`[Outbound] Call initiated: ${call.sid} to ${to}`);

            return {
                success: true,
                callSid: call.sid,
                status: call.status,
                to: to
            };

        } catch (error) {
            fastify.log.error(`[Outbound] Error initiating call: ${error.message}`);
            return reply.code(500).send({
                error: 'Failed to initiate call',
                details: error.message
            });
        }
    });

    /**
     * POST /api/end-call
     * Body: { callSid: "CA..." }
     * 
     * Terminates an active call
     */
    fastify.post('/api/end-call', async (request, reply) => {
        const { callSid } = request.body;

        if (!callSid) {
            return reply.code(400).send({ error: 'Missing "callSid"' });
        }

        try {
            await client.calls(callSid).update({ status: 'completed' });
            fastify.log.info(`[Outbound] Hung up call: ${callSid}`);
            return { success: true };
        } catch (error) {
            fastify.log.error(`[Outbound] Error hanging up: ${error.message}`);
            // If call is already done, it's fine.
            return { success: false, error: error.message };
        }
    });

    /**
     * POST/GET /call-status
     * Webhook for call status updates from Twilio
     */
    const callStatusHandler = async (request, reply) => {
        const params = request.body || request.query;
        const { CallSid, CallStatus, From, To } = params;

        fastify.log.info(`[Call Status] ${CallSid}: ${CallStatus} (${From} -> ${To})`);

        // You can add custom logic here based on status
        // e.g., update database, send notifications, etc.

        return reply.code(200).send('OK');
    };

    fastify.post('/call-status', callStatusHandler);
    fastify.get('/call-status', callStatusHandler);
}

module.exports = registerOutboundRoutes;
