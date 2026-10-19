// Caregiver routes
import { Router } from 'express';
import { caregiverService } from '../services/index.js';
import { authMiddleware } from '../middleware/index.js';
import { validateEmail } from '../utils/validators.js';

const router = Router();

router.post('/invite', authMiddleware, async (req, res, next) => {
  try {
    const { email, relationship } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const result = await caregiverService.createInvitation(req.user.id, email, relationship);
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('plan allows')) {
      return res.status(402).json({ error: error.message, upgrade_url: '/subscription' });
    }
    if (error.message === 'Invitation already sent to this email') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/invitation/:token', async (req, res, next) => {
  try {
    const result = await caregiverService.getInvitationByToken(req.params.token);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/accept/:token', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ error: 'Only caregivers can accept invitations' });
    }

    const link = await caregiverService.acceptInvitation(req.params.token, req.user.id);
    res.json({ success: true, link });
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('already')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/register-and-accept/:token', async (req, res, next) => {
  try {
    const caregiver = await caregiverService.registerAndAccept(req.params.token, req.body);
    res.status(201).json({ success: true, caregiver: { id: caregiver.id, email: caregiver.email, name: caregiver.name } });
  } catch (error) {
    if (error.message.includes('Invalid') || error.message === 'Email already registered') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/linked-users', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ error: 'Only caregivers can access this' });
    }

    const users = await caregiverService.getLinkedUsers(req.user.id);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/linked-caregivers', authMiddleware, async (req, res, next) => {
  try {
    const caregivers = await caregiverService.getLinkedCaregivers(req.user.id);
    res.json(caregivers);
  } catch (error) {
    next(error);
  }
});

router.put('/link/:linkId/permissions', authMiddleware, async (req, res, next) => {
  try {
    await caregiverService.updatePermissions(req.user.id, req.params.linkId, req.body);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Not authorized to modify this link') {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

router.delete('/link/:linkId', authMiddleware, async (req, res, next) => {
  try {
    await caregiverService.removeLink(req.user.id, req.params.linkId);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Not authorized to remove this link') {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
