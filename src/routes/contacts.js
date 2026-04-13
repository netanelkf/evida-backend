const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const EmergencyContact = require('../models/EmergencyContact');
const asyncHandler = require('../utils/asyncHandler');

// GET /contacts
router.get('/', auth, asyncHandler(async (req, res) => {
  const contacts = await EmergencyContact.findByUser(req.user.userId);
  return res.json(contacts);
}));

// POST /contacts
router.post(
  '/',
  auth,
  [
    body('name').trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('relationship').optional().trim(),
    body('priority').optional().isInt({ min: 1 }),
    body('notify_email').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, relationship, priority, notify_email } = req.body;
    const contact = await EmergencyContact.create({
      user_id: req.user.userId,
      name, email, phone, relationship,
      priority: priority || 1,
      notify_email: notify_email !== undefined ? notify_email : true,
    });
    return res.status(201).json(contact);
  })
);

// PUT /contacts/:id
router.put('/:id', auth, asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  if (contact.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

  const { name, email, phone, relationship, priority, notify_email } = req.body;
  const updated = await EmergencyContact.update(req.params.id, {
    name, email, phone, relationship, priority, notify_email,
  });
  return res.json(updated);
}));

// DELETE /contacts/:id
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findById(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  if (contact.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

  await EmergencyContact.delete(req.params.id);
  return res.status(204).send();
}));

module.exports = router;
