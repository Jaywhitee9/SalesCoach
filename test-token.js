require('dotenv').config();
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY_SID;
const apiSecret = process.env.TWILIO_API_KEY_SECRET;
const appSid = process.env.TWILIO_TWIML_APP_SID;
const identity = 'test_user_123';

console.log('--- Twilio Token Test ---');
console.log('Account SID:', accountSid ? '✅ Present' : '❌ Missing');
console.log('API Key:', apiKey ? '✅ Present' : '❌ Missing');
console.log('API Secret:', apiSecret ? '✅ Present' : '❌ Missing');
console.log('App SID:', appSid ? '✅ Present' : '❌ Missing');

if (!accountSid || !apiKey || !apiSecret || !appSid) {
    console.error('❌ Cannot generate token: Missing environment variables.');
    process.exit(1);
}

try {
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: identity });
    const grant = new VoiceGrant({
        outgoingApplicationSid: appSid,
        incomingAllow: true,
    });
    token.addGrant(grant);

    console.log('✅ Token generated successfully!');
    console.log('Make sure these credentials belong to the SAME Twilio account!');
    console.log('Token starts with:', token.toJwt().substring(0, 20) + '...');
} catch (error) {
    console.error('❌ Error generating token:', error.message);
}
