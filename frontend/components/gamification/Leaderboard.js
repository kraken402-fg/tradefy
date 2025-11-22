import React from 'react';
import { colors } from '../styles/colors';

const Leaderboard = () => {
  // Sample data
  const data = [
    { rank: 1, username: 'PEPSY-SKY', country: 'Bénin', sales: 1422 },
    { rank: 2, username: 'TRADER-JOE', country: 'USA', sales: 1200 },
    // Add more sample data as needed
  ];

  return (
    <div style={{ backgroundColor: colors.surface[1], color: colors.lightText[0], padding: '20px', borderRadius: '10px' }}>
      <h2 style={{ color: colors.accentGold }}>Leaderboard</h2>
      <ul>
        {data.map((item) => (
          <li key={item.rank} style={{ marginBottom: '10px', padding: '10px', borderRadius: '5px', backgroundColor: colors.surface[0] }}>
            <span style={{ color: colors.accentCopper }}>{item.rank}</span> - {item.username} from {item.country} with {item.sales} sales
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
