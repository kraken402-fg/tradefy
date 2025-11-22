import React from 'react';
import { colors } from '../styles/colors';

const Sidebar = () => {
  const menuItems = ['Profil', 'Ma Boutique', 'Mes Ventes', 'Classement National', 'Classement Global', 'Paiements', 'Dépendances', 'Déconnexion'];

  return (
    <aside style={{ backgroundColor: colors.surface[0], color: colors.lightText[0], padding: '20px', width: '250px', height: '100vh' }}>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {menuItems.map((item, index) => (
          <li key={index} style={{ marginBottom: '10px' }}>
            <button style={{ backgroundColor: 'transparent', color: colors.lightText[0], border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', padding: '10px', borderRadius: '5px', transition: 'background-color 0.3s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.hover}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              {item}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
