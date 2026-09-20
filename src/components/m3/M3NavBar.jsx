import React from 'react';
import { Network, Layers, BarChart3, Search, MapPin } from 'lucide-react';
import { useTranslation } from '@/i18n/i18nContext';

export default function M3NavBar({ activeView, onTabChange, onSherlock }) {
  const { t } = useTranslation();
  const TABS = [
    { key: 'graph', label: t('nav.spider'), icon: Network },
    { key: 'archive', label: t('nav.case'), icon: Layers },
    { key: 'map', label: t('nav.alibi'), icon: MapPin },
    { key: 'timeline', label: t('nav.timeline'), icon: BarChart3 },
    { key: 'sherlock', label: t('nav.sherlock'), icon: Search }
  ];

  const isActive = (key) => {
    if (key === 'sherlock') return activeView === 'sherlock';
    return activeView === key;
  };

  const handle = (tab) => {
    if (tab.key === 'sherlock') {
      onSherlock?.();
    } else {
      onTabChange(tab.key);
    }
  };

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="lg:hidden shrink-0 z-40 bg-transparent px-3 pt-1 text-slate-100"
      style={{ paddingBottom: 'max(0.5rem, var(--safe-bottom, 0px))' }}
    >
      <div className="liquid-glass-panel flex items-stretch h-14 rounded-full overflow-hidden">
        {TABS.map((tab) => {
          const active = isActive(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handle(tab)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 mx-0.5 my-1 rounded-2xl transition-all min-h-[44px] min-w-[44px] ${
                active
                  ? 'text-amber-400 font-bold bg-amber-400/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
