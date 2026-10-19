// User routes
import { Router } from 'express';
import { userService, authService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await userService.getById(req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/me/medical-info', authMiddleware, async (req, res, next) => {
  try {
    const info = await userService.getMedicalInfo(req.user.id);
    res.json(info);
  } catch (error) {
    next(error);
  }
});

router.put('/me/location', authMiddleware, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    await userService.updateLocation(req.user.id, lat, lng);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/me/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
