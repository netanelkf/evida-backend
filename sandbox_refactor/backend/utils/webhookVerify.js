// Webhook verification utilities
import crypto from 'crypto';

export function verifyRookWebhookSignature(payload, signature, secret) {
  if (!secret) {
    console.warn('ROOK_WEBHOOK_SECRET not configured - skipping verification');
    return true;
  }

  if (!signature) {
    console.warn('No signature provided in ROOK webhook');
    return false;
  }

  try {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('ROOK webhook signature verification failed:', error);
    return false;
  }
}

export async function verifyStripeWebhookSignature(rawBody, signature, secret) {
  if (!secret) {
    console.warn('STRIPE_WEBHOOK_SECRET not configured - skipping verification');
    return { verified: true, event: JSON.parse(rawBody) };
  }

  if (!signature) {
    console.warn('No signature provided in Stripe webhook');
    return { verified: false, error: 'Missing signature' };
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    return { verified: true, event };
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return { verified: false, error: error.message };
  }
}

export default {
  verifyRookWebhookSignature,
  verifyStripeWebhookSignature
};
