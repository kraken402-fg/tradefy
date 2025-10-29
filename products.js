import express from 'express';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

const router = express.Router();

// Create product (simple, no auth middleware for brevity)
router.post('/', async (req, res) => {
  const { title, description, price, images, sellerId } = req.body;
  const p = await Product.create({ title, description, price, images, seller: sellerId });
  res.json({ ok: true, product: p });
});

// Get product by id (with reviews)
router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).populate({ path: 'reviews', model: 'Review' });
  res.json({ ok: true, product: p });
});

// List products
router.get('/', async (req, res) => {
  const products = await Product.find().limit(50).populate({ path: 'reviews', model: 'Review' });
  res.json({ ok: true, products });
});

// Add review
router.post('/:id/reviews', async (req, res) => {
  const { rating, comment, userId } = req.body;
  const review = await Review.create({ product: req.params.id, user: userId, rating, comment });
  await Product.findByIdAndUpdate(req.params.id, { $push: { reviews: review._id } });
  res.json({ ok: true, review });
});

export default router;
