import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

const CONSENT_KEY = 'alibi_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Zobraz banner po krátkom oneskorení pre lepší UX
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    // Aktivuj telemetriu po súhlase
    window.dispatchEvent(new CustomEvent('cookie-consent-granted'));
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-0"
    >
      <div className="max-w-2xl mx-auto mb-4 sm:mb-6 p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl shadow-slate-200/80">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800 font-medium mb-1">Súkromie & Cookies</p>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Používame anonymizovanú analytiku (PostHog EU) a sledovanie chýb (Sentry) na zlepšenie kvality.
              Vaše dokumenty sú spracovávané výlučne pre účely analýzy a nikdy nie sú zdieľané.
              {' '}
              <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Zásady ochrany súkromia
              </Link>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={accept}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Súhlasím
              </button>
              <button
                type="button"
                onClick={decline}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-medium transition-colors border border-slate-300"
              >
                Len nevyhnutné
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={decline}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Zavrieť"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility: Skontroluje či používateľ udelil súhlas s analytikou.
 */
export function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'accepted';
}
