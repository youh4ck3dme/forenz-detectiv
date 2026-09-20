import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { usePlanStore } from '@/store/usePlanStore';

export default function PaywallGate({
  isOpen,
  onClose,
  reason = 'limit_cases' // 'limit_cases' | 'limit_documents' | 'pro_feature'
}) {
  const { setPricingModalOpen } = usePlanStore();

  const titleMap = {
    limit_cases: 'Dosiahli ste limit bezplatných spisov (2 spisy)',
    limit_documents: 'Dosiahli ste limit 5 výpovedí na spis',
    pro_feature: 'Táto funkcia vyžaduje licenciu Pro Vyšetrovateľ'
  };

  const descMap = {
    limit_cases: 'V bezplatnom režime môžete naraz spravovať maximálne 2 vyšetrovacie spisy. Pre neobmedzenú kartotéku prejdite na Pro.',
    limit_documents: 'Na komplexnú analýzu rozsiahlych spisov s desiatkami svedeckých výpovedí a znaleckých posudkov potrebujete plán Pro.',
    pro_feature: 'Súdny PDF hash protokol a virálny export kariet alibi sú dostupné v pláne Pro Vyšetrovateľ.'
  };

  const handleOpenPricing = () => {
    onClose();
    setPricingModalOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-2">
          <ShieldAlert className="h-6 w-6 text-amber-400" />
        </div>

        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold text-white">
            {titleMap[reason] || titleMap.limit_cases}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {descMap[reason] || descMap.limit_cases}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 rounded-xl bg-white border border-slate-200 text-left space-y-2 text-xs text-slate-700">
          <p className="font-semibold text-amber-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> S licenciou Pro získate:
          </p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Neobmedzený počet spisov a výpovedí</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Súdny PDF protokol s overeným SHA-256 hashóm</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Export virálnych kariet Alibi pre sociálne siete</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-slate-400 hover:text-slate-900"
          >
            Neskôr
          </Button>
          <Button
            type="button"
            onClick={handleOpenPricing}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Zap className="h-4 w-4" />
            Aktivovať Pro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
