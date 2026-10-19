import express from 'express';
import * as incidentService from '../services/incidentService.js';

const router = express.Router();

router.post('/sos', async (req, res) => {
  try {
    const { userId, location, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await incidentService.createSOS(userId, { location, message });

    console.log(`[SOS] Created incident ${result.incident.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      incidentId: result.incident.id,
      eventId: result.event.id,
      actionsCreated: result.actions.length
    });
  } catch (error) {
    console.error('[SOS] Error:', error);
    res.status(500).json({ error: 'Failed to create SOS incident' });
  }
});

router.get('/incidents', async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    const incidents = await incidentService.getIncidents({
      status,
      priority,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ incidents, count: incidents.length });
  } catch (error) {
    console.error('[Incidents] Error fetching:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

router.get('/incidents/metrics', async (req, res) => {
  try {
    const metrics = await incidentService.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[Incidents] Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/incidents/:id', async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(parseInt(req.params.id));

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(incident);
  } catch (error) {
    console.error('[Incidents] Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

router.patch('/incidents/:id', async (req, res) => {
  try {
    const { status, note } = req.body;
    const changedBy = req.headers['x-user-id'] || 'operator';
    const changedByRole = req.headers['x-user-role'] || 'OPERATOR';

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = Object.values(incidentService.INCIDENT_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const incident = await incidentService.updateIncidentStatus(
      parseInt(req.params.id),
      status,
      { changedBy, changedByRole, note }
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ success: true, incident });
  } catch (error) {
    console.error('[Incidents] Error updating:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

router.post('/incidents/:id/notes', async (req, res) => {
  try {
    const { note } = req.body;
    const authorUserId = req.headers['x-user-id'] || 'operator';
    const authorRole = req.headers['x-user-role'] || 'OPERATOR';

    if (!note) {
      return res.status(400).json({ error: 'note is required' });
    }

    const newNote = await incidentService.addNote(
      parseInt(req.params.id),
      authorUserId,
      authorRole,
      note
    );

    res.status(201).json({ success: true, note: newNote });
  } catch (error) {
    console.error('[Incidents] Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

export default router;
