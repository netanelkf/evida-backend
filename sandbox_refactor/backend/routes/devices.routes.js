// Device routes
import { Router } from 'express';
import { deviceService, rookService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/supported', async (req, res, next) => {
  try {
    const devices = await deviceService.getSupportedDevices();
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const devices = await deviceService.getConnectedDevices(req.user.id);
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

router.get('/:deviceType/status', authMiddleware, async (req, res, next) => {
  try {
    const status = await deviceService.getDeviceStatus(req.user.id, req.params.deviceType);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.get('/:deviceType/authorize', authMiddleware, async (req, res, next) => {
  try {
    const result = await rookService.getAuthorizationUrl(req.user.id, req.params.deviceType);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:deviceType/connect', authMiddleware, async (req, res, next) => {
  try {
    const device = await deviceService.connectDevice(
      req.user.id,
      req.params.deviceType,
      req.body.method || 'rook',
      req.body
    );
    res.json(device);
  } catch (error) {
    next(error);
  }
});

router.post('/:deviceType/disconnect', authMiddleware, async (req, res, next) => {
  try {
    await deviceService.disconnectDevice(req.user.id, req.params.deviceType);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Device not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
