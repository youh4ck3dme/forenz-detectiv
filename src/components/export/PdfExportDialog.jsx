import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ShieldCheck, Download, Loader2, Hash, CheckCircle2, Package } from 'lucide-react';
import { exportForensicCasePdf } from '@/lib/pdfExporter';
import { exportCourtDossier } from '@/lib/courtDossier';
import { generateCaseIntegrityDigest } from '@/utils/cryptoUtils';

export default function PdfExportDialog({
  isOpen,
  onClose,
  onExported = null,
  onDossierExported = null,
  documents = [],
  persons = [],
  relationships = [],
  redFlags = [],
  contradictions = [],
  events = [],
  claims = [],
  auditLogs = [],
  graphCanvasElement = null,
  mapElement = null,
  scopeTitle = 'Vyšetrovací spis'
}) {
  const [loading, setLoading] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [sha256, setSha256] = useState('');
  const [options, setOptions] = useState({
    includeCitations: true,
    includeMapAlibi: true,
    includeAuditLog: true
  });

  useEffect(() => {
    if (isOpen) {
      generateCaseIntegrityDigest({
        documents,
        persons,
        redFlags,
        contradictions,
        events,
        caseTitle: scopeTitle
      }).then(hash => setSha256(hash));
    }
  }, [isOpen, documents, persons, redFlags, contradictions, events, scopeTitle]);

  const handleExport = async () => {
    try {
      setLoading(true);
      await exportForensicCasePdf({
        documents,
        persons,
        relationships,
        redFlags,
        contradictions,
        events,
        graphCanvasElement,
        scopeTitle,
        options,
        customSha256: sha256
      });
      onExported?.();
      onClose();
    } catch (err) {
      console.error('Chyba pri generovaní PDF protokolu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDossierExport = async () => {
    try {
      setDossierLoading(true);
      const result = await exportCourtDossier({
        documents,
        persons,
        relationships,
        redFlags,
        contradictions,
        events,
        claims,
        auditLogs,
        graphElement: graphCanvasElement,
        mapElement,
        scopeTitle,
        download: true
      });
      onDossierExported?.(result);
      onClose();
    } catch (err) {
      console.error('Chyba pri generovaní Court Dossier ZIP:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const busy = loading || dossierLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900 p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold text-white">
              Súdny PDF Protokol s Kryptografickým Hashom
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            Generovanie formálneho dokumentu pre potreby obhajoby, vyšetrovania alebo súdneho konania.
          </DialogDescription>
        </DialogHeader>

        {/* SHA-256 Fingerprint Display */}
        <div className="bg-white/90 border border-slate-200 p-3.5 rounded-xl space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Hash className="h-3.5 w-3.5 text-amber-400" />
              Kryptografický odtlačok integrity (SHA-256)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Pripravené
            </span>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-amber-400 break-all select-all">
            {sha256 || 'Vypočítavam kontrolný súčet...'}
          </div>
        </div>

        {/* Contents Checklist */}
        <div className="space-y-2 py-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Obsah protokolu:</p>
          
          <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-850 cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-slate-800">
              <FileText className="h-4 w-4 text-blue-400" />
              <span>Doslovné citácie zo spisu ({documents.length} dokumentov)</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeCitations}
              onChange={(e) => setOptions({ ...options, includeCitations: e.target.checked })}
              className="accent-amber-500 rounded h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-850 cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-slate-800">
              <FileText className="h-4 w-4 text-red-400" />
              <span>Identifikované rozpory ({contradictions.length + redFlags.length} položiek)</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeMapAlibi}
              onChange={(e) => setOptions({ ...options, includeMapAlibi: e.target.checked })}
              className="accent-amber-500 rounded h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-850 cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-slate-800">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Právne posúdenie (§ 346 Trestného zákona č. 300/2005 Z. z.)</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeAuditLog}
              onChange={(e) => setOptions({ ...options, includeAuditLog: e.target.checked })}
              className="accent-amber-500 rounded h-4 w-4"
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-amber-400" />
            Court Intelligence Dossier (ZIP)
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            PDF protokol + CSV rozporov + 2K PNG graf/alibi mapa + JSON audit so SHA-256 reťazcom dôkazov.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 gap-2 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900"
            disabled={busy}
          >
            Zrušiť
          </Button>

          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              type="button"
              onClick={handleDossierExport}
              disabled={busy}
              variant="outline"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-semibold gap-2"
            >
              {dossierLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              Exportovať Dossier ZIP
            </Button>

            <Button
              type="button"
              onClick={handleExport}
              disabled={busy}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportovať PDF protokol
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
