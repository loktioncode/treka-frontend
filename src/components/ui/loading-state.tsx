'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface LoadingStateProps {
  children?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingState({ 
  children, 
  className = '', 
  size = 'md',
  text = 'Loading...'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-16 h-16 border-4'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      <div className={`${sizeClasses[size]} border-teal-500 border-t-transparent rounded-full animate-spin`}></div>
      {text && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-teal-600 font-medium ${textSizes[size]}`}
        >
          {text}
        </motion.p>
      )}
      {children}
    </motion.div>
  );
}

export function LoadingOverlay({ 
  children, 
  className = '',
  text = 'Loading...'
}: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center ${className}`}
    >
      <LoadingState size="lg" text={text}>
        {children}
      </LoadingState>
    </motion.div>
  );
}
