import React from 'react';
import Header from '../components/layout/Header';
import ProductCard from '../components/layout/ProductCard';

const Products = () => {
  const sampleProducts = [
    { name: 'Product 1', description: 'Description of Product 1', price: 100 },
    { name: 'Product 2', description: 'Description of Product 2', price: 150 },
    // Add more sample products as needed
  ];

  return (
    <div style={{ backgroundColor: '#0D0D0D', color: '#E8E8E8', minHeight: '100vh', padding: '20px' }}>
      <Header />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {sampleProducts.map((product, index) => (
          <ProductCard key={index} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Products;
