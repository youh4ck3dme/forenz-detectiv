import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Check, Mail, Users } from 'lucide-react';
import { usePlanStore } from '@/store/usePlanStore';

export default function ReferralModal({ isOpen, onClose }) {
  const { getReferralLink } = usePlanStore();
  const [copied, setCopied] = useState(false);
  const refLink = getReferralLink();

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailInvite = () => {
    const subject = encodeURIComponent('Odporúčam: AI analýza vyšetrovacích spisov (ForenzDetectiv)');
    const body = encodeURIComponent(
      `Ahoj,\n\nchcem ti odporučiť slovenskú aplikáciu ForenzDetectiv na analýzu výpovedí, detekciu rozporov a kontrolu alibi:\n\n${refLink}\n\nS pozdravom`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-slate-100 p-6">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
            <Gift className="h-6 w-6 text-amber-400" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Pozvite kolegu advokáta
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs max-w-sm mx-auto">
            Zdieľajte ForenzDetectiv s kolegami z branže. Odkaz slúži na sledovanie odporúčaní — automatický Pro upgrade sa v tejto verzii neudeľuje.
          </DialogDescription>
        </DialogHeader>

        {/* Benefits Card */}
        <div className="my-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-amber-500/20 text-amber-400 mt-0.5">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="font-semibold text-white">Ako funguje odkaz?</p>
              <p className="text-slate-400 mt-0.5">
                Keď kolega otvorí váš odkaz, systém si zapamätá odporúcuťeľa pre budúcu registráciu. Pro odmeny sa aktivujú až po nasadení serverovej referral logiky.
              </p>
            </div>
          </div>
        </div>

        {/* Referral Link Input & Copy */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">Váš unikátny pozvánkový odkaz:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={refLink}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-400 flex-1 select-all focus:outline-none"
            />
            <Button
              type="button"
              onClick={handleCopy}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
              {copied ? 'Skopírované' : 'Kopírovať'}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Zavrieť
          </Button>

          <Button
            type="button"
            onClick={handleEmailInvite}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
          >
            <Mail className="h-4 w-4" />
            Odoslať pozvánku e-mailom
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
