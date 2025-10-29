import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './lib/liaison.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import vendorRoutes from './routes/vendors.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';
import { buildSitemap } from './scripts/build-sitemap.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// static frontend files
app.use('/', express.static(path.join(process.cwd(), 'frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);

// sitemap endpoint - generate on demand
app.get('/sitemap.xml', async (req, res) => {
  // Attempt to call backend script to build sitemap
  try {
    const build = await import('./scripts/build-sitemap.js');
    const out = await build.default();
    res.sendFile(out);
  } catch (err) {
    res.status(500).send('sitemap error');
  }
});

// Start
connectDB().then(() => {
  app.listen(PORT, () => console.log(`⚡ Tradefy server running on port ${PORT}`));
});
