import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scale, Loader2, Copy, CheckCircle2, Gavel, Shield } from 'lucide-react';
import {
  CROSS_EXAM_MODES,
  generateCrossExamination,
  createBase44CrossExamInvoker
} from '@/lib/crossExamination';
import { base44 } from '@/api/base44Client';

const MODE_LIST = Object.values(CROSS_EXAM_MODES);

export default function CrossExamDialog({
  isOpen,
  onClose,
  target = null,
  targetKind = 'contradiction', // 'contradiction' | 'person'
  documents = [],
  claims = [],
  contradictions = [],
  onGenerated = null
}) {
  const [modeId, setModeId] = useState('mild');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError(null);
      setCopied(false);
      setModeId('mild');
    }
  }, [isOpen]);

  const titleLabel =
    targetKind === 'person'
      ? target?.name || 'Osoba'
      : target?.entity_ref || target?.person || target?.type || 'Rozpor';

  const handleGenerate = async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const aiInvoke = createBase44CrossExamInvoker(base44);
      const out = await generateCrossExamination({
        target,
        mode: modeId,
        documents,
        claims,
        contradictions,
        aiInvoke
      });
      setResult(out);
      onGenerated?.(out);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Generovanie zlyhalo');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.questions?.length) return;
    const text = result.questions
      .map((q, i) => `${i + 1}. ${q.question}\n   Citácia: ${q.citationText || q.citation?.text || ''}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <Gavel className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold text-white">
              Krížový výsluch — {titleLabel}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            Generovanie súdnych otázok s povinnou citáciou zo spisu (strana/riadok alebo dokument + pasáž).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taktický režim</p>
          <div className="grid gap-2">
            {MODE_LIST.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  modeId === m.id
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="cross-exam-mode"
                  className="mt-1 accent-amber-500"
                  checked={modeId === m.id}
                  onChange={() => setModeId(m.id)}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Shield className="w-3 h-3 text-emerald-500" />
            Každá otázka musí mať citáciu
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-900">
              Zavrieť
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !target}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
              Generovať otázky
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-2 bg-red-950/40 border border-red-900 rounded-lg p-2">{error}</p>
        )}

        {result?.questions?.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">
                {result.questions.length} otázok · zdroj: {result.source}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="border-slate-300 text-slate-800 gap-1.5 h-8"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Skopírované' : 'Kopírovať'}
              </Button>
            </div>
            <ol className="space-y-2.5">
              {result.questions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-300">
                      {q.tactic}
                    </span>
                    <span className="text-[10px] text-slate-500">{q.modeLabel}</span>
                  </div>
                  <p className="text-slate-900 leading-relaxed">{q.question}</p>
                  <p className="mt-2 text-[11px] font-mono text-emerald-400/90 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    Citácia: {q.citationText || q.citation?.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
