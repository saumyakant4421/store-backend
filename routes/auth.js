
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
};


router.post(
  '/signup',
  [
  body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 characters'),
    body('email').isEmail().withMessage('Invalid email'),
    body('address').isLength({ max: 400 }).withMessage('Address must be at most 400 characters'),
    body('password')
      .matches(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/)
      .withMessage('Password must be 8-16 chars and include at least one uppercase letter and one special character'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { name, email, password, address } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword, address, role: 'Normal User' });
      res.status(201).json({ message: 'User created', userId: user.id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 1 }).withMessage('Password is required'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


router.put(
  '/update-password',
  authMiddleware,
  [
    body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
    body('newPassword')
      .matches(passwordRegex)
      .withMessage('New password must be 8-16 chars and include at least one uppercase letter and one special character'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await User.findByPk(req.user.id);
      if (user && (await bcrypt.compare(currentPassword, user.password))) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });
        res.json({ message: 'Password updated' });
      } else {
        res.status(401).json({ error: 'Invalid current password' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


router.get('/profile', authMiddleware, async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ['id', 'name', 'email', 'address', 'role'] });
  res.json(user);
});

module.exports = router;
