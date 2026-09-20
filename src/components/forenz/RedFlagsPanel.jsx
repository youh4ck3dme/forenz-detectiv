import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Share2, Gavel } from 'lucide-react';
import ShareModal from '@/components/share/ShareModal';

const CATEGORY_LABEL = {
  časová_nesúlad: 'Časový nesúlad',
  geografická_nesúlad: 'Nemožné alibi (Geografický presun)',
  chýbajúce_info: 'Chýbajúce info',
  lingvistika: 'Lingvistická anomália',
  rozpor: 'Forenzný rozpor',
  iné: 'Iné varovanie'
};

export default function RedFlagsPanel({
  redFlags = [],
  contradictions = [],
  onCrossExamine = null
}) {
  const [selectedContradiction, setSelectedContradiction] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const handleShare = (rf) => {
    const contradictionData = {
      locationA: rf.locationA || rf.locA || '—',
      timeA: rf.timeA || '—',
      locationB: rf.locationB || rf.locB || '—',
      timeB: rf.timeB || '—',
      distanceKm: rf.distanceKm || null,
      intervalMinutes: rf.intervalMinutes || null,
      requiredSpeedKmH: rf.requiredSpeedKmH || null,
      personName: rf.person || rf.entity || 'Podozrivá osoba',
      quoteA: rf.quoteA || rf.description || '',
      quoteB: rf.quoteB || '',
      caseTitle: rf.document_title || 'Aktuálny spis'
    };
    setSelectedContradiction(contradictionData);
    setShareOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white border-t border-slate-200">
      <div className="px-4 py-3 sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center gap-2 z-10">
        <ShieldAlert className="w-4 h-4 text-red-400" />
        <h3 className="text-xs font-semibold text-slate-900">Analýza dôveryhodnosti</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-400 font-semibold border border-red-800">
          {redFlags.length + contradictions.length}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {redFlags.length === 0 && contradictions.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/40 border border-slate-200 rounded-xl">
            <ShieldAlert className="w-7 h-7 mx-auto mb-2 text-slate-600 opacity-60" />
            <p className="text-xs text-slate-400">
              Žiadne varovania. Naskenujte výpovede pre automatickú detekciu nezrovnalostí a nemožných alibi.
            </p>
          </div>
        ) : (
          <>
            {contradictions.map((c) => (
              <div
                key={c.id || `${c.claim_a_id}-${c.claim_b_id}`}
                className="rounded-xl p-3 border border-red-900/70 bg-red-950/30 hover:border-red-700 transition-all"
                data-testid="contradiction-row"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-red-900/50 text-red-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 leading-snug">
                      {c.explanation || c.type?.replace(/_/g, ' ') || 'Detegovaný rozpor'}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-red-900/60 text-red-300 border border-red-800">
                          {c.severity || 'rozpor'}
                        </span>
                        {c.entity_ref && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {c.entity_ref}
                          </span>
                        )}
                      </div>
                      {onCrossExamine && (
                        <button
                          type="button"
                          onClick={() => onCrossExamine(c)}
                          data-testid="cross-exam-contradiction"
                          className="flex items-center gap-1 text-[10px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition-colors"
                          title="Generovať otázky na krížový výsluch"
                        >
                          <Gavel className="w-3 h-3" />
                          <span>Výsluch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {redFlags.map((rf) => {
              const isCritical = rf.category === 'geografická_nesúlad' || rf.category === 'rozpor' || rf.severity === 'critical';
              return (
                <div
                  key={rf.id}
                  className={`rounded-xl p-3 border transition-all ${
                    isCritical
                      ? 'border-red-900/70 bg-red-950/30 hover:border-red-700'
                      : 'border-amber-900/60 bg-amber-950/25 hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isCritical ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'
                    }`}>
                      {isCritical ? <ShieldAlert className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 leading-snug">{rf.description}</p>
                      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isCritical
                              ? 'bg-red-900/60 text-red-300 border border-red-800'
                              : 'bg-amber-900/60 text-amber-300 border border-amber-800'
                          }`}>
                            {CATEGORY_LABEL[rf.category] || rf.category}
                          </span>
                          {rf.document_title && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono">
                              {rf.document_title}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {onCrossExamine && (
                            <button
                              type="button"
                              onClick={() => onCrossExamine(rf)}
                              className="flex items-center gap-1 text-[10px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition-colors"
                              title="Generovať otázky na krížový výsluch"
                            >
                              <Gavel className="w-3 h-3" />
                              <span>Výsluch</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleShare(rf)}
                            className="flex items-center gap-1 text-[10px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition-colors"
                            title="Zdieľať kartu alibi / rozporu"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Karta</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {shareOpen && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          contradiction={selectedContradiction}
        />
      )}
    </div>
  );
}
