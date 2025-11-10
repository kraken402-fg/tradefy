import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import colors from '../../styles/colors';

const rankConfig = {
  profane: {
    name: 'Profane',
    color: colors.ranks.novice,
    icon: '👤',
  },
  beginner: {
    name: 'Débutant',
    color: colors.ranks.beginner,
    icon: '🆕',
  },
  merchant: {
    name: 'Marchand',
    color: colors.ranks.merchant,
    icon: '🏪',
  },
  negotiator: {
    name: 'Négociant',
    color: colors.ranks.negotiator,
    icon: '💼',
  },
  broker: {
    name: 'Courtier',
    color: colors.ranks.broker,
    icon: '🤝',
  },
  magnate: {
    name: 'Magnat',
    color: colors.ranks.magnate,
    icon: '👑',
  },
  senior: {
    name: 'Senior',
    color: colors.ranks.senior,
    icon: '🏆',
  },
};

const Badge = ({ rank = 'profane', size = 'md', showIcon = true, showLabel = true, className = '' }) => {
  const rankData = rankConfig[rank.toLowerCase()] || rankConfig.profane;
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  return (
    <motion.span
      className={`inline-flex items-center rounded-full font-medium ${sizeStyles[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${rankData.color.primary}, ${rankData.color.secondary})`,
        color: 'white',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {showIcon && <span className="mr-1.5">{rankData.icon}</span>}
      {showLabel && <span className="font-['Orbitron']">{rankData.name}</span>}
    </motion.span>
  );
};

Badge.propTypes = {
  rank: PropTypes.oneOf(['profane', 'beginner', 'merchant', 'negotiator', 'broker', 'magnate', 'senior']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showIcon: PropTypes.bool,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

export default Badge;
