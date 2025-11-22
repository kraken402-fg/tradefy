import React from 'react';
import { colors } from '../styles/colors';

const Button = ({ children, onClick, style }) => {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: colors.accentGold,
        color: colors.lightText[0],
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export default Button;
