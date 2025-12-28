const EventEmitter = require('events');
const CoachingEngine = require('./coaching-engine');
const DBService = require('./db-service');

class CallManager extends EventEmitter {
  constructor() {
    super();
    this.calls = new Map();
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
      // 1. Generate AI Summary
      const summary = await CoachingEngine.generateSummary(call);

      if (summary) {
        console.log(`[CallManager] Summary generated: Score ${summary.score}`);
        call.summary = summary;

        // 2. Broadcast Summary to Frontend (Immediate Feedback)
        this.broadcastToFrontend(callSid, {
          type: 'call_summary',
          data: summary
        });

        // 3. Save to DB
        await DBService.saveCall(call);
      } else {
        console.warn(`[CallManager] No summary generated for ${callSid} (likely short/empty call)`);
      }

    } catch (err) {
      console.error('[CallManager] Error during endCall processing:', err);
    } finally {
      // 4. Cleanup
      this.cleanupCall(callSid);
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
}

module.exports = new CallManager();
