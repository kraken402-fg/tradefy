import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/* REMPLACEZ ICI - fichier central pour insérer vos identifiants */
export const CONFIG = {
  MONGO_URI:
    process.env.MONGO_URI ||
    'mongodb+srv://charbelus_miyolni:<DB_PASS>@cluster0.a7ulr63.mongodb.net/tradefy', // /* REMPLACEZ ICI */
  MONEROO_API_KEY: process.env.MONEROO_API_KEY || '<MONEROO_KEY_AFTER_DEPLOY>', // /* REMPLACEZ ICI */
  MONEROO_WEBHOOK_SECRET:
    process.env.MONEROO_WEBHOOK_SECRET || '<MONEROO_WEBHOOK_SECRET>', // /* REMPLACEZ ICI */
  CLOUDFLARE_API_TOKEN:
    process.env.CLOUDFLARE_API_TOKEN || '<CLOUDFLARE_TOKEN>', // /* REMPLACEZ ICI */
  CLOUDFLARE_ACCOUNT_ID:
    process.env.CLOUDFLARE_ACCOUNT_ID || '<CLOUDFLARE_ACCOUNT_ID>', // /* REMPLACEZ ICI */
  JWT_SECRET: process.env.JWT_SECRET || '<JWT_SECRET>', // /* REMPLACEZ ICI */
  SITE_URL: process.env.SITE_URL || 'https://tradefy.vercel.app'
};

export async function connectDB() {
  try {
    await mongoose.connect(CONFIG.MONGO_URI, { dbName: 'tradefy' });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

// NOTE: Replace placeholders in .env or here before running in production.
