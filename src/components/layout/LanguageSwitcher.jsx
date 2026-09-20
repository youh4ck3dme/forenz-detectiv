import React from 'react';
import { useTranslation } from '@/i18n/i18nContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage } = useTranslation();

  return (
    <div className={`inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs ${className}`}>
      <div className="pl-1.5 pr-0.5 text-slate-500">
        <Globe className="h-3.5 w-3.5" />
      </div>

      <button
        type="button"
        onClick={() => setLanguage('sk')}
        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
          language === 'sk'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        🇸🇰 SK
      </button>

      <button
        type="button"
        onClick={() => setLanguage('cs')}
        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
          language === 'cs'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        🇨🇿 CZ
      </button>
    </div>
  );
}
