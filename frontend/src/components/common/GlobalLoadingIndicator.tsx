'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  return (
    <LoadingContext.Provider
      value={{ isLoading, setLoading: setIsLoading, startLoading, stopLoading }}
    >
      {children}
      <GlobalLoadingIndicator show={isLoading} />
    </LoadingContext.Provider>
  );
};

interface GlobalLoadingIndicatorProps {
  show: boolean;
}

/**
 * Global loading indicator that displays at the top of the viewport
 * Provides visual feedback during API calls and page transitions
 */
export const GlobalLoadingIndicator: React.FC<GlobalLoadingIndicatorProps> = ({ show }) => {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Top progress bar */}
          <motion.div
            className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-[length:200%_100%]"
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{
              scaleX: [0, 0.4, 0.7, 0.9, 1],
              backgroundPosition: ['0% 0%', '100% 0%'],
            }}
            exit={{ opacity: 0 }}
            transition={{
              scaleX: { duration: 2, ease: 'easeOut' },
              backgroundPosition: { duration: 1, repeat: Infinity, ease: 'linear' },
            }}
            role="progressbar"
            aria-label="Loading content"
            aria-valuenow={show ? 50 : 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />

          {/* Optional overlay for blocking interactions */}
          <motion.div
            className="fixed inset-0 z-[9998] bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />

          {/* Centered spinner for longer loads */}
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.2 }}
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Loading...
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingIndicator;
