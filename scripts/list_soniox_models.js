const https = require('https');
require('dotenv').config();

const API_KEY = process.env.SONIOX_API_KEY;

function getModels() {
    const options = {
        hostname: 'api.soniox.com', // Try api.soniox.com
        path: '/v1/models', // Guessing the path
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    console.log(`Querying ${options.hostname}${options.path}...`);

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            try {
                console.log('Body:', JSON.parse(data));
            } catch (e) {
                console.log('Body:', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();
}

getModels();
