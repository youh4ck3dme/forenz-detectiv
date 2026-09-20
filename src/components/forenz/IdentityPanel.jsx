import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Split, X, ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';

export default function IdentityPanel({ overrides = [], persons = [], onRevokeOverride }) {
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  const personName = (id) => persons.find((p) => p.id === id)?.name || 'Neznáma';
  const targetOverride = overrides.find(o => o.id === confirmRevokeId);

  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 lg:p-8 min-h-0">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900">Identity Control Center</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manuálne korekcie automatického zlučovania AI. V grafe použite{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-700 font-mono">Shift+Click</kbd>{' '}
            (desktop) alebo podržanie uzla pre výber, potom zlúčte alebo rozdeľte identity.
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> zlúčené človekom</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> rozdelené človekom</span>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-800">Audit trail identít</h3>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 font-mono">{overrides.length} zmien</span>
          </div>

          {overrides.length === 0 ? (
            <div className="text-center py-10">
              <Info className="w-7 h-7 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">Zatiaľ žiadne manuálne korekcie identít.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {overrides.map((o) => {
                  const isMerge = o.override_type === 'merge';
                  return (
                    <motion.div
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isMerge ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {isMerge ? <UserPlus className="w-4 h-4" /> : <Split className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {isMerge ? 'Zlúčenie identity' : 'Rozdelenie identity'}
                        </p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {personName(o.source_person_id)} {isMerge ? '→' : '⊘'} {personName(o.target_person_id)}
                        </p>
                        {o.note && <p className="text-xs text-slate-400 mt-1 italic">„{o.note}"</p>}
                        {o.created_date && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            {new Date(o.created_date).toLocaleString('sk-SK')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setConfirmRevokeId(o.id)}
                        className="shrink-0 w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors flex items-center justify-center"
                        title="Zrušiť opravu"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRevokeId} onOpenChange={() => setConfirmRevokeId(null)}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-900">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle>Potvrdenie zrušenia korekcie identity</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-400 text-xs mt-2">
              Naozaj chcete zrušiť túto manuálnu úpravu pre aktérov{' '}
              <strong className="text-slate-800">{targetOverride ? personName(targetOverride.source_person_id) : ''}</strong> a{' '}
              <strong className="text-slate-800">{targetOverride ? personName(targetOverride.target_person_id) : ''}</strong>? Graf väzieb sa vráti k pôvodnému automatickému stavu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100">
              Ponechať
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRevokeId) {
                  onRevokeOverride(confirmRevokeId);
                  setConfirmRevokeId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              Potvrdiť zrušenie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
