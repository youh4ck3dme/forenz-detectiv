import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Network,
  Menu,
  Bell,
  Search as SearchIcon,
  HelpCircle,
  BarChart3,
  LayoutDashboard,
  Users,
  Share2,
  Ban,
  ShieldCheck,
  ScrollText,
  Gift,
  Zap,
  Download,
  Archive,
  Trash2,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import ScanButton from '@/components/forenz/ScanButton';
import BulkScanButton from '@/components/forenz/BulkScanButton';
import { useTranslation } from '@/i18n/i18nContext';

export default function AppBar({
  documents = [],
  persons = [],
  redFlags = [],
  contradictions = [],
  plan = 'free',
  showStats = true,
  setShowStats,
  activeShare,
  handleShare,
  handleRevokeShare,
  readOnly = false,
  scanning = false,
  handleScan,
  handleBulkScan,
  bulkProgress,
  onCancelProcessing,
  onExport,
  onExportAll,
  onClearCase,
  onOpenMobileMenu,
  onOpenSearch,
  onOpenIntro,
  onOpenPricing,
  onOpenTrust,
  onOpenAudit,
  onOpenReferral,
  onNavigateIdentity
}) {
  const { t } = useTranslation();
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const alertCount = redFlags.length + contradictions.length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      data-testid="m3-app-bar"
      className="shrink-0 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md z-30 transition-colors"
    >
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2 group focus:outline-none" aria-label="ForenzDetektív - Domovská stránka">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 via-blue-600/30 to-indigo-600/40 p-0.5 flex items-center justify-center border border-amber-500/30 shadow-glass-sm group-hover:border-amber-400 transition-all">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Network className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight text-slate-100 group-hover:text-amber-300 transition-colors">
                ForenzDetektív
              </span>
              <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase -mt-0.5">
                Vyšetrovací Engine
              </span>
            </div>
          </Link>

          <div className="hidden md:block pl-1">
            <LanguageSwitcher />
          </div>

          <button
            type="button"
            onClick={onOpenPricing}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-2.5 py-1 rounded-xl text-[11px] font-bold tracking-wide border shadow-sm transition-all hover:scale-[1.02] ${
              plan === 'agency'
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-purple-500/10'
                : plan === 'pro'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/15 ring-1 ring-amber-500/30'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-amber-500/40'
            }`}
            title="Kliknite pre správu plánu a licencie"
          >
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="uppercase">{plan === 'agency' ? 'Agency' : plan === 'pro' ? 'Pro' : 'Free'}</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 min-h-[44px] rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 text-xs shadow-inner transition-all group"
            title="Rýchle vyhľadávanie v spise (Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <SearchIcon className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-amber-400 transition-colors" />
              <span className="truncate">{t('nav.search') || 'Hľadať v spise...'}</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Hľadať v spise"
            aria-label="Vyhľadávanie"
          >
            <SearchIcon className="w-4 h-4 text-blue-400" />
          </button>

          <div className="hidden xl:flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenIntro}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
              title="Sprievodca systémom"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Sprievodca</span>
            </button>

            <button
              type="button"
              data-stats-toggle
              onClick={() => setShowStats?.((s) => !s)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl text-xs font-medium border transition-colors ${
                showStats
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title="Štatistiky spisu (vysunúť)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Štatistiky</span>
            </button>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
              title="Otvoriť vyšetrovací dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={onNavigateIdentity}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
              title="Správa identít a zlúčenie profilov"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Identity</span>
            </button>

            <button
              type="button"
              onClick={onOpenTrust}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
              title="Bezpečnostný audit & LEA Trust Pack"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trust</span>
            </button>

            <button
              type="button"
              onClick={onOpenAudit}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
              title="Reťazec dôkazov (Audit Log)"
            >
              <ScrollText className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit</span>
            </button>

            <button
              type="button"
              onClick={onOpenReferral}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
              title="Referral — zdieľať pozvánkový odkaz"
            >
              <Gift className="w-3.5 h-3.5 text-pink-400" />
              <span>Referral</span>
            </button>
          </div>

          <div className="hidden md:flex xl:hidden relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setToolsDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Nástroje</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {toolsDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => { onOpenIntro?.(); setToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 text-left"
                >
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>Sprievodca</span>
                </button>
                <Link
                  to="/dashboard"
                  onClick={() => setToolsDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 text-left"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={() => { onNavigateIdentity?.(); setToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 text-left"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Správa identít</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onOpenTrust?.(); setToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Trust Pack</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onOpenAudit?.(); setToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 text-left"
                >
                  <ScrollText className="w-4 h-4 text-amber-400" />
                  <span>Audit log</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onOpenReferral?.(); setToolsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 text-left"
                >
                  <Gift className="w-4 h-4 text-pink-400" />
                  <span>Referral program</span>
                </button>
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                disabled={!documents.length}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
                title="Zdieľať vyšetrovací spis"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Zdieľať</span>
                {activeShare && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>

              {activeShare && (
                <button
                  type="button"
                  onClick={handleRevokeShare}
                  className="min-h-[44px] min-w-[44px] p-1.5 rounded-xl bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/60 transition-colors"
                  title="Zneplatniť aktívny zdieľaný link"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              title={alertCount > 0 ? `${alertCount} aktívnych varovaní a rozporov` : 'Žiadne nové varovania'}
              aria-label="Upozornenia"
            >
              <Bell className="w-4 h-4" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          </div>

          {!readOnly && onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={!persons.length}
              className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 text-xs font-medium transition-colors"
              title="Exportovať znalecký posudok do PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Report PDF</span>
            </button>
          )}

          {!readOnly && onExportAll && (
            <button
              type="button"
              onClick={onExportAll}
              disabled={!documents.length}
              className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 text-xs font-medium transition-colors"
              title="Hromadný export celého archívu do PDF"
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span>Archív PDF</span>
            </button>
          )}

          {!readOnly && onClearCase && documents.length > 0 && (
            <button
              type="button"
              onClick={onClearCase}
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition-colors"
              title="Zavrieť aktuálny spis a vytvoriť nový"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Nový spis</span>
            </button>
          )}

          {!readOnly && handleBulkScan && (
            <div className="hidden sm:block">
              <BulkScanButton
                onBulkScan={handleBulkScan}
                scanning={scanning}
                progress={bulkProgress}
                onCancel={onCancelProcessing}
              />
            </div>
          )}

          {!readOnly && (
            <div className="pl-0.5">
              <ScanButton onScan={handleScan} scanning={scanning} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
