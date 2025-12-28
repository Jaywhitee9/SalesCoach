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

const AGENTS = {
    'ag_1': { agentId: 'ag_1', accountId: 'acc_DemoCorp', name: 'Alon Coin' },
    'ag_2': { agentId: 'ag_2', accountId: 'acc_SalesPro', name: 'John Doe' }
};

// Deterministic Mapping: "Whenever calls come to THIS number, it's THIS agent/account"
const PHONE_MAPPING = {
    '+1234567890': 'ag_1',
    'default': 'ag_1'
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
