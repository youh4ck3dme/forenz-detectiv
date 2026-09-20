import React from 'react';
import { motion } from 'framer-motion';
import {
  Network, Layers, LogOut, X, ShieldAlert,
  Users, HelpCircle, Clock, MapPin, LayoutDashboard, Download,
  ShieldCheck, Gift, Zap, ScrollText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePwaInstall } from '@/lib/pwaInstall';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { useTranslation } from '@/i18n/i18nContext';

function initials(name) {
  if (!name) return 'VY';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function Item({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
        active
          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
          {badge}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-3 mt-4 mb-1.5">{children}</p>;
}

export default function MobileDrawer({
  user,
  activeView,
  onNavigate,
  onClose,
  onLogout,
  onOpenIntro,
  onOpenPricing,
  onOpenTrust,
  onOpenReferral,
  onOpenAudit,
  plan = 'free',
  alertCount = 0
}) {
  const go = (view) => { onNavigate(view); onClose(); };
  const { canInstall, promptInstall } = usePwaInstall();
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute left-0 top-0 h-full w-[80%] max-w-xs bg-white border-r border-slate-200 rounded-r-2xl shadow-2xl flex flex-col"
        style={{ paddingTop: 'var(--camera-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              {initials(user?.full_name || user?.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name || 'Hlavný Vyšetrovateľ'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || 'Hosť'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1 min-h-[44px] min-w-[44px] shrink-0" aria-label="Zavrieť menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <SectionLabel>{t('nav.workspace')}</SectionLabel>
          <Item icon={Network} label={t('nav.graph')} active={activeView === 'graph'} onClick={() => go('graph')} />
          <Item icon={Layers} label={t('nav.archive')} active={activeView === 'archive'} onClick={() => go('archive')} />
          <Item icon={Clock} label={t('nav.timeline')} active={activeView === 'timeline'} onClick={() => go('timeline')} />
          <Item icon={MapPin} label={t('nav.map')} active={activeView === 'map'} onClick={() => go('map')} />

          <SectionLabel>{t('nav.dashboard')}</SectionLabel>
          <Link
            to="/dashboard"
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-left"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-500" />
            <span className="flex-1 truncate">Dashboard štatistík</span>
          </Link>
          <Item icon={Users} label="Prepojené identity" active={activeView === 'identity'} onClick={() => go('identity')} />

          <SectionLabel>{t('nav.account')}</SectionLabel>
          {onOpenPricing && (
            <Item
              icon={Zap}
              label={t('nav.pricing')}
              badge={plan === 'agency' ? 'Agency' : plan === 'pro' ? 'Pro' : 'Free'}
              onClick={() => { onOpenPricing(); onClose(); }}
            />
          )}
          {onOpenTrust && (
            <Item icon={ShieldCheck} label={t('nav.trust')} onClick={() => { onOpenTrust(); onClose(); }} />
          )}
          {onOpenAudit && (
            <Item icon={ScrollText} label={t('nav.audit')} onClick={() => { onOpenAudit(); onClose(); }} />
          )}
          {onOpenReferral && (
            <Item icon={Gift} label={t('nav.referral')} onClick={() => { onOpenReferral(); onClose(); }} />
          )}

          <SectionLabel>{t('nav.help')}</SectionLabel>
          {canInstall && (
            <Item
              icon={Download}
              label="Inštalovať do mobilu (PWA)"
              badge="App"
              onClick={async () => {
                await promptInstall();
                onClose();
              }}
            />
          )}
          {onOpenIntro && (
            <Item icon={HelpCircle} label={t('nav.guide')} onClick={() => { onOpenIntro(); onClose(); }} />
          )}
          <SectionLabel>Právne informácie</SectionLabel>
          <div className="px-3 py-1 flex items-center gap-3 text-[11px]">
            <Link to="/terms" onClick={onClose} className="text-slate-500 hover:text-slate-800 underline underline-offset-2">
              Podmienky (VOP)
            </Link>
            <span className="text-slate-300">&middot;</span>
            <Link to="/privacy" onClick={onClose} className="text-slate-500 hover:text-slate-800 underline underline-offset-2">
              Ochrana súkromia
            </Link>
          </div>
          <div className="px-3 mb-2 mt-2">
            <LanguageSwitcher className="w-full justify-center" />
          </div>
        </div>

        <div className="px-3 py-3 border-t border-slate-200">
          {alertCount > 0 && (
            <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-medium">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-500" />
              <span>{alertCount} aktívnych varovaní / rozporov</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Resetovať reláciu</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
