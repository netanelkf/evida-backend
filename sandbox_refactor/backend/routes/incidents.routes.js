// Incidents routes
import { Router } from 'express';
import { incidentService } from '../services/index.js';
import { authMiddleware, requireOperator } from '../middleware/index.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const incidents = await incidentService.getByUser(req.user.id);
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

router.post('/sos', authMiddleware, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const incident = await incidentService.createSOS(req.user.id, { lat, lng });
    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});

router.get('/:incidentId', authMiddleware, async (req, res, next) => {
  try {
    const incident = await incidentService.getById(req.params.incidentId);

    if (incident.user_id !== req.user.id && req.user.role !== 'operator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(incident);
  } catch (error) {
    if (error.message === 'Incident not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/:incidentId/assign', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const incident = await incidentService.assign(req.params.incidentId, req.user.id);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.put('/:incidentId/status', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const { status } = req.body;
    const incident = await incidentService.updateStatus(
      req.params.incidentId,
      status,
      req.user.id,
      'operator',
      req.user.name
    );
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.post('/:incidentId/notes', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }

    await incidentService.addNote(
      req.params.incidentId,
      note,
      req.user.id,
      'operator',
      req.user.name
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:incidentId/contact', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const { contactType, contactName } = req.body;

    await incidentService.logContactAttempt(
      req.params.incidentId,
      contactType,
      contactName,
      req.user.id,
      req.user.name
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:incidentId/resolve', authMiddleware, requireOperator, async (req, res, next) => {
  try {
    const { resolutionType, resolutionNotes } = req.body;

    if (!resolutionType) {
      return res.status(400).json({ error: 'Resolution type is required' });
    }

    const incident = await incidentService.resolve(
      req.params.incidentId,
      req.user.id,
      resolutionType,
      resolutionNotes
    );
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

export default router;
