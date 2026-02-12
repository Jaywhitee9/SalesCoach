const EventEmitter = require('events');
const CoachingEngine = require('./coaching-engine');
const DBService = require('./db-service');

class CallManager extends EventEmitter {
  constructor() {
    super();
    this.calls = new Map();
    
    // Auto-save call state every 10 seconds
    this.persistenceInterval = setInterval(() => {
      this.persistAllActiveCalls();
    }, 10000);
    
    // Recover crashed calls on startup
    this.recoverCrashedCalls();
  }

  // ... (getCall remains same)

  getCall(callSid, context = null) {
    if (!this.calls.has(callSid)) {
      if (!context) {
        // Create a dummy fallback context if missing (e.g. for ghost calls)
        context = {
          account: { accountId: 'default', name: 'Default' },
          agent: { agentId: 'system' }
        };
        // throw new Error(`Call ${callSid} not found and no context provided for creation`);
      }
      this.calls.set(callSid, {
        callSid,
        accountId: context.account.accountId,
        agentId: context.agent.agentId,
        leadId: context.customLeadId, // STORE LEAD ID
        customerNumber: context.customerNumber || 'Unknown', // Ideally passed in context
        sonioxSockets: {
          inbound: null, // Customer
          outbound: null // Agent
        },
        transcripts: {
          customer: [], // Array of finalized segments
          agent: []
        },
        frontendSocket: null,
        coachingHistory: [], // array of { type, message, timestamp }
        lastCoachingTime: 0,
        coachingPending: false, // Track if coaching is currently being generated
        transcriptsAtLastCoaching: 0, // Track how many transcripts existed when coaching last ran
        startTime: Date.now()
      });
      console.log(`[CallManager] Created state for call ${callSid} [Acc: ${context.account.name}]`);
    }
    return this.calls.get(callSid);
  }

  /**
   * Called when stream stops.
   * Generates summary, saves to DB, checks for success, then cleans up.
   */
  async endCall(callSid) {
    if (!this.calls.has(callSid)) return;

    const call = this.calls.get(callSid);
    console.log(`[CallManager] Ending call ${callSid}... Generating Summary...`);

    try {
      const summary = await CoachingEngine.generateSummary(call);

      if (summary) {
        console.log(`[CallManager] Summary generated: Score ${summary.score}`);
        call.summary = summary;

        this.broadcastToFrontend(callSid, {
          type: 'call_summary',
          data: summary
        });

        if (summary.suggested_status && call.leadId && call.leadId !== 'unknown') {
          const followupDate = this.resolveFollowupDate(summary.suggested_followup);

          this.broadcastToFrontend(callSid, {
            type: 'status_suggestion',
            data: {
              leadId: call.leadId,
              suggestedStatus: summary.suggested_status,
              suggestedFollowup: followupDate,
              followupReason: summary.followup_reason || null,
              customerSentiment: summary.customer_sentiment,
              isSuccess: summary.is_success,
              dealAmount: summary.deal_amount
            }
          });

          console.log(`[CallManager] Status suggestion for lead ${call.leadId}: ${summary.suggested_status}${followupDate ? ` (follow-up: ${followupDate})` : ''}`);

          try {
            await this.autoUpdateLeadFromSummary(call.leadId, summary);
          } catch (statusErr) {
            console.error('[CallManager] Auto-status update failed:', statusErr.message);
          }
        }

        await DBService.saveCall(call);
      } else {
        console.warn(`[CallManager] No summary generated for ${callSid} (likely short/empty call)`);
      }

      // Clear live_state on completion (save storage)
      const supabase = require('../lib/supabase');
      await supabase
        .from('calls')
        .update({ 
          live_state: null,
          status: 'completed'
        })
        .eq('recording_url', `sid:${callSid}`);

    } catch (err) {
      console.error('[CallManager] Error during endCall processing:', err);
    } finally {
      this.cleanupCall(callSid);
    }
  }

  resolveFollowupDate(suggestion) {
    if (!suggestion) return null;
    const now = new Date();
    switch (suggestion) {
      case 'tomorrow':
        now.setDate(now.getDate() + 1);
        break;
      case '3_days':
        now.setDate(now.getDate() + 3);
        break;
      case '1_week':
        now.setDate(now.getDate() + 7);
        break;
      case '2_weeks':
        now.setDate(now.getDate() + 14);
        break;
      default:
        return null;
    }
    return now.toISOString().split('T')[0];
  }

  async autoUpdateLeadFromSummary(leadId, summary) {
    const supabase = require('../lib/supabase');

    const statusMap = {
      'Closed Won': 'won',
      'Closed Lost': 'lost',
      'Follow Up': 'contacted',
      'Negotiation': 'negotiation',
      'Not Relevant': 'not_relevant'
    };

    const newStatus = statusMap[summary.suggested_status];
    if (!newStatus) return;

    const updateData = {};
    updateData.status = newStatus;

    if (summary.deal_amount && summary.suggested_status === 'Closed Won') {
      updateData.value = summary.deal_amount;
    }

    if (summary.suggested_followup) {
      updateData.follow_up_date = this.resolveFollowupDate(summary.suggested_followup);
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      console.error('[CallManager] Lead status update error:', error.message);
    } else {
      console.log(`[CallManager] Lead ${leadId} auto-updated: status=${newStatus}${updateData.value ? `, value=${updateData.value}` : ''}${updateData.follow_up_date ? `, follow-up=${updateData.follow_up_date}` : ''}`);
    }
  }

  cleanupCall(callSid) {
    if (this.calls.has(callSid)) {
      const call = this.calls.get(callSid);

      // Close Soniox sockets
      if (call.sonioxSockets.inbound) {
        try { call.sonioxSockets.inbound.close(); } catch (e) { }
      }
      if (call.sonioxSockets.outbound) {
        try { call.sonioxSockets.outbound.close(); } catch (e) { }
      }

      // Notify frontend if connected
      if (call.frontendSocket) {
        try {
          call.frontendSocket.send(JSON.stringify({ type: 'call_ended', callSid }));
        } catch (e) { }
      }

      this.calls.delete(callSid);
      console.log(`[CallManager] Cleaned up call ${callSid}`);
    }
  }

  // Helper to append transcript (storage only, broadcasting handled by handler)
  addTranscript(callSid, role, text, isFinal) {
    const call = this.getCall(callSid);

    // Map track to role if needed
    const uiRole = (role === 'inbound') ? 'customer' : (role === 'outbound' ? 'agent' : role);

    // Only store FINAL transcripts for history/summary
    if (isFinal) {
      call.transcripts[uiRole].push({
        text,
        timestamp: Date.now()
      });

      // PERSISTENCE (P0)
      if (call.leadId && call.leadId !== 'unknown') {
        DBService.saveMessage({
          callId: callSid,
          leadId: call.leadId,
          role: uiRole,
          text: text,
          isFinal: true
        });
      }

      this.emit('transcript_final', { callSid, role: uiRole, text });
    }
    // Note: Broadcasting is now handled ONLY in twilio-handler.js to avoid duplicates
  }

  broadcastToFrontend(callSid, message) {
    const call = this.getCall(callSid);
    if (call && call.frontendSocket && call.frontendSocket.readyState === 1) { // OPEN
      call.frontendSocket.send(JSON.stringify(message));
    }
  }

  // PERSISTENCE LOGIC

  async persistAllActiveCalls() {
    const promises = [];
    for (const [callSid, callState] of this.calls.entries()) {
      if (callState.status !== 'completed') {
        promises.push(this.persistCallState(callSid));
      }
    }
    const results = await Promise.allSettled(promises);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`[Persist] ${failed}/${promises.length} calls failed to persist`);
    }
  }

  async persistCallState(callSid) {
    const call = this.calls.get(callSid);
    if (!call) return;

    const supabase = require('../lib/supabase');

    const liveState = {
      transcripts: call.transcripts,
      coachingHistory: call.coachingHistory,
      accumulatedSignals: call.accumulatedSignals,
      previousAdvice: call.previousAdvice,
      lastScore: call.lastScore,
      currentStage: call.currentStage,
      startTime: call.startTime,
      transcriptsAtLastCoaching: call.transcriptsAtLastCoaching
    };

    const { error } = await supabase
      .from('calls')
      .update({
        live_state: liveState,
        last_heartbeat: new Date().toISOString()
      })
      .eq('recording_url', `sid:${callSid}`);

    if (error) {
      console.error(`[Persist] Failed to save state for ${callSid}:`, error.message);
      throw error;
    }
  }

  async recoverCrashedCalls() {
    try {
      const supabase = require('../lib/supabase');

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const { data: staleCalls, error } = await supabase
        .from('calls')
        .select('id, recording_url, agent_id, lead_id, organization_id, live_state, created_at')
        .eq('status', 'in-progress')
        .lt('last_heartbeat', twoMinutesAgo);

      if (error) {
        console.error('[Recovery] Error querying stale calls:', error.message);
        return;
      }

      if (!staleCalls || staleCalls.length === 0) {
        console.log('[Recovery] No stale calls found');
        return;
      }

      console.log(`[Recovery] Found ${staleCalls.length} stale calls - marking as interrupted`);

      for (const call of staleCalls) {
        const callSid = call.recording_url?.replace('sid:', '');

        await supabase
          .from('calls')
          .update({
            status: 'interrupted',
            duration: Math.floor((new Date() - new Date(call.created_at)) / 1000),
            live_state: null
          })
          .eq('id', call.id);

        console.log(`[Recovery] Call ${callSid} marked as interrupted`);
      }
    } catch (err) {
      console.error('[Recovery] Error during recovery:', err.message);
    }
  }
}

module.exports = new CallManager();
