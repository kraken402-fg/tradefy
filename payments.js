import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import * as moneroo from '../lib/moneroo.js';

const router = express.Router();

// Create payment: create transaction and call Moneroo
router.post('/create-payment', async (req, res) => {
  const { productId, buyerId } = req.body;
  const product = await Product.findById(productId).populate('seller');
  if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
  const amount = product.price;
  const tx = await Transaction.create({ product: product._id, buyer: buyerId, seller: product.seller._id, amount, status: 'pending' });
  // Initialize payment with moneroo
  try {
    const pay = await moneroo.initializePayment({ amount, productId: product._id, buyerEmail: 'buyer@example.com' });
    tx.monerooId = pay.id || pay.paymentId || '';
    await tx.save();
    res.json({ ok: true, paymentUrl: pay.paymentUrl || pay.url || pay.checkout_url, txId: tx._id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
