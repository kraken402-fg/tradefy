import axios from 'axios';
import { CONFIG } from './liaison.js';

/* Moneroo wrapper
   - MONEROO_API_KEY must be set in CONFIG (see liaison.js)
   - For local testing, use ngrok and set webhook URL in Moneroo dashboard
*/

const API_BASE = 'https://api.moneroo.example'; // Placeholder - replace with real Moneroo API base

export function calculateCommission(amount) {
  // default 10% commission
  return Math.round((amount * 0.10 + Number.EPSILON) * 100) / 100;
}

export async function initializePayment({ amount, productId, buyerEmail }) {
  // Create a payment session with Moneroo; returns { paymentUrl, paymentId }
  const payload = {
    amount,
    currency: 'USD',
    productId,
    buyerEmail,
    callback_url: `${CONFIG.SITE_URL}/api/webhooks/moneroo` // webhook endpoint
  };

  // NOTE: Replace API_BASE with actual Moneroo endpoint.
  const res = await axios.post(`${API_BASE}/payments`, payload, {
    headers: {
      Authorization: `Bearer ${CONFIG.MONEROO_API_KEY}`
    }
  });
  return res.data;
}

export async function verifyPayment(paymentId) {
  // Verify payment status with Moneroo
  const res = await axios.get(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${CONFIG.MONEROO_API_KEY}` }
  });
  return res.data;
}

export async function initializePayout({ amount, sellerDetails }) {
  // Payout to seller via Moneroo payout API
  const payload = {
    amount,
    currency: 'USD',
    recipient: sellerDetails
  };
  const res = await axios.post(`${API_BASE}/payouts`, payload, {
    headers: { Authorization: `Bearer ${CONFIG.MONEROO_API_KEY}` }
  });
  return res.data;
}

// NOTE: MONEROO_KEY only available after SITE_URL deployed; use ngrok for local testing.
