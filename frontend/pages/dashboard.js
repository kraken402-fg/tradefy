import React from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import Leaderboard from '../components/gamification/Leaderboard';
import LevelSystem from '../components/gamification/LevelSystem';

const Dashboard = () => {
  return (
    <div style={{ display: 'flex', backgroundColor: '#1E1E2C', color: '#E8E8E8', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px' }}>
        <Header />
        <Leaderboard />
        <LevelSystem sales={1422} />
      </div>
    </div>
  );
};

export default Dashboard;
