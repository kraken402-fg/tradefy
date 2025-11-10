import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../ui/Badge';
import colors from '../../styles/colors';

const Leaderboard = ({ data = [], title = 'Classement des Vendeurs', showNational = true }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  // Get current items
  const currentItems = data.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  
  // Auto-scroll through pages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prevPage) => (prevPage + 1) % totalPages);
    }, 10000); // Change page every 10 seconds
    
    return () => clearInterval(interval);
  }, [totalPages]);
  
  // Get rank badge color based on position
  const getRankBadge = (rank) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };
  
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
  
  // Get commission rate based on sales count
  const getCommissionRate = (sales) => {
    if (sales >= 2850) return '3.60%';
    if (sales >= 1005) return '3.75%';
    if (sales >= 555) return '3.90%';
    if (sales >= 228) return '4.05%';
    if (sales >= 75) return '4.20%';
    if (sales >= 25) return '4.35%';
    return '4.50%';
  };
  
  return (
    <div className="bg-[#1E1E2C] rounded-xl overflow-hidden shadow-lg border border-opacity-10 border-white">
      <div className="p-4 bg-gradient-to-r from-[#1A1A1A] to-[#222222] border-b border-opacity-10 border-white">
        <h2 className="text-xl font-bold text-white font-['Orbitron'] flex items-center">
          {title}
          {showNational && (
            <span className="ml-2 text-xs bg-[#3A3A3A] text-[#C6A664] px-2 py-1 rounded-full">
              National
            </span>
          )}
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-[#BFBFBF] border-b border-opacity-10 border-white">
              <th className="px-4 py-3 w-16 text-center">Rang</th>
              <th className="px-4 py-3">Vendeur</th>
              {showNational && <th className="px-4 py-3 w-24">Pays</th>}
              <th className="px-4 py-3 text-right w-32">Ventes</th>
              <th className="px-4 py-3 text-right w-32">Niveau</th>
              <th className="px-4 py-3 text-right w-32">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D2D3A]">
            <AnimatePresence>
              {currentItems.map((item, index) => {
                const rank = currentPage * itemsPerPage + index + 1;
                const rankLevel = getRankLevel(item.sales);
                
                return (
                  <motion.tr 
                    key={item.id || index}
                    className={`hover:bg-[#2A2A3A] transition-colors ${index % 2 === 0 ? 'bg-[#22222A]' : 'bg-[#1E1E26]'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="px-4 py-3 text-center font-bold text-[#C6A664]">
                      {getRankBadge(rank)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#3A3A3A] flex items-center justify-center text-sm font-medium text-[#E8E8E8]">
                          {item.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-[#E8E8E8]">
                            {item.username || 'Anonyme'}
                          </div>
                        </div>
                      </div>
                    </td>
                    {showNational && (
                      <td className="px-4 py-3">
                        <span className="text-sm text-[#BFBFBF]">
                          {item.country || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1A1A1A] text-[#00D4FF] border border-[#00D4FF] border-opacity-30">
                        {item.sales?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge rank={rankLevel} size="sm" showIcon={false} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#E8E8E8]">
                      {getCommissionRate(item.sales)}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#2D2D3A]">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="relative inline-flex items-center px-4 py-2 border border-[#3A3A3A] text-sm font-medium rounded-md text-[#E8E8E8] bg-[#1A1A1A] hover:bg-[#222222] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-[#3A3A3A] text-sm font-medium rounded-md text-[#E8E8E8] bg-[#1A1A1A] hover:bg-[#222222] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#BFBFBF]">
                Affichage de <span className="font-medium">{currentPage * itemsPerPage + 1}</span> à{' '}
                <span className="font-medium">
                  {Math.min((currentPage + 1) * itemsPerPage, data.length)}
                </span>{' '}
                sur <span className="font-medium">{data.length}</span> vendeurs
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#3A3A3A] bg-[#1A1A1A] text-sm font-medium text-[#E8E8E8] hover:bg-[#222222] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Précédent</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show first page, last page, current page, and pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i; // First 5 pages
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i; // Last 5 pages
                  } else {
                    pageNum = currentPage - 2 + i; // 2 pages before and after current
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-[#C6A664] border-[#C6A664] text-[#0D0D0D] font-bold'
                          : 'bg-[#1A1A1A] border-[#3A3A3A] text-[#E8E8E8] hover:bg-[#222222]'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#3A3A3A] bg-[#1A1A1A] text-sm font-medium text-[#E8E8E8] hover:bg-[#222222] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Suivant</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
