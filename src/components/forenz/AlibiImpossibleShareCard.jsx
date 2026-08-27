import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, AlertTriangle, CheckCircle2, Loader2, Download, X as CloseIcon } from 'lucide-react';
import { exportElementAsPng } from '@/utils/imageExporter';

/**
 * AlibiImpossibleShareCard - Wow funkcia S10.4
 * Vizuálne působivá karta pre zdieľanie nemožného alibi
 * Generuje sa z impossibleRoutes a umožňuje export ako obrázok
 */
export default function AlibiImpossibleShareCard({
  routes = [],
  persons = [],
  className = '',
  onShare = null,
  onClose = null
}) {
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const cardRef = useRef(null);

  const validRoutes = routes.filter(Boolean);
  const selectedRoute = validRoutes[selectedRouteIndex] || validRoutes[0] || null;

  // Formátovanie vzdialenosti
  const formatDistance = (km) => {
    if (!km) return '?';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  // Formátovanie času
  const formatMinutes = (minutes) => {
    if (!minutes) return '?';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins} min`;
  };

  // Formátovanie rýchlosti
  const formatSpeed = (kmh) => {
    if (!kmh) return '?';
    return `${Math.round(kmh)} km/h`;
  };

  // Získanie farby pre osobu
  const getPersonColor = (personName) => {
    const person = persons.find((p) => p.name === personName);
    if (person?.type === 'alibi') return '#3b82f6';
    if (person?.type === 'podozrivý' || person?.type === 'obvinený') return '#ef4444';
    if (person?.type === 'svedok') return '#60a5fa';
    if (person?.type === 'obeť' || person?.type === 'poškodený') return '#f97316';
    if (person?.type === 'znalec') return '#8b5cf6';
    return '#64748b';
    return '#84cc16';
  };

  // Export karty ako obrázok
  const handleExportCard = async () => {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      await exportElementAsPng(
        cardRef.current,
        `alibi-impossible-${selectedRoute?.subject || 'osoba'}-${Date.now()}.png`
      );
      setExportSuccess(true);
      onShare?.();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportSuccess(false), 3000);
    }
  };

  // Zísanie názvu osoby podľa ID alebo mená
  const getPersonNameBySubject = (subject) => {
    if (!subject) return 'Neznáma osoba';
    const person = persons.find(
      (p) => 
        p.name === subject || 
        p.id === subject ||
        (p.name && subject.includes(p.name)) ||
        (p.id && subject.includes(p.id))
    );
    return person?.name || subject;
  };

  if (validRoutes.length === 0 || !selectedRoute) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed inset-4 sm:inset-8 md:inset-12 z-50 flex items-center justify-center p-4 ${className}`}
        style={{ background: 'rgba(2, 6, 23, 0.95)' }}
      >
        {/* Backdrop blur overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
        
        {/* Karta */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 130, 246, 0.1)'
          }}
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-gradient-to-r from-red-950/20 to-blue-950/20 border-b border-slate-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white/20 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Nemožné Alibi</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Fyzikálne neuskutočniteľný presun</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Navigácia medzi routami */}
                {validRoutes.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-900/60 rounded-xl p-1">
                    <button
                      onClick={() => setSelectedRouteIndex((i) => (i > 0 ? i - 1 : validRoutes.length - 1))}
                      disabled={validRoutes.length <= 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs font-semibold text-slate-300">
                      {selectedRouteIndex + 1} / {validRoutes.length}
                    </span>
                    <button
                      onClick={() => setSelectedRouteIndex((i) => (i < validRoutes.length - 1 ? i + 1 : 0))}
                      disabled={validRoutes.length <= 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Tlačidlá */}
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportCard}
                    disabled={isExporting}
                    className="relative p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 disabled:opacity-60 transition-all"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : exportSuccess ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {selectedRoute && (
            <div className="p-6 space-y-5">
              {/* Osoba */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800"
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${getPersonColor(selectedRoute.subject)} 0%, ${getPersonColor(selectedRoute.subject)}80 100%)`,
                    boxShadow: `0 4px 15px -3px ${getPersonColor(selectedRoute.subject)}40`
                  }}
                >
                  <span className="text-sm font-bold text-white">
                    {getPersonNameBySubject(selectedRoute.subject).slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-white">
                      {getPersonNameBySubject(selectedRoute.subject)}
                    </h4>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-red-900/60 text-red-300 border border-red-800">
                      NEMOŽNÉ ALIBI
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Fyzikálne nemožný presun medzi dvoma lokalitami v danom čase
                  </p>
                </div>
              </motion.div>

              {/* Lokality a čas */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Lokality */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Lokality presunu
                  </div>
                  
                  {selectedRoute.positions && selectedRoute.positions.length >= 2 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/20 border border-blue-800/40">
                        <div className="w-2.5 h-2.5 mt-1 rounded-full bg-blue-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-100">Mesto A</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {selectedRoute.explanation?.split('a')[0]?.trim() || 'Neznáme miesto'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center gap-2 my-1">
                        <div className="flex-1 h-0.5 bg-slate-800" />
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <CloseIcon className="w-2 h-2 text-white" />
                        </div>
                        <div className="flex-1 h-0.5 bg-slate-800" />
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-red-950/20 border border-red-800/40">
                        <div className="w-2.5 h-2.5 mt-1 rounded-full bg-red-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-100">Mesto B</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {selectedRoute.explanation?.split('a')?.[1]?.split('(')?.[0]?.trim() || 'Neznáme miesto'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Časové údaje */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    Časové parametre
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/40">
                      <span className="text-xs text-slate-400">Vzdialenosť</span>
                      <span className="text-sm font-bold text-blue-400">
                        {formatDistance(selectedRoute.distanceKm)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/40">
                      <span className="text-xs text-slate-400">Minimálny čas jazdy</span>
                      <span className="text-sm font-bold text-amber-400">
                        {formatMinutes(selectedRoute.minCarMinutes || 
                          (selectedRoute.speedKmh && selectedRoute.distanceKm 
                            ? (selectedRoute.distanceKm / selectedRoute.speedKmh) * 60 
                            : null))}
                      </span>
                    </div>
                    {selectedRoute.speedKmh && (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/40">
                        <span className="text-xs text-slate-400">Požadovaná rýchlosť</span>
                        <span className="text-sm font-bold text-red-400">
                          {formatSpeed(selectedRoute.speedKmh)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Vysvetlenie */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-2xl bg-gradient-to-r from-red-950/10 to-blue-950/10 border border-slate-800"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Vysvetlenie</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedRoute.explanation}
                </p>
              </motion.div>

              {/* Wow efekt - animovaný banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-blue-500/10 border border-slate-700 text-center"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-xs text-slate-400 font-medium"
                >
                  ⚡ Tento presun je fyzikálne nemožný podľa analýzy vyšetrovacieho spisu
                </motion.p>
              </motion.div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-800/50">
            <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>ForenzDetectiv AI Analýza</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Generované: {new Date().toLocaleDateString('sk-SK')}</span>
                <span className="font-mono text-slate-600">
                  #{selectedRoute?.id?.slice(0, 8) || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper component for navigation arrows
function ChevronLeft({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
