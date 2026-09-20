import React, { useRef, useEffect, useCallback } from 'react';
import { FileText, Users, Network, Flag, AlertOctagon } from 'lucide-react';
import ScanButton from '@/components/forenz/ScanButton';
import BulkScanButton from '@/components/forenz/BulkScanButton';

const STATUS_BADGE = {
  pending: { label: 'Čaká', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' },
  analyzing: { label: 'Analyzuje', cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/30' },
  done: { label: 'Hotové', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
  error: { label: 'Chyba', cls: 'bg-red-500/15 text-red-300 border border-red-500/30' }
};

export default function ArchiveFilmstrip({
  documents = [],
  selectedDocId,
  onSelect,
  contradictionCounts = {},
  onScan = null,
  onBulkScan = null,
  scanning = false,
  bulkProgress = null,
  onCancelProcessing = null,
  readOnly = false
}) {
  const scrollRef = useRef(null);
  const drag = useRef({ active: false, moved: false, sx: 0, scrollLeft: 0 });

  useEffect(() => {
    if (!scrollRef.current || !selectedDocId) return;
    const idx = documents.findIndex((d) => d.id === selectedDocId);
    if (idx < 0) return;
    const card = scrollRef.current.children[idx];
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDocId, documents]);

  const onWheel = useCallback((e) => {
    if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
  }, []);

  const onDown = (e) => {
    drag.current = { active: true, moved: false, sx: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
  };
  const onMove = (e) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.sx;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    scrollRef.current.scrollLeft = drag.current.scrollLeft - dx;
  };
  const onUp = () => { drag.current.active = false; };

  const handleSelect = (id) => {
    if (drag.current.moved) { drag.current.moved = false; return; }
    onSelect(id);
  };

  return (
    <div className="shrink-0 bg-white border-b border-slate-200">
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Archív dokumentov</span>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 font-mono">{documents.length}</span>
        {!readOnly && onScan && (
          <div className="ml-auto flex items-center gap-1.5">
            {onBulkScan && (
              <div className="hidden sm:block">
                <BulkScanButton
                  onBulkScan={onBulkScan}
                  scanning={scanning}
                  progress={bulkProgress}
                  onCancel={onCancelProcessing}
                />
              </div>
            )}
            <ScanButton onScan={onScan} scanning={scanning} />
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        className="flex gap-3 overflow-x-auto px-4 pb-3 hide-scrollbar"
        style={{ cursor: 'grab' }}
      >
        {documents.length === 0 && (
          <div className="text-xs text-slate-500 py-6">Žiadne dokumenty v archíve.</div>
        )}
        {documents.map((doc) => {
          const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending;
          const active = doc.id === selectedDocId;
          const date = doc.created_date ? new Date(doc.created_date).toLocaleDateString('sk-SK') : '';
          const contras = contradictionCounts[doc.id] || 0;
          return (
            <button
              key={doc.id}
              onClick={() => handleSelect(doc.id)}
              className={`group relative shrink-0 w-44 rounded-xl border overflow-hidden transition-all text-left shadow-sm ${
                active
                  ? 'border-blue-500 ring-1 ring-blue-500/50 bg-slate-800'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100/60'
              }`}
            >
              <div className="relative h-24 bg-white overflow-hidden">
                {doc.image_url && !(/\.pdf$/i.test(doc.image_url) || /\.pdf$/i.test(doc.title || '')) ? (
                  <img
                    src={doc.image_url}
                    alt={doc.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white text-slate-400 group-hover:bg-white transition-colors">
                    <FileText className="w-8 h-8 text-amber-500/80 mb-1" />
                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      PDF SPIS
                    </span>
                  </div>
                )}
                <span className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium text-slate-800 truncate">{doc.title}</p>
                {date && <p className="text-[10px] text-slate-500 mt-0.5">{date}</p>}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 flex-wrap">
                  <span className="inline-flex items-center gap-0.5" title="Osoby"><Users className="w-3 h-3 text-cyan-400" />{doc.person_count ?? 0}</span>
                  <span className="inline-flex items-center gap-0.5" title="Vzťahy"><Network className="w-3 h-3 text-blue-400" />{doc.relationship_count ?? 0}</span>
                  <span className="inline-flex items-center gap-0.5" title="Varovania"><Flag className="w-3 h-3 text-amber-400" />{doc.red_flag_count ?? 0}</span>
                  {contras > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-red-400 font-semibold" title="Rozpory"><AlertOctagon className="w-3 h-3 text-red-500" />{contras}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}