const EventEmitter = require('events');

/**
 * In-process event bus powering real-time Server-Sent Events (SSE) push.
 *
 * Maps merchantId -> Set of open SSE response objects so we can fan a single
 * domain event out to every browser tab a merchant currently has open.
 * Swap this for Redis pub/sub when running multiple API instances.
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0); // many merchants, many concurrent connections
    this.connections = new Map(); // merchantId -> Set<res>
  }

  addConnection(merchantId, res) {
    if (!this.connections.has(merchantId)) {
      this.connections.set(merchantId, new Set());
    }
    this.connections.get(merchantId).add(res);
  }

  removeConnection(merchantId, res) {
    const set = this.connections.get(merchantId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.connections.delete(merchantId);
  }

  connectedCount(merchantId) {
    return this.connections.get(merchantId)?.size || 0;
  }

  /**
   * Push an event to every open SSE stream for a single merchant.
   * @param {string} merchantId
   * @param {string} eventType  e.g. 'payment.received', 'payment.sent', 'wallet.topup'
   * @param {object} data        serializable payload
   */
  publish(merchantId, eventType, data) {
    const set = this.connections.get(merchantId);
    if (!set || set.size === 0) return;
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    set.forEach((res) => {
      try {
        res.write(payload);
      } catch (e) {
        // Broken pipe — connection cleanup happens on the 'close' event.
      }
    });
  }
}

module.exports = new EventBus();
