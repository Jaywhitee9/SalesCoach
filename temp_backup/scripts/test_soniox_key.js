require('dotenv').config();
const WebSocket = require('ws');

const API_KEY = process.env.SONIOX_API_KEY;
const MODELS_TO_TEST = ['stt-rt-v3'];
let currentModelIndex = 0;

function testModel(model) {
    return new Promise((resolve) => {
        console.log(`\nTesting model: ${model}...`);
        const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket');

        const config = {
            api_key: API_KEY,
            model: model,
            audio_format: "mulaw",
            sample_rate: 8000,
            num_channels: 1,
            enable_endpoint_detection: true
        };

        let isSuccess = false;

        ws.on('open', () => {
            console.log('  WebSocket Connected. Sending config...');
            ws.send(JSON.stringify(config));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            if (response.error_code) {
                console.log(`  ❌ Failed: ${response.error_code} - ${response.error_message}`);
                ws.close();
            } else {
                // If we get a message without error (even empty tokens), it accepted the config
                console.log(`  ✅ Success! Model '${model}' is accepted.`);
                isSuccess = true;
                ws.close();
            }
        });

        ws.on('close', () => {
            resolve(isSuccess);
        });

        ws.on('error', (err) => {
            console.log('  ❌ Connection Error:', err.message);
            resolve(false);
        });

        // Timeout
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log('  ⚠️ Timeout (No rejected message implies success?)');
                ws.close();
                resolve(true);
            }
        }, 3000);
    });
}

async function runTests() {
    console.log("Starting Soniox Key Verification...");
    for (const model of MODELS_TO_TEST) {
        const success = await testModel(model);
        if (success) {
            console.log(`\n🎉 Found working model: "${model}"`);
            console.log("Please use this model in your configuration.");
            process.exit(0);
        }
    }
    console.log("\n❌ No working models found for this API key.");
    process.exit(1);
}

runTests();
