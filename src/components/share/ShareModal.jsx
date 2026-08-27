import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, Share2, Eye, EyeOff, Check, Loader2, Sparkles } from 'lucide-react';
import AlibiShareCard from './AlibiShareCard';
import { exportElementAsPng, copyElementImageToClipboard } from '@/utils/imageExporter';
import { trackShareCardGenerated } from '@/lib/analytics';

export default function ShareModal({
  isOpen,
  onClose,
  contradiction = null
}) {
  const [anonymized, setAnonymized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fullCardRef = useRef(null);

  const requirePro = () => false;

  const handleDownload = async () => {
    if (requirePro()) return;
    try {
      setLoading(true);
      if (!fullCardRef.current) return;
      await exportElementAsPng(fullCardRef.current, `alibi-paradox-${Date.now()}.png`);
      trackShareCardGenerated('alibi_impossible');
    } catch (err) {
      console.error('Chyba pri sťahovaní karty:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (requirePro()) return;
    try {
      setLoading(true);
      if (!fullCardRef.current) return;
      await copyElementImageToClipboard(fullCardRef.current);
      trackShareCardGenerated('alibi_impossible');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Chyba pri kopírovaní do schránky:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInShare = () => {
    const locA = contradiction?.locationA || 'miesta A';
    const locB = contradiction?.locationB || 'miesta B';
    const mins = contradiction?.intervalMinutes != null ? `${contradiction.intervalMinutes} minút` : 'krátky interval';
    const speed = contradiction?.requiredSpeedKmH != null ? `${contradiction.requiredSpeedKmH} km/h` : 'nemožnú rýchlosť';
    const text = encodeURIComponent(
      `Odhalili sme fyzikálne nemožné alibi pomocou ForenzDetectiv AI!\n\n📍 Presun z ${locA} do ${locB} za ${mins} vyžaduje ${speed}.\n\nVyskúšajte automatickú detekciu rozporov vo vyšetrovacích spisoch:`
    );
    const url = encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://forenz-detectiv.vercel.app');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-slate-100 p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold text-white">
              Virálna Karta: Geograficky Nemožné Alibi
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            Exportujte vizuálnu kartu alibi paradoxu pre sociálne siete (LinkedIn, X), e-mail alebo súdnu prílohu.
          </DialogDescription>
        </DialogHeader>

        {/* Anonymization Toggle */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl mt-2">
          <div className="flex items-center gap-3">
            {anonymized ? <EyeOff className="h-5 w-5 text-amber-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
            <div>
              <p className="text-sm font-medium text-slate-200">Anonymizácia osobných údajov</p>
              <p className="text-xs text-slate-400">Nahradí mená aktérov vo výpovediach za "Osoba A / Svedok"</p>
            </div>
          </div>
          <Button
            type="button"
            variant={anonymized ? "default" : "outline"}
            size="sm"
            onClick={() => setAnonymized(!anonymized)}
            className={anonymized ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold" : "border-slate-700 text-slate-300"}
          >
            {anonymized ? 'Anonymizované ✓' : 'Anonymizovať'}
          </Button>
        </div>

        {/* Visual Preview scaled for dialog view */}
        <div className="relative my-4 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-4">
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center', marginBottom: '-260px' }}>
              <AlibiShareCard
                contradiction={contradiction}
                anonymized={anonymized}
              />
            </div>
          </div>
        </div>

        {/* Hidden full-res card for html2canvas extraction */}
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
          <AlibiShareCard
            cardRef={fullCardRef}
            contradiction={contradiction}
            anonymized={anonymized}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Zatvoriť
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleLinkedInShare}
              className="border-slate-700 hover:bg-slate-900 text-slate-200 gap-2"
            >
              <Share2 className="h-4 w-4 text-blue-400" />
              Zdieľať na LinkedIn
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              disabled={loading}
              className="border-slate-700 hover:bg-slate-900 text-slate-200 gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-amber-400" />}
              {copied ? 'Skopírované!' : 'Kopírovať obrázok'}
            </Button>

            <Button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Stiahnuť PNG (1200x630)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
