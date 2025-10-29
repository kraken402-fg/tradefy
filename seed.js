import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../lib/liaison.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Transaction from '../models/Transaction.js';
import bcrypt from 'bcrypt';

async function run() {
  await connectDB();
  await User.deleteMany({});
  await Product.deleteMany({});
  await Review.deleteMany({});
  await Transaction.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const admin = await User.create({ username: 'admin', email: 'admin@tradefy.local', passwordHash: await bcrypt.hash('password', salt), role: 'admin' });
  const seller = await User.create({ username: 'seller1', email: 'seller@tradefy.local', passwordHash: await bcrypt.hash('password', salt), role: 'seller', monerooConnected: false });
  const buyer = await User.create({ username: 'buyer1', email: 'buyer@tradefy.local', passwordHash: await bcrypt.hash('password', salt), role: 'buyer' });

  const p1 = await Product.create({ title: 'Neon T-Shirt', description: 'Glow in the dark t-shirt', price: 29.99, images: ['/assets/images/tshirt1.jpg'], seller: seller._id });
  const p2 = await Product.create({ title: 'Cyber Poster', description: 'High-res cyberpunk poster', price: 9.99, images: ['/assets/images/poster1.jpg'], seller: seller._id });

  const r1 = await Review.create({ product: p1._id, user: buyer._id, rating: 5, comment: 'Great product!', verifiedPurchase: true });
  p1.reviews.push(r1._id);
  await p1.save();

  const tx = await Transaction.create({ product: p1._id, buyer: buyer._id, seller: seller._id, amount: p1.price, status: 'pending' });

  console.log('Seeding complete');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
