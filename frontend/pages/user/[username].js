import React from 'react';
import Header from '../../components/layout/Header';
import PublicProfile from '../../components/profile/PublicProfile';

const UserProfile = ({ username }) => {
  // Mock user data based on username
  const user = {
    username: username,
    country: 'Bénin',
    sales: 1422,
    rank: 'Magnat',
  };

  return (
    <div style={{ backgroundColor: '#0D0D0D', color: '#E8E8E8', minHeight: '100vh', padding: '20px' }}>
      <Header />
      <PublicProfile user={user} />
    </div>
  );
};

export default UserProfile;
