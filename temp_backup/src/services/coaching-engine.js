const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

class CoachingEngine {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL
        });
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    }

    /**
     * Load organization knowledge (with caching)
     * @param {string} organizationId 
     * @param {string} domain - 'sales' | 'support' | 'success'
     */
    async loadOrgKnowledge(organizationId, domain = 'sales') {
        try {
            const supabase = require('../lib/supabase');
            const { data, error } = await supabase
                .from('organization_knowledge')
                .select('knowledge_type, title, content')
                .eq('organization_id', organizationId)
                .eq('domain', domain)
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (error) {
                console.error('[Coaching] Failed to load knowledge:', error.message);
                return {};
            }

            // Organize knowledge by type for easy access
            const organized = {
                product: [],
                objections: [],
                competitors: [],
                processes: [],
                terminology: {},
                success_stories: []
            };

            (data || []).forEach(item => {
                switch (item.knowledge_type) {
                    case 'product_info':
                        organized.product.push(item.content);
                        break;
                    case 'objections':
                        organized.objections.push(item.content);
                        break;
                    case 'competitors':
                        organized.competitors.push(item.content);
                        break;
                    case 'processes':
                        organized.processes.push(item.content);
                        break;
                    case 'terminology':
                        Object.assign(organized.terminology, item.content);
                        break;
                    case 'success_stories':
                        organized.success_stories.push(item.content);
                        break;
                }
            });

            console.log(`[Coaching] Loaded knowledge for org ${organizationId}:`, {
                product: organized.product.length,
                objections: organized.objections.length,
                competitors: organized.competitors.length
            });

            return organized;
        } catch (err) {
            console.error('[Coaching] Knowledge load error:', err.message);
            return {};
        }
    }

    /**
     * Main entry point for generating coaching
     * @param {Object} callState - The full call state object
     * @param {Object} accountConfig - The tenant's configuration object  
     * @param {Array} conversationHistory - Sorted array of {role, text}
     */
    async generateCoaching(callState, accountConfig, conversationHistory) {
        const { callSid } = callState;

        // === LOAD USER SETTINGS ===
        const settings = accountConfig?.calls_config || {};
        const customStages = accountConfig?.stages_config || [
            "פתיחה והיכרות",
            "גילוי צרכים והבנת כאב",
            "הצגת חזון ופתרון",
            "טיפול בהתנגדויות",
            "הצעת מחיר וסגירה"
        ];

        // Coaching Weights (defaults if not set)
        const weights = settings.coachingWeights || { discovery: 70, objections: 50, closing: 85 };

        // Model Selection & Provider Routing
        const useAnthropic = settings.aiModel === 'advanced';
        const model = useAnthropic
            ? 'claude-3-5-sonnet-20241022'
            : (settings.aiModel === 'pro' ? 'gpt-4o' : 'gp-4o-mini');

        console.log(`[Coaching] Using ${useAnthropic ? 'Anthropic' : 'OpenAI'} model: ${model}, Stages: ${customStages.length}, Weights:`, weights);

        // 1. Format conversation for LLM
        const conversationText = conversationHistory
            .map((entry) => {
                const roleHebrew = entry.role === 'agent' ? 'נציג מכירות' : 'לקוח';
                return `${roleHebrew}: ${entry.text}`;
            })
            .join("\n");

        if (!conversationText) return null;

        // Build dynamic system prompt
        const stagesList = customStages.map((s, i) => `- "${s}" (Stage ${i + 1})`).join('\n');

        const weightInstructions = `
**COACHING FOCUS AREAS (Emphasis Levels):**
- Discovery/Needs Analysis: ${weights.discovery}% → ${weights.discovery > 70 ? 'HIGH PRIORITY' : weights.discovery > 50 ? 'Medium' : 'Low'}
- Objection Handling: ${weights.objections}% → ${weights.objections > 70 ? 'HIGH PRIORITY' : weights.objections > 50 ? 'Medium' : 'Low'}
- Closing Skills: ${weights.closing}% → ${weights.closing > 70 ? 'HIGH PRIORITY' : weights.closing > 50 ? 'Medium' : 'Low'}

When giving advice, PRIORITIZE the areas marked as HIGH PRIORITY above.
`;

        const systemPrompt = `
You are "SalesCoach AI" — an expert real-time **Hebrew B2B sales coach**.

**PARTICIPANTS:**
- נציג מכירות (Agent) = The salesperson you're coaching
- לקוח (Customer) = The prospect

---

## YOUR ANALYSIS TASKS:

### 1. CALL STAGE DETECTION
Identify the CURRENT stage from the organization's custom sales process. Choose EXACTLY ONE:
${stagesList}

${weightInstructions}

### 2. COMPETITOR & OBJECTION DETECTION (BATTLE CARDS)
**Scan for:**

**COMPETITORS** - Detect mentions of:
- Salesforce, HubSpot, Pipedrive, Monday, Zoho, Microsoft Dynamics
- "המערכת הנוכחית", "הספק שלנו כרגע"

**COMMON OBJECTIONS** - Detect phrases:
- Price: "יקר", "אין תקציב", "מעל התקציב"
- Timing: "לא עכשיו", "בעתיד", "אחרי..."
- Decision: "צריך לחשוב", "צריך להתייעץ"
- Competition: "כבר יש לנו", "עובדים עם..."
- Need: "לא מעניין", "לא רלוונטי"

If competitor/objection detected, provide battle card response.

### 3. SIGNAL EXTRACTION
Extract SPECIFIC items mentioned by the CUSTOMER:

**כאבים (Pains)** — Problems, frustrations
**התנגדויות (Objections)** — Resistance, barriers
**פערים (Gaps)** — Current vs desired state
**חזון (Vision)** — Goals, outcomes

### 4. ACTIONABLE COACHING
1-2 sentences of PRACTICAL advice. Be SPECIFIC.

### 5. SUGGESTED REPLY
ONE ready-to-use reply in natural Hebrew (max 2 sentences).

### 6. NEXT BEST ACTIONS
List 1-3 specific things to do next.

---

## DETAILED QUALITY SCORING:

Provide BOTH overall score AND breakdown:

**BREAKDOWN CATEGORIES (0-100 each):**
1. **Discovery**: Quality of questions, uncovering needs
2. **Listening**: Talk/listen ratio, active listening
3. **Objection Handling**: How well objections addressed
4. **Closing**: Moving toward commitment

**OVERALL**: Average of breakdown scores

---

## OUTPUT FORMAT (JSON ONLY):
{
  "stage": "<stage_name>",
  "score": number,
  "score_breakdown": {
    "discovery": number,
    "listening": number,
    "objection_handling": number,
    "closing": number
  },
  "message": "string (HEBREW advice)",
  "suggested_reply": "string (HEBREW response)",
  "next_actions": ["string"],
  "battle_card": {
    "triggered": boolean,
    "type": "competitor" | "objection" | null,
    "detected": "string (e.g., 'Salesforce', 'יקר מדי')",
    "response": "string (counter in Hebrew)",
    "tips": ["string"]
  },
  "signals": {
    "pains": [{"text": "string", "severity": "high"|"medium"|"low"}],
    "objections": [{"text": "string", "status": "open"|"handled"}],
    "gaps": [{"text": "string"}],
    "vision": [{"text": "string"}]
  }
}

**RULES:**
- JSON ONLY
- All text in HEBREW except field names
- Focus on LAST 2-3 exchanges
- If no battle card: battle_card.triggered = false
`;

        try {
            let content;

            if (useAnthropic) {
                const response = await this.anthropic.messages.create({
                    model: model,
                    max_tokens: 1200,
                    system: systemPrompt,
                    messages: [
                        { role: "user", content: `Current Conversation:\n${conversationText}\n\nRespond ONLY with valid JSON.` }
                    ],
                    temperature: 0.2
                });

                content = response.content[0].text;
            } else {
                const response = await this.openai.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Current Conversation:\n${conversationText}` },
                    ],
                    response_format: { type: "json_object" },
                    max_tokens: model.includes('mini') ? 600 : 800,
                    temperature: 0.2,
                });

                content = response.choices[0].message.content;
            }

            let advice;

            try {
                advice = JSON.parse(content);
            } catch (e) {
                console.error(`[Coaching] Failed to parse JSON for ${callSid}`, content);
                return null;
            }

            // Validation
            if (!advice.stage || typeof advice.score !== 'number' || !advice.message) {
                console.warn('[Coaching] Invalid response structure', advice);
                return null;
            }

            // Log signals & battle cards
            const signalCounts = {
                pains: advice.signals?.pains?.length || 0,
                objections: advice.signals?.objections?.length || 0,
                gaps: advice.signals?.pains?.length || 0,
                vision: advice.signals?.vision?.length || 0
            };

            console.log(`[Coaching] ${callSid}: Stage=${advice.stage}, Score=${advice.score}`, {
                breakdown: advice.score_breakdown,
                signals: signalCounts,
                battleCard: advice.battle_card?.triggered ? advice.battle_card.detected : 'none'
            });

            return {
                type: 'coaching',
                stage: advice.stage,
                score: advice.score,
                score_breakdown: advice.score_breakdown || {},
                message: advice.message,
                suggested_reply: advice.suggested_reply || '',
                next_actions: advice.next_actions || [],
                battle_card: advice.battle_card || { triggered: false },
                signals: advice.signals || { pains: [], objections: [], gaps: [], vision: [] },
                severity: advice.score < 50 ? 'critical' : advice.score < 70 ? 'warning' : 'info'
            };

        } catch (err) {
            console.error(`[Coaching] Error generating advice:`, err.message);
            return {
                type: 'coaching',
                stage: "בירור צרכים",
                score: 50,
                score_breakdown: {},
                message: "",
                suggested_reply: "",
                next_actions: [],
                battle_card: { triggered: false },
                signals: { pains: [], objections: [], gaps: [], vision: [] },
                severity: 'error'
            };
        }
    }

    /**
     * Generate final call summary
     * @param {Object} callState 
     */
    async generateSummary(callState) {
        const { callSid, transcripts } = callState;

        const mixedHistory = [
            ...transcripts.customer.map(t => ({ role: 'customer', text: t.text, timestamp: t.timestamp })),
            ...transcripts.agent.map(t => ({ role: 'agent', text: t.text, timestamp: t.timestamp }))
        ].sort((a, b) => a.timestamp - b.timestamp);

        const conversationText = mixedHistory
            .map((entry) => {
                const roleHebrew = entry.role === 'agent' ? 'נציג מכירות' : 'לקוח';
                return `${roleHebrew}: ${entry.text}`;
            })
            .join("\n");

        if (!conversationText) return null;

        const systemPrompt = `
You are an expert **Sales Quality Assurance Analyst**.
Analyze a sales call transcript and produce a professional summary in Hebrew.

# OUTPUT FORMAT (JSON ONLY):
{
  "score": number,
  "is_success": boolean,
  "summary": "string (3-paragraph summary in Hebrew)",
  "key_points": {
       "positive": ["string"],
       "improvements": ["string"],
       "objections": ["string"]
  },
  "next_steps": ["string"],
  "customer_sentiment": "Positive" | "Neutral" | "Negative"
}
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: conversationText }
                ],
                response_format: { type: "json_object" },
                max_tokens: 1000,
                temperature: 0.3
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error(`[Coaching] Summary Failed:`, e.message);
            return null;
        }
    }
}

module.exports = new CoachingEngine();
