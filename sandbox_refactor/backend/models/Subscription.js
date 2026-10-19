// Subscription model
import { query } from '../db/pool.js';

export default {
  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async findByStripeId(stripeSubscriptionId) {
    const result = await query(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );
    return result.rows[0] || null;
  },

  async create(data) {
    const {
      user_id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id,
      status, current_period_start, current_period_end, trial_start, trial_end
    } = data;

    const result = await query(`
      INSERT INTO subscriptions (
        user_id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id,
        status, current_period_start, current_period_end, trial_start, trial_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [user_id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id,
       status, current_period_start, current_period_end, trial_start, trial_end]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE subscriptions SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async cancel(id) {
    const result = await query(`
      UPDATE subscriptions
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async getUserPlan(userId) {
    const sub = await this.findByUser(userId);
    if (!sub || sub.status !== 'active') {
      return 'free';
    }
    return sub.plan;
  }
};
