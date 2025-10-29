import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { CONFIG } from '../lib/liaison.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  try {
    const user = await User.create({ username, email, passwordHash: hash, role });
    res.json({ ok: true, user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role }, CONFIG.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
  res.json({ ok: true, token });
});

// Save XP / badges (simple endpoint)
router.post('/xp', async (req, res) => {
  const { userId, xp, badges } = req.body;
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'user not found' });
    user.xp = xp !== undefined ? xp : user.xp;
    user.badges = Array.isArray(badges) ? badges : user.badges;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
