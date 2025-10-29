import express from 'express';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import * as moneroo from '../lib/moneroo.js';
import { CONFIG } from '../lib/liaison.js';

const router = express.Router();

// Endpoint for Moneroo webhooks
router.post('/moneroo', express.raw({ type: '*/*' }), async (req, res) => {
  const signature = req.headers['x-moneroo-signature'] || req.headers['x-signature'];
  const body = req.body; // raw buffer
  const computed = crypto.createHmac('sha256', CONFIG.MONEROO_WEBHOOK_SECRET || '').update(body).digest('hex');
  if (!signature || computed !== signature) {
    return res.status(400).send('invalid signature');
  }

  let payload = {};
  try {
    payload = JSON.parse(body.toString());
  } catch (e) {
    return res.status(400).send('invalid payload');
  }

  // Example payload contains { paymentId, status }
  const paymentId = payload.paymentId || payload.id;
  const status = payload.status || payload.event;
  const tx = await Transaction.findOne({ monerooId: paymentId });
  if (!tx) return res.status(404).send('tx not found');

  if (status === 'paid' || status === 'payment_succeeded') {
    tx.status = 'paid';
    tx.commission = moneroo.calculateCommission(tx.amount);
    await tx.save();
    // Initialize payout to seller for amount - commission
    const payoutAmount = Math.round((tx.amount - tx.commission) * 100) / 100;
    try {
      await moneroo.initializePayout({ amount: payoutAmount, sellerDetails: { id: tx.seller } });
    } catch (err) {
      console.error('Payout error', err.message);
    }
  } else if (status === 'failed') {
    tx.status = 'failed';
    await tx.save();
  }

  res.json({ ok: true });
});

export default router;
