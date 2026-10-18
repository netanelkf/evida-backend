// Subscription routes
import { Router } from 'express';
import express from 'express';
import { subscriptionService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';
import stripeConfig from '../config/stripe.js';
import { verifyStripeWebhookSignature } from '../utils/webhookVerify.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getCurrentSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

router.get('/plans', async (req, res, next) => {
  try {
    const plans = Object.entries(stripeConfig.plans).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      features: plan.features
    }));
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

router.post('/checkout', authMiddleware, async (req, res, next) => {
  try {
    const { plan } = req.body;

    if (!plan || !['basic', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Valid plan required (basic or premium)' });
    }

    const result = await subscriptionService.createCheckoutSession(req.user.id, plan);
    res.json(result);
  } catch (error) {
    if (error.message === 'Stripe is not configured') {
      return res.status(503).json({ error: 'Payment processing is not available' });
    }
    next(error);
  }
});

router.post('/cancel', authMiddleware, async (req, res, next) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'No active subscription found') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    const rawBody = req.body.toString();
    const { verified, event, error } = await verifyStripeWebhookSignature(rawBody, signature, secret);

    if (!verified) {
      console.warn('Invalid Stripe webhook signature:', error);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    await subscriptionService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;
