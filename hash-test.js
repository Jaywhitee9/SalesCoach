const crypto = require('crypto');

// Simulate createApiKey logic
const randomPart = crypto.randomBytes(24).toString('base64url');
const fullKey = `org_sk_${randomPart}`;
const keyPrefix = fullKey.substring(0, 12);
const keyHashCreated = crypto.createHash('sha256').update(fullKey).digest('hex');

console.log('--- CREATION ---');
console.log('Full Key:', fullKey);
console.log('Key Hash (stored):', keyHashCreated);

// Simulate verifyApiKey logic
const inputKey = fullKey;
const keyHashVerify = crypto.createHash('sha256').update(inputKey).digest('hex');

console.log('--- VERIFICATION ---');
console.log('Input Key:', inputKey);
console.log('Key Hash (computed):', keyHashVerify);

if (keyHashCreated === keyHashVerify) {
    console.log('SUCCESS: Hashes match.');
} else {
    console.error('FAILURE: Hashes do NOT match.');
}
