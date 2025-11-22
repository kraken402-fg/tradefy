import React from 'react';
import { colors } from '../styles/colors';

const Card = ({ children, style }) => {
  return (
    <div
      style={{
        backgroundColor: colors.surface[0],
        color: colors.lightText[0],
        padding: '20px',
        borderRadius: '10px',
        boxShadow: `0 4px 8px 0 rgba(0, 0, 0, 0.2)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Card;
