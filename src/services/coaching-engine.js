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
        this.knowledgeCache = new Map();
        this.leadContextCache = new Map();
        this.KNOWLEDGE_CACHE_TTL = 5 * 60 * 1000;
        this.LEAD_CACHE_TTL = 3 * 60 * 1000;
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

    async getCachedKnowledge(organizationId, domain = 'sales') {
        const cacheKey = `${organizationId}_${domain}`;
        const cached = this.knowledgeCache.get(cacheKey);
        if (cached && (Date.now() - cached.loadedAt) < this.KNOWLEDGE_CACHE_TTL) {
            return cached.data;
        }
        const data = await this.loadOrgKnowledge(organizationId, domain);
        this.knowledgeCache.set(cacheKey, { data, loadedAt: Date.now() });
        return data;
    }

    async loadLeadContext(leadId) {
        if (!leadId || leadId === 'unknown') return null;

        const cached = this.leadContextCache.get(leadId);
        if (cached && (Date.now() - cached.loadedAt) < this.LEAD_CACHE_TTL) {
            return cached.data;
        }

        try {
            const supabase = require('../lib/supabase');

            const [leadResult, callsResult, summariesResult] = await Promise.all([
                supabase
                    .from('leads')
                    .select('name, company, phone, email, status, priority, value, tags, source, notes')
                    .eq('id', leadId)
                    .single(),

                supabase
                    .from('calls')
                    .select('id, duration, created_at, coaching_tips, summary_json')
                    .eq('lead_id', leadId)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(5),

                supabase
                    .from('call_summaries')
                    .select('summary_text, score, created_at')
                    .eq('call_id', leadId)
                    .order('created_at', { ascending: false })
                    .limit(3)
            ]);

            const lead = leadResult.data;
            const previousCalls = callsResult.data || [];
            const summaries = summariesResult.data || [];

            const pastObjections = [];
            const pastPains = [];
            previousCalls.forEach(c => {
                if (c.coaching_tips && Array.isArray(c.coaching_tips)) {
                    c.coaching_tips.forEach(tip => {
                        if (tip.signals) {
                            (tip.signals.objections || []).forEach(o => {
                                if (!pastObjections.includes(o.text)) pastObjections.push(o.text);
                            });
                            (tip.signals.pains || []).forEach(p => {
                                if (!pastPains.includes(p.text)) pastPains.push(p.text);
                            });
                        }
                    });
                }
            });

            const context = {
                lead,
                callCount: previousCalls.length,
                summaries: summaries.map(s => s.summary_text).filter(Boolean),
                pastObjections: pastObjections.slice(0, 5),
                pastPains: pastPains.slice(0, 5),
                averageScore: summaries.length > 0
                    ? Math.round(summaries.reduce((s, c) => s + (c.score || 0), 0) / summaries.length)
                    : null,
                lastCallDate: previousCalls[0]?.created_at || null
            };

            this.leadContextCache.set(leadId, { data: context, loadedAt: Date.now() });
            console.log(`[Coaching] Lead context loaded: ${lead?.name} (${previousCalls.length} previous calls)`);
            return context;
        } catch (err) {
            console.error('[Coaching] Lead context load error:', err.message);
            return null;
        }
    }

    buildKnowledgeBlock(knowledge) {
        if (!knowledge || Object.keys(knowledge).length === 0) return '';

        const sections = [];

        if (knowledge.product?.length > 0) {
            const productText = knowledge.product.map(p =>
                typeof p === 'string' ? p : JSON.stringify(p)
            ).join('\n');
            sections.push(`**PRODUCT/SERVICE INFO:**\n${productText}`);
        }

        if (knowledge.competitors?.length > 0) {
            const compText = knowledge.competitors.map(c =>
                typeof c === 'string' ? c : JSON.stringify(c)
            ).join('\n');
            sections.push(`**COMPETITOR INTELLIGENCE:**\n${compText}`);
        }

        if (knowledge.objections?.length > 0) {
            const objText = knowledge.objections.map(o =>
                typeof o === 'string' ? o : JSON.stringify(o)
            ).join('\n');
            sections.push(`**OBJECTION PLAYBOOKS:**\n${objText}`);
        }

        if (knowledge.success_stories?.length > 0) {
            const storyText = knowledge.success_stories.slice(0, 2).map(s =>
                typeof s === 'string' ? s : JSON.stringify(s)
            ).join('\n');
            sections.push(`**SUCCESS STORIES (use as social proof):**\n${storyText}`);
        }

        if (sections.length === 0) return '';
        return `\n---\n## ORGANIZATION KNOWLEDGE BASE:\n${sections.join('\n\n')}\n\nUSE this knowledge to give SPECIFIC, product-aware advice. Reference real product features, competitor weaknesses, and proven objection responses.\n`;
    }

    buildLeadContextBlock(leadContext) {
        if (!leadContext) return '';

        const parts = [];

        if (leadContext.lead) {
            const l = leadContext.lead;
            parts.push(`**LEAD INFO:** ${l.name || 'Unknown'}${l.company ? ` from ${l.company}` : ''} | Status: ${l.status || 'New'} | Priority: ${l.priority || 'N/A'} | Value: ${l.value || 'N/A'}${l.source ? ` | Source: ${l.source}` : ''}`);
            if (l.notes) parts.push(`**NOTES:** ${l.notes}`);
        }

        if (leadContext.callCount > 0) {
            parts.push(`**HISTORY:** ${leadContext.callCount} previous calls${leadContext.averageScore ? `, avg score: ${leadContext.averageScore}` : ''}${leadContext.lastCallDate ? `, last call: ${new Date(leadContext.lastCallDate).toLocaleDateString('he-IL')}` : ''}`);

            if (leadContext.summaries?.length > 0) {
                parts.push(`**PREVIOUS CALL SUMMARIES:**\n${leadContext.summaries.slice(0, 2).join('\n')}`);
            }
            if (leadContext.pastObjections.length > 0) {
                parts.push(`**KNOWN OBJECTIONS FROM PAST:** ${leadContext.pastObjections.join(', ')}`);
            }
            if (leadContext.pastPains.length > 0) {
                parts.push(`**KNOWN PAINS:** ${leadContext.pastPains.join(', ')}`);
            }
        }

        if (parts.length === 0) return '';
        return `\n---\n## LEAD CONTEXT (THIS CUSTOMER):\n${parts.join('\n')}\n\nUSE this context: reference previous conversations, address known objections proactively, build on established rapport.\n`;
    }

    buildPreviousAdviceBlock(callState) {
        if (!callState.previousAdvice || callState.previousAdvice.length === 0) return '';

        const recent = callState.previousAdvice.slice(-3);
        const adviceText = recent.map((a, i) => {
            const status = a.followed ? 'FOLLOWED' : 'NOT YET FOLLOWED';
            return `${i + 1}. [${status}] "${a.message}"`;
        }).join('\n');

        return `\n---\n## YOUR PREVIOUS ADVICE THIS CALL:\n${adviceText}\n\n**RULES:**
- Do NOT repeat advice already given
- If agent FOLLOWED your advice, briefly acknowledge ("יפה שהתחלת לשאול שאלות פתוחות")
- If agent IGNORED advice, escalate urgency
- Give NEW, DIFFERENT advice each time\n`;
    }

    buildCompactContext(conversationHistory, callState) {
        const allHistory = conversationHistory;
        const recentExchanges = allHistory.slice(-6);

        const recentText = recentExchanges
            .map(entry => {
                const roleHebrew = entry.role === 'agent' ? 'נציג' : 'לקוח';
                return `${roleHebrew}: ${entry.text}`;
            })
            .join("\n");

        let contextSummary = '';
        if (allHistory.length > 6) {
            const earlierPart = allHistory.slice(0, -6);
            const agentUtterances = earlierPart.filter(e => e.role === 'agent').length;
            const customerUtterances = earlierPart.filter(e => e.role === 'customer').length;
            contextSummary = `[Earlier in call: ${earlierPart.length} exchanges (agent: ${agentUtterances}, customer: ${customerUtterances})]`;
        }

        const accumulatedSignals = callState.accumulatedSignals || {};
        let signalsSummary = '';
        const painsList = accumulatedSignals.pains || [];
        const objectionsList = accumulatedSignals.objections || [];
        const visionList = accumulatedSignals.vision || [];
        if (painsList.length > 0 || objectionsList.length > 0 || visionList.length > 0) {
            const parts = [];
            if (painsList.length > 0) parts.push(`Pains: ${painsList.map(p => p.text).join(', ')}`);
            if (objectionsList.length > 0) parts.push(`Objections: ${objectionsList.map(o => `${o.text}(${o.status})`).join(', ')}`);
            if (visionList.length > 0) parts.push(`Vision: ${visionList.map(v => v.text).join(', ')}`);
            signalsSummary = `\n[Accumulated Signals: ${parts.join(' | ')}]`;
        }

        let scoreContext = '';
        if (callState.lastScore !== undefined && callState.lastScore !== null) {
            scoreContext = `\n[Current Score: ${callState.lastScore} | Stage: ${callState.currentStage || 'unknown'}]`;
        }

        const talkRatio = this.calculateTalkRatio(allHistory);
        let talkRatioText = '';
        if (talkRatio) {
            talkRatioText = `\n[Talk Ratio - Agent: ${talkRatio.agentPercent}% | Customer: ${talkRatio.customerPercent}%]`;
        }

        return {
            text: `${contextSummary}\n\n--- RECENT CONVERSATION ---\n${recentText}${signalsSummary}${scoreContext}${talkRatioText}`,
            tokenEstimate: recentText.length / 4
        };
    }

    calculateTalkRatio(history) {
        if (!history || history.length < 4) return null;
        let agentChars = 0;
        let customerChars = 0;
        history.forEach(e => {
            if (e.role === 'agent') agentChars += (e.text || '').length;
            else customerChars += (e.text || '').length;
        });
        const total = agentChars + customerChars;
        if (total === 0) return null;
        return {
            agentPercent: Math.round((agentChars / total) * 100),
            customerPercent: Math.round((customerChars / total) * 100)
        };
    }

    /**
     * Main entry point for generating coaching
     * @param {Object} callState - The full call state object
     * @param {Object} accountConfig - The tenant's configuration object  
     * @param {Array} conversationHistory - Sorted array of {role, text}
     */
    async generateCoaching(callState, accountConfig, conversationHistory) {
        const { callSid } = callState;
        const startTime = Date.now();

        const settings = accountConfig?.calls_config || {};
        const customStages = accountConfig?.stages_config || [
            "פתיחה והיכרות",
            "גילוי צרכים והבנת כאב",
            "הצגת חזון ופתרון",
            "טיפול בהתנגדויות",
            "הצעת מחיר וסגירה"
        ];

        const weights = settings.coachingWeights || { discovery: 70, objections: 50, closing: 85 };

        const useAnthropic = settings.aiModel === 'advanced';
        const model = useAnthropic
            ? 'claude-3-5-sonnet-20241022'
            : (settings.aiModel === 'pro' ? 'gpt-4o' : 'gpt-4o-mini');

        const orgId = callState.context?.agent?.organizationId || accountConfig?.organizationId;
        const leadId = accountConfig?.leadProfile?.id;
        const agentId = callState.agentId;

        const contextLoadStart = Date.now();
        const [orgKnowledge, leadContext, repProfile, provenResponses] = await Promise.all([
            orgId ? this.getCachedKnowledge(orgId) : Promise.resolve({}),
            leadId ? this.loadLeadContext(leadId) : Promise.resolve(null),
            agentId ? this.loadRepProfile(agentId) : Promise.resolve(null),
            orgId ? this.loadProvenResponses(orgId) : Promise.resolve(null)
        ]);
        const contextLoadTime = Date.now() - contextLoadStart;

        if (!callState.previousAdvice) callState.previousAdvice = [];
        if (!callState.accumulatedSignals) callState.accumulatedSignals = { pains: [], objections: [], gaps: [], vision: [] };
        if (callState.lastScore === undefined) callState.lastScore = null;

        const compactCtx = this.buildCompactContext(conversationHistory, callState);
        const knowledgeBlock = this.buildKnowledgeBlock(orgKnowledge);
        const leadBlock = this.buildLeadContextBlock(leadContext);
        const adviceBlock = this.buildPreviousAdviceBlock(callState);
        const repBlock = this.buildRepProfileBlock(repProfile);
        const provenBlock = this.buildProvenResponsesBlock(provenResponses);

        console.log(`[Coaching] ${callSid}: Context loaded in ${contextLoadTime}ms | Using ${useAnthropic ? 'Anthropic' : 'OpenAI'} model: ${model} | Org knowledge: ${Object.keys(orgKnowledge).length > 0 ? 'YES' : 'NO'} | Lead context: ${leadContext ? 'YES' : 'NO'} | Rep profile: ${repProfile ? 'YES' : 'NO'} | Proven responses: ${provenResponses ? 'YES' : 'NO'}`);

        if (!compactCtx.text.trim()) return null;

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

${knowledgeBlock}
${leadBlock}
${adviceBlock}
${repBlock}
${provenBlock}

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

### 4. BUYING SIGNALS DETECTION
Detect customer readiness to buy:
- **strong**: "בואו נסגור", "מה המחיר?", "מתי אפשר להתחיל?", "אני מוכן"
- **medium**: שאלות על תנאי תשלום, שאלות מפורטות על התקנה/הטמעה, השוואה ספציפית
- **weak**: "מעניין", "אפשר לשמוע עוד?", "תשלחו חומר"
- **none**: no buying signals detected

If buying signal is "strong" or "medium" AND agent is NOT moving to closing — your advice MUST push toward closing.

### 5. EMOTIONAL TONE TRACKING
Evaluate the customer's emotional state in the last 2-3 exchanges:
- **positive**: enthusiastic, interested, engaged, agreeing
- **neutral**: informational, asking questions, no strong emotion
- **negative**: frustrated, skeptical, defensive, cold, dismissive
- **warming**: was negative/neutral, now showing more interest

If tone is "negative" — advise de-escalation and empathy before pushing value.
If tone is "warming" — advise to capitalize on the momentum.

### 6. TALK RATIO COACHING
If agent talk ratio is above 65% — coach the agent to LISTEN MORE and ASK QUESTIONS.
If agent talk ratio is below 30% — coach the agent to provide more VALUE and DIRECTION.

### 7. ACTIONABLE COACHING
1-2 sentences of PRACTICAL advice. Be SPECIFIC.
${callState.previousAdvice.length > 0 ? 'MUST be different from previous advice given.' : ''}

### 8. ADVICE FOLLOW-UP
${callState.previousAdvice.length > 0 ? `Check if the agent followed your most recent advice: "${callState.previousAdvice[callState.previousAdvice.length - 1]?.message || ''}"` : 'No previous advice given yet.'}

### 9. SUGGESTED REPLY
ONE ready-to-use reply in natural Hebrew (max 2 sentences).

### 10. NEXT BEST ACTIONS
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
    "detected": "string",
    "response": "string (counter in Hebrew)",
    "tips": ["string"]
  },
  "signals": {
    "pains": [{"text": "string", "severity": "high"|"medium"|"low"}],
    "objections": [{"text": "string", "status": "open"|"handled"}],
    "gaps": [{"text": "string"}],
    "vision": [{"text": "string"}]
  },
  "buying_signals": {
    "level": "strong" | "medium" | "weak" | "none",
    "indicators": ["string"]
  },
  "emotional_tone": "positive" | "neutral" | "negative" | "warming",
  "advice_followed": boolean | null,
  "urgency_note": "string or null"
}

**RULES:**
- JSON ONLY
- All text in HEBREW except field names
- Focus on LAST 2-3 exchanges
- If no battle card: battle_card.triggered = false
`;

        try {
            let content;
            const llmStart = Date.now();

            // Log prompt size for performance monitoring
            const promptSize = systemPrompt.length + compactCtx.text.length;
            console.log(`[Coaching] ${callSid}: Prompt size: ${promptSize} chars (~${Math.round(promptSize/4)} tokens)`);

            if (useAnthropic) {
                const response = await this.anthropic.messages.create({
                    model: model,
                    max_tokens: 1400,
                    system: systemPrompt,
                    messages: [
                        { role: "user", content: `${compactCtx.text}\n\nRespond ONLY with valid JSON.` }
                    ],
                    temperature: 0.2
                });

                content = response.content[0].text;
            } else {
                const response = await this.openai.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: compactCtx.text },
                    ],
                    response_format: { type: "json_object" },
                    max_tokens: model.includes('mini') ? 800 : 1000,
                    temperature: 0.2,
                });

                content = response.choices[0].message.content;
            }

            const llmTime = Date.now() - llmStart;
            console.log(`[Coaching] ${callSid}: LLM response received in ${llmTime}ms`);

            let advice;

            try {
                advice = JSON.parse(content);
            } catch (e) {
                console.error(`[Coaching] Failed to parse JSON for ${callSid}`, content);
                return null;
            }

            if (!advice.stage || typeof advice.score !== 'number' || !advice.message) {
                console.warn('[Coaching] Invalid response structure', advice);
                return null;
            }

            if (advice.signals) {
                const acc = callState.accumulatedSignals;
                (advice.signals.pains || []).forEach(p => {
                    if (!acc.pains.find(x => x.text === p.text)) acc.pains.push(p);
                });
                (advice.signals.objections || []).forEach(o => {
                    const existing = acc.objections.find(x => x.text === o.text);
                    if (existing) existing.status = o.status;
                    else acc.objections.push(o);
                });
                (advice.signals.gaps || []).forEach(g => {
                    if (!acc.gaps.find(x => x.text === g.text)) acc.gaps.push(g);
                });
                (advice.signals.vision || []).forEach(v => {
                    if (!acc.vision.find(x => x.text === v.text)) acc.vision.push(v);
                });
            }

            callState.previousAdvice.push({
                message: advice.message,
                timestamp: Date.now(),
                followed: null
            });

            if (advice.advice_followed !== undefined && advice.advice_followed !== null && callState.previousAdvice.length >= 2) {
                callState.previousAdvice[callState.previousAdvice.length - 2].followed = advice.advice_followed;
            }

            callState.lastScore = advice.score;
            callState.currentStage = advice.stage;

            const signalCounts = {
                pains: advice.signals?.pains?.length || 0,
                objections: advice.signals?.objections?.length || 0,
                gaps: advice.signals?.gaps?.length || 0,
                vision: advice.signals?.vision?.length || 0
            };

            console.log(`[Coaching] ${callSid}: Stage=${advice.stage}, Score=${advice.score}, Buying=${advice.buying_signals?.level || 'none'}, Tone=${advice.emotional_tone || 'unknown'}`, {
                breakdown: advice.score_breakdown,
                signals: signalCounts,
                battleCard: advice.battle_card?.triggered ? advice.battle_card.detected : 'none',
                adviceFollowed: advice.advice_followed
            });

            const totalTime = Date.now() - startTime;
            console.log(`[Coaching] ${callSid}: Total generation time: ${totalTime}ms (context: ${contextLoadTime}ms, LLM: ${llmTime}ms)`);

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
                buying_signals: advice.buying_signals || { level: 'none', indicators: [] },
                emotional_tone: advice.emotional_tone || 'neutral',
                advice_followed: advice.advice_followed,
                urgency_note: advice.urgency_note || null,
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
                buying_signals: { level: 'none', indicators: [] },
                emotional_tone: 'neutral',
                advice_followed: null,
                urgency_note: null,
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
        const startTime = Date.now();

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

        console.log(`[Summary] ${callSid}: Starting summary generation - transcript length: ${conversationText.length} chars (~${Math.round(conversationText.length/4)} tokens), ${mixedHistory.length} exchanges`);

        const systemPrompt = `
You are an expert **Sales Quality Assurance Analyst**.
Analyze a sales call transcript and produce a CONCISE, ACTIONABLE summary in Hebrew.

# RULES:
- Summary must be SHORT - maximum 3 bullet points
- Focus only on WHAT HAPPENED and WHAT TO DO NEXT
- Skip generic observations, be SPECIFIC
- **CRITICAL**: If a deal amount/price is mentioned in the conversation, extract it to the "deal_amount" field

# DEAL AMOUNT EXTRACTION:
- Look for ANY mention of prices, amounts, or deal values (e.g., "699 שקל", "5000₪", "$100", "חמישה אלפים")
- Convert to numbers only (no currency symbols)
- If multiple amounts mentioned, use the FINAL/AGREED amount
- If no amount mentioned, set to null
- Common patterns: "סוכם מחיר", "העסקה בשווי", "זה יעלה", "המחיר הוא"

# AUTO-STATUS SUGGESTION:
Based on the call outcome, suggest a lead status change:
- "Closed Won" — if deal was closed, customer agreed, payment discussed
- "Closed Lost" — if customer explicitly refused, said not interested
- "Follow Up" — if customer wants to think, needs another call, asked for materials
- "Negotiation" — if price/terms discussed but not finalized
- "Not Relevant" — if customer clearly not a fit
- null — if current status should remain unchanged

Also suggest a follow-up date if relevant:
- "tomorrow" — urgent follow-up needed
- "3_days" — standard follow-up
- "1_week" — customer asked for time
- "2_weeks" — low urgency
- null — no follow-up needed

# KEY MOMENTS ANALYSIS:
Identify 2-4 pivotal moments that changed the direction of the call. For each:
- **type**: "turning_point" | "missed_opportunity" | "objection_handled" | "buying_signal" | "rapport_built" | "objection_raised"
- **description**: One sentence in HEBREW explaining what happened
- **impact**: "positive" (helped the sale) | "negative" (hurt the sale)

Focus on REAL, SPECIFIC moments — not generic observations.

# MICRO-LESSON:
Based on the agent's WEAKEST area in this call, generate a short learning tip:
- Identify the weakest score_breakdown category
- Give ONE specific, actionable tip in HEBREW (2-3 sentences max)
- Include ONE example phrase the agent could have used in THIS call
- Make it practical and immediately usable

# OUTPUT FORMAT (JSON ONLY):
{
  "score": number,
  "is_success": boolean,
  "summary": "string (3 SHORT bullet points in Hebrew, use • for bullets)",
  "deal_amount": number | null,
  "score_breakdown": {
    "discovery": number,
    "listening": number,
    "objection_handling": number,
    "closing": number
  },
  "key_points": {
       "positive": ["string (max 2)"],
       "improvements": ["string (max 2)"],
       "objections": ["string (only if mentioned)"]
  },
  "next_steps": ["string (1-2 specific actions)"],
  "customer_sentiment": "Positive" | "Neutral" | "Negative",
  "suggested_status": "Closed Won" | "Closed Lost" | "Follow Up" | "Negotiation" | "Not Relevant" | null,
  "suggested_followup": "tomorrow" | "3_days" | "1_week" | "2_weeks" | null,
  "followup_reason": "string (HEBREW, why this follow-up timing)" | null,
  "key_moments": [
    { "type": "string", "description": "string (HEBREW)", "impact": "positive" | "negative" }
  ],
  "micro_lesson": {
    "weak_area": "discovery" | "listening" | "objection_handling" | "closing",
    "title": "string (HEBREW, short title)",
    "tip": "string (HEBREW, 2-3 sentences of practical advice)",
    "example_phrase": "string (HEBREW, a ready-to-use phrase the agent could say)"
  }
}
`;

        try {
            const llmStart = Date.now();
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

            const llmTime = Date.now() - llmStart;
            const totalTime = Date.now() - startTime;
            
            const result = JSON.parse(response.choices[0].message.content);
            console.log(`[Summary] ${callSid}: Summary generated in ${totalTime}ms (LLM: ${llmTime}ms) - Score: ${result.score}, Status: ${result.suggested_status || 'none'}`);
            
            return result;
        } catch (e) {
            console.error(`[Coaching] Summary Failed:`, e.message);
            return null;
        }
    }

    async generatePreCallBrief(leadId) {
        if (!leadId) return null;

        try {
            const leadContext = await this.loadLeadContext(leadId);
            if (!leadContext || !leadContext.lead) {
                return { brief: 'אין מידע זמין על ליד זה', sections: {} };
            }

            if (leadContext.callCount === 0) {
                return {
                    brief: `שיחה ראשונה עם ${leadContext.lead.name || 'הליד'}`,
                    sections: {
                        lead_info: `${leadContext.lead.name}${leadContext.lead.company ? ' מ-' + leadContext.lead.company : ''}`,
                        previous_calls: 'אין שיחות קודמות - זו שיחה ראשונה',
                        suggested_opening: `היי ${leadContext.lead.name || ''}, שמח לדבר איתך! איך אני יכול לעזור לך היום?`,
                        tips: ['התחל בהיכרות קצרה', 'שאל שאלות פתוחות כדי להבין את הצרכים', 'אל תמהר להציג מוצר - קודם תבין את הכאב']
                    }
                };
            }

            const summariesText = leadContext.summaries.slice(0, 3).join('\n\n');
            const objectionsText = leadContext.pastObjections.join(', ');
            const painsText = leadContext.pastPains.join(', ');

            const prompt = `
Generate a pre-call brief for a sales rep about to call a returning lead. Keep it SHORT and ACTIONABLE.

LEAD: ${leadContext.lead.name}${leadContext.lead.company ? ' from ' + leadContext.lead.company : ''}
STATUS: ${leadContext.lead.status || 'Unknown'}
PREVIOUS CALLS: ${leadContext.callCount}
AVERAGE SCORE: ${leadContext.averageScore || 'N/A'}
LAST CALL: ${leadContext.lastCallDate ? new Date(leadContext.lastCallDate).toLocaleDateString('he-IL') : 'Unknown'}

PREVIOUS SUMMARIES:
${summariesText || 'None'}

KNOWN OBJECTIONS: ${objectionsText || 'None'}
KNOWN PAINS: ${painsText || 'None'}
NOTES: ${leadContext.lead.notes || 'None'}

OUTPUT FORMAT (JSON ONLY):
{
  "previous_discussion": "string (1-2 sentences HEBREW: what was discussed last time)",
  "key_pains": ["string (known customer pains)"],
  "open_objections": ["string (unresolved objections from past calls)"],
  "avoid": ["string (what NOT to do based on history)"],
  "suggested_opening": "string (HEBREW: recommended opening line that references past conversation)",
  "strategy": "string (HEBREW: 2-3 sentences on recommended approach for this call)"
}
`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a sales strategy advisor. Output JSON only. All text in HEBREW.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 600,
                temperature: 0.3
            });

            const brief = JSON.parse(response.choices[0].message.content);

            return {
                brief: `תדריך לשיחה עם ${leadContext.lead.name}`,
                lead: leadContext.lead,
                callCount: leadContext.callCount,
                lastCallDate: leadContext.lastCallDate,
                averageScore: leadContext.averageScore,
                sections: brief
            };
        } catch (err) {
            console.error('[Coaching] Pre-call brief error:', err.message);
            return null;
        }
    }

    async generateRepInsights(analytics) {
        if (!analytics) return null;

        try {
            const prompt = `
Analyze this sales rep's performance data and provide personalized insights in HEBREW.

PERFORMANCE DATA:
- Strengths: ${JSON.stringify(analytics.strengths)}
- Weaknesses: ${JSON.stringify(analytics.weaknesses)}
- Objection success rates: ${JSON.stringify(analytics.objectionSuccessRate)}
- Stage conversion: ${JSON.stringify(analytics.stageConversion)}
- Improvement trend: last week avg ${analytics.improvementTrend?.lastWeek || 'N/A'}, this week avg ${analytics.improvementTrend?.thisWeek || 'N/A'}
- Top struggles: ${JSON.stringify(analytics.topStruggles)}
- Total calls analyzed: ${analytics.totalCalls || 0}

OUTPUT FORMAT (JSON ONLY):
{
  "insights": [
    "string (HEBREW, specific insight about their performance)",
    "string (HEBREW, another insight)",
    "string (HEBREW, encouragement or alert)"
  ],
  "weekly_focus": "string (HEBREW, one specific thing to focus on this week)",
  "improvement_plan": [
    "string (HEBREW, step 1)",
    "string (HEBREW, step 2)",
    "string (HEBREW, step 3)"
  ]
}
`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a sales performance coach. All text in HEBREW. Be specific and actionable. JSON only.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 500,
                temperature: 0.3
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (err) {
            console.error('[Coaching] Rep insights error:', err.message);
            return null;
        }
    }

    async loadRepProfile(agentId) {
        if (!agentId) return null;

        const cacheKey = `rep_${agentId}`;
        const cached = this.leadContextCache.get(cacheKey);
        if (cached && (Date.now() - cached.loadedAt) < this.KNOWLEDGE_CACHE_TTL) {
            return cached.data;
        }

        try {
            const DBService = require('./db-service');
            const analytics = await DBService.getRepAnalytics(agentId, 30);
            if (!analytics || analytics.totalCalls < 3) return null;

            const profile = {
                weakAreas: analytics.weaknesses.slice(0, 2),
                strongAreas: analytics.strengths.slice(0, 2),
                objectionSuccessRate: analytics.objectionSuccessRate,
                topStruggles: analytics.topStruggles
            };

            this.leadContextCache.set(cacheKey, { data: profile, loadedAt: Date.now() });
            return profile;
        } catch (err) {
            console.error('[Coaching] Rep profile load error:', err.message);
            return null;
        }
    }

    buildRepProfileBlock(repProfile) {
        if (!repProfile) return '';

        const parts = [];

        if (repProfile.weakAreas?.length > 0) {
            const weakText = repProfile.weakAreas.map(w => `${w.area} (avg ${w.avgScore}/100, ${w.trend})`).join(', ');
            parts.push(`**WEAK AREAS — EMPHASIZE coaching here:** ${weakText}`);
        }

        if (repProfile.strongAreas?.length > 0) {
            const strongText = repProfile.strongAreas.map(s => `${s.area} (avg ${s.avgScore}/100)`).join(', ');
            parts.push(`**STRONG AREAS — acknowledge when done well:** ${strongText}`);
        }

        if (repProfile.objectionSuccessRate && Object.keys(repProfile.objectionSuccessRate).length > 0) {
            const objText = Object.entries(repProfile.objectionSuccessRate)
                .map(([type, rate]) => `${type}: ${Math.round(Number(rate) * 100)}%`)
                .join(', ');
            parts.push(`**OBJECTION SUCCESS RATES:** ${objText}`);
        }

        if (repProfile.topStruggles?.length > 0) {
            parts.push(`**TOP STRUGGLES:** ${repProfile.topStruggles.join(', ')}`);
        }

        if (parts.length === 0) return '';
        return `\n---\n## REP PERSONAL PROFILE (THIS AGENT):\n${parts.join('\n')}\n\nTailor your coaching to this rep's specific weaknesses. Give EXTRA attention to weak areas.\n`;
    }

    async loadProvenResponses(organizationId) {
        if (!organizationId) return null;

        const cacheKey = `proven_${organizationId}`;
        const cached = this.knowledgeCache.get(cacheKey);
        if (cached && (Date.now() - cached.loadedAt) < 30 * 60 * 1000) {
            return cached.data;
        }

        try {
            const DBService = require('./db-service');
            const analytics = await DBService.getObjectionAnalytics(organizationId);
            if (!analytics || !analytics.objections) return null;

            const proven = {};
            for (const [type, data] of Object.entries(analytics.objections)) {
                if (data.topResponses && data.topResponses.length > 0) {
                    proven[type] = data.topResponses.slice(0, 2);
                }
            }

            this.knowledgeCache.set(cacheKey, { data: proven, loadedAt: Date.now() });
            return proven;
        } catch (err) {
            console.error('[Coaching] Proven responses load error:', err.message);
            return null;
        }
    }

    buildProvenResponsesBlock(provenResponses) {
        if (!provenResponses || Object.keys(provenResponses).length === 0) return '';

        const lines = [];
        for (const [type, responses] of Object.entries(provenResponses)) {
            responses.forEach(r => {
                lines.push(`- ${type} objection: "${r.response}" → ${Math.round(r.successRate * 100)}% success rate`);
            });
        }

        if (lines.length === 0) return '';
        return `\n---\n## PROVEN OBJECTION RESPONSES (from your team's real data):\n${lines.join('\n')}\n\nWhen these objection types come up, PREFER these proven responses.\n`;
    }
}

module.exports = new CoachingEngine();
