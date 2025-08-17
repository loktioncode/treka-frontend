'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ children, content, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateTooltipPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      let x = 0;
      let y = 0;
      
      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2 + scrollX;
          y = rect.top + scrollY - 8;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2 + scrollX;
          y = rect.bottom + scrollY + 8;
          break;
        case 'left':
          x = rect.left + scrollX - 8;
          y = rect.top + rect.height / 2 + scrollY;
          break;
        case 'right':
          x = rect.right + scrollX + 8;
          y = rect.top + rect.height / 2 + scrollY;
          break;
      }
      
      setTooltipPosition({ x, y });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updateTooltipPosition();
      window.addEventListener('scroll', updateTooltipPosition);
      window.addEventListener('resize', updateTooltipPosition);
      
      return () => {
        window.removeEventListener('scroll', updateTooltipPosition);
        window.removeEventListener('resize', updateTooltipPosition);
      };
    }
  }, [isVisible, position]);

  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return { transform: 'translate(-50%, -100%)' };
      case 'bottom':
        return { transform: 'translate(-50%, 0%)' };
      case 'left':
        return { transform: 'translate(-100%, -50%)' };
      case 'right':
        return { transform: 'translate(0%, -50%)' };
      default:
        return { transform: 'translate(-50%, -100%)' };
    }
  };

  const getArrowPosition = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-teal-800';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-teal-800';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 border-l-teal-800';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 border-r-teal-800';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-teal-800';
    }
  };

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[9999] px-3 py-2 text-sm text-white bg-teal-800 rounded-lg shadow-xl whitespace-nowrap"
            style={{
              position: 'fixed',
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              zIndex: 9999,
              ...getPositionStyles(),
            }}
          >
            {content}
            <div className={`absolute w-0 h-0 border-4 border-transparent ${getArrowPosition()}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
