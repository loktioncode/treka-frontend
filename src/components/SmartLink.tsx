'use client';

import Link from 'next/link';
import { ReactNode, useCallback, useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { motion } from 'framer-motion';

interface SmartLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  preload?: boolean;
  variant?: 'default' | 'nav' | 'button';
  disabled?: boolean;
}

export function SmartLink({ 
  href, 
  children, 
  className = '', 
  onClick,
  preload = true,
  variant = 'default',
  disabled = false
}: SmartLinkProps) {
  const { navigateTo, preloadPage } = useNavigation();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick();
    }

    // Use custom navigation for smooth transitions
    e.preventDefault();
    navigateTo(href);
  }, [href, onClick, navigateTo, disabled]);

  const handleMouseEnter = useCallback(() => {
    if (preload && !disabled) {
      preloadPage(href);
    }
    setIsHovered(true);
  }, [preload, href, disabled, preloadPage]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const baseClasses = {
    default: 'text-gray-700 hover:text-teal-700 transition-colors cursor-pointer',
    nav: 'inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors cursor-pointer',
    button: 'inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all cursor-pointer'
  };

  const variantClasses = {
    default: '',
    nav: 'border-b-2 border-transparent hover:border-gray-300',
    button: 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm hover:shadow-md transform hover:-translate-y-0.5'
  };

  const classes = `${baseClasses[variant]} ${variantClasses[variant]} ${className}`;

  if (variant === 'button') {
    return (
      <motion.button
        className={classes}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={disabled}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Link>
  );
}
