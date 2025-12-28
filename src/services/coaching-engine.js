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
You are "SalesCoach", a real-time **Hebrew sales call coach**.
The conversation is between:
- Agent = נציג מכירות
- Customer = לקוח

Your tasks:
1. Detect the current stage of the call – choose ONE of:
   - "פתיחה"
   - "יצירת קשר אישי"
   - "גילוי צרכים"
   - "הצגת פתרון"
   - "הצגת מחיר"
   - "טיפול בהתנגדויות"
   - "סגירה"
   - "לא ברור"

2. Give a **quality score** from 0 to 100 that reflects how well the AGENT is handling the call so far (0=Garbage, 100=Excellent).

3. Write a short **coaching message** (2–3 sentences) in HEBREW:
   - Direct and simple language.
   - Specific to what the agent did well or needs to improve.
   - No academic language or excessive flattery.

4. Generate ONE **suggested reply** that the AGENT can say NOW:
   - Natural spoken Hebrew.
   - One or two sentences max.
   - Adapted to the current stage.
   - Just the text, no prefixes like "You can say:".

**RULES:**
- Ignore system tags like <end>.
- Focus on content, ignore minor transcription errors.
- Respond ONLY in this JSON format:
{
  "stage": "string",
  "score": number,
  "message": "string",
  "suggested_reply": "string",
  "signals": [{ "type": "pain" | "interest" | "objection" | "positive", "label": "string" }]
}
`;

        try {
            // 2. LLM CALL
            const response = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview", // Or gpt-3.5-turbo if latency is an issue
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Current Conversation:\n${conversationText}` },
                ],
                response_format: { type: "json_object" },
                max_tokens: 300,
                temperature: 0.3,
            });

            const content = response.choices[0].message.content;
            let advice;

            try {
                advice = JSON.parse(content);
            } catch (e) {
                console.error(`[Coaching] Failed to parse JSON for ${callSid}`, content);
                return null;
            }

            // 3. VALIDATION
            if (!advice.stage || typeof advice.score !== 'number' || !advice.message || !advice.suggested_reply) {
                console.warn('[Coaching] Invalid response structure', advice);
                return null;
            }

            console.log(`[Coaching] Insight for ${callSid}: Stage=${advice.stage}, Score=${advice.score}`);
            return {
                type: 'coaching',
                stage: advice.stage,
                score: advice.score,
                message: advice.message,
                suggested_reply: advice.suggested_reply,
                severity: advice.score < 60 ? 'warning' : 'info'
            };

        } catch (err) {
            console.error(`[Coaching] Error generating advice:`, err.message);
            // Return safe fallback so we don't crash
            return {
                type: 'coaching',
                stage: "לא ברור",
                score: 0,
                message: "",
                suggested_reply: "",
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
You are a **Sales Call Evaluator**.
Analyze the FULL conversation and provide a structured summary in HEBREW.

Output structured JSON:
{
  "score": number, // 0-100 final score
  "is_success": boolean, // Did they achieve the goal?
  "key_points": {
       "positive": ["string", "string"], // 2-3 Good things
       "improvements": ["string", "string"] // 2-3 Things to improve
  },
  "summary": "string" // 1-2 sentences summary
}
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: conversationText }
                ],
                response_format: { type: "json_object" },
                max_tokens: 400,
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
