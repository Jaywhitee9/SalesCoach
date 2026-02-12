const CallMonitor = require('../services/call-monitor');
const CallManager = require('../services/call-manager');
const { createClient } = require('@supabase/supabase-js');

async function registerManagerRoutes(fastify) {

    fastify.register(async function (fastify) {
        fastify.get('/ws/manager', { websocket: true }, async (connection, req) => {
            const ws = connection.socket || connection;
            const { orgId, token } = req.query;

            if (!orgId || !token) {
                console.error('[Manager-WS] Connection attempt without orgId or token');
                ws.close(1008, 'Missing orgId or auth token');
                return;
            }

            // Verify auth token
            try {
                const supabaseAuth = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
                );
                const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
                if (error || !user) {
                    console.error('[Manager-WS] Invalid token');
                    ws.close(1008, 'Unauthorized');
                    return;
                }

                const { data: profile } = await supabaseAuth
                    .from('profiles')
                    .select('organization_id, role')
                    .eq('id', user.id)
                    .single();

                if (!profile || profile.organization_id !== orgId) {
                    console.error(`[Manager-WS] Org mismatch: user org=${profile?.organization_id}, requested=${orgId}`);
                    ws.close(1008, 'Forbidden');
                    return;
                }

                const isManager = ['manager', 'super_admin', 'platform_admin'].includes(profile.role);
                if (!isManager) {
                    console.error(`[Manager-WS] User role=${profile.role} is not a manager`);
                    ws.close(1008, 'Forbidden: Not a manager');
                    return;
                }

                console.log(`[Manager-WS] Manager ${user.email} connected for org ${orgId}`);
                CallMonitor.registerManagerSocket(orgId, ws);

            } catch (err) {
                console.error('[Manager-WS] Auth error:', err.message);
                ws.close(1011, 'Auth error');
                return;
            }

            let listeningTo = null;

            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw);

                    switch (msg.type) {
                        case 'start_listening': {
                            const { callSid } = msg;
                            if (!callSid) break;

                            if (listeningTo) {
                                CallMonitor.stopListening(listeningTo, ws);
                            }

                            const success = CallMonitor.startListening(callSid, ws);
                            listeningTo = success ? callSid : null;

                            ws.send(JSON.stringify({
                                type: 'listen_status',
                                callSid,
                                listening: success,
                                message: success ? 'מאזין לשיחה' : 'השיחה לא נמצאה'
                            }));

                            if (success) {
                                const call = CallManager.calls.get(callSid);
                                if (call) {
                                    const history = [
                                        ...call.transcripts.customer.map(t => ({ role: 'customer', text: t.text, timestamp: t.timestamp })),
                                        ...call.transcripts.agent.map(t => ({ role: 'agent', text: t.text, timestamp: t.timestamp }))
                                    ].sort((a, b) => a.timestamp - b.timestamp);

                                    ws.send(JSON.stringify({
                                        type: 'transcript_history',
                                        callSid,
                                        history
                                    }));

                                    if (call.coachingHistory && call.coachingHistory.length > 0) {
                                        ws.send(JSON.stringify({
                                            type: 'coaching_history',
                                            callSid,
                                            history: call.coachingHistory
                                        }));
                                    }
                                }
                            }
                            break;
                        }

                        case 'stop_listening': {
                            if (listeningTo) {
                                CallMonitor.stopListening(listeningTo, ws);
                                listeningTo = null;
                            }
                            break;
                        }

                        case 'dismiss_alert': {
                            const { callSid, managerId } = msg;
                            if (callSid) {
                                CallMonitor.dismissAlert(callSid, managerId);
                            }
                            break;
                        }

                        case 'get_active_calls': {
                            const calls = CallMonitor.getActiveCallsForOrg(orgId);
                            ws.send(JSON.stringify({
                                type: 'active_calls',
                                calls
                            }));
                            break;
                        }

                        case 'get_alerts': {
                            const alerts = CallMonitor.getAlertsForOrg(orgId);
                            ws.send(JSON.stringify({
                                type: 'alerts_list',
                                alerts
                            }));
                            break;
                        }
                    }
                } catch (e) {
                    console.error('[Manager-WS] Error processing message:', e.message);
                }
            });

            ws.on('close', () => {
                console.log(`[Manager-WS] Manager disconnected for org ${orgId}`);
                CallMonitor.unregisterManagerSocket(orgId, ws);
                if (listeningTo) {
                    CallMonitor.stopListening(listeningTo, ws);
                }
            });
        });
    });

    fastify.get('/api/manager/attention', async (request, reply) => {
        try {
            const { organizationId } = request.query;
            if (!organizationId) {
                return reply.code(400).send({ success: false, error: 'Missing organizationId' });
            }

            const alerts = CallMonitor.getAlertsForOrg(organizationId);
            const activeCalls = CallMonitor.getActiveCallsForOrg(organizationId);

            return {
                success: true,
                alerts,
                activeCalls,
                summary: {
                    critical: alerts.filter(a => a.severity === 'critical').length,
                    high: alerts.filter(a => a.severity === 'high').length,
                    medium: alerts.filter(a => a.severity === 'medium').length,
                    total: alerts.length
                }
            };
        } catch (err) {
            console.error('[API] Manager Attention Error:', err.message);
            return reply.code(500).send({ success: false, error: 'Failed to fetch attention data' });
        }
    });

    fastify.post('/api/manager/dismiss-alert', async (request, reply) => {
        try {
            const { callSid, managerId } = request.body;
            if (!callSid) {
                return reply.code(400).send({ success: false, error: 'Missing callSid' });
            }
            CallMonitor.dismissAlert(callSid, managerId);
            return { success: true };
        } catch (err) {
            return reply.code(500).send({ success: false, error: 'Failed to dismiss alert' });
        }
    });
}

module.exports = registerManagerRoutes;
