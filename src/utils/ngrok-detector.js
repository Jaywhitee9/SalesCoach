const https = require('http'); // Check using http for localhost:4040

/**
 * Queries the local ngrok API to find the active public URL.
 * Returns null if not found or error.
 */
async function detectNgrokUrl() {
    return new Promise((resolve) => {
        const req = https.get('http://localhost:4040/api/tunnels', (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    // Look for the first https tunnel
                    const tunnel = parsed.tunnels.find(t => t.proto === 'https');
                    if (tunnel) {
                        resolve(tunnel.public_url);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            // Ngrok is likely not running or API port is different
            resolve(null);
        });

        // Fast timeout
        req.setTimeout(500, () => {
            req.destroy();
            resolve(null);
        });
    });
}

module.exports = detectNgrokUrl;
