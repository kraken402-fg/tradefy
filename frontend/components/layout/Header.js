import React from 'react';
import { colors } from '../styles/colors';

const Header = () => {
  return (
    <header style={{ backgroundColor: colors.primaryBackground, color: colors.lightText[0], padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: '24px', color: colors.accentGold }}>Tradefy</div>
      <div>
        <button style={{ marginRight: '10px', backgroundColor: colors.accentCopper, color: colors.lightText[0], border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Theme</button>
        <button style={{ backgroundColor: colors.accentCopper, color: colors.lightText[0], border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Profile</button>
      </div>
    </header>
  );
};

export default Header;
