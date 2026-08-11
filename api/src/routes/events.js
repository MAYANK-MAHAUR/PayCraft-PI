const express = require('express');
const { authenticateMerchant } = require('../middleware/auth');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Server-Sent Events stream
router.get('/stream', authenticateMerchant, (req, res) => {
  const merchantId = req.merchant.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Open the stream immediately so the client knows it connected.
  res.write(': connected\n\n');

  eventBus.addConnection(merchantId, res);

  // Heartbeat keeps idle connections alive through proxies / load balancers.
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      /* ignore — cleaned up on close */
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.removeConnection(merchantId, res);
  });
});

module.exports = router;
