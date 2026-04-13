const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/db');
const HealthData = require('../models/HealthData');
const Alert = require('../models/Alert');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Middleware: only caregivers and admins can access these routes
function caregiverOnly(req, res, next) {
  if (req.user.role !== 'caregiver' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Caregiver role required' });
  }
  next();
}

// Helper: check this caregiver is linked to the requested patient
async function assertLinked(caregiverId, patientId, res) {
  const link = await db('caregiver_patients')
    .where({ caregiver_id: caregiverId, patient_id: patientId })
    .first();
  if (!link) {
    res.status(403).json({ error: 'Not linked to this patient' });
    return false;
  }
  return true;
}

// GET /caregiver/patients — list all patients linked to this caregiver
router.get('/patients', auth, caregiverOnly, asyncHandler(async (req, res) => {
  const links = await db('caregiver_patients')
    .where({ caregiver_id: req.user.userId })
    .join('users', 'users.id', 'caregiver_patients.patient_id')
    .select('users.id', 'users.name', 'users.email', 'users.phone', 'users.created_at');
  return res.json(links);
}));

// POST /caregiver/patients/:patientId — link a patient by their userId
router.post('/patients/:patientId', auth, caregiverOnly, asyncHandler(async (req, res) => {
  const patient = await User.findById(req.params.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  await db('caregiver_patients')
    .insert({ caregiver_id: req.user.userId, patient_id: req.params.patientId })
    .onConflict(['caregiver_id', 'patient_id'])
    .ignore();

  return res.status(201).json({ linked: true });
}));

// GET /caregiver/patients/:patientId/vitals
router.get('/patients/:patientId/vitals', auth, caregiverOnly, asyncHandler(async (req, res) => {
  if (!(await assertLinked(req.user.userId, req.params.patientId, res))) return;

  const { from, to, metric, limit = 50 } = req.query;
  const data = await HealthData.findByUser({
    user_id: req.params.patientId,
    from, to, metric,
    limit: Number(limit),
  });
  return res.json(data);
}));

// GET /caregiver/patients/:patientId/alerts
router.get('/patients/:patientId/alerts', auth, caregiverOnly, asyncHandler(async (req, res) => {
  if (!(await assertLinked(req.user.userId, req.params.patientId, res))) return;

  const { status, limit = 20 } = req.query;
  const alerts = await Alert.findByUser({ user_id: req.params.patientId, status, limit: Number(limit) });
  return res.json(alerts);
}));

// GET /caregiver/dashboard — overview of all patients
router.get('/dashboard', auth, caregiverOnly, asyncHandler(async (req, res) => {
  const links = await db('caregiver_patients')
    .where({ caregiver_id: req.user.userId })
    .select('patient_id');

  const patientIds = links.map((l) => l.patient_id);
  if (patientIds.length === 0) return res.json([]);

  const dashboard = await Promise.all(
    patientIds.map(async (id) => {
      const [user, latestVitals, activeAlerts] = await Promise.all([
        User.findById(id),
        HealthData.getLatest(id),
        Alert.findByUser({ user_id: id, status: 'active', limit: 5 }),
      ]);
      const { password_hash, ...safeUser } = user;
      return { patient: safeUser, latestVitals, activeAlerts };
    })
  );

  return res.json(dashboard);
}));

module.exports = router;
