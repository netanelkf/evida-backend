// Vitals routes
import { Router } from 'express';
import { vitalsService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    const vitals = await vitalsService.getLatest(req.user.id);

    if (!vitals) {
      return res.json({ message: 'No vitals data available', data: null });
    }

    res.json(vitals);
  } catch (error) {
    next(error);
  }
});

router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const history = await vitalsService.getHistory(req.user.id, days);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get('/daily-summaries', authMiddleware, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const summaries = await vitalsService.getDailySummaries(req.user.id, days);
    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await vitalsService.getAggregatedStats(req.user.id, days);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.post('/manual', authMiddleware, async (req, res, next) => {
  try {
    const vitals = await vitalsService.store(req.user.id, {
      ...req.body,
      source: 'manual',
      data_type: 'manual_entry',
      recorded_at: new Date()
    });
    res.status(201).json(vitals);
  } catch (error) {
    next(error);
  }
});

router.post('/calculate-baselines', authMiddleware, async (req, res, next) => {
  try {
    const baselines = await vitalsService.calculateBaselines(req.user.id);

    if (!baselines) {
      return res.json({ message: 'Not enough data to calculate baselines (need at least 7 days)' });
    }

    res.json({ success: true, baselines });
  } catch (error) {
    next(error);
  }
});

export default router;
