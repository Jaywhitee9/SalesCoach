
require('dotenv').config();
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const twilio = require('twilio');

async function testToken() {
    console.log('--- Testing Twilio Credentials ---');
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('API Key SID:', process.env.TWILIO_API_KEY_SID);
    console.log('API Secret length:', process.env.TWILIO_API_KEY_SECRET?.length);

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_API_KEY_SID || !process.env.TWILIO_API_KEY_SECRET) {
        console.error('❌ Missing environment variables!');
        return;
    }

    // 1. Generate Token
    const identity = 'test_user_' + Math.floor(Math.random() * 1000);
    const token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        { identity: identity }
    );

    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true,
    });
    token.addGrant(voiceGrant);
    const jwt = token.toJwt();
    console.log('✅ Token generated successfully');

    // 2. Validate Credentials by making an API call
    console.log('\n--- Validating Credentials via API ---');
    try {
        // Use the API Key and Secret to initialize the client
        // This verifies if the pair is valid and active
        const client = twilio(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, {
            accountSid: process.env.TWILIO_ACCOUNT_SID
        });

        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Credentials Valid! Connected to Account:', account.friendlyName);
        console.log('   Status:', account.status);
        console.log('   Type:', account.type);

    } catch (err) {
        console.error('❌ Credentials Validation Failed!');
        console.error('   Code:', err.code);
        console.error('   Message:', err.message);
        console.error('   More Info:', err.moreInfo);

        if (err.code === 20003) {
            console.log('\n💡 Tip: Your API Key SID or Secret might be incorrect, or the Account SID does not match.');
        }
    }
}

testToken();
