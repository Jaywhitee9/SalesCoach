const WebSocket = require('ws');

const SONIOX_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

class SonioxService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        if (!this.apiKey) {
            console.error('[Soniox] CRITICAL: SONIOX_API_KEY is missing! Transcription will fail.');
        }
    }

    createSession(callSid, track, onTranscript) {
        // track is 'inbound' (customer) or 'outbound' (agent)

        // Config as requested - HEBREW OPTIMIZED
        // Using Universal v3 model found via API query
        const model = process.env.SONIOX_MODEL || "stt-rt-v3";

        // Config matching Soniox v3 Real-time docs
        const config = {
            api_key: this.apiKey,
            model: model,

            // Audio format
            audio_format: "mulaw",
            sample_rate: 8000,
            num_channels: 1,

            // Languages: Hebrew only (Strict)
            // v3 uses hints to guide the universal model
            language_hints: ["he"],
            enable_language_identification: false, // Turn off ID to force Hebrew focus

            // Features
            enable_endpoint_detection: true,
            enable_speaker_diarization: false
        };

        console.log("[Soniox] Creating stream for", callSid, track, {
            model: config.model,
            languages: config.language_hints,
            sampleRateHz: config.sample_rate,
        });

        const ws = new WebSocket(SONIOX_URL);

        // State for Deduplication
        let lastFinalText = "";
        let lastPartialText = "";
        let lastBroadcastTime = 0;

        // Audio Buffer for pre-connection packets
        let audioBuffer = [];

        ws.on('open', () => {
            console.log(`[Soniox] Opening stream for ${callSid} (${track}) using model: ${config.model}`);
            ws.send(JSON.stringify(config));

            // Flush buffer
            if (audioBuffer.length > 0) {
                console.log(`[Soniox] Flushing ${audioBuffer.length} buffered audio packets for ${callSid} (${track})`);
                audioBuffer.forEach(packet => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(packet);
                });
                audioBuffer = [];
            } else {
                console.log(`[Soniox] No audio buffered for ${callSid} (${track})`);
            }
        });

        // ... existing 'message' handler ...

        ws.on('message', (data) => {
            // ... existing code ...
            // (Copy existing message handler entirely or ensure checking line numbers closely)
            try {
                const response = JSON.parse(data);

                if (response.error_code) {
                    console.error(`[Soniox] API Error for ${callSid} (${track}): ${response.error_code} - ${response.error_message}`);
                    return;
                }

                if (!response.tokens) return;

                const finalTokens = response.tokens.filter(t => t.is_final);
                const nonFinalTokens = response.tokens.filter(t => !t.is_final);

                if (finalTokens.length > 0) {
                    let finalText = finalTokens.map(t => t.text).join("").replace(/<end>/gi, '').trim();
                    if (finalText && finalText.length > 0) {
                        if (finalText === lastFinalText) { return; }
                        lastFinalText = finalText;
                        lastPartialText = "";
                        console.log("[Coach-Transcript] Outgoing FINAL", { callId: callSid, role: track, text: finalText.slice(0, 50) });
                        onTranscript(finalText, true);
                    }
                }

                if (nonFinalTokens.length > 0) {
                    let partialText = nonFinalTokens.map(t => t.text).join("").replace(/<end>/gi, '').trim();

                    // DEBUG: Check for excessive duplication
                    // if (partialText.length > 50) console.log(`[Soniox-Debug] Raw Partial: "${partialText}"`);

                    if (partialText && partialText.length > 0) {
                        if (partialText === lastPartialText) return;
                        lastPartialText = partialText;
                        onTranscript(partialText, false);
                    }
                }
            } catch (e) {
                console.error(`[Soniox] Error parsing message for ${callSid}:`, e);
            }
        });

        // ... existing 'error' and 'close' handlers ...
        ws.on('error', (err) => {
            console.error(`[Soniox] Error for ${callSid} (${track}):`, err.message);
        });

        ws.on('close', () => {
            console.log(`[Soniox] Closed for ${callSid} (${track})`);
        });

        return {
            sendAudio: (audioPayload) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(audioPayload);
                } else if (ws.readyState === WebSocket.CONNECTING) {
                    audioBuffer.push(audioPayload);
                }
            },
            close: () => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }
        };
    }
}

module.exports = new SonioxService(process.env.SONIOX_API_KEY);
