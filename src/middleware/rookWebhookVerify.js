const crypto = require('crypto');

// This middleware must run BEFORE express.json() on the webhook route.
// It reads the raw body bytes and verifies Rook's HMAC-SHA256 signature.
module.exports = (req, res, next) => {
  const signature = req.headers['x-rook-signature'];
  const secret = process.env.ROOK_WEBHOOK_SECRET;

  if (!secret) {
    // If no secret is configured, skip verification (dev/testing mode)
    req.body = JSON.parse(req.body);
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing x-rook-signature header' });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body) // req.body is a Buffer here (express.raw was used)
    .digest('hex');

  const expectedBuf = Buffer.from(`sha256=${expected}`);
  const receivedBuf = Buffer.from(signature);

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Parse the body now that it's verified
  try {
    req.body = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  next();
};
