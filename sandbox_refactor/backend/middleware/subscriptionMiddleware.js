// Subscription-based feature gating middleware
import { Subscription } from '../models/index.js';
import stripeConfig from '../config/stripe.js';

const TIER_RANK = { free: 0, basic: 1, premium: 2 };

export function requireSubscription(requiredTier = 'basic') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userTier = req.user.tier || 'free';
      const requiredRank = TIER_RANK[requiredTier] || 0;
      const userRank = TIER_RANK[userTier] || 0;

      if (userRank < requiredRank) {
        return res.status(402).json({
          error: 'upgrade_required',
          message: `This feature requires ${requiredTier} plan`,
          current_plan: userTier,
          required_plan: requiredTier,
          upgrade_url: '/subscription'
        });
      }

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      return res.status(500).json({ error: 'Subscription verification failed' });
    }
  };
}

export function requireBasic(req, res, next) {
  return requireSubscription('basic')(req, res, next);
}

export function requirePremium(req, res, next) {
  return requireSubscription('premium')(req, res, next);
}

export function getFeatureLimits(tier) {
  return stripeConfig.plans[tier]?.features || stripeConfig.plans.free.features;
}
