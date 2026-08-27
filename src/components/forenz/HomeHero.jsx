import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  Scale,
  Files
} from 'lucide-react';
import { useForenzStore } from '@/store/useForenzStore';
import LeadCaptureModal from '@/components/landing/LeadCaptureModal';
import { useTranslation } from '@/i18n/i18nContext';
import { MAX_FILE_SIZE_BYTES, validateUploadSize } from '@/lib/documentPipeline';

export default function HomeHero({ onScan, onBulkScan = null, scanning = false }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const showToast = useForenzStore((s) => s.showToast);
  const { t } = useTranslation();

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const validFiles = [];
    const oversizedFiles = [];

    files.forEach((file) => {
      if (!validateUploadSize(file, MAX_FILE_SIZE_BYTES).ok) {
        oversizedFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      const first = oversizedFiles[0];
      const sizeKb = Math.round(first.size / 1024);
      showToast?.(`Súbor "${first.name}" prekračuje limit 50 MB (${sizeKb.toLocaleString()} KB / max 50 000 KB).`);
    }

    if (validFiles.length === 0) return;

    if (validFiles.length > 1 && onBulkScan) {
      onBulkScan(validFiles);
    } else if (onScan) {
      onScan(validFiles[0]);
    }
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="relative w-full flex-1 flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl w-full flex flex-col items-center text-center z-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 font-semibold">ForenzDetectiv AI</span>
          <span className="text-slate-500">·</span>
          <span>{t('hero.pill')}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]"
        >
          {t('hero.headlineBefore')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">{t('hero.headlineMid')}</span> {t('hero.headlineAnd')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-red-500">{t('hero.headlineEnd')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-sm sm:text-base text-slate-400 max-w-2xl mt-4 mb-8 leading-relaxed"
        >
          {t('hero.subheadline')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full max-w-2xl p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer relative overflow-hidden group shadow-2xl ${
            isDragOver
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : 'border-slate-800 bg-slate-900/80 hover:border-amber-500/50 hover:bg-slate-900'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            data-testid="home-file-input"
            accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.doc,.odt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all shadow-inner">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {scanning ? t('hero.dropScanning') : t('hero.dropTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('hero.dropHint')}
              </p>
            </div>

            <button
              type="button"
              disabled={scanning}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all group-hover:shadow-amber-500/20"
            >
              <Files className="w-4 h-4" /> {t('hero.uploadCta')}
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="text-[11px] sm:text-xs text-slate-500 max-w-2xl mt-3 leading-relaxed"
        >
          {t('hero.pipelineHint')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mt-8 pt-6 border-t border-slate-900"
        >
          <div className="flex items-center gap-2 text-left p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-200">{t('hero.badgeContradictions')}</div>
              <div className="text-[11px] text-slate-400">{t('hero.badgeCitations')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-left p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-200">{t('hero.badgeMap')}</div>
              <div className="text-[11px] text-slate-400">{t('hero.badgeHaversine')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-left p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-200">{t('hero.badgeSandbox')}</div>
              <div className="text-[11px] text-slate-400">{t('hero.badgeGdpr')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-left p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40">
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-200">{t('hero.badgePdf')}</div>
              <div className="text-[11px] text-slate-400">{t('hero.badgeSha')}</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="w-full max-w-3xl mt-8"
        >
          <button
            type="button"
            onClick={() => setLeadOpen(true)}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            {t('hero.pilotLink')}
          </button>
        </motion.div>
      </div>

      <LeadCaptureModal isOpen={leadOpen} onClose={() => setLeadOpen(false)} />
    </div>
  );
}
