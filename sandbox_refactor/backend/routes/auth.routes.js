// Authentication routes
import { Router } from 'express';
import { authService } from '../services/index.js';
import { validateRegisterInput, validateLoginInput } from '../utils/validators.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const validation = validateRegisterInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Email already registered') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/caregiver/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginCaregiver(email, password);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid refresh token') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
