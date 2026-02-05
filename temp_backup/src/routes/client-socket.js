const CallManager = require('../services/call-manager');

async function registerClientRoutes(fastify) {

    // WebSocket: /ws/coach?callSid=...
    fastify.register(async function (fastify) {
        fastify.get('/ws/coach', { websocket: true }, (connection, req) => {
            const ws = connection.socket || connection;
            const { callSid } = req.query;

            if (!callSid) {
                console.error('[Client] Connection attempt without callSid');
                ws.close(1008, 'Missing callSid');
                return;
            }

            console.log(`[Client] UI Connected for call ${callSid}`);

            // Get or Create call state (though usually created by Twilio first)
            // If UI connects first (rare but possible), we create state
            const TenantStore = require('../services/tenant-store');
            const defaultContext = TenantStore.resolveContext({ From: 'default' });
            const call = CallManager.getCall(callSid, defaultContext);

            // Attach to state structure
            // Note: Only supports one frontend client per call for now (Simple assignment)
            call.frontendSocket = ws;

            // Send initial status/history if needed? 
            // For now, just confirming connection
            ws.send(JSON.stringify({ type: 'status', message: 'connected' }));

            ws.on('close', () => {
                console.log(`[Client] UI Disconnected for ${callSid}`);
                if (call.frontendSocket === ws) {
                    call.frontendSocket = null;
                }
            });
        });
    });
}

module.exports = registerClientRoutes;
