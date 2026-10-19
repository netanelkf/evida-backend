// Health Score routes
import { Router } from 'express';
import { healthScoreService } from '../services/index.js';
import { authMiddleware, requireBasic } from '../middleware/index.js';

const router = Router();

router.get('/', authMiddleware, requireBasic, async (req, res, next) => {
  try {
    const score = await healthScoreService.getLatest(req.user.id);

    if (!score) {
      return res.json({
        message: 'No health score available yet. Connect a device and sync data to calculate your score.',
        score: null
      });
    }

    res.json(score);
  } catch (error) {
    next(error);
  }
});

router.get('/history', authMiddleware, requireBasic, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const history = await healthScoreService.getHistory(req.user.id, days);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.post('/calculate', authMiddleware, requireBasic, async (req, res, next) => {
  try {
    const date = req.body.date || undefined;
    const score = await healthScoreService.calculateDailyScore(req.user.id, date);

    if (!score) {
      return res.json({
        message: 'Not enough data to calculate health score. Make sure you have synced vitals data.',
        score: null
      });
    }

    res.json(score);
  } catch (error) {
    next(error);
  }
});

export default router;
