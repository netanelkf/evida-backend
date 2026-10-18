// Stripe configuration
export default {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  plans: {
    free: {
      name: 'Free',
      price: 0,
      stripePriceId: null,
      features: {
        maxDevices: 1,
        maxCaregivers: 1,
        healthScore: false,
        dispatchAccess: false,
        historyDays: 7,
        reports: false,
        aiInsights: false
      }
    },
    basic: {
      name: 'Basic',
      price: 4.99,
      stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
      features: {
        maxDevices: 3,
        maxCaregivers: 3,
        healthScore: true,
        dispatchAccess: true,
        historyDays: 30,
        reports: 'monthly',
        aiInsights: false
      }
    },
    premium: {
      name: 'Premium',
      price: 9.99,
      stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
      features: {
        maxDevices: 999,
        maxCaregivers: 10,
        healthScore: true,
        dispatchAccess: true,
        priorityDispatch: true,
        historyDays: 365,
        reports: 'anytime',
        aiInsights: true
      }
    }
  }
};
