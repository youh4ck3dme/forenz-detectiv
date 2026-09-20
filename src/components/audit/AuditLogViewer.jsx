import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Download, Trash2, Search, Clock, FileText } from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';

export default function AuditLogViewer({ isOpen, onClose }) {
  const { logs, clearLogs, exportLogsAsCsv, exportLogsAsTxt } = useAuditStore();
  const [filterAction, setFilterAction] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(item => {
    if (filterAction !== 'ALL' && item.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = item.action.toLowerCase().includes(q);
      const matchDetails = JSON.stringify(item.details).toLowerCase().includes(q);
      if (!matchAction && !matchDetails) return false;
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white border-slate-200 text-slate-900 p-6 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold text-slate-900">
              Forenzný Audit Log v2 (Reťazec dôkazov)
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-xs">
            Nemenný chronologický denník všetkých operácií, nahrávania súborov a AI analýzy v súlade s advokátskym tajomstvom.
          </DialogDescription>
        </DialogHeader>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Hľadať v záznamoch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Všetky akcie</option>
              <option value="CASE_CREATED">Vytvorenie spisu</option>
              <option value="DOC_UPLOADED">Nahratie výpovede</option>
              <option value="AI_ANALYSIS">AI analýza</option>
              <option value="CONTRADICTION_FLAGGED">Detekcia rozporu</option>
              <option value="PDF_EXPORTED">PDF export</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportLogsAsCsv}
              className="border-slate-200 text-slate-700 hover:text-slate-900 text-xs gap-1"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" /> CSV
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportLogsAsTxt}
              className="border-slate-200 text-slate-700 hover:text-slate-900 text-xs gap-1"
            >
              <FileText className="h-3.5 w-3.5 text-blue-400" /> TXT
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLogs}
              className="text-slate-500 hover:text-red-400 text-xs p-2"
              title="Vyčistiť denník"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              Žiadne zaznamenané udalosti pre zvolený filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {new Date(log.timestamp).toLocaleTimeString('sk-SK')} ({new Date(log.timestamp).toLocaleDateString('sk-SK')})
                    </span>
                  </div>
                  <p className="text-slate-800 text-xs font-sans">
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </p>
                </div>

                <div className="text-right sm:text-right shrink-0">
                  <span className="text-[10px] text-slate-500">ID: {log.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Záznamov: {filteredLogs.length} / {logs.length}
          </span>
          <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-900 text-xs">
            Zavrieť
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
