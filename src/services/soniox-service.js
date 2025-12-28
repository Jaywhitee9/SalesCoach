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
        // If provided via env, use it, otherwise default to Hebrew Low Latency
        const model = process.env.SONIOX_MODEL || "he_v2_lowlatency";

        // Config matching Soniox v3 Real-time docs
        const config = {
            api_key: this.apiKey,
            model: model, // Using Hebrew model

            // Audio format
            audio_format: "mulaw",
            sample_rate: 8000,
            num_channels: 1,

            // Languages: Hebrew only (Strict)
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

        ws.on('open', () => {
            console.log(`[Soniox] Opening stream for ${callSid} (${track}) using model: ${config.model}`);
            ws.send(JSON.stringify(config));
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data);

                if (response.error_code) {
                    console.error(`[Soniox] API Error for ${callSid} (${track}): ${response.error_code} - ${response.error_message}`);
                    return;
                }

                if (!response.tokens) return;

                // Separate Final and Non-Final tokens
                const finalTokens = response.tokens.filter(t => t.is_final);
                const nonFinalTokens = response.tokens.filter(t => !t.is_final);

                // 1. PROCESS FINAL UTTERANCE
                if (finalTokens.length > 0) {
                    let finalText = finalTokens.map(t => t.text).join("").replace(/<end>/gi, '').trim();

                    if (finalText && finalText.length > 0) {
                        // Dedup: Ignore if identical to last final
                        if (finalText === lastFinalText) {
                            console.log(`[Coach-Transcript] Skipped duplicate final: "${finalText.slice(0, 20)}..."`);
                            return;
                        }

                        lastFinalText = finalText;
                        lastPartialText = ""; // Reset partial tracking

                        console.log("[Coach-Transcript] Outgoing FINAL", {
                            callId: callSid,
                            role: track, // 'inbound' or 'outbound'
                            text: finalText.slice(0, 50)
                        });

                        onTranscript(finalText, true);
                    }
                }

                // 2. PROCESS PARTIAL UTTERANCE
                if (nonFinalTokens.length > 0) {
                    let partialText = nonFinalTokens.map(t => t.text).join("").replace(/<end>/gi, '').trim();

                    if (partialText && partialText.length > 0) {
                        // Dedup: Ignore if identical to last partial
                        if (partialText === lastPartialText) return;

                        // Rate Limit: Only 1 partial per 100ms per role
                        // (Optional, keeps UI fresher but cheaper)
                        // const now = Date.now();
                        // if (now - lastBroadcastTime < 100) return;
                        // lastBroadcastTime = now;

                        lastPartialText = partialText;

                        // We check confidence here? Soniox tokens have confidence?
                        // If we want to filter low confidence partials:
                        // const avgConf = nonFinalTokens.reduce((sum, t) => sum + (t.confidence || 0), 0) / nonFinalTokens.length;
                        // if (avgConf < 0.6) return; // Example

                        onTranscript(partialText, false);
                    }
                }

            } catch (e) {
                console.error(`[Soniox] Error parsing message for ${callSid}:`, e);
            }
        });

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
