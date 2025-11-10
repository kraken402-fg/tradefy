import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import colors from '../../styles/colors';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-lg font-medium font-["Orbitron"] transition-all duration-200 flex items-center justify-center';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const variantStyles = {
    primary: `bg-gradient-to-r from-[${colors.accents.gold}] to-[${colors.accents.copper}] text-${colors.text.primary} hover:opacity-90`,
    secondary: `border border-${colors.accents.gold} text-${colors.accents.gold} hover:bg-${colors.accents.gold} hover:bg-opacity-10`,
    ghost: `text-${colors.text.primary} hover:bg-${colors.background.hover}`,
    danger: `bg-${colors.ui.error} text-white hover:opacity-90`,
  };
  
  const widthStyle = fullWidth ? 'w-full' : 'w-auto';
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${disabledStyle} ${className}`}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;
