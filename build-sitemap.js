import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../lib/liaison.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';

export default async function build() {
  await connectDB();
  const products = await Product.find().lean().limit(1000);
  const vendors = await User.find({ role: 'seller' }).lean().limit(1000);

  const siteUrl = process.env.SITE_URL || 'https://tradefy.vercel.app';
  const urls = [];
  urls.push({ loc: siteUrl, changefreq: 'daily', priority: '1.0' });
  products.forEach((p) => urls.push({ loc: `${siteUrl}/product.html?id=${p._id}`, changefreq: 'weekly', priority: '0.8' }));
  vendors.forEach((v) => urls.push({ loc: `${siteUrl}/vendor.html?id=${v._id}`, changefreq: 'weekly', priority: '0.7' }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
    .join('\n')}\n</urlset>`;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  const outPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(outPath, xml);
  return outPath;
}

if (require.main === module) {
  build().then((out) => console.log('Sitemap written to', out)).catch(console.error);
}
