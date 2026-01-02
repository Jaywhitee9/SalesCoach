// MOCK DATABASE / TENANT STORE
// In a real app, this would query a DB (Postgres/Mongo)

const ACCOUNTS = {
    'acc_DemoCorp': {
        accountId: 'acc_DemoCorp',
        name: 'Demo Corp Call Center',
        config: {
            language: 'Hebrew',
            coachingResponseTime: 3000, // min ms between events
            maxTipsPerCall: 5,
            rules: {
                objection_handling: true,
                tone_check: true
            },
            systemPrompt: `You are a strict sales coach for "Demo Corp".
Your advise must be short, professional, and in Hebrew.
Focus on closing techniques and empathy.`
        }
    },
    'acc_SalesPro': {
        accountId: 'acc_SalesPro',
        name: 'Sales Pro Ltd',
        config: {
            language: 'English',
            coachingResponseTime: 5000,
            maxTipsPerCall: 3,
            rules: {
                upsell_reminders: true
            },
            systemPrompt: `You are an aggressive sales coach for "Sales Pro".
Push for the close. Keep advice in English.`
        }
    }
};

// Real Agent IDs from Supabase profiles table
const AGENTS = {
    // Primary agent - a@a.com
    '21e26622-06f8-459b-b812-36414754d5e9': {
        agentId: '21e26622-06f8-459b-b812-36414754d5e9',
        accountId: 'acc_DemoCorp',
        name: 'Alon Coin',
        organizationId: '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
    },
    // rep@salesflow.ai
    'c165a009-76e4-4c4f-a817-78f73cef2ba4': {
        agentId: 'c165a009-76e4-4c4f-a817-78f73cef2ba4',
        accountId: 'acc_DemoCorp',
        name: 'Sales Rep',
        organizationId: '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
    },
    // manager@salesflow.ai
    'd97c0deb-8ef6-4b7e-8fa3-5d1ea442ae02': {
        agentId: 'd97c0deb-8ef6-4b7e-8fa3-5d1ea442ae02',
        accountId: 'acc_DemoCorp',
        name: 'Manager',
        organizationId: '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
    },
    // Legacy fallback
    'system': {
        agentId: '21e26622-06f8-459b-b812-36414754d5e9',
        accountId: 'acc_DemoCorp',
        name: 'System (Default)',
        organizationId: '2633560c-d5f0-4eee-bd34-6b1c5b16faa3'
    }
};

// Default mapping - all calls go to primary agent
const PHONE_MAPPING = {
    'default': '21e26622-06f8-459b-b812-36414754d5e9'
};

class TenantStore {
    getAgent(identifier) {
        const agentId = PHONE_MAPPING[identifier] || PHONE_MAPPING['default'];
        return AGENTS[agentId];
    }

    getAccount(accountId) {
        return ACCOUNTS[accountId];
    }

    // Helper to resolve full context from a start event or `To`/`From` number
    resolveContext(callParams) {
        // For now, we assume simple resolution
        const agent = this.getAgent(callParams.From || 'default');
        if (!agent) throw new Error("Unknown Agent");

        const account = this.getAccount(agent.accountId);
        if (!account) throw new Error("Unknown Account");

        console.log(`[TenantStore] Resolved: ${agent.name} (${account.name})`);

        return { agent, account };
    }
}

module.exports = new TenantStore();
