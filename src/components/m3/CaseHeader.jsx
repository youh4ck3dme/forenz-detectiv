import React from 'react';
import { ShieldCheck, Users, AlertTriangle, FileText } from 'lucide-react';

export default function CaseHeader({
  sharedBy,
  documents = [],
  persons = [],
  redFlags = [],
  contradictions = []
}) {
  const alertCount = redFlags.length + contradictions.length;
  if (!sharedBy && !documents.length) return null;

  return (
    <div data-testid="case-header" className="shrink-0 border-b border-slate-200 bg-white/90">
      {sharedBy && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-violet-950/80 border-b border-violet-800/60 text-violet-200 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="truncate">
              Zdieľaný vyšetrovací spis od <strong>{sharedBy}</strong> · len na čítanie
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-violet-900/60 border border-violet-700/50 shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {documents.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-400" />
            {documents.length} dok.
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3 text-cyan-400" />
            {persons.length} osôb
          </span>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {alertCount} varovaní
          </span>
        </div>
      )}
    </div>
  );
}
