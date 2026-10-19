// Notification routes
import { Router } from 'express';
import { notificationService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const recipientType = req.user.role === 'caregiver' ? 'caregiver' : 'user';

    const notifications = await notificationService.getForRecipient(
      req.user.id,
      recipientType,
      unreadOnly
    );
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const recipientType = req.user.role === 'caregiver' ? 'caregiver' : 'user';
    const count = await notificationService.getUnreadCount(req.user.id, recipientType);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.post('/:notificationId/read', authMiddleware, async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.notificationId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/mark-all-read', authMiddleware, async (req, res, next) => {
  try {
    const recipientType = req.user.role === 'caregiver' ? 'caregiver' : 'user';
    await notificationService.markAllRead(req.user.id, recipientType);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
