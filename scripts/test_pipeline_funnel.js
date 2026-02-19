require('dotenv').config();
const DBService = require('../src/services/db-service');

async function main() {
    const orgId = '98881ac3-bed5-4fc6-84af-099668c6cc9b'; // Org ID from previous debug
    const userId = null; // Funnel for whole org usually

    console.log('Testing getPipelineFunnel...');
    try {
        const funnel = await DBService.getPipelineFunnel(userId, 'month', orgId);
        console.log('Funnel Result:', JSON.stringify(funnel, null, 2).substring(0, 500) + '...');
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
}

main();
