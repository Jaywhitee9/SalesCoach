const CallManager = require('../services/call-manager');
const SonioxService = require('../services/soniox-service');
const CoachingEngine = require('../services/coaching-engine');
const TenantStore = require('../services/tenant-store');
const supabase = require('../lib/supabase'); // NEW: Supabase Client
const { v4: uuidv4 } = require('uuid');

async function registerTwilioRoutes(fastify) {

    // 1. HTTP Endpoint for Inbound/Outbound Calls
    const voiceHandler = async (request, reply) => {
        const baseUrl = process.env.PUBLIC_URL || `https://${request.headers.host}`;
        const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

        console.log('------------------------------------------');
        console.log('[Twilio-Handler] /voice HIT. Method:', request.method);
        console.log('[Twilio-Handler] Headers:', JSON.stringify(request.headers));
        console.log('[Twilio-Handler] Body:', JSON.stringify(request.body));
        console.log('[Twilio-Handler] Query:', JSON.stringify(request.query));
        console.log('------------------------------------------');

        // Extract Standard Twilio Params + Custom Params (from device.connect)
        const { To, From, CallSid, agent_id, lead_id, target_number } = request.body || request.query;

        console.log('[Twilio] Incoming Voice Request:', { CallSid, To, From, agent_id, lead_id });

        // -- ACTION: Create Call Record in DB --
        if (CallSid && agent_id && lead_id && agent_id !== 'unknown') {
            try {
                // PHASE 3: Fetch organization_id and profile phone number (and rotator config)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id, twilio_phone_number, phone_rotator_config')
                    .eq('id', agent_id)
                    .single();

                if (profileError || !profile?.organization_id) {
                    console.error('[DB] CRITICAL: Cannot determine organization_id for call', {
                        agent_id,
                        lead_id,
                        CallSid,
                        error: profileError?.message
                    });
                    throw new Error(`Missing organization_id for agent ${agent_id}`);
                }

                // Determine Caller ID Strategy:
                // 1. Agent Private Line (profiles.twilio_phone_number)
                // 2. Organization Business Line (organization_settings.twilio_phone_number)
                // 3. System Fallback (env.TWILIO_PHONE_NUMBER)

                let callerIdToUse = process.env.TWILIO_PHONE_NUMBER;

                // 1. Check Phone Rotator (Advanced Logic)
                const rotator = profile.phone_rotator_config;
                if (rotator && rotator.numbers && rotator.numbers.length > 0) {
                    const activeIndex = rotator.active_index || 0;
                    if (rotator.numbers[activeIndex]) {
                        callerIdToUse = rotator.numbers[activeIndex].number;
                        console.log(`[Twilio] Using Rotator Line [${activeIndex}]: ${callerIdToUse}`);
                    }
                }
                // 2. Check Legacy Agent Private Line
                else if (profile.twilio_phone_number) {
                    callerIdToUse = profile.twilio_phone_number;
                    console.log(`[Twilio] Using Agent Private Line: ${callerIdToUse}`);
                }
                // 3. Check Organization Business Line
                else {
                    const { data: orgSettings } = await supabase
                        .from('organization_settings')
                        .select('twilio_phone_number')
                        .eq('organization_id', profile.organization_id)
                        .single();

                    if (orgSettings?.twilio_phone_number) {
                        callerIdToUse = orgSettings.twilio_phone_number;
                        console.log(`[Twilio] Using Org Business Line: ${callerIdToUse}`);
                    }
                }

                // Store determined callerId in call record for transparency
                // (Note: we might need to add 'from_number' column to calls table later, for now just logging)

                const { error } = await supabase.from('calls').insert({
                    id: uuidv4(),
                    agent_id: agent_id,
                    lead_id: lead_id,
                    organization_id: profile.organization_id,
                    org_id: profile.organization_id,
                    status: 'in-progress',
                    direction: 'outbound',
                    recording_url: `sid:${CallSid}`,
                    created_at: new Date().toISOString(),
                    // We can reuse 'recording_url' field or similar to store meta-data if needed, 
                    // but for now relying on logs is fine.
                });

                // Pass callerId to the dial logic scope (via request context or variable)
                request.activeCallerId = callerIdToUse;

                if (error) console.error('[DB] Failed to insert call:', error.message);
                else console.log('[DB] Call record created:', CallSid, 'org:', profile.organization_id);
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
            // Adding leg=agent to identify this stream is on the agent's side
            const streamUrl = `${wsUrl}/twilio-stream?direction=${callDirection}&agentId=${agent_id}&leadId=${lead_id}&leg=agent`;

            const start = response.start();
            start.stream({
                url: streamUrl,
                track: 'both_tracks'
            });

            // 3. DIAL LOGIC
            // Normalize "To" number to E.164 if dealing with Israeli numbers
            let targetNumber = destination;

            if (targetNumber) {
                // Remove all non-digit characters
                let cleanNumber = targetNumber.replace(/\D/g, '');

                // ISRAEL E.164 LOGIC:
                // If it starts with '0' (e.g. 052...), remove 0 and add +972
                if (cleanNumber.startsWith('0')) {
                    cleanNumber = cleanNumber.substring(1);
                    targetNumber = `+972${cleanNumber}`;
                }
                // If it already doesn't start with +, add + (assuming it's full number but missing +)
                // But safer to only touch if we are sure. For now, just handling the 0 case is P0.
                else if (!targetNumber.startsWith('+')) {
                    // If it's 9 digits starting with 5, likely IL mobile without 0 -> +972
                    if (cleanNumber.length === 9 && cleanNumber.startsWith('5')) {
                        targetNumber = `+972${cleanNumber}`;
                    }
                }
            }

            if (targetNumber && targetNumber !== (request.activeCallerId || process.env.TWILIO_PHONE_NUMBER)) {
                // Outbound or forwarding - Enable recording with callback
                const dial = response.dial({
                    callerId: request.activeCallerId || process.env.TWILIO_PHONE_NUMBER,
                    answerOnBridge: true,
                    record: 'record-from-answer-dual',
                    // SPAM DETECTION: Track call outcome
                    action: `${baseUrl}/voice/status-callback?agentId=${agent_id}`,
                    method: 'POST',
                    recordingStatusCallback: `${process.env.RENDER_EXTERNAL_URL || 'https://sales-coach.onrender.com'}/recording-callback`,
                    recordingStatusCallbackEvent: 'completed'
                });
                dial.number(targetNumber);
            } else {
                // --- INBOUND CALL LOGIC (Smart Routing) ---
                console.log(`[Twilio] Inbound call from ${From || 'Unknown'}`);

                let routed = false;

                if (From) {
                    try {
                        // 1. Lookup Lead by Phone Number
                        // Clean the incoming number for matching (flexible)
                        // Assume DB stores normalized or we try fuzzy match. For now, exact match or partial.
                        // Twilio sends E.164 (+972...). DB might have 050...

                        // We will try exact match first
                        let { data: lead, error } = await supabase
                            .from('leads')
                            .select('id, owner_id, name, organization_id')
                            .or(`phone.eq.${From},phone.eq.${From.replace('+972', '0')}`)
                            .single();

                        if (lead && lead.owner_id) {
                            console.log(`[Twilio] Smart Routing: Found lead ${lead.name}, routing to agent ${lead.owner_id}`);

                            // 2. Announce to Caller
                            response.say({ language: 'he-IL', voice: 'alice' }, 'שלום, אנא המתינו ותועברו לנציג האישי שלכם.');

                            // 3. Dial Agent Client
                            const dial = response.dial({
                                timeout: 20,
                                callerId: From
                            });

                            // Determine Client Identity (Agent ID)
                            dial.client({
                                statusCallbackEvent: 'initiated ringing answered completed',
                                statusCallback: `${baseUrl}/client-status-callback`, // Optional
                            }, lead.owner_id);

                            routed = true;
                        }
                    } catch (err) {
                        console.error('[Twilio] Routing Lookup Error:', err.message);
                    }
                }

                if (!routed) {
                    // Fallback: No lead found or no owner
                    console.log('[Twilio] No specific agent found, playing default greeting.');
                    response.say({ language: 'he-IL', voice: 'alice' }, 'שלום, הגעתם למוקד המכירות. כל הנציגים עסוקים כעת, אנא נסו שוב מאוחר יותר.');
                    // Optional: Dial a "General Queue" or default admin if we had one
                }
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
        const resolveRole = (track, leg) => {
            // P0 Fix: Role Mapping - EMPIRICALLY VERIFIED
            // User tested: "טלפון" spoken from PHONE showed as track=outbound role=agent
            // But PHONE = Customer!
            // So: outbound -> customer, inbound -> agent
            // (This is the OPPOSITE of what Twilio docs suggest, but it works!)
            if (leg === 'agent') {
                return track === 'inbound' ? 'agent' : 'customer';
            }
            // Fallback - same logic
            return track === 'inbound' ? 'agent' : 'customer';
        };

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                // Extract direction from WebSocket request
                // In Fastify, use req.query for WebSocket query params
                const queryParams = req.query || {};
                const callDirection = queryParams.direction || 'inbound';
                const agentId = queryParams.agentId || 'system';
                const leadId = queryParams.leadId || 'unknown';
                const leg = queryParams.leg || 'agent'; // Default to 'agent' since we set leg=agent in TwiML

                if (data.event === 'start') {
                    console.log('[Twilio] Stream START event received', data.start);
                    callSid = data.start.callSid;
                    streamSid = data.start.streamSid;

                    try {
                        // Resolve Context - Use params from URL if available
                        const context = TenantStore.resolveContext({ From: 'default' });

                        // Inject our specific IDs
                        if (agentId !== 'undefined') context.agent.agentId = agentId;
                        if (leadId !== 'undefined') context.customLeadId = leadId;

                        console.log(`[Twilio] Stream started for CallSid: ${callSid} [Agent: ${agentId}, Lead: ${leadId}, Leg: ${leg}]`);
                        console.log(`[Twilio] Stream Direction: ${callDirection}`);

                        // Initialize Call State
                        const call = CallManager.getCall(callSid, context);
                        if (!call) {
                            console.error('[Twilio] CRITICAL: CallManager returned null for new call!');
                        }
                    } catch (e) {
                        console.error(`[Twilio] Failed to resolve context: ${e.message}`);
                        ws.close();
                        return;
                    }

                } else if (data.event === 'media') {
                    const track = data.media.track;
                    const payload = data.media.payload;

                    if (!callSid) return;

                    const call = CallManager.getCall(callSid);
                    if (!call) return; // specific handling if call missing

                    // DEBUG: Log first packet per track
                    if (!call._debugTracks) call._debugTracks = new Set();
                    if (!call._debugTracks.has(track)) {
                        console.log(`[Twilio-Debug] First Media Packet for track: ${track} (CallSid: ${callSid})`);
                        call._debugTracks.add(track);
                    }

                    // Resolve Role (Use LEG)
                    const role = resolveRole(track, leg);

                    // Ensure session exists
                    if (!call.sonioxSockets[role]) {
                        call.sonioxSockets[role] = SonioxService.createSession(callSid, role, (text, isFinal) => {
                            // Pass resolved role props explicitly
                            handleTranscript(callSid, role, text, isFinal, track, callDirection, leg);
                        });
                    }
                    call.sonioxSockets[role].sendAudio(Buffer.from(payload, 'base64'));

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
    const handleTranscript = async (callSid, role, text, isFinal, rawTrack, callDirection, leg) => {
        try {
            // EXPLICT ROLE VERIFICATION LOG
            console.log(`[Role-Mapping] callSid=${callSid} leg=${leg} track=${rawTrack} resolved=${role} text="${text.substring(0, 50)}..."`);


            // 1. Update State & Broadcast to UI (Transcript)
            CallManager.addTranscript(callSid, role, text, isFinal);

            // FORCE_SWAP_ROLES: ENV override for quick role swap testing
            let finalRole = role;
            if (process.env.FORCE_SWAP_ROLES === '1') {
                finalRole = (role === 'agent') ? 'customer' : 'agent';
                console.log(`[FORCE_SWAP] Swapped ${role} -> ${finalRole}`);
            }

            // Generate stable segmentId for monotonic tracking
            const segmentId = `${finalRole}-${Math.floor(Date.now() / 3000)}`;

            // Broadcast to UI with ALL relevant info
            CallManager.broadcastToFrontend(callSid, {
                type: 'transcript',
                role: finalRole,
                track: rawTrack || null,
                leg: leg || null,
                segmentId: segmentId,
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

                // === LOAD REAL SETTINGS FROM DB ===
                let organizationId = call.context?.agent?.organizationId;
                if (organizationId) {
                    const orgSettings = await TenantStore.loadOrganizationSettings(organizationId);
                    // Merge settings into account config
                    account.config = {
                        ...account.config,
                        ...orgSettings
                    };
                    console.log(`[Coaching] Loaded settings for org ${organizationId}:`, {
                        model: orgSettings.calls_config?.aiModel,
                        stages: orgSettings.stages_config?.length
                    });
                }

                // === LOAD LEAD PROFILE FOR CONTEXT ===
                const leadId = call.context?.customLeadId;
                if (leadId) {
                    try {
                        const supabase = require('../lib/supabase');
                        const { data: lead } = await supabase
                            .from('leads')
                            .select('name, company, phone, email, status, priority, value, tags, source, notes')
                            .eq('id', leadId)
                            .single();

                        if (lead) {
                            // Inject lead profile into account config for coaching engine
                            account.config.leadProfile = lead;
                            console.log(`[Coaching] Loaded lead profile: ${lead.name} from ${lead.company || 'Unknown'}`);
                        }
                    } catch (err) {
                        console.error(`[Coaching] Failed to load lead profile:`, err.message);
                    }
                }

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

    // --- SPAM DETECTION & ROTATION LOGIC ---

    // Callback from <Dial> action
    fastify.post('/voice/status-callback', async (request, reply) => {
        const { agentId } = request.query;
        const { DialCallStatus, DialCallDuration } = request.body;

        console.log(`[Twilio] Call Status Callback for Agent ${agentId}: Status=${DialCallStatus}, Duration=${DialCallDuration}`);

        if (!agentId) return reply.send();

        try {
            // Fetch current config
            const { data: profile } = await supabase
                .from('profiles')
                .select('phone_rotator_config')
                .eq('id', agentId)
                .single();

            if (!profile || !profile.phone_rotator_config || !profile.phone_rotator_config.auto_rotate) {
                return reply.send();
            }

            let config = profile.phone_rotator_config;
            const currentNumberIdx = config.active_index || 0;

            // Ensure numbers array structure integrity
            if (!config.numbers) config.numbers = [];
            if (!config.numbers[currentNumberIdx]) return reply.send();

            // LOGIC: Did the call succeed?
            // Success = 'completed' AND duration > 5 seconds (meaning actual talk time, not just voicemail usually)
            // Or just 'completed' is enough signal for "connected".
            // Failures = 'busy', 'no-answer', 'failed', 'canceled'

            const isSuccess = DialCallStatus === 'completed'; // Simple check

            if (isSuccess) {
                // RESET FAILURES
                config.numbers[currentNumberIdx].consecutive_failures = 0;
                config.numbers[currentNumberIdx].last_used = new Date().toISOString();

                // Update DB
                await supabase.from('profiles').update({ phone_rotator_config: config }).eq('id', agentId);
                console.log(`[SpamLogic] Call Success. Reset failures for ${config.numbers[currentNumberIdx].number}`);
            } else {
                // INCREMENT FAILURES
                const failures = (config.numbers[currentNumberIdx].consecutive_failures || 0) + 1;
                config.numbers[currentNumberIdx].consecutive_failures = failures;
                console.log(`[SpamLogic] Call Failed (${DialCallStatus}). Failures: ${failures}`);

                // CHECK THRESHOLD (e.g., 10)
                if (failures >= 10) {
                    // ROTATE!
                    const nextIndex = (currentNumberIdx + 1) % config.numbers.length;
                    config.active_index = nextIndex;
                    config.numbers[currentNumberIdx].consecutive_failures = 0; // Reset old one? Or keep as flagged? Let's reset to give it a chance later or manual review.

                    console.warn(`[SpamLogic] 🚨 THRESHOLD HIT! Rotating from ${config.numbers[currentNumberIdx].number} to ${config.numbers[nextIndex].number}`);

                    // Notify Agent (WebSocket)
                    CallManager.broadcastToAgent(agentId, {
                        type: 'system_alert',
                        level: 'warning',
                        message: `System detected connectivity issues. Auto-switching to line ${config.numbers[nextIndex].number}.`
                    });
                }

                // Update DB
                await supabase.from('profiles').update({ phone_rotator_config: config }).eq('id', agentId);
            }

        } catch (err) {
            console.error('[SpamLogic] Error processing callback:', err);
        }

        return reply.type('text/xml').send('<Response></Response>');
    });

    // Recording Status Callback - Receives actual Twilio recording URL
    fastify.post('/recording-callback', async (request, reply) => {
        try {
            const {
                CallSid,
                RecordingUrl,
                RecordingSid,
                RecordingDuration
            } = request.body;

            console.log(`[Recording] Received callback for call ${CallSid}:`, {
                RecordingSid,
                RecordingDuration,
                RecordingUrl
            });

            if (RecordingUrl && CallSid) {
                // Update the call record with the actual recording URL
                const { error } = await supabase
                    .from('calls')
                    .update({
                        recording_url: `${RecordingUrl}.mp3`, // Append .mp3 for direct playback
                        duration: parseInt(RecordingDuration) || null
                    })
                    .eq('recording_url', `sid:${CallSid}`);

                if (error) {
                    console.error('[Recording] Failed to update call with recording URL:', error.message);
                } else {
                    console.log(`[Recording] Updated call ${CallSid} with recording URL`);
                }
            }

            reply.code(200).send({ success: true });
        } catch (err) {
            console.error('[Recording] Callback error:', err);
            reply.code(500).send({ error: 'Recording callback failed' });
        }
    });
}

module.exports = registerTwilioRoutes;
