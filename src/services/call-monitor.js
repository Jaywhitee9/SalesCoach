const EventEmitter = require('events');

class CallMonitor extends EventEmitter {
    constructor() {
        super();
        this.alerts = new Map();
        this.callStates = new Map();
        this.managerSockets = new Map();
    }

    registerManagerSocket(orgId, ws) {
        if (!this.managerSockets.has(orgId)) {
            this.managerSockets.set(orgId, new Set());
        }
        this.managerSockets.get(orgId).add(ws);
        console.log(`[CallMonitor] Manager connected for org ${orgId} (${this.managerSockets.get(orgId).size} total)`);

        ws.send(JSON.stringify({
            type: 'monitor_connected',
            activeAlerts: this.getAlertsForOrg(orgId)
        }));
    }

    unregisterManagerSocket(orgId, ws) {
        if (this.managerSockets.has(orgId)) {
            this.managerSockets.get(orgId).delete(ws);
            if (this.managerSockets.get(orgId).size === 0) {
                this.managerSockets.delete(orgId);
            }
        }
    }

    broadcastToManagers(orgId, message) {
        if (!this.managerSockets.has(orgId)) return;
        const data = JSON.stringify(message);
        for (const ws of this.managerSockets.get(orgId)) {
            try {
                if (ws.readyState === 1) ws.send(data);
            } catch (e) {}
        }
    }

    onCoachingResult(callSid, coachingData, callMeta) {
        const { agentId, agentName, organizationId, leadName, callDuration } = callMeta;
        if (!organizationId) return;

        let state = this.callStates.get(callSid);
        if (!state) {
            state = {
                callSid,
                agentId,
                agentName: agentName || 'Unknown',
                organizationId,
                leadName: leadName || 'Unknown',
                startTime: Date.now(),
                coachingHistory: [],
                alertLevel: 'none',
                currentStage: null,
                stageEnteredAt: Date.now(),
                lowScoreStreak: 0,
                unhandledObjections: 0,
                customerFrustrationSignals: 0,
                lastScore: null,
                scoreHistory: [],
                buyingSignalMissed: false,
                lastBuyingSignalLevel: 'none',
                lastEmotionalTone: 'neutral'
            };
            this.callStates.set(callSid, state);
        }

        state.coachingHistory.push(coachingData);
        state.lastScore = coachingData.score;
        state.scoreHistory.push({ score: coachingData.score, timestamp: Date.now() });

        if (state.currentStage !== coachingData.stage) {
            state.stageEnteredAt = Date.now();
        }
        state.currentStage = coachingData.stage;
        state.lastBuyingSignalLevel = coachingData.buying_signals?.level || 'none';
        state.lastEmotionalTone = coachingData.emotional_tone || 'neutral';

        const analysis = this.analyzeCallState(state, coachingData, callDuration);

        if (analysis.shouldAlert) {
            this.createOrUpdateAlert(callSid, state, analysis);
        } else if (analysis.shouldResolve && this.alerts.has(callSid)) {
            this.resolveAlert(callSid);
        }

        this.broadcastToManagers(organizationId, {
            type: 'call_update',
            callSid,
            agentName: state.agentName,
            score: coachingData.score,
            stage: coachingData.stage,
            alertLevel: state.alertLevel
        });
    }

    analyzeCallState(state, coaching, callDuration) {
        const reasons = [];
        let severity = 'low';
        let shouldAlert = false;
        let shouldResolve = false;

        const score = coaching.score;
        const scoreBreakdown = coaching.score_breakdown || {};
        const signals = coaching.signals || {};
        const battleCard = coaching.battle_card || {};

        if (score < 35) {
            reasons.push({ type: 'critical_score', text: `ציון שיחה קריטי: ${score}`, severity: 'critical' });
            severity = 'critical';
            shouldAlert = true;
            state.lowScoreStreak++;
        } else if (score < 50) {
            reasons.push({ type: 'low_score', text: `ציון שיחה נמוך: ${score}`, severity: 'high' });
            if (severity !== 'critical') severity = 'high';
            shouldAlert = true;
            state.lowScoreStreak++;
        } else if (score < 65) {
            state.lowScoreStreak = Math.max(0, state.lowScoreStreak - 1);
            if (state.lowScoreStreak >= 2) {
                reasons.push({ type: 'declining_score', text: `ציון יורד ברצף: ${score}`, severity: 'medium' });
                if (severity === 'low') severity = 'medium';
                shouldAlert = true;
            }
        } else {
            state.lowScoreStreak = 0;
            if (score >= 75) shouldResolve = true;
        }

        const openObjections = (signals.objections || []).filter(o => o.status === 'open');
        if (openObjections.length >= 2) {
            state.unhandledObjections = openObjections.length;
            reasons.push({
                type: 'unhandled_objections',
                text: `${openObjections.length} התנגדויות פתוחות: ${openObjections.map(o => o.text).join(', ')}`,
                severity: openObjections.length >= 3 ? 'high' : 'medium'
            });
            if (openObjections.length >= 3 && severity !== 'critical') severity = 'high';
            shouldAlert = true;
        }

        if (battleCard.triggered && battleCard.type === 'competitor') {
            reasons.push({
                type: 'competitor_mentioned',
                text: `מתחרה בשיחה: ${battleCard.detected}`,
                severity: 'medium'
            });
            if (severity === 'low') severity = 'medium';
            shouldAlert = true;
        }

        const highPains = (signals.pains || []).filter(p => p.severity === 'high');
        if (highPains.length >= 2 && score < 60) {
            state.customerFrustrationSignals++;
            reasons.push({
                type: 'customer_frustration',
                text: `לקוח מתוסכל: ${highPains.map(p => p.text).join(', ')}`,
                severity: 'high'
            });
            if (severity !== 'critical') severity = 'high';
            shouldAlert = true;
        }

        if (scoreBreakdown.discovery !== undefined && scoreBreakdown.discovery < 30) {
            reasons.push({ type: 'weak_discovery', text: 'גילוי צרכים חלש מאוד', severity: 'medium' });
            shouldAlert = true;
        }
        if (scoreBreakdown.objection_handling !== undefined && scoreBreakdown.objection_handling < 30) {
            reasons.push({ type: 'weak_objection_handling', text: 'טיפול בהתנגדויות חלש', severity: 'high' });
            if (severity !== 'critical') severity = 'high';
            shouldAlert = true;
        }
        if (scoreBreakdown.closing !== undefined && scoreBreakdown.closing < 25) {
            reasons.push({ type: 'weak_closing', text: 'מיומנויות סגירה חלשות', severity: 'medium' });
            shouldAlert = true;
        }

        const callMinutes = (callDuration || (Date.now() - state.startTime)) / 60000;
        const earlyStages = ['פתיחה והיכרות', 'גילוי צרכים והבנת כאב'];
        if (callMinutes > 10 && earlyStages.includes(coaching.stage)) {
            reasons.push({
                type: 'stuck_stage',
                text: `${Math.round(callMinutes)} דקות ועדיין ב"${coaching.stage}"`,
                severity: 'medium'
            });
            if (severity === 'low') severity = 'medium';
            shouldAlert = true;
        }

        if (callMinutes > 20 && score < 60) {
            reasons.push({
                type: 'long_struggling_call',
                text: `שיחה ארוכה (${Math.round(callMinutes)} דק׳) עם ציון נמוך`,
                severity: 'high'
            });
            if (severity !== 'critical') severity = 'high';
            shouldAlert = true;
        }

        const buyingSignals = coaching.buying_signals || {};
        const buyingLevel = buyingSignals.level || 'none';
        const closingStages = ['הצעת מחיר וסגירה', 'טיפול בהתנגדויות'];

        if ((buyingLevel === 'strong' || buyingLevel === 'medium') && !closingStages.includes(coaching.stage)) {
            state.buyingSignalMissed = true;
            const alertSev = buyingLevel === 'strong' ? 'critical' : 'high';
            reasons.push({
                type: 'golden_moment',
                text: `רגע זהב! לקוח מראה סימני קנייה (${buyingLevel}) אבל הנציג לא עובר לסגירה`,
                severity: alertSev
            });
            if (alertSev === 'critical') severity = 'critical';
            else if (severity !== 'critical') severity = 'high';
            shouldAlert = true;
        }

        if (state.buyingSignalMissed && buyingLevel === 'none' && state.lastBuyingSignalLevel !== 'none') {
            reasons.push({
                type: 'lost_momentum',
                text: 'הלקוח הראה עניין אבל הנציג איבד את המומנטום',
                severity: 'high'
            });
            if (severity !== 'critical') severity = 'high';
            shouldAlert = true;
        }

        const emotionalTone = coaching.emotional_tone;
        if (emotionalTone === 'negative') {
            state.customerFrustrationSignals++;
            if (state.customerFrustrationSignals >= 2) {
                reasons.push({
                    type: 'negative_tone',
                    text: 'הלקוח מראה סימני תסכול/שליליות ברצף',
                    severity: 'high'
                });
                if (severity !== 'critical') severity = 'high';
                shouldAlert = true;
            }
        } else if (emotionalTone === 'positive' || emotionalTone === 'warming') {
            state.customerFrustrationSignals = Math.max(0, state.customerFrustrationSignals - 1);
        }

        if (state.scoreHistory.length >= 3) {
            const last3 = state.scoreHistory.slice(-3).map(s => s.score);
            const isDowntrend = last3[0] > last3[1] && last3[1] > last3[2] && (last3[0] - last3[2]) > 15;
            if (isDowntrend) {
                reasons.push({
                    type: 'score_downtrend',
                    text: `ציון יורד ברצף: ${last3.join(' → ')}`,
                    severity: 'high'
                });
                if (severity !== 'critical') severity = 'high';
                shouldAlert = true;
            }
        }

        return {
            shouldAlert,
            shouldResolve,
            severity,
            reasons,
            score,
            stage: coaching.stage,
            scoreBreakdown
        };
    }

    createOrUpdateAlert(callSid, state, analysis) {
        const existingAlert = this.alerts.get(callSid);
        const now = Date.now();

        const alert = {
            id: callSid,
            callSid,
            agentId: state.agentId,
            agentName: state.agentName,
            organizationId: state.organizationId,
            leadName: state.leadName,
            severity: analysis.severity,
            reasons: analysis.reasons,
            score: analysis.score,
            stage: analysis.stage,
            scoreBreakdown: analysis.scoreBreakdown,
            callDuration: Math.round((now - state.startTime) / 1000),
            createdAt: existingAlert?.createdAt || now,
            updatedAt: now,
            dismissed: false
        };

        state.alertLevel = analysis.severity;
        this.alerts.set(callSid, alert);

        console.log(`[CallMonitor] ALERT ${analysis.severity.toUpperCase()} for ${state.agentName}: ${analysis.reasons.map(r => r.text).join(' | ')}`);

        this.broadcastToManagers(state.organizationId, {
            type: 'attention_alert',
            alert
        });
    }

    resolveAlert(callSid) {
        const alert = this.alerts.get(callSid);
        if (!alert) return;

        const state = this.callStates.get(callSid);
        if (state) state.alertLevel = 'none';

        this.alerts.delete(callSid);

        console.log(`[CallMonitor] Alert RESOLVED for ${alert.agentName}`);

        this.broadcastToManagers(alert.organizationId, {
            type: 'attention_resolved',
            callSid,
            agentName: alert.agentName
        });
    }

    dismissAlert(callSid, managerId) {
        const alert = this.alerts.get(callSid);
        if (alert) {
            alert.dismissed = true;
            alert.dismissedBy = managerId;
            alert.dismissedAt = Date.now();

            this.broadcastToManagers(alert.organizationId, {
                type: 'attention_dismissed',
                callSid
            });
        }
    }

    onCallEnd(callSid) {
        this.callStates.delete(callSid);
        if (this.alerts.has(callSid)) {
            const alert = this.alerts.get(callSid);
            this.alerts.delete(callSid);
            if (alert) {
                this.broadcastToManagers(alert.organizationId, {
                    type: 'attention_ended',
                    callSid,
                    agentName: alert.agentName
                });
            }
        }
    }

    getAlertsForOrg(orgId) {
        const orgAlerts = [];
        for (const [, alert] of this.alerts) {
            if (alert.organizationId === orgId && !alert.dismissed) {
                orgAlerts.push(alert);
            }
        }
        return orgAlerts.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
        });
    }

    getActiveCallsForOrg(orgId) {
        const calls = [];
        for (const [callSid, state] of this.callStates) {
            if (state.organizationId === orgId) {
                calls.push({
                    callSid,
                    agentId: state.agentId,
                    agentName: state.agentName,
                    leadName: state.leadName,
                    currentStage: state.currentStage,
                    lastScore: state.lastScore,
                    alertLevel: state.alertLevel,
                    duration: Math.round((Date.now() - state.startTime) / 1000)
                });
            }
        }
        return calls;
    }

    startListening(callSid, managerWs) {
        const state = this.callStates.get(callSid);
        if (!state) return false;

        if (!state.managerListeners) state.managerListeners = new Set();
        state.managerListeners.add(managerWs);

        console.log(`[CallMonitor] Manager started listening to call ${callSid} (${state.agentName})`);
        return true;
    }

    stopListening(callSid, managerWs) {
        const state = this.callStates.get(callSid);
        if (state && state.managerListeners) {
            state.managerListeners.delete(managerWs);
        }
    }

    broadcastTranscriptToListeners(callSid, transcriptData) {
        const state = this.callStates.get(callSid);
        if (!state || !state.managerListeners || state.managerListeners.size === 0) return;

        const data = JSON.stringify({
            type: 'live_transcript',
            callSid,
            agentName: state.agentName,
            ...transcriptData
        });

        for (const ws of state.managerListeners) {
            try {
                if (ws.readyState === 1) ws.send(data);
            } catch (e) {}
        }
    }

    broadcastCoachingToListeners(callSid, coachingData) {
        const state = this.callStates.get(callSid);
        if (!state || !state.managerListeners || state.managerListeners.size === 0) return;

        const data = JSON.stringify({
            type: 'live_coaching',
            callSid,
            agentName: state.agentName,
            ...coachingData
        });

        for (const ws of state.managerListeners) {
            try {
                if (ws.readyState === 1) ws.send(data);
            } catch (e) {}
        }
    }
}

module.exports = new CallMonitor();
