// Subscription service
import { Subscription, User } from '../models/index.js';
import stripeConfig from '../config/stripe.js';

let stripe = null;
if (stripeConfig.secretKey) {
  const Stripe = (await import('stripe')).default;
  stripe = new Stripe(stripeConfig.secretKey);
}

export async function createCheckoutSession(userId, plan) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const planConfig = stripeConfig.plans[plan];
  if (!planConfig || !planConfig.stripePriceId) {
    throw new Error('Invalid plan');
  }

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { user_id: userId }
    });
    customerId = customer.id;
    await User.update(userId, { stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: planConfig.stripePriceId,
      quantity: 1
    }],
    success_url: `${process.env.APP_URL || 'http://localhost:5000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || 'http://localhost:5000'}/subscription/cancelled`,
    metadata: { user_id: userId, plan }
  });

  return { checkout_url: session.url, session_id: session.id };
}

export async function activateSubscription(userId, stripeSubscriptionId, plan) {
  const user = await User.findById(userId);

  await Subscription.create({
    user_id: userId,
    plan,
    stripe_customer_id: user.stripe_customer_id,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: stripeConfig.plans[plan]?.stripePriceId,
    status: 'active',
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  await User.setSubscriptionTier(userId, plan);

  return { success: true };
}

export async function handleWebhook(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await activateSubscription(
        session.metadata.user_id,
        session.subscription,
        session.metadata.plan
      );
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const sub = await Subscription.findByStripeId(subscription.id);
      if (sub) {
        await Subscription.update(sub.id, {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const sub = await Subscription.findByStripeId(subscription.id);
      if (sub) {
        await Subscription.cancel(sub.id);
        const user = await User.findById(sub.user_id);
        if (user) {
          await User.setSubscriptionTier(user.id, 'free');
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log('Payment failed for invoice:', invoice.id);
      break;
    }
  }
}

export async function getCurrentSubscription(userId) {
  const subscription = await Subscription.findByUser(userId);

  if (!subscription) {
    return {
      plan: 'free',
      status: 'active',
      features: stripeConfig.plans.free.features
    };
  }

  return {
    plan: subscription.plan,
    status: subscription.status,
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    features: stripeConfig.plans[subscription.plan]?.features || stripeConfig.plans.free.features
  };
}

export async function cancelSubscription(userId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const subscription = await Subscription.findByUser(userId);
  if (!subscription || !subscription.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true
  });

  await Subscription.update(subscription.id, {
    cancel_at_period_end: true
  });

  return { success: true, message: 'Subscription will cancel at period end' };
}

export default {
  createCheckoutSession,
  activateSubscription,
  handleWebhook,
  getCurrentSubscription,
  cancelSubscription
};
