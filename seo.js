import fs from 'fs';
import path from 'path';
import xml from 'xml';

// Generate JSON-LD for Product
export function productJSONLD(product) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    image: product.images || [],
    description: product.description,
    sku: product._id.toString(),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: product.price
    },
    aggregateRating: product._avgRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product._avgRating,
          reviewCount: product.reviews?.length || 0
        }
      : undefined
  };
}

export function personJSONLD(vendor) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: vendor.username,
    description: vendor.bio || '',
    image: vendor.avatar || ''
  };
}

export async function buildSitemap({ products = [], vendors = [], siteUrl = 'https://tradefy.vercel.app' } = {}) {
  const urls = [];
  urls.push({ url: [{ loc: siteUrl }, { changefreq: 'daily' }, { priority: '1.0' }] });

  products.forEach((p) => {
    urls.push({ url: [{ loc: `${siteUrl}/product.html?id=${p._id}` }, { changefreq: 'weekly' }, { priority: '0.8' }] });
  });
  vendors.forEach((v) => {
    urls.push({ url: [{ loc: `${siteUrl}/vendor.html?id=${v._id}` }, { changefreq: 'weekly' }, { priority: '0.7' }] });
  });

  const sitemapObj = [{ urlset: urls }];
  const xmlOptions = { declaration: true };
  const sitemapXml = xml(sitemapObj, xmlOptions);

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  const outPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(outPath, sitemapXml);
  return outPath;
}
