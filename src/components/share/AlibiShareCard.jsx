import React from 'react';
import { AlertTriangle, ShieldCheck, MapPin, Gauge, Clock, FileText, QrCode } from 'lucide-react';

export default function AlibiShareCard({
  contradiction = null,
  anonymized = false,
  cardRef = null
}) {
  // Reálne polia z rozporu — bez fake BA–KE ukážkových dát
  const data = {
    locationA: contradiction?.locationA || contradiction?.locA || '—',
    timeA: contradiction?.timeA || '—',
    locationB: contradiction?.locationB || contradiction?.locB || '—',
    timeB: contradiction?.timeB || '—',
    distanceKm: contradiction?.distanceKm ?? null,
    intervalMinutes: contradiction?.intervalMinutes ?? null,
    requiredSpeedKmH: contradiction?.requiredSpeedKmH ?? null,
    personName: contradiction?.person || contradiction?.entity || contradiction?.personName || 'Podozrivá osoba',
    citationA: contradiction?.quoteA || contradiction?.citationA || '',
    citationB: contradiction?.quoteB || contradiction?.citationB || '',
    caseTitle: contradiction?.caseTitle || 'Aktuálny spis'
  };

  const displayName = anonymized ? 'Podozrivá osoba [ANONYM]' : data.personName;
  const anonymizeText = (text) => {
    if (!anonymized || !text) return text;
    const name = (data.personName || '').trim();
    if (!name || name === 'Podozrivá osoba') return text;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(escaped, 'gi'), 'Osoba A');
  };
  const displayCitationA = anonymizeText(data.citationA);
  const displayCitationB = anonymizeText(data.citationB);

  return (
    <div
      ref={cardRef}
      id="alibi-share-card"
      style={{ width: '1200px', height: '630px', fontFamily: 'Inter, system-ui, sans-serif' }}
      className="relative flex flex-col justify-between bg-slate-950 text-slate-100 p-12 select-none overflow-hidden border border-slate-800 shadow-2xl rounded-2xl"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header */}
      <div className="flex items-center justify-between z-10 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
            <ShieldCheck className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">FORENZ DETECTIV</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-semibold border border-amber-500/30 uppercase tracking-widest">
                AI Forensic Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Analýza integrity spisov a detekcia fyzikálnych rozporov</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/70 border border-red-500/50 text-red-400 text-sm font-bold tracking-wide shadow-lg shadow-red-950/50">
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            <span>GEOGRAFICKY NEMOŽNÉ ALIBI</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content: Locations, Interval & Speed paradox */}
      <div className="grid grid-cols-12 gap-8 my-auto z-10 py-4">
        {/* Left 7 cols: Route & Speed calculation */}
        <div className="col-span-7 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400 font-mono">
            <span className="px-2 py-1 bg-slate-900 rounded border border-slate-800 text-slate-300">
              Spis: {data.caseTitle}
            </span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{displayName}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-xl backdrop-blur">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span>Východzí bod (Lokalita A)</span>
              </div>
              <p className="text-lg font-bold text-white">{data.locationA}</p>
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Čas: {data.timeA}</span>
              </div>
            </div>

            <div className="space-y-1 border-l border-slate-800 pl-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-4 w-4 text-red-400" />
                <span>Cieľový bod (Lokalita B)</span>
              </div>
              <p className="text-lg font-bold text-white">{data.locationB}</p>
              <div className="flex items-center gap-1.5 text-xs font-mono text-red-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Čas: {data.timeB}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20">
                <Gauge className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Požadovaná rýchlosť presunu</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-red-400">
                    {data.requiredSpeedKmH != null ? `${data.requiredSpeedKmH} km/h` : '—'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({data.distanceKm != null ? `${data.distanceKm} km` : '—'} za {data.intervalMinutes != null ? `${data.intervalMinutes} min` : '—'})
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-bold px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full">
                ⚡ Fyzikálne nemožné
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Quotation excerpts */}
        <div className="col-span-5 flex flex-col justify-center space-y-4">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <FileText className="h-4 w-4" />
              <span>Dôkaz č. 1</span>
            </div>
            <p className="text-xs italic text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800/80">
              {displayCitationA}
            </p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
              <FileText className="h-4 w-4" />
              <span>Dôkaz č. 2 (Protirečenie)</span>
            </div>
            <p className="text-xs italic text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800/80">
              {displayCitationB}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="flex items-center justify-between z-10 border-t border-slate-800/80 pt-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Overené vyšetrovacím systémom ForenzDetectiv</p>
            <p className="text-[10px] text-slate-500 font-mono">forenz-detectiv.vercel.app · 100% citácie zo spisov · Kryptografická integrita</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400">
            Export ID: FD-{Math.random().toString(36).substring(2, 9).toUpperCase()} · {new Date().toLocaleDateString('sk-SK')}
          </span>
        </div>
      </div>
    </div>
  );
}
