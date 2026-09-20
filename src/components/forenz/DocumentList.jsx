import React, { useState, useMemo } from 'react';
import {
  FileText,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Folder,
  Layers
} from 'lucide-react';
import { buildDocumentHierarchy } from '@/lib/pdfPageChunker';

const STATUS_BADGE = {
  pending: { label: 'Čaká', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  analyzing: { label: 'Analyzuje sa', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  done: { label: 'Hotové', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  error: { label: 'Chyba', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' }
};

export default function DocumentList({
  documents = [],
  selectedDocId,
  onSelect,
  onDelete,
  onRetry,
  onRetryContainer
}) {
  const hierarchy = useMemo(() => buildDocumentHierarchy(documents), [documents]);

  // Track collapsed state per container. By default, all containers are expanded.
  const [collapsedMap, setCollapsedMap] = useState({});

  const toggleCollapse = (containerId, e) => {
    e?.stopPropagation?.();
    setCollapsedMap((prev) => ({
      ...prev,
      [containerId]: !prev[containerId]
    }));
  };

  const totalPageCount = useMemo(() => {
    let count = 0;
    hierarchy.forEach((item) => {
      if (item.type === 'container') {
        count += item.pages?.length || item.totalPages || 0;
      } else {
        count += 1;
      }
    });
    return count;
  }, [hierarchy]);

  return (
    <div className="w-full h-full shrink-0 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[20vh] lg:max-h-none overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white/90">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Výpovede & Spisy
        </h2>
        <span
          className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 font-mono"
          title={`${hierarchy.length} spisov celkovo (${totalPageCount} strán)`}
        >
          {documents.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            !selectedDocId
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
          }`}
        >
          🌐 Všetky spisy (kompletný pavúk)
        </button>

        {documents.length === 0 && (
          <p className="text-xs text-slate-500 px-3 py-6 text-center">
            Zatiaľ žiadne výpovede. Naskenujte alebo nahrajte dokument.
          </p>
        )}

        {hierarchy.map((item) => {
          if (item.type === 'standalone') {
            const doc = item.doc;
            const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending;
            const isSelected = selectedDocId === doc.id;

            return (
              <div
                key={doc.id}
                onClick={() => onSelect(doc.id)}
                className={`group cursor-pointer rounded-xl border p-2.5 transition-all ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                    : 'bg-white/50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {doc.status === 'analyzing' ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin mt-0.5 shrink-0" />
                  ) : doc.status === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  ) : doc.status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>
                      {doc.status === 'done' && (
                        <span className="text-[10px] text-slate-400">
                          {doc.person_count || 0} osôb · {doc.relationship_count || 0} vzťahov
                        </span>
                      )}
                    </div>
                    {doc.status === 'error' && (doc.error || doc.last_error) && (
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <p className="text-[10px] text-red-400 line-clamp-2">{doc.error || doc.last_error}</p>
                        {onRetry && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onRetry(doc); }}
                            className="text-[10px] text-blue-400 hover:text-blue-300 underline font-medium shrink-0 ml-1"
                            title="Znovu analyzovať výpoveď"
                          >
                            Skúsiť znova
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {onRetry && doc.status === 'error' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRetry(doc); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-400 p-1 transition"
                      title="Znovu analyzovať"
                      aria-label="Znovu analyzovať"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition"
                      title="Zmazať výpoveď"
                      aria-label="Zmazať výpoveď"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Container document (PDF with child pages)
          const containerDoc = item.doc;
          const isCollapsed = Boolean(collapsedMap[containerDoc.id]);
          const isContainerSelected = selectedDocId === containerDoc.id;
          const containerBadge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
          const hasErrorPages = item.errorPages > 0;
          const isProcessing = item.analyzingPages > 0 || item.pendingPages > 0;

          return (
            <div
              key={containerDoc.id}
              className="rounded-xl border border-slate-200/90 bg-slate-50 overflow-hidden transition-all shadow-sm"
            >
              {/* Parent Container Header */}
              <div
                onClick={() => onSelect(containerDoc.id)}
                className={`group cursor-pointer p-2.5 transition-all flex items-start gap-2 ${
                  isContainerSelected
                    ? 'bg-amber-500/15 border-b border-amber-500/30'
                    : 'hover:bg-slate-100/70'
                }`}
              >
                {/* Collapsible toggle */}
                <button
                  type="button"
                  onClick={(e) => toggleCollapse(containerDoc.id, e)}
                  className="p-0.5 text-slate-400 hover:text-slate-900 transition-colors mt-0.5 shrink-0 rounded hover:bg-slate-700/60"
                  title={isCollapsed ? 'Rozbaliť stránky' : 'Zbaliť stránky'}
                  aria-label={isCollapsed ? 'Rozbaliť stránky' : 'Zbaliť stránky'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {/* Container Icon */}
                <div className="mt-0.5 shrink-0 text-amber-400">
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : (
                    <Folder className="w-4 h-4" />
                  )}
                </div>

                {/* Container details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-slate-900 truncate" title={containerDoc.title}>
                      {containerDoc.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${containerBadge.cls}`}>
                      {containerBadge.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {item.donePages}/{item.totalPages} strán
                    </span>
                    {hasErrorPages && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                        {item.errorPages} {item.errorPages === 1 ? 'chyba' : 'chyby'}
                      </span>
                    )}
                  </div>

                  {/* Mini progress bar if active processing */}
                  {isProcessing && item.totalPages > 0 && (
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5 flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${(item.donePages / item.totalPages) * 100}%` }}
                      />
                      <div
                        className="bg-blue-500 h-full transition-all duration-300 animate-pulse"
                        style={{ width: `${(item.analyzingPages / item.totalPages) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 h-full transition-all duration-300"
                        style={{ width: `${(item.errorPages / item.totalPages) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Container actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {hasErrorPages && (onRetryContainer || onRetry) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRetryContainer) {
                          onRetryContainer(containerDoc);
                        } else if (onRetry) {
                          const firstErr = item.pages.find((p) => p.status === 'error');
                          if (firstErr) onRetry(firstErr);
                        }
                      }}
                      className="text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-amber-500/10 transition"
                      title="Znovu analyzovať chybné strany"
                      aria-label="Znovu analyzovať chybné strany"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(containerDoc); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition"
                      title="Zmazať celý PDF spis a všetky strany"
                      aria-label="Zmazať celý PDF spis a všetky strany"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Child Pages Tree Items */}
              {!isCollapsed && (
                <div className="pl-6 pr-2 py-1.5 space-y-1 bg-slate-50 border-t border-slate-200">
                  {item.pages.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic py-1 px-2">
                      Spracovávam strany PDF...
                    </p>
                  )}

                  {item.pages.map((pageDoc) => {
                    const isPageSelected = selectedDocId === pageDoc.id;
                    const pageBadge = STATUS_BADGE[pageDoc.status] || STATUS_BADGE.pending;

                    return (
                      <div
                        key={pageDoc.id}
                        onClick={() => onSelect(pageDoc.id)}
                        className={`group/page cursor-pointer rounded-lg border p-2 transition-all flex items-start gap-2 relative ${
                          isPageSelected
                            ? 'bg-blue-600/20 border-blue-500/60 shadow-sm'
                            : 'bg-white border-slate-200/70 hover:bg-slate-100/70 hover:border-slate-300'
                        }`}
                      >
                        {/* Page indicator symbol */}
                        <div className="mt-0.5 shrink-0">
                          {pageDoc.status === 'analyzing' ? (
                            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                          ) : pageDoc.status === 'error' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          ) : pageDoc.status === 'done' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>

                        {/* Page Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-medium text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 shrink-0">
                              s. {pageDoc.page_number || '?'}/{pageDoc.page_count || item.totalPages}
                            </span>
                            <p className="text-xs text-slate-800 truncate font-medium">
                              {pageDoc.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded ${pageBadge.cls}`}>
                              {pageBadge.label}
                            </span>
                            {pageDoc.status === 'done' && (
                              <span className="text-[10px] text-slate-400">
                                {pageDoc.person_count || 0} osôb · {pageDoc.relationship_count || 0} vzťahov
                              </span>
                            )}
                          </div>

                          {pageDoc.status === 'error' && (
                            <div className="mt-1 bg-red-950/40 border border-red-900/50 rounded p-1.5">
                              <p className="text-[10px] text-red-400 line-clamp-2">
                                {pageDoc.error || pageDoc.last_error || 'Chyba pri extrakcii strany'}
                              </p>
                              {onRetry && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onRetry(pageDoc); }}
                                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[10px] font-medium transition-colors"
                                  title="Znovu analyzovať stranu"
                                  aria-label="Znovu analyzovať stranu"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Znovu analyzovať stranu</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Per-page Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {onRetry && pageDoc.status === 'error' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onRetry(pageDoc); }}
                              className="text-slate-400 hover:text-blue-400 p-1 transition rounded hover:bg-slate-700/60"
                              title="Znovu analyzovať stranu"
                              aria-label="Znovu analyzovať stranu"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onDelete(pageDoc); }}
                              className="opacity-0 group-hover/page:opacity-100 text-slate-500 hover:text-red-400 p-1 transition rounded hover:bg-slate-700/60"
                              title="Zmazať túto stranu"
                              aria-label="Zmazať túto stranu"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}