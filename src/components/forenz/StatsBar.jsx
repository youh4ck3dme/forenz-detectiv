import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  Users,
  Link2,
  AlertTriangle,
  Flag,
  BarChart3,
  ChevronDown
} from 'lucide-react';

export default function StatsBar({
  documents = [],
  persons = [],
  relationships = [],
  redFlags = [],
  flaggedPassages = [],
  open = false,
  onOpenChange
}) {
  const panelRef = useRef(null);
  const byStatus = { pending: 0, analyzing: 0, done: 0, error: 0 };
  documents.forEach((d) => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  });
  const successBase = byStatus.done + byStatus.error;
  const successRate = successBase ? Math.round((byStatus.done / successBase) * 100) : 0;
  const errorCount = byStatus.error || 0;
  const warningCount = redFlags.length;

  const chips = [
    { label: 'Dokumenty', value: documents.length, icon: FileText, color: '#3b82f6' },
    { label: 'Spracované', value: byStatus.done, icon: CheckCircle2, color: '#22c55e' },
    { label: 'V analýze', value: byStatus.analyzing + byStatus.pending, icon: Clock, color: '#f59e0b' },
    { label: 'Chyby', value: errorCount, icon: XCircle, color: '#ef4444' },
    { label: 'Úspešnosť', value: `${successRate}%`, icon: Percent, color: '#8b5cf6' },
    { label: 'Osoby', value: persons.length, icon: Users, color: '#06b6d4' },
    { label: 'Vzťahy', value: relationships.length, icon: Link2, color: '#0ea5e9' },
    { label: 'Varovania', value: warningCount, icon: AlertTriangle, color: '#f97316' },
    { label: 'Zvýraznenia', value: flaggedPassages.length, icon: Flag, color: '#eab308' }
  ];

  const setOpen = (next) => {
    onOpenChange?.(typeof next === 'function' ? next(open) : next);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (e.target.closest?.('[data-stats-toggle]')) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    // Defer so the opening click does not immediately close.
    const t = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointer);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div
      ref={panelRef}
      data-testid="stats-drawer-root"
      className="fixed z-40 right-20 lg:right-24 bottom-[calc(var(--sheet-offset)+0.5rem)] lg:bottom-6 flex flex-col items-end gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="stats-sheet"
            id="stats-drawer-panel"
            data-testid="stats-drawer"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto w-[min(100vw-1.5rem,22rem)] sm:w-[28rem] max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-200/80 p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
              <span className="text-xs font-medium text-slate-700">Štatistiky spisu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                aria-label="Zbaliť štatistiky"
              >
                Zbaliť
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {chips.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/90 min-w-0"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${c.color}22` }}
                  >
                    <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-500 text-[10px] truncate leading-tight">{c.label}</div>
                    <div className="font-semibold text-slate-900 tabular-nums text-sm leading-tight">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        data-testid="stats-drawer-toggle"
        onClick={() => setOpen(!open)}
        className={`pointer-events-auto relative inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-medium shadow-lg shadow-slate-200/60 backdrop-blur-md transition-colors ${
          open
            ? 'bg-blue-600/90 text-white border-blue-400/50'
            : 'bg-white/95 text-slate-800 border-slate-300 hover:border-slate-500 hover:bg-slate-100'
        }`}
        aria-expanded={open}
        aria-controls="stats-drawer-panel"
        title="Štatistiky spisu (vysunúť)"
      >
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <span className="hidden sm:inline">Štatistiky</span>
        {(errorCount > 0 || warningCount > 0) && (
          <span className="absolute -top-1.5 -right-1.5 flex gap-0.5">
            {errorCount > 0 && (
              <span className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                {errorCount > 9 ? '9+' : errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                {warningCount > 9 ? '9+' : warningCount}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
