import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useTranslation } from '@/i18n/i18nContext';

/**
 * Pricing UI kept for RB-05 re-enable. Monetization is hard-disabled —
 * this modal only shows a paused notice (no Stripe / license keys).
 */
export default function PricingModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [msg] = useState({
    type: 'info',
    text: 'Platby a licencie sú dočasne pozastavené. Ostré testovanie beží bez paywallu.'
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 p-6">
        <DialogHeader className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mx-auto">
            <Zap className="h-3.5 w-3.5" />
            <span>{t('pricing.badge')}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            {t('pricing.title')}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            {msg.text}
          </DialogDescription>
        </DialogHeader>
        <Button type="button" onClick={onClose} className="w-full mt-4 bg-slate-800 hover:bg-slate-700">
          Zavrieť
        </Button>
      </DialogContent>
    </Dialog>
  );
}
