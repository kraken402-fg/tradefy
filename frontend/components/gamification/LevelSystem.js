import React from 'react';
import { colors } from '../styles/colors';

const LevelSystem = ({ sales }) => {
  const getLevel = (sales) => {
    if (sales < 24) return 'Profane';
    if (sales < 74) return 'Débutant';
    if (sales < 226) return 'Marchand';
    if (sales < 551) return 'Négociant';
    if (sales < 1001) return 'Courtier';
    if (sales < 2850) return 'Magnat';
    return 'Senior';
  };

  return (
    <div style={{ backgroundColor: colors.surface[1], color: colors.lightText[0], padding: '20px', borderRadius: '10px' }}>
      <h2 style={{ color: colors.accentGold }}>Level System</h2>
      <p>Your current level based on sales: <span style={{ color: colors.accentCopper }}>{getLevel(sales)}</span></p>
    </div>
  );
};

export default LevelSystem;
