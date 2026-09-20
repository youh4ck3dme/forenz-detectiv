import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, EyeOff, CheckCircle2, Download, Scale, Award } from 'lucide-react';

export default function TrustPackModal({ isOpen, onClose }) {
  const downloadWhitepaper = () => {
    const content = [
      '=================================================================',
      'FORENZDETECTIV — SECURITY & COMPLIANCE WHITEPAPER',
      'Bezpečnostný rámec a právny súlad pre advokáciu a OČTK',
      `Dátum vydania: ${new Date().toLocaleDateString('sk-SK')}`,
      '=================================================================\n',
      '1. OCHRANA DÁT A ADVOKÁTSKE TAJOMSTVO',
      'Všetky analýzy vyšetrovacích spisov prebiehajú s dôrazom na mlčanlivosť podľa Zákona č. 586/2003 Z. z. o advokácii.',
      '- Žiadne dáta z vašich spisov sa nepoužívajú na trénovanie verejných AI modelov (Zero Data Retention).',
      '- Citlivé osobné údaje sú pred odoslaním do AI modulu anonymizovateľné jedným klikom.\n',
      '2. KRYPTOGRAFICKÁ INTEGRITA (SHA-256)',
      'Každý generovaný spis a PDF protokol nesie kryptografický odtlačok integrity SHA-256 vypočítaný cez Web Crypto API.',
      'To garantuje nemennosť dôkazového materiálu v čase.\n',
      '3. 100% PROVENANCE & CITÁCIE ZO ZDROJA',
      'Engine ForenzDetectiv striktne zakazuje halucinácie: každý identifikovaný rozpor musí obsahovať doslovnú citáciu.',
      'Závery majú odporúčací charakter v súlade s princípom human-in-the-loop.\n',
      '4. AUDITNÝ DENNÍK (CHAIN OF CUSTODY)',
      'Každá operácia v systéme sa zaznamenáva do nemenného lokálneho audit logu s presnou časovou pečiatkou.'
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ForenzDetectiv-Security-Whitepaper.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white border-slate-200 text-slate-900 p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldCheck className="h-6 w-6" />
            <DialogTitle className="text-2xl font-bold text-white">
              Bezpečnosť, Dôvera & LEA Trust Pack
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            ForenzDetectiv spĺňa prísne štandardy pre ochranu advokátskeho tajomstva a forenznú integritu dôkazov.
          </DialogDescription>
        </DialogHeader>

        {/* 4 Security Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Lock className="h-4 w-4" />
              <span>Lokálne šifrovanie & Bezpečnosť</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Citlivé spisy a materiály sú indexované priamo vo vašom prehliadači cez zabezpečenú IndexedDB s AES šifrovaním.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <EyeOff className="h-4 w-4" />
              <span>Zero-Data Retention AI</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Dáta z vašich vyšetrovacích spisov sa nikdy nepoužívajú na trénovanie modelov ani sa neukladajú tretím stranám.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <Award className="h-4 w-4" />
              <span>100% Citácie bez halucinácií</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Každý identifikovaný rozpor alebo alibi konflikt striktne odkazuje na konkrétnu stranu a riadok spisu.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <Scale className="h-4 w-4" />
              <span>Súlad s právnymi predpismi</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Plný súlad s GDPR a Zákonom o advokácii. Forenzná doložka preukazuje zachovanie reťazca dôkazov (Chain of Custody).
            </p>
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
          <p className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">Garantované certifikácie:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Kryptografický SHA-256 odtlačok spisu</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Nezávislý auditný log udalostí</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Podpora okamžitej anonymizácie aktérov</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Možnosť prevádzky na vlastnom serveri (On-Premise)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-xs"
          >
            Zatvoriť
          </Button>

          <Button
            type="button"
            onClick={downloadWhitepaper}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 text-xs shadow-lg shadow-amber-500/20"
          >
            <Download className="h-4 w-4" />
            Stiahnuť Bezpečnostný list (Whitepaper)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
