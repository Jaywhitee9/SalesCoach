const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

// System prompt defining the AI Sales Expert persona
const SYSTEM_PROMPT = `אתה מומחה מכירות ו-Revenue Operations עם נסיון של 20 שנה ב-B2B.
המטרה שלך: לנתח ליד (Lead) ולקבוע ציון איכות (0-100), סיכויי סגירה, והמלצות קונקרטיות לפעולה.

עליך להחזיר תשובה בפורמט JSON בלבד:
{
    "score": 85,
    "fit": 90, // התאמה פרופיל
    "activity": 80, // רמת מעורבות
    "intent": 85, // כוונת רכישה
    "reasoning": "הליד מראה כוונות רכישה גבוהות...", // הסבר קצר (1-3 משפטים) בעברית
    "recommendations": [ // 3 פעולות קונקרטיות וספציפיות לליד הזה
        "שלח דוגמה ל-ROI כפי שעלה בשיחה",
        "תאם פגישה עם מנהל הטכנולוגיות",
        "הדגש את יכולות האינטגרציה בשיחה הבאה"
    ]
}`;

class AiScoreService {

    /**
     * Generate an AI Score for a lead based on profile and history
     * @param {Object} lead - The lead object
     * @param {Array} history - List of past activities
     * @param {Array} calls - List of past calls (including transcripts)
     * @param {Array} summaries - List of past call summaries (AI feedback)
     */
    static async generateLeadScore(lead, history = [], calls = [], summaries = []) {
        try {
            console.log(`[AiScore] Analyzing lead: ${lead.name} (${lead.company})`);

            // 1. Construct the prompt
            const prompt = this.buildPrompt(lead, history, calls, summaries);

            // 2. Call OpenAI
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            });

            // 3. Parse result
            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error('Empty response from AI');

            const result = JSON.parse(content);
            console.log(`[AiScore] Generated score: ${result.score}`);

            return {
                success: true,
                ...result
            };

        } catch (error) {
            console.error('[AiScore] Error generating score:', error);
            // Fallback to basic deterministic score if AI fails
            return {
                success: false,
                error: error.message,
                score: 50,
                reasoning: "שגיאה בניתוח AI, אנא נסה שנית מאוחר יותר.",
                recommendations: [
                    "נסה ליצור קשר שוב",
                    "בדוק את פרטי הליד",
                    "שלח מייל מעקב"
                ]
            };
        }
    }

    /**
     * Build the context prompt for the AI
     */
    static buildPrompt(lead, history, calls, summaries) {
        // Summarize general history
        const recentActivity = history.slice(0, 5).map(h => {
            return `- ${new Date(h.created_at).toLocaleDateString()}: ${h.type} (${h.data?.notes || 'No notes'})`;
        }).join('\n');

        // Summarize Calls Context
        let callsContext = "אין שיחות מתועדות.";
        if (calls && calls.length > 0) {
            callsContext = calls.slice(0, 3).map(call => {
                const summary = summaries.find(s => s.call_id === call.id);
                // Format transcript interleaving agent/customer
                const transcriptFormatted = this.formatTranscript(call.transcript);

                return `
📞 שיחה מתאריך ${new Date(call.created_at).toLocaleDateString()} (${call.direction}, ${call.duration}s):
- סטטוס: ${call.status}
- סיכום AI: ${summary?.summary_text || 'לא זמין'}
- סנטימנט: ${summary?.sentiment || 'לא ידוע'}
- נקודות מפתח: ${summary?.key_points?.join(', ') || 'אין'}
- תמצית תמלול:
${transcriptFormatted}
                `;
            }).join('\n---\n');
        }

        return `אנא נתח את הליד הבא וקבע ציון איכות והמלצות לפעולה:

📋 **פרופיל הליד:**
- שם: ${lead.name}
- חברה: ${lead.company || 'לא צוין'}
- תפקיד: ${lead.title || 'לא צוין'}
- מקור הגעה: ${lead.source || 'לא ידוע'}
- סטטוס נוכחי: ${lead.status}
- עדיפות נוכחית: ${lead.priority}
- ערך משוער: ${lead.value}

📅 **היסטוריית פעילות אחרונה:**
${recentActivity || 'אין פעילות מתועדת עדיין.'}

💬 **ניתוח שיחות עומק (Deep Dive):**
${callsContext}

**הנחיות לניתוח:**
1. **Fit (התאמה):** האם הלקוח מתאים לפרופיל האידיאלי (חברה, תפקיד, תקציב)?
2. **Activity (מעורבות):** האם יש תקשורת דו-כיוונית? האם הם עונים לשיחות/מיילים?
3. **Intent (כוונות):** האם הביעו רצון להתקדם בשיחות? מה היה הסנטימנט בשיחות האחרונות?
4. **Recommendations (המלצות):** חובה לתת 3 המלצות שנובעות ישירות מתוכן השיחות וההתנגדויות שעלו. למשל: "טפל בהתנגדות המחיר שעלתה בשיחה האחרונה ע"י שליחת ROI".

תן ציון משוקלל, הסבר, והמלצות.`;
    }

    /**
     * Helper to format transcript object into readable conversation
     */
    static formatTranscript(transcript) {
        if (!transcript || typeof transcript !== 'object') return "No transcript available";

        const agentSegments = (transcript.agent || []).map(s => ({ ...s, speaker: 'Agent' }));
        const customerSegments = (transcript.customer || transcript.user || []).map(s => ({ ...s, speaker: 'Customer' }));

        // Merge and sort by timestamp
        const allSegments = [...agentSegments, ...customerSegments]
            .sort((a, b) => a.timestamp - b.timestamp);

        if (allSegments.length === 0) return "Empty transcript";

        // Join text with speaker labels
        // Limit to 2500 characters to fit in context window but give enough detail
        return allSegments
            .map(s => `[${s.speaker}]: ${s.text}`)
            .join('\n')
            .substring(0, 2500) + (allSegments.length > 20 ? "..." : "");
    }
}

module.exports = AiScoreService;
