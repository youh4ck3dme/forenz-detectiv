import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function LiquidGlassModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  className = ''
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto pt-[var(--camera-inset-top)] pb-[var(--safe-bottom)]" role="dialog" aria-modal="true">
        {/* Pozadie s hlbokým rozostrením */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white/40 backdrop-blur-xl transition-opacity"
          onClick={onClose}
        />

        {/* Liquid Glass Dialog Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className={`relative w-full ${maxWidth} rounded-3xl md:rounded-[32px] liquid-glass-panel p-5 sm:p-7 text-slate-900 dark:text-slate-900 shadow-2xl overflow-hidden z-10 ${className}`}
        >
          {/* Slovak Tri-Color Subtle Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-white to-red-600 z-20" />

          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/60 dark:border-white/10">
              <div>
                {title && <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>}
                {subtitle && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-700 flex items-center justify-center transition-colors"
                  aria-label="Zavrieť dialóg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="relative z-10">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
