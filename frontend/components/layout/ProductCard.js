import React from 'react';
import { colors } from '../styles/colors';

const ProductCard = ({ product }) => {
  return (
    <div style={{ backgroundColor: colors.surface[0], color: colors.lightText[0], padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
      <h3 style={{ color: colors.accentGold }}>{product.name}</h3>
      <p>{product.description}</p>
      <p style={{ color: colors.accentCopper }}>Price: ${product.price}</p>
    </div>
  );
};

export default ProductCard;
