import React from 'react';
import { Loader2 } from 'lucide-react';

export function ViewSkeleton({ type = 'graph', label = 'Načítavam modul...' }) {
  return (
    <div className="w-full h-full flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl relative overflow-hidden animate-pulse">
      {/* Background skeleton grid / shapes */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-950/80 to-slate-900/40 pointer-events-none" />

      {type === 'map' && (
        <div className="w-full h-full flex flex-col gap-4 opacity-40">
          <div className="h-10 bg-slate-800/60 rounded-xl w-1/3" />
          <div className="flex-1 bg-slate-800/40 rounded-2xl flex items-center justify-center border border-slate-300/30" />
        </div>
      )}

      {type === 'graph' && (
        <div className="w-full h-full flex items-center justify-center relative opacity-30">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-blue-500/40 animate-spin" />
          <div className="absolute w-16 h-16 rounded-full bg-blue-500/20" />
        </div>
      )}

      {type === 'archive' && (
        <div className="w-full h-full flex flex-col gap-3 opacity-40">
          <div className="h-8 bg-slate-800 rounded-lg w-1/4" />
          <div className="h-24 bg-slate-800/60 rounded-xl w-full border border-slate-300/30" />
          <div className="h-24 bg-slate-800/60 rounded-xl w-full border border-slate-300/30" />
          <div className="h-24 bg-slate-800/60 rounded-xl w-full border border-slate-300/30" />
        </div>
      )}

      {type === 'timeline' && (
        <div className="w-full h-full flex flex-col gap-4 opacity-40">
          <div className="h-6 bg-slate-800 rounded-md w-48" />
          <div className="flex-1 flex gap-4">
            <div className="w-1 bg-blue-500/30 h-full rounded-full ml-4" />
            <div className="flex-1 flex flex-col gap-3">
              <div className="h-16 bg-slate-800/50 rounded-xl" />
              <div className="h-16 bg-slate-800/50 rounded-xl" />
              <div className="h-16 bg-slate-800/50 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      <div className="absolute z-10 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/90 border border-slate-200 shadow-xl text-slate-700 text-xs font-medium backdrop-blur-md">
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default ViewSkeleton;
