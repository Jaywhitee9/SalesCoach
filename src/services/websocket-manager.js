class WebSocketManager {
  constructor() {
    this.connections = new Map(); // callSid -> { ws, lastPing, reconnectAttempts, metadata, messageQueue }
    this.pingInterval = 30000; // 30 seconds
    
    setInterval(() => this.pingAllConnections(), this.pingInterval);
    console.log('[WebSocketManager] Initialized with 30s ping interval');
  }

  registerConnection(callSid, ws, metadata = {}) {
    this.connections.set(callSid, {
      ws,
      lastPing: Date.now(),
      reconnectAttempts: 0,
      metadata,
      messageQueue: []
    });

    console.log(`[WS] Registered connection for ${callSid}`);

    ws.on('pong', () => {
      const conn = this.connections.get(callSid);
      if (conn) {
        conn.lastPing = Date.now();
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[WS] Connection closed: ${callSid} (${code}: ${reason})`);
      this.handleDisconnect(callSid);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error on ${callSid}:`, err.message);
    });
  }

  pingAllConnections() {
    const now = Date.now();
    let activeCount = 0;
    let staleCount = 0;

    for (const [callSid, conn] of this.connections.entries()) {
      if (conn.ws.readyState === 1) { // OPEN
        conn.ws.ping();
        activeCount++;
        
        // Check for stale connections (no pong in 60s)
        if (now - conn.lastPing > 60000) {
          console.warn(`[WS] Stale connection detected: ${callSid}`);
          conn.ws.terminate();
          this.handleDisconnect(callSid);
          staleCount++;
        }
      }
    }

    if (activeCount > 0) {
      console.log(`[WS] Pinged ${activeCount} connections${staleCount > 0 ? `, terminated ${staleCount} stale` : ''}`);
    }
  }

  handleDisconnect(callSid) {
    const conn = this.connections.get(callSid);
    if (!conn) return;

    // Mark in CallManager that connection is lost
    try {
      const CallManager = require('./call-manager');
      const call = CallManager.calls.get(callSid);
      if (call) {
        call.connectionLost = true;
        call.lastDisconnectTime = Date.now();
        console.log(`[WS] Marked call ${callSid} as connection lost`);
      }
    } catch (err) {
      console.error('[WS] Error marking call as disconnected:', err.message);
    }

    // Keep connection metadata for 5 minutes (allow reconnect)
    setTimeout(() => {
      if (this.connections.has(callSid)) {
        console.log(`[WS] Cleaning up connection metadata for ${callSid}`);
        this.connections.delete(callSid);
      }
    }, 5 * 60 * 1000);
  }

  sendMessage(callSid, message) {
    const conn = this.connections.get(callSid);
    if (!conn) {
      console.warn(`[WS] No connection found for ${callSid}`);
      return false;
    }

    try {
      if (conn.ws.readyState === 1) { // OPEN
        conn.ws.send(JSON.stringify(message));
        return true;
      } else {
        // Buffer message for reconnection
        conn.messageQueue.push(message);
        console.log(`[WS] Message queued for ${callSid} (${conn.messageQueue.length} in queue)`);
        return false;
      }
    } catch (err) {
      console.error(`[WS] Send error for ${callSid}:`, err.message);
      return false;
    }
  }

  flushQueue(callSid) {
    const conn = this.connections.get(callSid);
    if (!conn || !conn.messageQueue.length) return 0;

    console.log(`[WS] Flushing ${conn.messageQueue.length} queued messages for ${callSid}`);
    
    let flushed = 0;
    while (conn.messageQueue.length > 0 && conn.ws.readyState === 1) {
      const msg = conn.messageQueue.shift();
      try {
        conn.ws.send(JSON.stringify(msg));
        flushed++;
      } catch (err) {
        console.error(`[WS] Error flushing message:`, err.message);
        conn.messageQueue.unshift(msg); // Put it back
        break;
      }
    }

    console.log(`[WS] Flushed ${flushed} messages for ${callSid}`);
    return flushed;
  }

  unregisterConnection(callSid) {
    if (this.connections.has(callSid)) {
      const conn = this.connections.get(callSid);
      if (conn.ws.readyState === 1) {
        conn.ws.close(1000, 'Normal closure');
      }
      this.connections.delete(callSid);
      console.log(`[WS] Unregistered connection for ${callSid}`);
    }
  }

  getConnectionStatus(callSid) {
    const conn = this.connections.get(callSid);
    if (!conn) return { connected: false, queued: 0 };

    return {
      connected: conn.ws.readyState === 1,
      queued: conn.messageQueue.length,
      lastPing: conn.lastPing,
      reconnectAttempts: conn.reconnectAttempts
    };
  }
}

module.exports = new WebSocketManager();
