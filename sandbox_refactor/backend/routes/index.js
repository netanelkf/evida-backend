// Routes aggregator
import { Router } from 'express';

import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import caregiversRoutes from './caregivers.routes.js';
import devicesRoutes from './devices.routes.js';
import rookRoutes from './rook.routes.js';
import vitalsRoutes from './vitals.routes.js';
import alertsRoutes from './alerts.routes.js';
import incidentsRoutes from './incidents.routes.js';
import healthScoreRoutes from './healthScore.routes.js';
import subscriptionsRoutes from './subscriptions.routes.js';
import dispatchRoutes from './dispatch.routes.js';
import notificationsRoutes from './notifications.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/caregivers', caregiversRoutes);
router.use('/devices', devicesRoutes);
router.use('/rook', rookRoutes);
router.use('/vitals', vitalsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/health-score', healthScoreRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/notifications', notificationsRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
