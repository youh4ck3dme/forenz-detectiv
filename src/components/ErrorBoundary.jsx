import React from 'react';
import { ShieldAlert, RefreshCw, Home, Download, AlertTriangle } from 'lucide-react';
import { captureException } from '@/lib/sentry';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 9)
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    captureException(error, { extra: errorInfo });
    console.error('[ForenzDetectiv ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleDownloadLog = () => {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      message: this.state.error?.message || 'Neznáma chyba',
      stack: this.state.error?.stack || null,
      componentStack: this.state.errorInfo?.componentStack || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    };

    const blob = new Blob([JSON.stringify(diagnostic, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forenz-diagnostika-${this.state.errorId || 'error'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      const isWidget = this.props.isWidget || false;

      if (isWidget) {
        return (
          <div className="w-full h-full min-h-[160px] p-4 flex flex-col items-center justify-center rounded-2xl bg-white/90 border border-red-500/30 text-slate-800 text-center shadow-lg">
            <AlertTriangle className="w-6 h-6 text-amber-400 mb-2" />
            <h4 className="text-sm font-semibold text-slate-900">Modul zlyhal</h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-3">
              {this.state.error?.message || 'Nastala neočakávaná chyba pri vykresľovaní.'}
              {' '}Skúste obnoviť modul. Ak problém pretrváva, vymažte lokálne dáta prehliadača (IndexedDB) a nahrajte spis znova.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-400 border border-amber-500/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Skúsiť znova
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white p-4 text-slate-900">
          <div className="max-w-md w-full p-6 lg:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
              Chyba systému ForenzDetectiv
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Nastala neočakávaná výnimka pri spracovaní. Vaše lokálne dáta a spisy sú bezpečne chránené v databáze.
            </p>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 break-words mb-5">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Obnoviť zobrazenie
              </button>

              <button
                onClick={this.handleDownloadLog}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" /> Stiahnuť diagnostický log
              </button>

              <a
                href="/"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent hover:bg-slate-100 text-slate-500 font-medium text-xs transition-colors"
              >
                <Home className="w-3.5 h-3.5" /> Návrat na domovskú stránku
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
