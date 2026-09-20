import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, MapPin, AlertTriangle, Search, Filter, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { parseTimeToMinutes } from '@/lib/forenzUtils';

export default function EventTimeline({
  events = [],
  contradictions = [],
  persons = [],
  selectedPerson = null,
  onSelectPerson = null
}) {
  const [search, setSearch] = useState('');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState(selectedPerson?.name || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [onlyAlibi, setOnlyAlibi] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const safePersons = useMemo(
    () => (persons || []).filter((p) => p && typeof p.name === 'string' && p.name.trim()),
    [persons]
  );
  const safeEvents = useMemo(
    () => (events || []).filter((e) => e && (e.id || e.title)),
    [events]
  );
  const safeContradictions = useMemo(
    () => (contradictions || []).filter((c) => c && c.id),
    [contradictions]
  );

  const eventTypes = useMemo(() => {
    const set = new Set();
    safeEvents.forEach((e) => {
      if (e.type) set.add(e.type);
    });
    return Array.from(set);
  }, [safeEvents]);

  const sortedEvents = useMemo(() => {
    return [...safeEvents].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = parseTimeToMinutes(a.time || a.time_start || '') ?? 9999;
      const timeB = parseTimeToMinutes(b.time || b.time_start || '') ?? 9999;
      return timeA - timeB;
    });
  }, [safeEvents]);

  // Pomocná funkce na identifikáciu alibi událostí
  const hasAlibiPerson = useMemo(() => {
    const alibiPersonNames = new Set(
      safePersons.filter((p) => p.type === 'alibi').map((p) => p.name.toLowerCase())
    );
    return alibiPersonNames;
  }, [safePersons]);

  const isEventAlibi = (ev) => {
    if (!Array.isArray(ev.persons)) return false;
    return ev.persons.some((p) => hasAlibiPerson.has(p.toLowerCase()));
  };

  const hasEventConflict = (ev) => {
    return safeContradictions.some(
      (c) =>
        (ev.description && c.explanation && ev.description.toLowerCase().includes(c.entity_ref?.toLowerCase())) ||
        (ev.persons && ev.persons.some((p) => c.entity_ref?.toLowerCase().includes(String(p).toLowerCase())))
    );
  };

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((ev) => {
      if (selectedPersonFilter !== 'all') {
        const matchesPerson = Array.isArray(ev.persons) && ev.persons.some((p) => p.toLowerCase().includes(selectedPersonFilter.toLowerCase()));
        if (!matchesPerson) return false;
      }

      if (typeFilter !== 'all' && ev.type !== typeFilter) {
        return false;
      }

      if (onlyConflicts && !hasEventConflict(ev)) {
        return false;
      }

      if (onlyAlibi && !isEventAlibi(ev)) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesText =
          (ev.title && ev.title.toLowerCase().includes(q)) ||
          (ev.description && ev.description.toLowerCase().includes(q)) ||
          (ev.location && ev.location.toLowerCase().includes(q)) ||
          (Array.isArray(ev.persons) && ev.persons.some((p) => p.toLowerCase().includes(q)));
        if (!matchesText) return false;
      }

      return true;
    });
  }, [sortedEvents, selectedPersonFilter, typeFilter, onlyConflicts, onlyAlibi, search, safeContradictions, hasAlibiPerson]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-4">
      {/* Hlavička & Ovládací panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Časová os vyšetrovania</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
              {filteredEvents.length} udalostí
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Chronologický sled udalostí, výpovedí a alibi</p>
        </div>

        {/* Vyhľadávanie a filtre */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať v udalostiach..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setOnlyConflicts((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              onlyConflicts
                ? 'bg-red-950 text-red-300 border border-red-800 shadow-sm'
                : 'bg-slate-800 text-slate-700 hover:bg-slate-700 border border-slate-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Iba rozpory
          </button>
          <button
            onClick={() => setOnlyAlibi((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
              onlyAlibi
                ? 'bg-blue-950 text-blue-300 border border-blue-800 shadow-sm'
                : 'bg-slate-800 text-slate-700 hover:bg-slate-700 border border-slate-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            Iba alibi
          </button>
        </div>
      </div>

      {/* Filtre (Osoby a Typy) */}
      <div className="flex flex-wrap items-center gap-2 py-2.5 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Osoba:</span>
        </div>
        <select
          value={selectedPersonFilter}
          onChange={(e) => setSelectedPersonFilter(e.target.value)}
          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 outline-none"
        >
          <option value="all">Všetky osoby ({safePersons.length})</option>
          {safePersons.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name} ({p.type || '—'})
            </option>
          ))}
        </select>

        {eventTypes.length > 0 && (
          <>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                  typeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-300'
                }`}
              >
                Všetky typy
              </button>
              {eventTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Telo časovej osi */}
      <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Clock className="w-8 h-8 mb-2 opacity-40 text-blue-500" />
            <p className="text-xs font-medium text-slate-400">Žiadne udalosti nezodpovedajú zvolenému filtru</p>
            <p className="text-[11px] text-slate-500 mt-1">Skúste zmeniť vyhľadávací dotaz alebo resetovať filtre.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-indigo-500 before:to-slate-800">
            {filteredEvents.map((ev, idx) => {
              const hasConflict = hasEventConflict(ev);
              const hasAlibi = isEventAlibi(ev);
              const isExpanded = expandedId === (ev.id || idx);

              return (
                <motion.div
                  key={ev.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(0.3, idx * 0.03) }}
                  className="relative group"
                >
                  {/* Časový bod (Dot na osi) */}
                  <div
                    className={`absolute -left-[29px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 z-10 transition-transform group-hover:scale-125 ${
                      hasConflict ? 'bg-red-500 shadow-md shadow-red-500/40' :
                      hasAlibi ? 'bg-blue-500 shadow-md shadow-blue-500/40' :
                      'bg-indigo-500 shadow-md shadow-indigo-500/40'
                    }`}
                  />

                  {/* Karta udalosti */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : (ev.id || idx))}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      hasConflict
                        ? 'bg-red-950/25 border-red-900/60 hover:border-red-700'
                        : hasAlibi
                          ? 'bg-blue-950/25 border-blue-900/60 hover:border-blue-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {/* Horný riadok: Čas, Dátum & Typ */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {ev.time ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white shadow-xs">
                            <Clock className="w-3 h-3" />
                            {ev.time}
                            {ev.approximate_time && <span className="text-[10px] font-normal opacity-80">(cca)</span>}
                          </span>
                        ) : ev.time_start || ev.time_end ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-600 text-white shadow-xs">
                            <Clock className="w-3 h-3" />
                            {ev.time_start || '?'} – {ev.time_end || '?'}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">Čas neuvedený</span>
                        )}

                        {ev.date && (
                          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {ev.date}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ev.type && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-700 border border-slate-300">
                            {ev.type}
                          </span>
                        )}
                        {hasConflict && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Rozpor
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Názov a popis */}
                    <h4 className="text-xs font-semibold text-slate-900 leading-snug">{ev.title}</h4>
                    {ev.description && <p className="text-xs text-slate-700 mt-1 leading-relaxed">{ev.description}</p>}

                    {/* Zúčastnené osoby & Miesto */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-200 text-xs">
                      {ev.location && (
                        <div className="flex items-center gap-1 text-slate-400 font-medium">
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span>{ev.location}</span>
                        </div>
                      )}

                      {Array.isArray(ev.persons) && ev.persons.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 ml-auto">
                          {ev.persons.map((name, pIdx) => (
                            <span
                              key={pIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                const pObj = safePersons.find((p) => p.name === name);
                                if (pObj && onSelectPerson) onSelectPerson(pObj);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-300 font-medium text-[10px] hover:bg-slate-700 transition-colors"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expandovateľný forenzný detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-xs"
                        >
                          {ev.source_quote && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border-l-2 border-blue-500">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Pôvodná citácia z výpovede:</span>
                              <p className="italic text-slate-700 mt-0.5 leading-relaxed">„{ev.source_quote}"</p>
                            </div>
                          )}

                          {ev.document_title && (
                            <p className="text-[10px] text-slate-400">
                              Zdrojový spis: <span className="font-mono text-slate-800">{ev.document_title}</span>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
