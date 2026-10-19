// ROOK integration routes
import { Router } from 'express';
import { rookService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';
import { verifyRookWebhookSignature } from '../utils/webhookVerify.js';

const router = Router();

router.get('/devices', async (req, res, next) => {
  try {
    const categories = await rookService.getDeviceCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

router.post('/users', authMiddleware, async (req, res, next) => {
  try {
    const result = await rookService.registerUser(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId/authorize', authMiddleware, async (req, res, next) => {
  try {
    const { dataSource } = req.query;
    if (!dataSource) {
      return res.status(400).json({ error: 'dataSource query parameter required' });
    }

    const result = await rookService.getAuthorizationUrl(req.params.userId, dataSource);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, user_id } = req.query;

    await rookService.handleOAuthCallback(code, state, user_id);

    res.send(`
      <html>
        <body>
          <h2>Device connected successfully!</h2>
          <p>You can close this window.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <html>
        <body>
          <h2>Connection failed</h2>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

router.get('/users/:userId/sources', authMiddleware, async (req, res, next) => {
  try {
    const sources = await rookService.getConnectedSources(req.params.userId);
    res.json(sources);
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:userId/sources/:source', authMiddleware, async (req, res, next) => {
  try {
    await rookService.disconnectSource(req.params.userId, req.params.source);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks', async (req, res, next) => {
  try {
    const signature = req.headers['x-rook-signature'] || req.headers['x-webhook-signature'];
    const secret = process.env.ROOK_WEBHOOK_SECRET;

    if (secret && !verifyRookWebhookSignature(req.body, signature, secret)) {
      console.warn('Invalid ROOK webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const result = await rookService.handleWebhook(req.body);
    res.json(result);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.get('/webhooks/recent', authMiddleware, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await rookService.getRecentWebhooks(limit);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
