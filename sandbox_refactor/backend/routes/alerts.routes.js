// Alerts routes
import { Router } from 'express';
import { Alert, AlertRule } from '../models/index.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const alerts = await Alert.findByUser(req.user.id, status);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

router.get('/active', authMiddleware, async (req, res, next) => {
  try {
    const alerts = await Alert.findActiveByUser(req.user.id);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

router.post('/:alertId/acknowledge', authMiddleware, async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await Alert.acknowledge(req.params.alertId, req.user.id, 'user');
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:alertId/resolve', authMiddleware, async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await Alert.resolve(req.params.alertId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get('/rules', authMiddleware, async (req, res, next) => {
  try {
    const rules = await AlertRule.findByUser(req.user.id);
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

router.post('/rules', authMiddleware, async (req, res, next) => {
  try {
    const rule = await AlertRule.create({
      user_id: req.user.id,
      ...req.body
    });
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

router.put('/rules/:ruleId', authMiddleware, async (req, res, next) => {
  try {
    const rule = await AlertRule.findById(req.params.ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (rule.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await AlertRule.update(req.params.ruleId, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.put('/rules/:ruleId/toggle', authMiddleware, async (req, res, next) => {
  try {
    const rule = await AlertRule.findById(req.params.ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (rule.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await AlertRule.toggleEnabled(req.params.ruleId, !rule.is_enabled);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/rules/:ruleId', authMiddleware, async (req, res, next) => {
  try {
    const rule = await AlertRule.findById(req.params.ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (rule.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await AlertRule.delete(req.params.ruleId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
