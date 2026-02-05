/**
 * AI Daily Coaching Service
 * מאמן מכירות AI מקצועי - מבוסס על SPIN, Challenger Sale, MEDDIC
 */

const OpenAI = require('openai');
const DBService = require('./db-service');

const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `אתה מאמן מכירות AI מתקדם המתמחה במתודולוגיות SPIN Selling, Challenger Sale ו-MEDDIC.

### עקרונות הליבה שלך:
- מבוסס על נתונים כמותיים ואיכותיים
- ממוקד בשיפור מדיד ומעשי
- משתמש בשפה ישירה, ברורה ופרקטית בעברית
- מזהה דפוסים חוזרים ומפתח אסטרטגיות
- נותן טיפים קונקרטיים שאפשר ליישם מיד

כל התשובות שלך בעברית.`;

class DailyCoachingService {

    /**
     * Generate daily focus and golden tip based on yesterday's performance
     * NOTE: OpenAI calls temporarily disabled to save API credits
     * The fallback provides pre-written professional sales tips
     */
    static async generateDailyCoaching() {
        // TEMPORARILY DISABLED - using fallback to save OpenAI credits
        // To re-enable, uncomment the code below and remove the return statement
        return this.getFallbackCoaching();

        /*
        try {
            // 1. Get yesterday's data
            const yesterdayData = await this.getYesterdayData();

            // 2. Build the analysis prompt
            const analysisPrompt = this.buildAnalysisPrompt(yesterdayData);

            // 3. Call GPT-4o
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: analysisPrompt }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });

            const content = response.choices[0]?.message?.content || '';

            // 4. Parse the response
            return this.parseCoachingResponse(content, yesterdayData);

        } catch (error) {
            console.error('[DailyCoaching] Error:', error);
            return this.getFallbackCoaching();
        }
        */
    }

    /**
     * Get yesterday's call summaries and stats
     */
    static async getYesterdayData() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Get call summaries from yesterday
            const { data: summaries } = await supabase
                .from('call_summaries')
                .select('*')
                .gte('created_at', yesterday.toISOString())
                .lt('created_at', today.toISOString());

            // Get calls from yesterday
            const { data: calls } = await supabase
                .from('calls')
                .select('*')
                .gte('created_at', yesterday.toISOString())
                .lt('created_at', today.toISOString());

            const totalCalls = calls?.length || 0;
            const successfulCalls = summaries?.filter(s => s.successful)?.length || 0;
            const avgScore = summaries?.length > 0
                ? Math.round(summaries.reduce((a, s) => a + (s.score || 0), 0) / summaries.length)
                : 0;

            // Extract objections from summaries
            const objections = [];
            const strengths = [];
            const improvements = [];

            summaries?.forEach(summary => {
                if (summary.key_objections) {
                    objections.push(...(Array.isArray(summary.key_objections) ? summary.key_objections : []));
                }
                if (summary.strengths) {
                    strengths.push(...(Array.isArray(summary.strengths) ? summary.strengths : []));
                }
                if (summary.improvements) {
                    improvements.push(...(Array.isArray(summary.improvements) ? summary.improvements : []));
                }
            });

            // Count objection frequency
            const objectionCounts = {};
            objections.forEach(obj => {
                const key = obj.toLowerCase().trim();
                objectionCounts[key] = (objectionCounts[key] || 0) + 1;
            });

            const topObjections = Object.entries(objectionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([text, count]) => ({ text, count }));

            return {
                totalCalls,
                successfulCalls,
                conversionRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
                avgScore,
                topObjections,
                strengths: [...new Set(strengths)].slice(0, 5),
                improvements: [...new Set(improvements)].slice(0, 5),
                hasData: totalCalls > 0
            };

        } catch (error) {
            console.error('[DailyCoaching] Error fetching data:', error);
            return { hasData: false, totalCalls: 0 };
        }
    }

    /**
     * Build the analysis prompt for GPT
     */
    static buildAnalysisPrompt(data) {
        if (!data.hasData) {
            return `אין נתונים מאתמול. צור טיפים כלליים למכירות מבוססי Best Practices.

החזר בפורמט JSON:
{
    "dailyFocus": [
        {"text": "נקודת מיקוד 1", "why": "הסבר קצר"},
        {"text": "נקודת מיקוד 2", "why": "הסבר קצר"}
    ],
    "goldenTip": {
        "title": "כותרת הטיפ",
        "content": "תוכן הטיפ המפורט",
        "example": "דוגמה לשימוש"
    }
}`;
        }

        const objectionsText = data.topObjections.length > 0
            ? data.topObjections.map(o => `- "${o.text}" (${o.count} פעמים)`).join('\n')
            : 'לא זוהו התנגדויות ספציפיות';

        const strengthsText = data.strengths.length > 0
            ? data.strengths.map(s => `- ${s}`).join('\n')
            : 'לא זוהו חוזקות ספציפיות';

        const improvementsText = data.improvements.length > 0
            ? data.improvements.map(i => `- ${i}`).join('\n')
            : 'לא זוהו נקודות לשיפור ספציפיות';

        return `## נתוני ביצועים מאתמול:

📊 **סטטיסטיקות:**
- סה"כ שיחות: ${data.totalCalls}
- שיחות מוצלחות: ${data.successfulCalls}
- אחוז המרה: ${data.conversionRate}%
- ציון איכות ממוצע: ${data.avgScore}/100

🔴 **התנגדויות שחזרו:**
${objectionsText}

✅ **מה עבד בשיחות המוצלחות:**
${strengthsText}

🔧 **נקודות לשיפור שזוהו:**
${improvementsText}

---

בהתבסס על הנתונים האלה, צור דשבורד אימון יומי.

**החזר בפורמט JSON בלבד:**
{
    "dailyFocus": [
        {
            "text": "נקודת מיקוד ספציפית ומעשית",
            "why": "הסבר קצר למה זה חשוב (מבוסס על הדאטה)"
        },
        {
            "text": "נקודת מיקוד שנייה",
            "why": "הסבר קצר"
        }
    ],
    "goldenTip": {
        "title": "כותרת קצרה וקליטה",
        "content": "טיפ מפורט ופרקטי שאפשר ליישם מיד - 2-3 משפטים",
        "example": "דוגמה לדיאלוג או שימוש בטכניקה"
    },
    "stats": {
        "calls": ${data.totalCalls},
        "conversion": ${data.conversionRate},
        "score": ${data.avgScore}
    }
}`;
    }

    /**
     * Parse GPT response to structured data
     */
    static parseCoachingResponse(content, originalData) {
        try {
            // Try to extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    dailyFocus: parsed.dailyFocus || [],
                    goldenTip: parsed.goldenTip || {},
                    stats: originalData,
                    generatedAt: new Date().toISOString()
                };
            }
        } catch (e) {
            console.warn('[DailyCoaching] JSON parse failed, using raw content');
        }

        // Fallback: return raw content
        return {
            success: true,
            dailyFocus: [
                { text: 'שאל על התקציב מוקדם יותר בשיחה', why: 'מבוסס על ביצועי אתמול' },
                { text: 'וודא צעד הבא ברור לפני סיום', why: 'לשפר המרות' }
            ],
            goldenTip: {
                title: 'טיפ זהב',
                content: content.slice(0, 200),
                example: ''
            },
            stats: originalData,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Fallback coaching when AI fails
     */
    static getFallbackCoaching() {
        const tips = [
            {
                dailyFocus: [
                    { text: 'שאל על התקציב מוקדם יותר בשיחה', why: 'לקוחות שמדברים על מחיר מוקדם בשלים יותר' },
                    { text: 'וודא צעד הבא ברור לפני סיום השיחה', why: 'מעלה את אחוזי ההמרה משמעותית' }
                ],
                goldenTip: {
                    title: 'שיטת ה-ROI המוקדם',
                    content: 'לקוחות ששואלים על מחיר בתחילת השיחה הם לרוב בשלים יותר. אל תחששי לדבר על ROI מוקדם.',
                    example: '"לפני שנדבר על מחיר, בוא נבין כמה זה עולה לך היום לא לפתור את הבעיה הזו"'
                }
            },
            {
                dailyFocus: [
                    { text: 'הקשב יותר, דבר פחות - יחס 70/30', why: 'הלקוח צריך לדבר רוב הזמן' },
                    { text: 'זהה את הכאב האמיתי לפני הצעת פתרון', why: 'מונע התנגדויות בהמשך' }
                ],
                goldenTip: {
                    title: 'שאלת הקסם',
                    content: 'כששומעים התנגדות, תמיד שאל "מה עוד?" - לרוב ההתנגדות הראשונה היא לא האמיתית.',
                    example: '"הבנתי שהמחיר גבוה. חוץ מזה, מה עוד מטריד אותך?"'
                }
            }
        ];

        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        return {
            success: true,
            ...randomTip,
            stats: { hasData: false },
            generatedAt: new Date().toISOString(),
            isFallback: true
        };
    }
}

module.exports = DailyCoachingService;
