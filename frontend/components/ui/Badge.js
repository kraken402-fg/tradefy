import React from 'react';
import { colors } from '../styles/colors';

const Badge = ({ text, style }) => {
  return (
    <span
      style={{
        backgroundColor: colors.accentCopper,
        color: colors.lightText[1],
        padding: '5px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        ...style,
      }}
    >
      {text}
    </span>
  );
};

export default Badge;
