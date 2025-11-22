import React from 'react';
import { colors } from '../styles/colors';

const PublicProfile = ({ user }) => {
  return (
    <div style={{ backgroundColor: colors.surface[1], color: colors.lightText[0], padding: '20px', borderRadius: '10px' }}>
      <h2 style={{ color: colors.accentGold }}>{user.username}'s Profile</h2>
      <p>Country: {user.country}</p>
      <p>Sales: {user.sales}</p>
      <p>Rank: {user.rank}</p>
    </div>
  );
};

export default PublicProfile;
