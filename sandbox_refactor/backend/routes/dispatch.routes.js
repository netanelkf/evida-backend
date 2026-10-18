// Dispatch routes (operator-only)
import { Router } from 'express';
import { incidentService } from '../services/index.js';
import { User } from '../models/index.js';
import { authMiddleware, requireOperator } from '../middleware/index.js';

const router = Router();

router.get('/queue', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const queue = await incidentService.getQueue();
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

router.get('/my-incidents', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const incidents = await incidentService.getAssignedTo(req.user.id);
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const stats = await incidentService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/operators', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const operators = await User.findOperators();
    res.json(operators.map(op => ({
      id: op.id,
      name: op.name,
      email: op.email
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: {
        lat: user.last_lat,
        lng: user.last_lng,
        updated: user.last_location_update
      },
      medicalInfo: {
        blood_type: user.blood_type,
        allergies: user.allergies,
        medications: user.medications,
        medical_conditions: user.medical_conditions,
        emergency_notes: user.emergency_notes
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
