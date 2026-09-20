import React, { useState } from 'react';
import { Calendar, Users, MapPin, Car, Network, Flag, AlertOctagon, CalendarClock, ExternalLink, FileText, ChevronDown, ChevronUp, Gavel } from 'lucide-react';

const STATUS = {
  pending: { label: 'Čaká', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' },
  analyzing: { label: 'Analyzuje sa', cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/30' },
  done: { label: 'Hotové', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
  error: { label: 'Chyba', cls: 'bg-red-500/15 text-red-300 border border-red-500/30' }
};

function Count({ icon: Icon, label, n }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs">
      <Icon className="w-3 h-3 text-blue-400 shrink-0" />
      <span className="text-slate-800 font-semibold tabular-nums">{n}</span>
      <span className="text-slate-500 text-[10px]">{label}</span>
    </div>
  );
}

function LinkRow({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-1.5 text-left rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors"
    >
      <span className="flex-1 min-w-0">{children}</span>
      <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-blue-400 shrink-0" />
    </button>
  );
}

function Section({ title, accent, children }) {
  return (
    <div>
      <h4 className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${accent === 'red' ? 'text-red-400' : 'text-slate-400'}`}>{title}</h4>
      <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden divide-y divide-slate-200">{children}</div>
    </div>
  );
}

export default function ArchiveMetaPanel({
  doc,
  persons = [],
  relationships = [],
  redFlags = [],
  flaggedPassages = [],
  claims = [],
  events = [],
  locations = [],
  vehicles = [],
  contradictions = [],
  onJumpToPerson,
  _onJumpToEdge,
  onJumpToContradiction,
  onCrossExamine,
  readOnly
}) {
  const [expandedQuotes, setExpandedQuotes] = useState({});

  const toggleQuote = (id) => {
    setExpandedQuotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const docId = doc?.id;
  const docPersons = docId ? persons.filter((p) => p.document_id === docId) : [];
  const docEvents = docId ? events.filter((e) => e.document_id === docId) : [];
  const docLocations = docId ? locations.filter((l) => l.document_id === docId) : [];
  const docVehicles = docId ? vehicles.filter((v) => v.document_id === docId) : [];
  const docRelationships = docId ? relationships.filter((r) => r.document_id === docId) : [];
  const docRedFlags = docId ? redFlags.filter((r) => r.document_id === docId) : [];
  const docFlagged = docId ? flaggedPassages.filter((p) => p.document_id === docId) : [];
  const docClaims = docId ? claims.filter((c) => c.document_id === docId) : [];
  const docContradictions = docId
    ? contradictions.filter((c) => c.document_a_id === docId || c.document_b_id === docId)
    : [];

  return (
    <div className="w-full lg:w-80 shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col max-h-[40vh] lg:max-h-none min-w-0 overflow-hidden">
      <div className="overflow-y-auto flex-1">
        {!doc ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            <FileText className="w-7 h-7 mx-auto mb-2 opacity-40" />
            Vyberte dokument z archívu pre zobrazenie forenzných metadát
          </div>
        ) : (
          <div className="p-3.5 space-y-4">
            {/* Header */}
            <div>
              <h3 className="text-xs font-semibold text-slate-900 break-words">{doc.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${(STATUS[doc.status] || STATUS.pending).cls}`}>
                  {(STATUS[doc.status] || STATUS.pending).label}
                </span>
                {doc.created_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {new Date(doc.created_date).toLocaleDateString('sk-SK')}
                  </span>
                )}
              </div>
              {doc.summary && <p className="text-[11px] text-slate-700 mt-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200">{doc.summary}</p>}
              {readOnly && <p className="text-[10px] text-violet-400 mt-1.5">Len na čítanie</p>}
            </div>

            {/* Counts */}
            <div className="flex flex-wrap gap-1.5">
              <Count icon={Users} label="osoby" n={docPersons.length} />
              <Count icon={CalendarClock} label="udalosti" n={docEvents.length} />
              <Count icon={MapPin} label="miesta" n={docLocations.length} />
              <Count icon={Car} label="vozidlá" n={docVehicles.length} />
              <Count icon={Network} label="vzťahy" n={docRelationships.length} />
              <Count icon={Flag} label="varovania" n={docRedFlags.length} />
              <Count icon={AlertOctagon} label="rozpory" n={docContradictions.length} />
            </div>

            {/* Osoby */}
            {docPersons.length > 0 && (
              <Section title="Osoby v spise">
                {docPersons.map((p) => (
                  <LinkRow key={p.id} onClick={() => onJumpToPerson(p)}>
                    <span className="text-xs font-medium text-slate-800">{p.name}</span>
                    <span className="text-[10px] text-slate-500 ml-1">[{p.type}]</span>
                    {p.details && <span className="block text-[10px] text-slate-400 truncate">{p.details}</span>}
                  </LinkRow>
                ))}
              </Section>
            )}

            {/* Udalosti */}
            {docEvents.length > 0 && (
              <Section title="Zaznamenané udalosti">
                {docEvents.map((e) => (
                  <div key={e.id} className="px-2.5 py-1.5 text-xs">
                    <span className="font-medium text-slate-800">{e.title}</span>
                    <span className="block text-[10px] text-slate-400">
                      {[e.time || e.date, e.location].filter(Boolean).join(' · ') || '—'}
                    </span>
                    {e.persons?.length > 0 && (
                      <span className="block text-[10px] text-slate-500 truncate">{e.persons.join(', ')}</span>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {/* Rozpory */}
            {docContradictions.length > 0 && (
              <Section title="Detegované rozpory" accent="red">
                {docContradictions.map((c) => (
                  <div key={c.id} className="flex items-stretch">
                    <div className="flex-1 min-w-0">
                      <LinkRow onClick={() => onJumpToContradiction(c)}>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${c.severity === 'high' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                          {c.severity}
                        </span>
                        <span className="ml-1 text-xs text-slate-700">{c.type?.replace(/_/g, ' ')}</span>
                        {c.explanation && <span className="block text-[10px] text-slate-400">{c.explanation}</span>}
                      </LinkRow>
                    </div>
                    {onCrossExamine && (
                      <button
                        type="button"
                        onClick={() => onCrossExamine(c)}
                        className="px-2 text-amber-400 hover:text-amber-300 hover:bg-slate-100 transition-colors"
                        title="Krížový výsluch"
                        data-testid="archive-cross-exam"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {/* Dôležité pasáže & Citácie */}
            {(docFlagged.length > 0 || docClaims.length > 0) && (
              <Section title="Dôležité pasáže & Tvrdenia">
                {docFlagged.map((p) => {
                  const isLong = (p.text || '').length > 120;
                  const isExpanded = expandedQuotes[p.id];
                  const displayText = isLong && !isExpanded ? `${p.text.slice(0, 120)}...` : p.text;

                  return (
                    <div key={p.id} className={`p-2.5 text-xs border-l-2 ${p.category === 'rozpor' ? 'border-red-500 bg-red-950/30' : 'border-amber-500 bg-amber-950/25'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-[10px] uppercase tracking-wider ${p.category === 'rozpor' ? 'text-red-400' : 'text-amber-400'}`}>
                          {p.category === 'rozpor' ? 'Rozpor' : 'Neistota'}
                        </span>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleQuote(p.id)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                          >
                            {isExpanded ? <>Zbaliť <ChevronUp className="w-3 h-3" /></> : <>Celý citát <ChevronDown className="w-3 h-3" /></>}
                          </button>
                        )}
                      </div>
                      <p className="text-slate-800 italic mt-1 leading-relaxed">„{displayText}"</p>
                      {p.explanation && <p className="text-slate-400 mt-1.5 text-[11px] bg-slate-50 p-1.5 rounded">{p.explanation}</p>}
                    </div>
                  );
                })}
                {docClaims.map((c) => {
                  const isLong = (c.source_quote || '').length > 120;
                  const isExpanded = expandedQuotes[c.id];
                  const displayText = isLong && !isExpanded ? `${c.source_quote.slice(0, 120)}...` : c.source_quote;

                  return (
                    <div key={c.id} className="p-2.5 text-xs bg-slate-50 border-l-2 border-slate-300">
                      <span className="text-slate-700 font-medium">{c.subject} {c.predicate} {c.object}</span>
                      {c.source_quote && (
                        <div className="mt-1">
                          <p className="text-slate-400 italic">„{displayText}"</p>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggleQuote(c.id)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-0.5"
                            >
                              {isExpanded ? <>Zbaliť <ChevronUp className="w-3 h-3" /></> : <>Celý kontext <ChevronDown className="w-3 h-3" /></>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
