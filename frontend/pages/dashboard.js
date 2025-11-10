import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Leaderboard from '../components/gamification/Leaderboard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import colors from '../styles/colors';

// Mock data - replace with actual API call in production
const mockLeaderboardData = [
  { id: 1, username: 'PEPSY-SKY', country: 'Bénin', sales: 1422 },
  { id: 2, username: 'TraderPro', country: 'France', sales: 1250 },
  { id: 3, username: 'MarketKing', country: 'Canada', sales: 1123 },
  { id: 4, username: 'SalesGuru', country: 'Bénin', sales: 987 },
  { id: 5, username: 'DealMaster', country: 'Belgique', sales: 876 },
  { id: 6, username: 'TradeLord', country: 'Bénin', sales: 765 },
  { id: 7, username: 'BargainHunter', country: 'Suisse', sales: 654 },
  { id: 8, username: 'ProfitMaker', country: 'Bénin', sales: 543 },
  { id: 9, username: 'SaleNinja', country: 'Luxembourg', sales: 432 },
  { id: 10, username: 'RetailKing', country: 'Bénin', sales: 321 },
  // Add more mock data as needed
];

// Get rank level based on sales count
const getRankLevel = (sales) => {
  if (sales >= 2850) return 'senior';
  if (sales >= 1005) return 'magnate';
  if (sales >= 555) return 'broker';
  if (sales >= 228) return 'negotiator';
  if (sales >= 75) return 'merchant';
  if (sales >= 25) return 'beginner';
  return 'profane';
};

// Get next rank information
const getNextRankInfo = (currentSales) => {
  const ranks = [
    { name: 'Profane', sales: 0, commission: '4.50%' },
    { name: 'Débutant', sales: 25, commission: '4.35%' },
    { name: 'Marchand', sales: 75, commission: '4.20%' },
    { name: 'Négociant', sales: 228, commission: '4.05%' },
    { name: 'Courtier', sales: 555, commission: '3.90%' },
    { name: 'Magnat', sales: 1005, commission: '3.75%' },
    { name: 'Senior', sales: 2850, commission: '3.60%' },
  ];
  
  for (let i = 0; i < ranks.length - 1; i++) {
    if (currentSales >= ranks[i].sales && currentSales < ranks[i + 1].sales) {
      return {
        currentRank: ranks[i],
        nextRank: ranks[i + 1],
        salesNeeded: ranks[i + 1].sales - currentSales,
        progress: ((currentSales - ranks[i].sales) / (ranks[i + 1].sales - ranks[i].sales)) * 100,
      };
    }
  }
  
  // If already at max rank
  return {
    currentRank: ranks[ranks.length - 1],
    nextRank: null,
    salesNeeded: 0,
    progress: 100,
  };
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userData, setUserData] = useState({
    username: 'PEPSY-SKY',
    country: 'Bénin',
    sales: 1422,
    commissionRate: '3.75%',
    totalEarnings: 28440,
    monthlyEarnings: 2370,
  });
  
  const nextRankInfo = getNextRankInfo(userData.sales);
  const rankLevel = getRankLevel(userData.sales);
  
  // Filter national leaderboard (same country as user)
  const nationalLeaderboard = mockLeaderboardData
    .filter(seller => seller.country === userData.country)
    .sort((a, b) => b.sales - a.sales);
  
  // Add rank numbers
  const nationalLeaderboardWithRanks = nationalLeaderboard.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
  
  const globalLeaderboard = [...mockLeaderboardData]
    .sort((a, b) => b.sales - a.sales)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  
  const userRankGlobal = globalLeaderboard.findIndex(item => item.username === userData.username) + 1;
  const userRankNational = nationalLeaderboardWithRanks.findIndex(item => item.username === userData.username) + 1;
  
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E8E8E8] pb-20">
      <Head>
        <title>Tableau de Bord | Tradefy</title>
        <meta name="description" content="Tableau de bord de votre compte Tradefy" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2D2D3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[#C6A664] font-['Orbitron']">Tradefy</h1>
              <nav className="hidden md:ml-10 md:flex space-x-8">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'overview' 
                      ? 'text-[#C6A664] bg-[#2A2A2A]' 
                      : 'text-[#BFBFBF] hover:text-[#E8E8E8] hover:bg-[#2A2A2A]'
                  }`}
                >
                  Aperçu
                </button>
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'products' 
                      ? 'text-[#C6A664] bg-[#2A2A2A]' 
                      : 'text-[#BFBFBF] hover:text-[#E8E8E8] hover:bg-[#2A2A2A]'
                  }`}
                >
                  Mes Produits
                </button>
                <button 
                  onClick={() => setActiveTab('sales')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'sales' 
                      ? 'text-[#C6A664] bg-[#2A2A2A]' 
                      : 'text-[#BFBFBF] hover:text-[#E8E8E8] hover:bg-[#2A2A2A]'
                  }`}
                >
                  Ventes
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'analytics' 
                      ? 'text-[#C6A664] bg-[#2A2A2A]' 
                      : 'text-[#BFBFBF] hover:text-[#E8E8E8] hover:bg-[#2A2A2A]'
                  }`}
                >
                  Analyse
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-[#BFBFBF]">{userData.username}</span>
                <Badge rank={rankLevel} size="sm" showLabel={false} />
              </div>
              <button className="p-2 rounded-full hover:bg-[#2A2A2A]">
                <svg className="h-5 w-5 text-[#BFBFBF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <motion.div 
            className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2D2D3A] hover:border-[#C6A664] transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#BFBFBF]">Ventes Totales</p>
                <p className="text-3xl font-bold mt-1">{userData.sales.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-[#10B981] font-medium">+12.5% ce mois-ci</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#222222]">
                <svg className="h-6 w-6 text-[#C6A664]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </motion.div>
          
          {/* Commission Rate */}
          <motion.div 
            className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2D2D3A] hover:border-[#C6A664] transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#BFBFBF]">Taux de Commission</p>
                <p className="text-3xl font-bold mt-1">{userData.commissionRate}</p>
                <div className="mt-2">
                  <Badge rank={rankLevel} size="sm" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#222222]">
                <svg className="h-6 w-6 text-[#C6A664]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
          
          {/* Earnings */}
          <motion.div 
            className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2D2D3A] hover:border-[#C6A664] transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#BFBFBF]">Gains Totaux</p>
                <p className="text-3xl font-bold mt-1">{userData.totalEarnings.toLocaleString()} FCFA</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-[#10B981] font-medium">+{userData.monthlyEarnings.toLocaleString()} FCFA ce mois-ci</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#222222]">
                <svg className="h-6 w-6 text-[#C6A664]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </motion.div>
          
          {/* Rank */}
          <motion.div 
            className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2D2D3A] hover:border-[#C6A664] transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#BFBFBF]">Classement</p>
                <p className="text-3xl font-bold mt-1">
                  {userRankGlobal ? `#${userRankGlobal}` : 'N/A'}
                  <span className="text-sm font-normal text-[#BFBFBF] ml-2">Global</span>
                </p>
                <p className="text-sm mt-1">
                  {userRankNational ? `#${userRankNational}` : 'N/A'}
                  <span className="text-[#BFBFBF] ml-2">National</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#222222]">
                <svg className="h-6 w-6 text-[#C6A664]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Next Rank Progress */}
          <div className="lg:col-span-1">
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2D2D3A] h-full">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <svg className="h-5 w-5 text-[#C6A664] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Prochain Niveau
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#BFBFBF]">Niveau Actuel</p>
                    <p className="font-medium">{nextRankInfo.currentRank.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#BFBFBF]">Prochain Niveau</p>
                    <p className="font-medium">{nextRankInfo.nextRank ? nextRankInfo.nextRank.name : 'Niveau Max'}</p>
                  </div>
                </div>
                
                {nextRankInfo.nextRank ? (
                  <>
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-[#BFBFBF]">
                            Progression
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-[#C6A664]">
                            {Math.round(nextRankInfo.progress)}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-[#222222]">
                        <div 
                          style={{ width: `${nextRankInfo.progress}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#C6A664] to-[#B87333]"
                        ></div>
                      </div>
                    </div>
                    
                    <div className="bg-[#222222] p-3 rounded-lg">
                      <p className="text-sm text-center">
                        <span className="font-medium text-[#C6A664]">{nextRankInfo.salesNeeded} ventes</span> 
                        pour devenir <span className="font-medium">{nextRankInfo.nextRank.name}</span>
                      </p>
                      <p className="text-xs text-center text-[#BFBFBF] mt-1">
                        Commission: {nextRankInfo.nextRank.commission}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-[#C6A664] font-medium">Vous avez atteint le niveau maximum !</p>
                    <p className="text-sm text-[#BFBFBF] mt-1">Félicitations pour votre excellence !</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* National Leaderboard */}
          <div className="lg:col-span-2">
            <Leaderboard 
              data={nationalLeaderboardWithRanks} 
              title={`Classement National - ${userData.country}`}
              showNational={false}
            />
          </div>
        </div>
        
        {/* Global Leaderboard */}
        <div className="mt-8">
          <Leaderboard 
            data={globalLeaderboard} 
            title="Classement Global"
            showNational={true}
          />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-[#1A1A1A] border-t border-[#2D2D3A] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center">
              <span className="text-[#BFBFBF] text-sm">
                © {new Date().getFullYear()} Tradefy. Tous droits réservés.
              </span>
            </div>
            <div className="mt-4 md:mt-0">
              <span className="text-[#BFBFBF] text-sm">
                Développé avec ❤️ par <span className="text-[#C6A664]">Charbelus</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
