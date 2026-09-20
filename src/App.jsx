import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from 'next-themes';
import { PwaInstallProvider } from '@/lib/pwaInstall';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import ForenzDetectiv from './pages/ForenzDetectiv';
import SharedCase from './pages/SharedCase';
import Dashboard from './pages/Dashboard';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { AuthProvider } from '@/lib/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { hasAnalyticsConsent } from '@/components/CookieConsentBanner';
import { initSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { I18nProvider } from '@/i18n/i18nContext';
import { usePlanStore } from '@/store/usePlanStore';
import { captureUtmParameters } from '@/utils/utmTracker';

export default function App() {
  useEffect(() => {
    // Inicializuj telemetriu len ak používateľ udelil súhlas
    if (hasAnalyticsConsent()) {
      initSentry();
      initAnalytics();
    }

    // Reaguj na neskorší súhlas z cookie banneru
    const handleConsent = () => {
      initSentry();
      initAnalytics();
    };
    window.addEventListener('cookie-consent-granted', handleConsent);

    usePlanStore.getState().captureReferralCode();
    captureUtmParameters();

    return () => window.removeEventListener('cookie-consent-granted', handleConsent);
  }, []);

  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
          <PwaInstallProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClientInstance}>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <ScrollToTop />
                  <Routes>
                    {/* Priamy prístup do ForenzDetectiv bez nutnosti prihlasovania */}
                    <Route path="/" element={<ForenzDetectiv />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/shared/:token" element={<SharedCase />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  <CookieConsentBanner />
                  <Toaster />
                </Router>
              </QueryClientProvider>
            </AuthProvider>
          </PwaInstallProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
