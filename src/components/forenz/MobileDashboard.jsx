import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { sk } from 'date-fns/locale';
import { FileText, Loader2, AlertTriangle, Users, ChevronRight } from 'lucide-react';

const TYPE_COLOR = {
  'podozrivý': '#ef4444',
  'obvinený': '#dc2626',
  'svedok': '#3b82f6',
  'poškodený': '#ea580c',
  'obeť': '#f97316',
  'znalec': '#8b5cf6',
  'alibi': '#22c55e',
  'iná osoba': '#64748b'
};

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}22`, color }}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

function MiniCard({ label, value, color }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 p-2.5 text-center">
      <p className="text-xl font-semibold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function Gauge({ percent }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const good = percent >= 80;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={good ? '#22c55e' : '#f59e0b'}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-slate-100 tabular-nums">{Math.round(percent)}%</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">úspešnosť</span>
        </div>
      </div>
      <p className={`text-sm mt-1 ${good ? 'text-emerald-400' : 'text-amber-400'}`}>
        {good ? 'Skvelá práca!' : 'Prebieha analýza'}
      </p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">{children}</h3>;
}

export default function MobileDashboard({ documents, persons, relationships, _redFlags, _contradictions, onSelectPerson }) {
  const stats = useMemo(() => {
    const analyzing = documents.filter((d) => d.status === 'analyzing' || d.status === 'pending').length;
    const errors = documents.filter((d) => d.status === 'error').length;
    const done = documents.filter((d) => d.status === 'done').length;
    const successRate = documents.length ? (done / documents.length) * 100 : 0;
    return { total: documents.length, analyzing, errors, done, successRate };
  }, [documents]);

  const recent = useMemo(
    () => [...documents].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5),
    [documents]
  );

  const topPersons = useMemo(() => {
    const counts = {};
    relationships.forEach((r) => {
      counts[r.source_name] = (counts[r.source_name] || 0) + 1;
      counts[r.target_name] = (counts[r.target_name] || 0) + 1;
    });
    const ranked = persons
      .map((p) => ({ ...p, links: counts[p.name] || 0 }))
      .filter((p) => p.name)
      .sort((a, b) => b.links - a.links)
      .slice(0, 5);
    return ranked;
  }, [persons, relationships]);

  const statusDot = (status) => {
    if (status === 'analyzing' || status === 'pending') return '#f59e0b';
    if (status === 'error') return '#ef4444';
    return '#22c55e';
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      {/* Prehľad */}
      <div>
        <SectionTitle>Prehľad</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard icon={FileText} label="Dokumenty" value={stats.total} color="#3b82f6" />
          <MetricCard icon={Loader2} label="V analýze" value={stats.analyzing} color="#f59e0b" />
          <MetricCard icon={AlertTriangle} label="Chyby" value={stats.errors} color="#ef4444" />
          <MetricCard icon={Users} label="Osoby" value={persons.length} color="#22c55e" />
        </div>
      </div>

      {/* Úspešnosť */}
      <div>
        <SectionTitle>Úspešnosť analýz</SectionTitle>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center">
          <Gauge percent={stats.successRate} />
          <div className="flex gap-2 w-full mt-4">
            <MiniCard label="Dokumenty" value={stats.total} color="#3b82f6" />
            <MiniCard label="V analýze" value={stats.analyzing} color="#f59e0b" />
            <MiniCard label="Chyby" value={stats.errors} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Aktivita */}
      <div>
        <SectionTitle>Aktivita</SectionTitle>
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {recent.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Zatiaľ žiadna aktivita.</p>
          ) : (
            recent.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot(doc.status) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 truncate">{doc.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {formatDistanceToNow(new Date(doc.created_date), { addSuffix: true, locale: sk })}
                  </p>
                </div>
              </div>
            ))
          )}
          <button className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-blue-400 hover:text-blue-300">
            Zobraziť všetku aktivitu <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Najaktívnejšie osoby */}
      {topPersons.length > 0 && (
        <div>
          <SectionTitle>Najaktívnejšie osoby</SectionTitle>
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            {topPersons.map((p) => {
              const color = TYPE_COLOR[p.type] || '#3b82f6';
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPerson(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-left"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    {initials(p.name)}
                  </span>
                  <span className="flex-1 text-sm text-slate-200 truncate min-w-0">{p.name}</span>
                  <span className="text-[11px] text-slate-500 shrink-0">{p.links} väzieb</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}