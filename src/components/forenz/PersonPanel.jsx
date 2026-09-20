import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Link2, X, Clock, Quote, FileText, Gavel } from 'lucide-react';
import { TYPE_COLOR } from '@/lib/forenzUtils';

const spring = { type: 'spring', stiffness: 300, damping: 30 };

export default function PersonPanel({ person, edge, onClose, onShowEvidence, onCrossExamine }) {
  const key = edge ? `edge-${edge.id}` : person ? `person-${person.id}` : 'empty';
  let content;

  if (edge) {
    content = (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-900">Forenzný vzťah</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-300 text-slate-900 font-medium truncate max-w-[45%]">{edge.sourceName}</span>
            <span className="text-slate-500 shrink-0">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-300 text-slate-900 font-medium truncate max-w-[45%]">{edge.targetName}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="text-slate-500">Typ:</span>
            <span className="font-semibold text-blue-400">{edge.label}</span>
          </div>
          {edge.time && (
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-amber-400">{edge.time}</span>
            </div>
          )}
          {edge.description && (
            <div className="flex gap-2 text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <Quote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
              <p className="text-xs italic leading-relaxed">{edge.description}</p>
            </div>
          )}
          {edge.document_title && (
            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">Spis: {edge.document_title}</p>
          )}
          {onShowEvidence && edge.document_id && (
            <button
              onClick={() => onShowEvidence(edge.document_id)}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-300 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Zobraziť dôkaz v Kartotéke
            </button>
          )}
        </div>
      </>
    );
  } else if (!person) {
    content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold text-slate-900">Profil osoby / aktéra</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Kliknite na uzol v grafe pre zobrazenie profilu osoby, alebo na spojnicu pre detail vzťahu.
        </p>
      </>
    );
  } else {
    const color = TYPE_COLOR[person.type] || '#3b82f6';
    content = (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color }} />
            <h3 className="text-xs font-semibold text-slate-900">Profil osoby</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <p className="text-base font-bold text-slate-900">{person.name}</p>
            <span
              className="inline-block mt-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border"
              style={{ background: `${color}22`, color, borderColor: `${color}44` }}
            >
              {person.type}
            </span>
          </div>
          {person.details && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Kontext & Zistenia</p>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">{person.details}</p>
            </div>
          )}
          {person.document_title && (
            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">Spis: {person.document_title}</p>
          )}
          {onShowEvidence && person.document_id && (
            <button
              onClick={() => onShowEvidence(person.document_id)}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-300 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Zobraziť dôkaz v Kartotéke
            </button>
          )}
          {onCrossExamine && (
            <button
              type="button"
              onClick={() => onCrossExamine(person)}
              data-testid="cross-exam-person"
              className="mt-1 w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-colors font-semibold"
            >
              <Gavel className="w-3.5 h-3.5" />
              Krížový výsluch
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="p-4 border-b border-slate-200 bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={spring}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
