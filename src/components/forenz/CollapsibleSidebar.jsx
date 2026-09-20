import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CollapsibleSidebar({ side, collapsed, onToggle, expandedWidth, bubbleIcon: Icon, bubbleLabel, children }) {
  const currentWidth = collapsed ? 0 : expandedWidth;

  return (
    <>
      {/* Mobilné zobrazenie */}
      <div className="lg:hidden">{children}</div>

      {/* Desktop: kolabujúci panel s ťahadlom bez layout shiftu */}
      <motion.div
        initial={false}
        animate={{ width: currentWidth }}
        style={{ width: currentWidth }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        className="hidden lg:flex shrink-0 overflow-hidden"
      >
        <div style={{ width: expandedWidth, minWidth: expandedWidth }} className="h-full flex">
          {side === 'right' && <Handle side={side} onToggle={onToggle} />}
          <div className="flex-1 min-w-0 h-full">{children}</div>
          {side === 'left' && <Handle side={side} onToggle={onToggle} />}
        </div>
      </motion.div>

      {/* Plávajúca bublina pri zbalenom stave */}
      <AnimatePresence>
        {collapsed && (
          <motion.button
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            onClick={onToggle}
            className={`hidden lg:flex absolute top-4 z-30 items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl text-blue-400 text-xs font-semibold hover:bg-slate-100 transition-colors ${side === 'left' ? 'left-4' : 'right-4'}`}
          >
            {side === 'left' ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{bubbleLabel}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

function Handle({ side, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-4 shrink-0 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-slate-100 rounded-lg transition-colors"
      title="Zbaliť panel"
    >
      {side === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
}