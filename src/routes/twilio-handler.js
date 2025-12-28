const CallManager = require('../services/call-manager');
const SonioxService = require('../services/soniox-service');
const CoachingEngine = require('../services/coaching-engine');
const TenantStore = require('../services/tenant-store');
const supabase = require('../lib/supabase'); // NEW: Supabase Client

async function registerTwilioRoutes(fastify) {

    // 1. HTTP Endpoint for Inbound/Outbound Calls
    const voiceHandler = async (request, reply) => {
        const baseUrl = process.env.PUBLIC_URL || `https://${request.headers.host}`;
        const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

        // Extract Standard Twilio Params + Custom Params (from device.connect)
        const { To, CallSid, agent_id, lead_id, target_number } = request.body || request.query;

        console.log('[Twilio] Incoming Voice Request:', { CallSid, To, agent_id, lead_id });

        // -- ACTION: Create Call Record in DB --
        if (CallSid && agent_id && lead_id && agent_id !== 'unknown') {
            try {
                const { error } = await supabase.from('calls').insert({
                    id: CallSid,
                    agent_id: agent_id,
                    lead_id: lead_id,
                    status: 'in-progress',
                    direction: 'outbound', // Assuming outbound for now based on browser start
                    created_at: new Date().toISOString()
                });
                if (error) console.error('[DB] Failed to insert call:', error.message);
                else console.log('[DB] Call record created:', CallSid);
            } catch (err) {
                console.error('[DB] Error inserting call:', err);
            }
        }

        const destination = target_number || To; // Prefer custom param

        reply.type('text/xml');

        let response;
        try {
            const VoiceResponse = require('twilio').twiml.VoiceResponse;
            response = new VoiceResponse();

            // 1. GREETING (Hebrew)
            response.say({
                language: 'he-IL',
                voice: 'alice' // or a specific neural voice if available
            }, 'שלום, הגעתם למאמן המכירות. השיחה מוקלטת לצורך שיפור השירות.');

            // 2. FORK AUDIO to AI (WebSocket)
            // Determine direction for the stream handler
            const callDirection = (destination && destination !== process.env.TWILIO_PHONE_NUMBER) ? 'outbound' : 'inbound';

            // PASS METADATA TO WEBSOCKET VIA URL PARAMS
            const streamUrl = `${wsUrl}/twilio-stream?direction=${callDirection}&agentId=${agent_id}&leadId=${lead_id}`;

            const start = response.start();
            start.stream({
                url: streamUrl,
                track: 'both_tracks'
            });

            // 3. DIAL LOGIC
            // Normalize "To" number to E.164 if dealing with Israeli numbers
            let targetNumber = destination;
            if (targetNumber) {
                // Remove non-digits
                let cleanNumber = targetNumber.replace(/\D/g, '');
                // If starts with 0 and is long enough, assume IL local
                if (targetNumber.startsWith('0') && cleanNumber.length >= 9) {
                    targetNumber = '+972' + cleanNumber.substring(1);
                } else if (!targetNumber.startsWith('+') && cleanNumber.length >= 7) {
                    // Try to be smart? Or just let it fail if not +
                    // Let's assume input might be 501234567 -> +972501234567 if they omitted 0? 
                    // Safer to just handle the standard '05...' case.
                }
            }

            if (targetNumber && targetNumber !== process.env.TWILIO_PHONE_NUMBER) {
                // Outbound or forwarding
                const dial = response.dial({
                    callerId: process.env.TWILIO_PHONE_NUMBER,
                    answerOnBridge: true
                });
                dial.number(targetNumber);
            } else {
                // Inbound to system
                response.say('. אנא המתינו לנציג.');
                // In a real app we might put them in a queue or just keep the stream open
                response.pause({ length: 10 });
            }

            console.log('[Twilio] Generated TwiML:', response.toString());
            return response.toString();

        } catch (error) {
            console.error('[Twilio] Error generating TwiML:', error);
            // Fallback TwiML to avoid "Application Error"
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Sorry, an error occurred in the system.</Say>
</Response>`;
        }
    };

    fastify.post('/voice', voiceHandler);
    fastify.get('/voice', voiceHandler);

    // 2. WebSocket Endpoint for Media Stream
    // 2. WebSocket Endpoint for Media Stream
    fastify.get('/twilio-stream', { websocket: true }, (connection, req) => {
        console.log("🔌 New Twilio media stream connection", {
            url: req.url,
            time: new Date().toISOString(),
        });
        const ws = connection.socket || connection;

        let callSid = null;
        let streamSid = null;

        // --- ROLE MAPPING HELPER ---
        // Determines logical role (agent/customer) based on audio track (inbound/outbound)
        // and call direction (inbound/outbound).
        // 
        // Rules:
        // 1. Inbound Call (Customer calls us):
        //    - 'inbound' track (From caller) = customer
        //    - 'outbound' track (From us/Twilio) = agent
        //
        // 2. Outbound Call (We call Customer):
        //    - 'inbound' track (From callee) = customer (Wait, inbound for Twilio on outbound call is callee audio?)
        //      Actually for Programmable Voice:
        //      - 'inbound' track is remote party (mixed).
        //      - 'outbound' track is what Twilio sends to the call.
        //      - Let's stick to the user's tested logic:
        //        If direction=outbound: inbound->agent, outbound->customer??
        //        Wait, verified code says:
        /*
           if (direction === 'outbound') {
                 inboundSpeaker = 'agent';
                 outboundSpeaker = 'customer';
            } else {
                 inboundSpeaker = 'customer';
                 outboundSpeaker = 'agent';
            }
        */
        const resolveRole = (track, callDirection) => {
            // Inbound Call: 'inbound' track = Customer (Caller), 'outbound' track = Agent (Say/Play)
            if (callDirection === 'inbound') {
                return track === 'inbound' ? 'customer' : 'agent';
            }
            // Outbound Call: 'inbound' track = Agent (Caller), 'outbound' = Customer (Callee)?
            // NOTE: This depends heavily on how Twilio streams are forked. 
            // Typically 'inbound' is the audio received by Twilio. 
            // On outbound call, Twilio initiates. 'Inbound' audio comes from the person picked up?
            // User's previous code had inverted logic for outbound. We preserve it but log it explicitly.
            else {
                return track === 'inbound' ? 'agent' : 'customer';
            }
        };

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                // Extract direction from the WebSocket request URL once
                const urlParams = new URLSearchParams(req.url.split('?')[1]);
                const callDirection = urlParams.get('direction') || 'inbound';
                const agentId = urlParams.get('agentId') || 'system';
                const leadId = urlParams.get('leadId') || 'unknown';

                if (data.event === 'start') {
                    callSid = data.start.callSid;
                    streamSid = data.start.streamSid;

                    try {
                        // Resolve Context - Use params from URL if available
                        const context = TenantStore.resolveContext({ From: 'default' });

                        // Inject our specific IDs
                        if (agentId !== 'undefined') context.agent.agentId = agentId;
                        if (leadId !== 'undefined') context.customLeadId = leadId;

                        console.log(`[Twilio] Stream started for CallSid: ${callSid} [Agent: ${agentId}, Lead: ${leadId}]`);
                        console.log(`[Twilio] Stream Direction: ${callDirection}`);

                        // Initialize Call State
                        const call = CallManager.getCall(callSid, context);
                    } catch (e) {
                        console.error(`[Twilio] Failed to resolve context: ${e.message}`);
                        ws.close();
                        return;
                    }

                } else if (data.event === 'media') {
                    const track = data.media.track;
                    const payload = data.media.payload;

                    if (callSid) {
                        const call = CallManager.getCall(callSid);

                        // Resolve Role
                        const role = resolveRole(track, callDirection);

                        // Ensure session exists
                        if (!call.sonioxSockets[role]) {
                            call.sonioxSockets[role] = SonioxService.createSession(callSid, role, (text, isFinal) => {
                                // Pass resolved role props explicitly
                                handleTranscript(callSid, role, text, isFinal, track, callDirection);
                            });
                        }
                        call.sonioxSockets[role].sendAudio(Buffer.from(payload, 'base64'));
                    }

                } else if (data.event === 'stop') {
                    console.log(`[Twilio] Stream stopped for ${callSid}`);
                    // Use endCall to trigger summary generation before cleanup
                    CallManager.endCall(callSid);
                }
            } catch (e) {
                console.error('[Twilio] Error processing message:', e);
            }
        });

        ws.on('close', () => {
            // For socket close, also try to end call gracefully if still active
            if (callSid) CallManager.endCall(callSid);
        });
    });

    // Helper to process transcripts
    const handleTranscript = async (callSid, role, text, isFinal, rawTrack, callDirection) => {
        try {
            // EXPLICT ROLE VERIFICATION LOG
            console.log("[Role-Mapping] Transcript", {
                callId: callSid,
                twilioDirection: callDirection,
                track: rawTrack,
                role: role,
                isFinal: isFinal,
                text: text.substring(0, 60)
            });

            // 1. Update State & Broadcast to UI (Transcript)
            CallManager.addTranscript(callSid, role, text, isFinal);

            // Broadcast to UI
            CallManager.broadcastToFrontend(callSid, {
                type: 'transcript',
                role: role,
                text: text,
                isFinal: isFinal,
                timestamp: Date.now()
            });

            // 2. Trigger Coaching Logic
            // --- CRITICAL: TRIGGER CONDITIONS ---
            // a) Must be FINAL
            // b) Must be CUSTOMER
            if (isFinal && role === 'customer') {
                const call = CallManager.getCall(callSid);

                // Extra safety check in logs
                console.log(`[Coaching-Trigger] Valid Customer Final: "${text.substring(0, 20)}..."`);

                const account = TenantStore.getAccount(call.accountId);
                const history = call.transcripts;
                const mixedHistory = [
                    ...history.customer.map(t => ({ role: 'customer', text: t.text, timestamp: t.timestamp })),
                    ...history.agent.map(t => ({ role: 'agent', text: t.text, timestamp: t.timestamp }))
                ].sort((a, b) => a.timestamp - b.timestamp);

                const recentContext = mixedHistory.slice(-10);
                const advice = await CoachingEngine.generateCoaching(call, account.config, recentContext);

                if (advice) {
                    call.lastCoachingTime = Date.now();
                    call.coachingHistory.push({
                        type: advice.type,
                        message: advice.message,
                        timestamp: Date.now()
                    });

                    CallManager.broadcastToFrontend(callSid, {
                        type: 'coaching',
                        severity: advice.severity || 'info',
                        role: 'system',
                        message: advice.message,
                        suggested_reply: advice.suggested_reply
                    });
                }
            }
        } catch (err) {
            console.warn(`[Handler] Error processing transcript for ${callSid}:`, err.message);
        }
    };
}

module.exports = registerTwilioRoutes;
