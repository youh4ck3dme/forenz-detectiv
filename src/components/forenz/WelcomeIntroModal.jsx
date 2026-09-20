import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  CheckCircle2,
  MapPin,
  FileSearch,
  X,
  Zap
} from 'lucide-react';
import { useTranslation } from '@/i18n/i18nContext';

export default function WelcomeIntroModal({ open, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleFinish = () => {
    localStorage.setItem('forenz_intro_seen', 'true');
    onClose();
  };

  const features = [
    { icon: FileSearch, title: t('welcome.feat1Title'), desc: t('welcome.feat1Desc') },
    { icon: ShieldAlert, title: t('welcome.feat2Title'), desc: t('welcome.feat2Desc') },
    { icon: MapPin, title: t('welcome.feat3Title'), desc: t('welcome.feat3Desc') }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-xl p-2 sm:p-4 md:p-6 overflow-y-auto pt-[var(--camera-inset-top)] pb-[var(--safe-bottom)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-xl flex flex-col rounded-3xl liquid-glass-panel text-slate-900 shadow-glass-lg overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-700 via-amber-500 to-slate-700 z-20" />

        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-800 to-amber-600 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">{t('app.title')}</h2>
              <p className="text-xs text-slate-400">{t('welcome.guide')}</p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-slate-900 transition-colors"
            aria-label={t('actions.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {t('welcome.title')}
            </h3>
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">
              {t('welcome.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                    <Icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{f.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleFinish}
            className="text-xs sm:text-sm text-slate-400 hover:text-slate-800 px-3 py-2 transition-colors font-medium"
          >
            {t('welcome.skip')}
          </button>
          <button
            onClick={handleFinish}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" /> {t('welcome.continue')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
