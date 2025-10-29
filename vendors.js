import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';

const router = express.Router();

// Public vendor profile
router.get('/:id', async (req, res) => {
  const vendor = await User.findById(req.params.id).lean();
  const products = await Product.find({ seller: vendor._id }).limit(50).lean();
  res.json({ ok: true, vendor, products });
});

// List vendors
router.get('/', async (req, res) => {
  const vendors = await User.find({ role: 'seller' }).limit(100).lean();
  res.json({ ok: true, vendors });
});

export default router;
