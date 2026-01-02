const OpenAI = require("openai");

class CoachingEngine {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL
        });
    }

    /**
     * Main entry point for generating coaching
     * @param {Object} callState - The full call state object
     * @param {Object} accountConfig - The tenant's configuration object
     * @param {Array} conversationHistory - Sorted array of {role, text}
     */
    async generateCoaching(callState, accountConfig, conversationHistory) {
        const { callSid } = callState;

        // 1. Format conversation for LLM
        // Map roles to Hebrew for the context
        const conversationText = conversationHistory
            .map((entry) => {
                const roleHebrew = entry.role === 'agent' ? 'נציג מכירות' : 'לקוח';
                return `${roleHebrew}: ${entry.text}`;
            })
            .join("\n");

        if (!conversationText) return null;

        const systemPrompt = `
You are "SalesCoach AI" — an expert real-time **Hebrew B2B sales coach**.
You analyze live sales conversations and provide **actionable, practical advice**.

**PARTICIPANTS:**
- נציג מכירות (Agent) = The salesperson you're coaching
- לקוח (Customer) = The prospect

---

## YOUR ANALYSIS TASKS:

### 1. CALL STAGE DETECTION
Identify the CURRENT stage. Choose EXACTLY ONE:
- "פתיחה" — Opening, first contact
- "בירור צרכים" — Discovery, understanding needs
- "סגירה" — Closing, asking for commitment
- "טיפול בהתנגדויות" — Handling objections

### 2. REAL-TIME SIGNAL EXTRACTION
Extract SPECIFIC items mentioned by the CUSTOMER:

**כאבים (Pains)** — Problems, frustrations, complaints
Examples: "מבזבזים הרבה זמן", "המערכת הנוכחית איטית", "אין לי שליטה"

**התנגדויות (Objections)** — Resistance, barriers, concerns
Examples: "יקר לנו", "אין תקציב", "צריך לחשוב", "לא עכשיו", "יש לנו כבר פתרון"

**פערים (Gaps)** — Distance between current state and desired state
Examples: "רוצים X אבל יש לנו Y", "המטרה שלנו... אבל היום..."

**חזון (Vision)** — Goals, dreams, desired outcomes
Examples: "רוצים לגדול", "חייבים לשפר", "המטרה שלנו", "אם היינו יכולים..."

### 3. ACTIONABLE COACHING
Write 1-2 sentences of PRACTICAL advice for the agent.
- Be SPECIFIC to what just happened
- Tell them EXACTLY what to do next
- Use simple, direct Hebrew
- No generic praise, only actionable guidance

### 4. SUGGESTED REPLY
Provide ONE ready-to-use reply the agent can say NOW.
- Natural spoken Hebrew
- Addresses the current situation
- Maximum 2 sentences
- NO prefixes like "אתה יכול לומר:"

### 5. NEXT BEST ACTIONS
List 1-3 specific things the agent should do next.
Short, actionable items only.

---

## QUALITY SCORING (0-100):
- 90-100: Excellent — Building rapport, asking great questions, handling objections smoothly
- 70-89: Good — Following the process, some missed opportunities
- 50-69: Average — Talking too much, not enough discovery
- Below 50: Needs improvement — Disconnected, pushy, missing signals

---

## OUTPUT FORMAT (JSON ONLY):
{
  "stage": "פתיחה" | "בירור צרכים" | "סגירה" | "טיפול בהתנגדויות",
  "score": number,
  "message": "string (HEBREW practical advice)",
  "suggested_reply": "string (HEBREW ready-to-use response)",
  "next_actions": ["string", "string"],
  "signals": {
    "pains": [{"text": "string", "severity": "high" | "medium" | "low"}],
    "objections": [{"text": "string", "status": "open" | "handled"}],
    "gaps": [{"text": "string"}],
    "vision": [{"text": "string"}]
  }
}

**IMPORTANT RULES:**
- Respond ONLY in valid JSON
- All text in HEBREW except field names
- Focus on the LAST 2-3 exchanges for immediate advice
- Ignore transcription errors, focus on intent
- If no clear signals, use empty arrays []
`;

        try {
            // 2. LLM CALL
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Current Conversation:\n${conversationText}` },
                ],
                response_format: { type: "json_object" },
                max_tokens: 600, // Increased for structured signals
                temperature: 0.2, // Lower for more consistent detection
            });

            const content = response.choices[0].message.content;
            let advice;

            try {
                advice = JSON.parse(content);
            } catch (e) {
                console.error(`[Coaching] Failed to parse JSON for ${callSid}`, content);
                return null;
            }

            // 3. VALIDATION - Updated for new structure
            if (!advice.stage || typeof advice.score !== 'number' || !advice.message) {
                console.warn('[Coaching] Invalid response structure', advice);
                return null;
            }

            // Log signals found
            const signalCounts = {
                pains: advice.signals?.pains?.length || 0,
                objections: advice.signals?.objections?.length || 0,
                gaps: advice.signals?.gaps?.length || 0,
                vision: advice.signals?.vision?.length || 0
            };
            console.log(`[Coaching] ${callSid}: Stage=${advice.stage}, Score=${advice.score}, Signals=${JSON.stringify(signalCounts)}`);

            return {
                type: 'coaching',
                stage: advice.stage,
                score: advice.score,
                message: advice.message,
                suggested_reply: advice.suggested_reply || '',
                next_actions: advice.next_actions || [],
                signals: advice.signals || { pains: [], objections: [], gaps: [], vision: [] },
                severity: advice.score < 50 ? 'critical' : advice.score < 70 ? 'warning' : 'info'
            };

        } catch (err) {
            console.error(`[Coaching] Error generating advice:`, err.message);
            // Return safe fallback so we don't crash
            return {
                type: 'coaching',
                stage: "בירור צרכים",
                score: 50,
                message: "",
                suggested_reply: "",
                next_actions: [],
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

        // Merge history
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
Your task is to analyze a sales call transcript and produce a high-level professional summary in Hebrew.

# ANALYSIS GOALS:
1. **Executive Summary**: A concise 2-3 sentence overview of the call's purpose and outcome.
2. **Key Topics**: Bullet points of main subjects discussed.
3. **Sentiment & Objections**:
   - Customer sentiment (Positive/Neutral/Negative).
   - Main objections raised and how they were handled.
4. **Next Steps**: Concrete action items for the agent.

# OUTPUT FORMAT (JSON ONLY):
{
  "score": number, // 0-100 based on process adherence and outcome
  "is_success": boolean, // Was the objective achieved?
  "summary": "string", // Professional 3-paragraph summary in Hebrew
  "key_points": {
       "positive": ["string", "string"], // What went well
       "improvements": ["string", "string"], // Coaching opportunities
       "objections": ["string"] // Specific objections raised
  },
  "next_steps": ["string", "string"], // Actionable follow-ups
  "customer_sentiment": "Positive" | "Neutral" | "Negative"
}

# TONE & STYLE:
- Professional, objective, and constructive.
- Focus on business value and outcomes.
- WRITE ONLY IN HEBREW.
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

            const content = response.choices[0].message.content;
            return JSON.parse(content);

        } catch (e) {
            console.error(`[Coaching] Summary Generation Failed:`, e.message);
            return null;
        }
    }
}

module.exports = new CoachingEngine();
