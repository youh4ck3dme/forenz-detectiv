import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Search, User, Link2, Calendar, FileText, AlertTriangle, ShieldAlert, ChevronRight } from 'lucide-react';

export default function QuickSearchDialog({
  open,
  onOpenChange,
  persons = [],
  relationships = [],
  events = [],
  redFlags = [],
  documents = [],
  contradictions = [],
  onSelectPerson = null,
  onSelectEdge = null,
  onSelectDoc = null,
  onSelectEvent = null
}) {
  const [query, setQuery] = useState('');

  const searchIndex = useMemo(() => {
    const items = [];

    // 1. Osoby
    persons.forEach((p) => {
      items.push({
        id: p.id,
        category: 'osoba',
        title: p.name,
        subtitle: `${p.type} · ${p.details || 'Bez detailu'}`,
        badge: p.type,
        badgeColor: p.type === 'podozrivý' || p.type === 'obvinený' ? 'bg-red-600' : 'bg-blue-600',
        raw: p
      });
    });

    // 2. Vzťahy
    relationships.forEach((r) => {
      items.push({
        id: r.id,
        category: 'vzťah',
        title: `${r.source_name || 'Osoba A'} → ${r.target_name || 'Osoba B'}`,
        subtitle: `${r.label || 'kontakt'} ${r.time ? `(${r.time})` : ''} · ${r.description || ''}`,
        badge: r.label || 'vzťah',
        badgeColor: 'bg-indigo-600',
        raw: r
      });
    });

    // 3. Udalosti
    events.forEach((ev) => {
      items.push({
        id: ev.id,
        category: 'udalosť',
        title: ev.title,
        subtitle: `${ev.time || ev.date || ''} ${ev.location ? `· ${ev.location}` : ''} · ${ev.description || ''}`,
        badge: ev.type || 'udalosť',
        badgeColor: 'bg-emerald-600',
        raw: ev
      });
    });

    // 4. Rozpory & Varovania
    contradictions.forEach((c) => {
      items.push({
        id: c.id,
        category: 'rozpor',
        title: `Rozpor: ${c.entity_ref || 'Forenzný nesúlad'}`,
        subtitle: c.explanation || '',
        badge: 'ROZPOR',
        badgeColor: 'bg-red-600',
        raw: c
      });
    });

    redFlags.forEach((rf) => {
      items.push({
        id: rf.id,
        category: 'varovanie',
        title: 'Varovanie',
        subtitle: rf.description || rf,
        badge: 'RED FLAG',
        badgeColor: 'bg-amber-600',
        raw: rf
      });
    });

    // 5. Dokumenty
    documents.forEach((d) => {
      items.push({
        id: d.id,
        category: 'dokument',
        title: d.title || 'Dokument',
        subtitle: d.summary || 'Naskenovaná výpoveď',
        badge: 'SPIS',
        badgeColor: 'bg-slate-700',
        raw: d
      });
    });

    return items;
  }, [persons, relationships, events, contradictions, redFlags, documents]);

  const fuse = useMemo(() => {
    return new Fuse(searchIndex, {
      keys: ['title', 'subtitle', 'badge'],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true
    });
  }, [searchIndex]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return searchIndex.slice(0, 10);
    }
    return fuse.search(query).map((res) => res.item).slice(0, 20);
  }, [query, fuse, searchIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const handleSelect = (item) => {
    onOpenChange(false);
    if (item.category === 'osoba' && onSelectPerson) {
      onSelectPerson(item.raw);
    } else if (item.category === 'vzťah' && onSelectEdge) {
      onSelectEdge(item.raw);
    } else if (item.category === 'dokument' && onSelectDoc) {
      onSelectDoc(item.raw.id);
    } else if (item.category === 'udalosť' && onSelectEvent) {
      onSelectEvent(item.raw);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'osoba':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'vzťah':
        return <Link2 className="w-4 h-4 text-indigo-400" />;
      case 'udalosť':
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'rozpor':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'varovanie':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-xl p-0 overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
        <DialogTitle className="sr-only">Rýchle vyhľadávanie v prípade</DialogTitle>
        <DialogDescription className="sr-only">
          Vyhľadajte osoby, dokumenty, udalosti a rozpory v aktuálnom prípade.
        </DialogDescription>
        <DialogHeader className="p-3.5 border-b border-slate-800 flex flex-row items-center gap-3 bg-slate-900/90">
          <Search className="w-4 h-4 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rýchle vyhľadávanie v celom prípade (osoby, časy, rozpory)..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
            Esc
          </kbd>
        </DialogHeader>

        <div className="max-h-[22rem] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenašli sa žiadne zhodné záznamy pre "{query}"
            </div>
          ) : (
            results.map((item) => (
              <button
                key={`${item.category}-${item.id}`}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/80 text-left transition-colors group"
              >
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 transition-colors">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {item.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Stlačte <strong>Enter</strong> pre výber</span>
          <span>Indexovaných {searchIndex.length} položiek prípadu</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
