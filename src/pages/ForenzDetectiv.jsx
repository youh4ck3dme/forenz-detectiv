import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { prepareFileForUpload, isImageUploadFile } from '@/lib/imageProcessor';
import {
  runOcrWithFallback,
  buildOcrAnalysisPayload,
  buildOcrDocumentPatch,
  mergeClientOcrIntoCase
} from '@/lib/clientOcrPipeline';
import {
  MAX_FILE_SIZE_BYTES,
  validateUploadSize,
  isPdfFile,
  chunkAndProcessPdf,
  PDF_ANALYZE_CONCURRENCY,
  PDF_MAX_PAGES
} from '@/lib/documentPipeline';
import { parseTimeToMinutes, namesMatch } from '@/lib/forenzUtils';
import { mapWithAdaptiveConcurrency } from '@/lib/adaptiveConcurrency';
import DocumentList from '@/components/forenz/DocumentList';
import StatsBar from '@/components/forenz/StatsBar';
import PersonPanel from '@/components/forenz/PersonPanel';
import TimeSlider from '@/components/forenz/TimeSlider';
import RedFlagsPanel from '@/components/forenz/RedFlagsPanel';
import SherlockChat from '@/components/forenz/SherlockChat';
import QuickSearchDialog from '@/components/forenz/QuickSearchDialog';
import WelcomeIntroModal from '@/components/forenz/WelcomeIntroModal';
import HomeHero from '@/components/forenz/HomeHero';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ViewSkeleton } from '@/components/ui/SkeletonViews';
import AppHeader from '@/components/forenz/AppHeader';
import AppLayout from '@/components/layout/AppLayout';
import PricingModal from '@/components/pricing/PricingModal';
import PaywallGate from '@/components/pricing/PaywallGate';
import TrustPackModal from '@/components/trust/TrustPackModal';
import ReferralModal from '@/components/referral/ReferralModal';
import AuditLogViewer from '@/components/audit/AuditLogViewer';
import PdfExportDialog from '@/components/export/PdfExportDialog';
import { saveDocumentOffline, saveCaseOffline, sanitizeCasePayload, cacheAnalysisOffline } from '@/lib/offlineDb';
import {
  shouldSyncBulkViaOfflineOnly,
  buildBulkOfflineSuccessMessage,
  buildBulkAnalyzeFailureMessage,
  casePayloadFromStore,
  mergeLocalDocuments
} from '@/lib/bulkUploadSync';
import { withAiRetry } from '@/lib/aiRetry';
import { trackFileUploaded, trackContradictionViewed, trackPdfExported, trackCaseCreated, trackCourtDossierExported, trackCrossExamGenerated } from '@/lib/analytics';
import { Network, Loader2, Layers, Users, FileText, ShieldAlert, Clock, MapPin, Search, XOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileDrawer from '@/components/forenz/MobileDrawer';
import MobileBottomNav from '@/components/forenz/MobileBottomNav';
import MobileDashboard from '@/components/forenz/MobileDashboard';
import IdentityPanel from '@/components/forenz/IdentityPanel';
import CollapsibleSidebar from '@/components/forenz/CollapsibleSidebar';
import CrossExamDialog from '@/components/court/CrossExamDialog';
import { useForenzStore } from '@/store/useForenzStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useAuditStore } from '@/store/useAuditStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { appParams } from '@/lib/app-params';
import { isMonetizationEnabled } from '@/lib/monetization';

// Lazy-loaded ťažké moduly pre rýchly počiatočný štart aplikácie
const GraphCanvas = lazy(() => import('@/components/forenz/GraphCanvas'));
const MapView = lazy(() => import('@/components/forenz/MapView'));
const ArchiveView = lazy(() => import('@/components/forenz/ArchiveView'));
const EventTimeline = lazy(() => import('@/components/forenz/EventTimeline'));

export default function ForenzDetectiv({ readOnly = false, scope = null, sharedBy = null, initialData = null }) {
  const documents = useForenzStore((s) => s.documents);
  const setDocuments = useForenzStore((s) => s.setDocuments);
  const persons = useForenzStore((s) => s.persons);
  const relationships = useForenzStore((s) => s.relationships);
  const redFlags = useForenzStore((s) => s.redFlags);
  const flaggedPassages = useForenzStore((s) => s.flaggedPassages);
  const claims = useForenzStore((s) => s.claims);
  const events = useForenzStore((s) => s.events);
  const locations = useForenzStore((s) => s.locations);
  const vehicles = useForenzStore((s) => s.vehicles);
  const contradictions = useForenzStore((s) => s.contradictions);
  const overrides = useForenzStore((s) => s.overrides);

  const loading = useForenzStore((s) => s.loading);
  const scanning = useForenzStore((s) => s.scanning);
  const setScanning = useForenzStore((s) => s.setScanning);
  const bulkProgress = useForenzStore((s) => s.bulkProgress);
  const setBulkProgress = useForenzStore((s) => s.setBulkProgress);
  const selectedDocId = useForenzStore((s) => s.selectedDocId);
  const setSelectedDocId = useForenzStore((s) => s.setSelectedDocId);
  const activeView = useForenzStore((s) => s.activeView);
  const setActiveView = useForenzStore((s) => s.setActiveView);
  const selectedPerson = useForenzStore((s) => s.selectedPerson);
  const setSelectedPerson = useForenzStore((s) => s.setSelectedPerson);
  const currentUser = useForenzStore((s) => s.currentUser);
  const setCurrentUser = useForenzStore((s) => s.setCurrentUser);
  const sherlockSignal = useForenzStore((s) => s.sherlockSignal);
  const setSherlockSignal = useForenzStore((s) => s.setSherlockSignal);
  const selectedEdge = useForenzStore((s) => s.selectedEdge);
  const setSelectedEdge = useForenzStore((s) => s.setSelectedEdge);
  const maxTime = useForenzStore((s) => s.maxTime);
  const setMaxTime = useForenzStore((s) => s.setMaxTime);
  const showStats = useForenzStore((s) => s.showStats);
  const setShowStats = useForenzStore((s) => s.setShowStats);
  const activeShare = useForenzStore((s) => s.activeShare);
  const setActiveShare = useForenzStore((s) => s.setActiveShare);
  const leftCollapsed = useForenzStore((s) => s.leftCollapsed);
  const setLeftCollapsed = useForenzStore((s) => s.setLeftCollapsed);
  const rightCollapsed = useForenzStore((s) => s.rightCollapsed);
  const setRightCollapsed = useForenzStore((s) => s.setRightCollapsed);
  const searchOpen = useForenzStore((s) => s.searchOpen);
  const setSearchOpen = useForenzStore((s) => s.setSearchOpen);
  const introOpen = useForenzStore((s) => s.introOpen);
  const setIntroOpen = useForenzStore((s) => s.setIntroOpen);
  const replaying = useForenzStore((s) => s.replaying);
  const setReplaying = useForenzStore((s) => s.setReplaying);
  const activeEdgeId = useForenzStore((s) => s.activeEdgeId);
  const setActiveEdgeId = useForenzStore((s) => s.setActiveEdgeId);
  const clearCase = useForenzStore((s) => s.clearCase);

  const [searchParams, setSearchParams] = useSearchParams();

  // Synchronizácia URL query parametra ?view= s activeView
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['hero', 'graph', 'archive', 'map', 'timeline', 'identity', 'overview', 'sherlock'].includes(viewParam)) {
      if (viewParam === 'sherlock') {
        setSherlockSignal((s) => s + 1);
      } else {
        setActiveView(viewParam);
      }
    }
  }, [searchParams, setActiveView, setSherlockSignal]);

  const handleViewChange = useCallback((view) => {
    if (view === 'sherlock') {
      setSherlockSignal((s) => s + 1);
      return;
    }
    setActiveView(view);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('view', view);
    setSearchParams(newParams, { replace: true });
  }, [setActiveView, setSherlockSignal, setSearchParams]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const storeToast = useForenzStore((s) => s.toast);
  const [trustOpen, setTrustOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [pdfExportScope, setPdfExportScope] = useState('selected'); // 'selected' | 'all'
  const [crossExamOpen, setCrossExamOpen] = useState(false);
  const [crossExamTarget, setCrossExamTarget] = useState(null);
  const [crossExamKind, setCrossExamKind] = useState('contradiction');
  const replayRef = useRef(null);
  const pulseRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isMobile = useIsMobile();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleCancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScanning(false);
    setBulkProgress(null);
    showToast('Spracovanie bolo zastavené.');
  }, [setScanning, setBulkProgress, showToast]);

  const plan = usePlanStore((s) => s.plan);
  const pricingModalOpen = usePlanStore((s) => s.pricingModalOpen);
  const paywallReason = usePlanStore((s) => s.paywallReason);
  const setPricingModalOpen = usePlanStore((s) => s.setPricingModalOpen);
  const canAddDocument = usePlanStore((s) => s.canAddDocument);
  const logAction = useAuditStore((s) => s.logAction);
  const auditLogs = useAuditStore((s) => s.logs);

  const openPaywall = useCallback((reason) => {
    if (!isMonetizationEnabled) return;
    logAction('PAYWALL_OPENED', { reason });
    setPricingModalOpen(false, reason);
  }, [setPricingModalOpen, logAction]);

  const fetchStoreData = useForenzStore((s) => s.fetchData);
  const fetchData = useCallback(() => fetchStoreData(scope, initialData), [fetchStoreData, scope, initialData]);

  useEffect(() => {
    fetchStoreData(scope, initialData);
  }, [fetchStoreData, scope, initialData]);

  useEffect(() => {
    const hasToken = !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token') || appParams?.token);
    if (hasToken) {
      base44.auth.me().then((user) => {
        setCurrentUser(user || null);
      }).catch(() => {
        setCurrentUser(null);
      });
    } else {
      setCurrentUser(null);
    }
  }, [setCurrentUser]);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const handleSherlockTab = useCallback(() => {
    setActiveView('graph');
    setSherlockSignal((s) => s + 1);
  }, []);

  const graphEdges = useMemo(() => {
    return relationships
      .map((r) => {
        const s = persons.find((p) => p.document_id === r.document_id && p.name === r.source_name);
        const t = persons.find((p) => p.document_id === r.document_id && p.name === r.target_name);
        return {
          id: r.id,
          source: s?.id,
          target: t?.id,
          sourceName: r.source_name,
          targetName: r.target_name,
          label: r.label,
          time: r.time,
          description: r.description,
          document_id: r.document_id,
          document_title: r.document_title
        };
      })
      .filter((e) => e.source && e.target);
  }, [relationships, persons]);

  const mergedEdges = useMemo(() => {
    const edges = [];
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        const a = persons[i];
        const b = persons[j];
        if (!a?.name || !b?.name || !a?.id || !b?.id) continue;
        if (a.document_id !== b.document_id && namesMatch(a.name, b.name)) {
          edges.push({ source: a.id, target: b.id });
        }
      }
    }
    return edges;
  }, [persons]);

  const visiblePersons = useMemo(
    () => (selectedDocId
      ? persons.filter((p) => p?.id && p?.name && p.document_id === selectedDocId)
      : persons.filter((p) => p?.id && p?.name)),
    [persons, selectedDocId]
  );
  const visibleEdges = useMemo(
    () => graphEdges.filter((e) => !selectedDocId || e.document_id === selectedDocId),
    [graphEdges, selectedDocId]
  );
  const visibleMerged = useMemo(() => (selectedDocId ? [] : mergedEdges), [mergedEdges, selectedDocId]);
  const visibleRedFlags = useMemo(
    () => (selectedDocId ? redFlags.filter((r) => r.document_id === selectedDocId) : redFlags),
    [redFlags, selectedDocId]
  );
  const visibleFlaggedPassages = useMemo(
    () => (selectedDocId ? flaggedPassages.filter((p) => p.document_id === selectedDocId) : flaggedPassages),
    [flaggedPassages, selectedDocId]
  );
  const visibleClaims = useMemo(
    () => (selectedDocId ? claims.filter((c) => c.document_id === selectedDocId) : claims),
    [claims, selectedDocId]
  );
  const visibleEvents = useMemo(
    () => {
      const valid = events.filter((e) => e && (e.id || e.title));
      return selectedDocId ? valid.filter((e) => e.document_id === selectedDocId) : valid;
    },
    [events, selectedDocId]
  );
  const visibleContradictions = useMemo(
    () => {
      if (!selectedDocId) return contradictions;
      return contradictions.filter((c) => c.document_a_id === selectedDocId || c.document_b_id === selectedDocId);
    },
    [contradictions, selectedDocId]
  );

  const timeBounds = useMemo(() => {
    const times = visibleEdges.map((e) => parseTimeToMinutes(e.time)).filter((t) => t != null);
    if (!times.length) return { min: 0, max: 0, hasTime: false };
    return { min: Math.min(...times), max: Math.max(...times), hasTime: true };
  }, [visibleEdges]);

  const timeEnabled = timeBounds.hasTime;
  useEffect(() => {
    if (timeBounds.hasTime) setMaxTime(timeBounds.max);
    stopReplay();
  }, [timeBounds.min, timeBounds.max, timeBounds.hasTime]);

  // Upload → validate → prepare → (PDF chunk) → analyzeDocument → contradiction detect
  const remainingDocSlots = () => {
    if (plan === 'pro' || plan === 'agency') return Number.POSITIVE_INFINITY;
    return Math.max(0, 5 - (documents?.length || 0));
  };

  const uploadBinaryToStorage = async (uploadFile) => {
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file: uploadFile });
      return uploadRes?.file_url || URL.createObjectURL(uploadFile);
    } catch (uploadErr) {
      console.warn('[Upload] Cloud upload skipped/offline:', uploadErr);
      return URL.createObjectURL(uploadFile);
    }
  };

  const createDocumentRecord = async (fields, uploadFileForOffline = null) => {
    try {
      return await base44.entities.Document.create(fields);
    } catch (entityErr) {
      console.warn('[Upload] Cloud entity create 403/offline, saving locally:', entityErr);
      const doc = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        ...fields,
        status: fields.status === 'pending' ? 'done' : (fields.status || 'done'),
        created_date: new Date().toISOString()
      };
      setDocuments((prev) => [doc, ...(prev || [])]);
      if (uploadFileForOffline) {
        try {
          await saveDocumentOffline(doc, uploadFileForOffline);
        } catch {
          /* ignore offline save errors */
        }
      }
      return { ...doc, __localOnly: true };
    }
  };

  const invokeAnalyze = async (doc, title) => {
    if (doc?.__localOnly) return null;
    return withAiRetry(
      () => base44.functions.invoke('analyzeDocument', {
        documentId: doc.id,
        documentTitle: title || doc.title
      }),
      {
        maxRetries: 2,
        initialDelayMs: 1200,
        onRetry: ({ attempt }) => {
          showToast(`AI server je vyťažený, opakujem pokus (${attempt}/2)...`);
        }
      }
    );
  };

  const applyClientOcrAnalysis = async (doc, ocrResult) => {
    if (!doc?.id || !ocrResult?.ok) return;
    const payload = buildOcrAnalysisPayload(ocrResult, doc.id, doc.title);
    await cacheAnalysisOffline(doc.id, payload);

    const state = useForenzStore.getState();
    const merged = mergeClientOcrIntoCase(
      {
        documents: state.documents,
        persons: state.persons,
        relationships: state.relationships,
        redFlags: state.redFlags,
        flaggedPassages: state.flaggedPassages,
        claims: state.claims,
        events: state.events,
        locations: state.locations,
        vehicles: state.vehicles,
        contradictions: state.contradictions,
        overrides: state.overrides
      },
      payload,
      doc.id
    );
    useForenzStore.setState(merged);
    await saveCaseOffline('current', sanitizeCasePayload(merged));

    if (!doc.__localOnly) {
      try {
        await base44.entities.Document.update(doc.id, buildOcrDocumentPatch(ocrResult));
      } catch (err) {
        console.warn('[OCR] Cloud document patch skipped:', err);
      }
    }
  };

  const runImageOcrIfNeeded = async (file, uploadFile, controller, onProgress) => {
    if (!isImageUploadFile(file)) return null;
    return runOcrWithFallback(uploadFile, {
      signal: controller.signal,
      onProgress: (pct) => {
        if (onProgress) onProgress(pct);
        setBulkProgress((p) => ({
          ...(p || {}),
          percent: Math.min(70, 25 + Math.round(pct * 0.35)),
          statusText: `OCR rozpoznávanie textu (${pct}%)...`
        }));
      }
    });
  };

  const handleScan = async (file) => {
    if (!file) return;
    const sizeCheck = validateUploadSize(file, MAX_FILE_SIZE_BYTES);
    if (!sizeCheck.ok) {
      showToast(`Súbor "${file.name}" prekračuje limit 50 MB (${sizeCheck.sizeKb.toLocaleString()} KB / max 50 000 KB).`);
      return;
    }
    if (!canAddDocument(documents.length)) {
      openPaywall('limit_documents');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setScanning(true);
    try {
      if (documents.length === 0) {
        if (!usePlanStore.getState().canCreateCase()) {
          openPaywall('limit_cases');
          setScanning(false);
          return;
        }
        usePlanStore.getState().incrementCaseCount();
        trackCaseCreated('upload', 1);
        logAction('CASE_CREATED', { source: 'upload' });
      }
      trackFileUploaded(file.name?.split('.').pop() || 'unknown', Math.round(file.size / 1024));
      logAction('DOC_UPLOADED', { file_type: file.name?.split('.').pop() || 'unknown', size_kb: Math.round(file.size / 1024) });

      if (isPdfFile(file)) {
        const slots = remainingDocSlots();
        const pageConcurrency = isMobile ? 1 : PDF_ANALYZE_CONCURRENCY;
        setBulkProgress({
          total: 1,
          done: 0,
          analyzing: 1,
          failed: 0,
          percent: 5,
          statusText: `Pripravujem PDF: ${file.name}...`
        });

        const result = await chunkAndProcessPdf(file, {
          remainingSlots: slots,
          maxPages: PDF_MAX_PAGES,
          pageConcurrency,
          signal: controller.signal,
          uploadBinary: uploadBinaryToStorage,
          createDocument: (fields) => createDocumentRecord(fields),
          analyzeDocument: (doc) => invokeAnalyze(doc, doc.title),
          onPageProgress: ({ pageNumber, pageCount, stage, percent, statusText }) => {
            setBulkProgress({
              total: pageCount,
              done: stage === 'done' ? pageNumber : Math.max(0, pageNumber - 1),
              analyzing: stage === 'done' ? 0 : 1,
              failed: 0,
              percent,
              statusText: statusText || `Strana ${pageNumber}/${pageCount}: ${stage}...`
            });
          }
        });

        setBulkProgress(null);
        if (result.aborted) {
          showToast(`Spracovanie PDF bolo zastavené. Spracovaných ${result.pageDocs?.length || 0} z ${result.originalPageCount || 0} strán.`);
          await fetchData();
          return;
        }
        if (!result.ok) {
          openPaywall('limit_documents');
          return;
        }
        if (result.truncated) {
          showToast(`PDF má ${result.originalPageCount} strán — spracovaných ${result.pageCount} (limit ${PDF_MAX_PAGES} / plán).`);
        }
        await fetchData();
        return;
      }

      // LOAD / PREPARE → UPLOAD → RELEASE local memory → ANALYZE FROM STORAGE
      setBulkProgress({
        total: 1,
        done: 0,
        analyzing: 1,
        failed: 0,
        percent: 25,
        statusText: `Spracovávam súbor: ${file.name}...`
      });

      const uploadFile = await prepareFileForUpload(file);
      if (controller.signal.aborted) {
        showToast('Spracovanie bolo zastavené.');
        return;
      }

      const ocrPromise = runImageOcrIfNeeded(file, uploadFile, controller);
      const [file_url, ocrResult] = await Promise.all([
        uploadBinaryToStorage(uploadFile),
        ocrPromise
      ]);
      if (controller.signal.aborted) {
        showToast('Spracovanie bolo zastavené.');
        return;
      }

      const ocrFields = ocrResult?.ok ? buildOcrDocumentPatch(ocrResult) : {};
      const doc = await createDocumentRecord({
        title: file.name,
        image_url: file_url,
        status: 'pending',
        source_kind: 'upload',
        ...ocrFields
      }, uploadFile);

      if (!doc.__localOnly) {
        await fetchData();
      } else {
        await saveCaseOffline('current', sanitizeCasePayload({
          documents: [doc, ...(documents || [])].map(({ __localOnly, ...rest }) => rest),
          persons,
          relationships,
          contradictions,
          redFlags,
          events,
          locations,
          claims,
          vehicles,
          flaggedPassages: flaggedPassages || [],
          overrides: overrides || []
        }));
        setSelectedDocId(doc.id);
      }

      if (controller.signal.aborted) {
        showToast('Spracovanie bolo zastavené.');
        return;
      }

      if (ocrResult?.ok) {
        await applyClientOcrAnalysis(doc, ocrResult);
        if (ocrResult.lowConfidence) {
          showToast('OCR dokončené s nízkou spoľahlivosťou — odporúčame manuálnu kontrolu.');
        }
      }

      try {
        setBulkProgress({
          total: 1,
          done: 0,
          analyzing: 1,
          failed: 0,
          percent: 75,
          statusText: `AI extrakcia: ${file.name}...`
        });
        await invokeAnalyze(doc, file.name);
        if (!doc.__localOnly) await fetchData();
      } catch (err) {
        console.warn('[Upload] Cloud AI invoke unavailable, document loaded into local workspace:', err);
        if (ocrResult?.ok) {
          showToast(`Spis "${file.name}" spracovaný cez OCR (offline režim).`);
        } else {
          showToast(`Spis "${file.name}" bol načítaný a bezpečne uložený do lokálneho úložiska (IndexedDB 50 MB).`);
        }
      }
    } catch (e) {
      if (controller.signal.aborted || e?.name === 'AbortError') {
        showToast('Spracovanie bolo zastavené.');
      } else {
        console.error(e);
        const msg = String(e?.message || '');
        const isDevViteDisconnect =
          import.meta.env.DEV &&
          /Failed to fetch dynamically imported module|Loading module|\/\.vite\/deps\//i.test(msg);
        showToast(
          isDevViteDisconnect
            ? 'Dev server sa odpojil — obnov stránku na http://127.0.0.1:5173 a skús znova.'
            : 'Nahrávanie zlyhalo'
        );
      }
    } finally {
      abortControllerRef.current = null;
      setScanning(false);
      setBulkProgress(null);
    }
  };

  const handleBulkScan = async (files) => {
    const validFiles = [];
    const oversizedFiles = [];

    (files || []).forEach((file) => {
      if (!validateUploadSize(file, MAX_FILE_SIZE_BYTES).ok) {
        oversizedFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => f.name).slice(0, 2).join(', ');
      const extra = oversizedFiles.length > 2 ? ` (+${oversizedFiles.length - 2} ďalšie)` : '';
      showToast(`Preskočené súbory nad 50 MB (50 000 KB): ${names}${extra}`);
    }

    if (validFiles.length === 0) return;

    if (!canAddDocument(documents.length + Math.min(validFiles.length, 1))) {
      openPaywall('limit_documents');
      return;
    }

    const maxBatch = isMobile ? 20 : 100;
    if (validFiles.length > maxBatch) {
      showToast(`Na mobile/desktope je limit ${maxBatch} súborov naraz. Spracujem prvých ${maxBatch}.`);
    }
    const batch = validFiles.slice(0, maxBatch);

    const remainingSlots = plan === 'free' || plan === undefined
      ? Math.max(0, 5 - documents.length)
      : batch.length;
    if (plan === 'free' && remainingSlots <= 0) {
      openPaywall('limit_documents');
      return;
    }
    const cappedBatch = plan === 'free' ? batch.slice(0, remainingSlots) : batch;
    if (plan === 'free' && cappedBatch.length < batch.length) {
      showToast(`Free plán: spracujem ${cappedBatch.length} z ${batch.length} (limit 5 výpovedí).`);
    }
    if (cappedBatch.length === 0) {
      openPaywall('limit_documents');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setScanning(true);
    setBulkProgress({ total: cappedBatch.length, done: 0, analyzing: 0, failed: 0, statusText: `Pripravujem ${cappedBatch.length} súborov...` });
    try {
      if (documents.length === 0) {
        if (!usePlanStore.getState().canCreateCase()) {
          openPaywall('limit_cases');
          setScanning(false);
          setBulkProgress(null);
          return;
        }
        usePlanStore.getState().incrementCaseCount();
        trackCaseCreated('bulk_upload', cappedBatch.length);
        logAction('CASE_CREATED', { source: 'bulk_upload', file_count: cappedBatch.length });
      }
      logAction('DOC_UPLOADED', { source: 'bulk', file_count: cappedBatch.length });

      let slotsLeft = remainingDocSlots();
      const pageConcurrency = isMobile ? 1 : PDF_ANALYZE_CONCURRENCY;
      // Free plán: sériovo kvôli presnému počítaniu slotov (PDF = N dokumentov).
      const fileConcStart = (plan === 'free' || plan === undefined) ? 1 : 2;
      const fileConcMax = (plan === 'free' || plan === undefined) ? 1 : (isMobile ? 2 : 4);

      let localOnlyCount = 0;
      let cloudCount = 0;
      let analyzeFailed = 0;
      const localDocSnapshots = [];
      const trackCreateDocument = async (fields, uploadFileForOffline = null) => {
        const doc = await createDocumentRecord(fields, uploadFileForOffline);
        if (doc?.__localOnly) {
          localOnlyCount++;
          const { __localOnly, ...stored } = doc;
          localDocSnapshots.push(stored);
        } else {
          cloudCount++;
        }
        return doc;
      };

      // Pipeline: PDF chunk alebo preprocess → upload → create → analyze (concurrency capped)
      await mapWithAdaptiveConcurrency(cappedBatch, fileConcStart, fileConcMax, async (file) => {
        if (controller.signal.aborted || slotsLeft < 1) return;

        if (isPdfFile(file)) {
          const result = await chunkAndProcessPdf(file, {
            remainingSlots: slotsLeft,
            maxPages: PDF_MAX_PAGES,
            pageConcurrency,
            signal: controller.signal,
            uploadBinary: uploadBinaryToStorage,
            createDocument: (fields, uploadFile) => trackCreateDocument(fields, uploadFile),
            onPageProgress: ({ pageNumber, pageCount, statusText, percent }) => {
              setBulkProgress((p) => ({
                ...p,
                percent,
                statusText: statusText || `${file.name} (s. ${pageNumber}/${pageCount})`
              }));
            },
            analyzeDocument: async (doc) => {
              if (controller.signal.aborted) return;
              setBulkProgress((p) => ({ ...p, analyzing: (p?.analyzing || 0) + 1 }));
              try {
                await invokeAnalyze(doc, doc.title);
              } finally {
                setBulkProgress((p) => ({
                  ...p,
                  analyzing: Math.max(0, (p?.analyzing || 1) - 1),
                  done: (p?.done || 0) + 1
                }));
              }
            }
          });
          if (result.ok) {
            const used = (result.parentDoc ? 1 : 0) + (result.pageCount || 0);
            slotsLeft = Number.isFinite(slotsLeft) ? Math.max(0, slotsLeft - used) : slotsLeft;
          }
          return;
        }

        const uploadFile = await prepareFileForUpload(file);
        if (controller.signal.aborted) return;

        const ocrPromise = runImageOcrIfNeeded(file, uploadFile, controller);
        const [file_url, ocrResult] = await Promise.all([
          uploadBinaryToStorage(uploadFile),
          ocrPromise
        ]);
        if (controller.signal.aborted) return;

        const ocrFields = ocrResult?.ok ? buildOcrDocumentPatch(ocrResult) : {};
        const doc = await trackCreateDocument({
          title: file.name,
          image_url: file_url || URL.createObjectURL(uploadFile),
          status: 'pending',
          source_kind: 'upload',
          ...ocrFields
        }, uploadFile);

        if (ocrResult?.ok) {
          await applyClientOcrAnalysis(doc, ocrResult);
        }

        if (Number.isFinite(slotsLeft)) slotsLeft = Math.max(0, slotsLeft - 1);

        if (controller.signal.aborted) return;

        if (doc?.__localOnly) {
          setBulkProgress((p) => ({
            ...p,
            done: (p?.done || 0) + 1,
            statusText: `Uložené lokálne: ${file.name}`
          }));
          return;
        }

        setBulkProgress((p) => ({
          ...p,
          analyzing: (p?.analyzing || 0) + 1,
          statusText: `AI extrakcia: ${file.name}...`
        }));
        try {
          await invokeAnalyze(doc, file.name);
          setBulkProgress((p) => ({ ...p, analyzing: Math.max(0, p.analyzing - 1), done: p.done + 1 }));
        } catch {
          analyzeFailed++;
          setBulkProgress((p) => ({ ...p, analyzing: Math.max(0, p.analyzing - 1), done: p.done + 1, failed: (p?.failed || 0) + 1 }));
        }
      });

      if (shouldSyncBulkViaOfflineOnly({ localOnlyCount, cloudCount })) {
        const state = useForenzStore.getState();
        await saveCaseOffline('current', sanitizeCasePayload(casePayloadFromStore(state)));
        if (state.documents?.length && !state.selectedDocId) {
          setSelectedDocId(state.documents[0].id);
        }
        showToast(buildBulkOfflineSuccessMessage(cappedBatch.length));
      } else if (cloudCount > 0) {
        await fetchData();
        if (localDocSnapshots.length) {
          const merged = mergeLocalDocuments(useForenzStore.getState().documents, localDocSnapshots);
          setDocuments(merged);
          await saveCaseOffline('current', sanitizeCasePayload(casePayloadFromStore({ ...useForenzStore.getState(), documents: merged })));
        }
        const analyzeMsg = buildBulkAnalyzeFailureMessage(analyzeFailed);
        if (analyzeMsg) showToast(analyzeMsg);
      } else {
        await fetchData();
      }
    } catch (e) {
      if (controller.signal.aborted || e?.name === 'AbortError') {
        showToast('Hromadné spracovanie bolo zastavené.');
      } else {
        console.error(e);
        showToast('Hromadné nahrávanie zlyhalo. Skúste to znova alebo nahrajte súbory po jednom.');
      }
    } finally {
      abortControllerRef.current = null;
      setScanning(false);
      setBulkProgress(null);
    }
  };

  const handleRetryAnalysis = async (doc) => {
    try {
      if (!doc?.__localOnly) {
        await base44.entities.Document.update(doc.id, { status: 'pending', last_error: '' });
      }
      setBulkProgress({
        total: 1,
        done: 0,
        analyzing: 1,
        failed: 0,
        percent: 50,
        statusText: `Znovu analyzujem stranu: ${doc.title}...`
      });
      try {
        const res = await invokeAnalyze(doc, doc.title);
        setBulkProgress(null);
        if (res?.data && !res.data.ok) {
          showToast('Analýza opäť zlyhala: ' + (res.data.error || ''));
        } else {
          showToast(`Analýza úspešne dokončená: ${doc.title}`);
        }
      } catch (err) {
        setBulkProgress(null);
        showToast('Retry zlyhal: ' + (err?.message || ''));
      }
      await fetchData();
    } catch (e) {
      console.error(e);
      setBulkProgress(null);
      showToast('Retry zlyhal');
    }
  };

  const handleRetryContainer = async (containerDoc) => {
    const childErrorPages = (documents || []).filter(
      (d) => d.parent_document_id === containerDoc.id && d.status === 'error'
    );
    if (!childErrorPages.length) return;

    setScanning(true);
    setBulkProgress({
      total: childErrorPages.length,
      done: 0,
      analyzing: 0,
      failed: 0,
      statusText: `Znovu analyzujem ${childErrorPages.length} chybných strán...`
    });

    for (let i = 0; i < childErrorPages.length; i++) {
      const pageDoc = childErrorPages[i];
      setBulkProgress((p) => ({
        ...p,
        analyzing: (p?.analyzing || 0) + 1,
        statusText: `Strana ${pageDoc.page_number || (i + 1)}/${childErrorPages.length}: AI extrakcia...`
      }));
      try {
        if (!pageDoc.__localOnly) {
          await base44.entities.Document.update(pageDoc.id, { status: 'pending', last_error: '' });
        }
        await invokeAnalyze(pageDoc, pageDoc.title);
        setBulkProgress((p) => ({
          ...p,
          analyzing: Math.max(0, (p?.analyzing || 1) - 1),
          done: (p?.done || 0) + 1
        }));
      } catch {
        setBulkProgress((p) => ({
          ...p,
          analyzing: Math.max(0, (p?.analyzing || 1) - 1),
          failed: (p?.failed || 0) + 1
        }));
      }
    }
    setScanning(false);
    setBulkProgress(null);
    showToast(`Dokončená opätovná analýza ${childErrorPages.length} strán.`);
    await fetchData();
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Naozaj zmazať výpoveď "${doc.title}" a všetky súvisiace dáta (osoby, vzťahy, varovania, tvrdenia, udalosti, miesta, vozidlá, rozpory)? Túto akciu nie je možné vrátiť späť.`)) {
      return;
    }
    try {
      const childPages = (doc.source_kind === 'pdf_container')
        ? (documents || []).filter((d) => d.parent_document_id === doc.id)
        : [];
      const toDelete = [doc, ...childPages];

      for (const target of toDelete) {
        await base44.entities.Person.deleteMany({ document_id: target.id });
        await base44.entities.Relationship.deleteMany({ document_id: target.id });
        await base44.entities.RedFlag.deleteMany({ document_id: target.id });
        await base44.entities.FlaggedPassage.deleteMany({ document_id: target.id });
        await base44.entities.ForensicClaim.deleteMany({ document_id: target.id });
        await base44.entities.Event.deleteMany({ document_id: target.id });
        await base44.entities.Location.deleteMany({ document_id: target.id });
        await base44.entities.Vehicle.deleteMany({ document_id: target.id });
        await base44.entities.Contradiction.deleteMany({ document_a_id: target.id });
        await base44.entities.Contradiction.deleteMany({ document_b_id: target.id });
        await base44.entities.Document.delete(target.id);
      }
      if (selectedDocId && toDelete.some((d) => d.id === selectedDocId)) setSelectedDocId(null);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    try {
      const me = await base44.auth.me();
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const docId = selectedDocId || '';
      const docTitle = selectedDocId
        ? documents.find((d) => d.id === selectedDocId)?.title
        : 'Celý prípad';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const created = await base44.entities.SharedCase.create({
        token,
        document_id: docId,
        document_title: docTitle || '',
        expires_at: expiresAt,
        created_by: me.id,
        created_by_name: me.full_name || me.email || 'Neznámy'
      });
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
      setActiveShare({ id: created.id, token });
      showToast('Link skopírovaný (platný 7 dní)');
    } catch (e) {
      console.error(e);
      showToast('Zdieľanie zlyhalo');
    }
  };

  const handleRevokeShare = async () => {
    if (!activeShare) return;
    try {
      await base44.entities.SharedCase.update(activeShare.id, {
        revoked_at: new Date().toISOString()
      });
      setActiveShare(null);
      showToast('Link zneplatnený');
    } catch (e) {
      console.error(e);
      showToast('Zneplatnenie zlyhalo');
    }
  };

  const handleCreateOverrides = async (payloads) => {
    if (!payloads?.length) return;
    try {
      await base44.entities.IdentityOverride.bulkCreate(payloads);
      const ovs = await base44.entities.IdentityOverride.list('-created_date', 500);
      setOverrides(ovs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeOverride = async (id) => {
    try {
      await base44.entities.IdentityOverride.delete(id);
      const ovs = await base44.entities.IdentityOverride.list('-created_date', 500);
      setOverrides(ovs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectEdge = useCallback((e) => {
    setSelectedPerson(null);
    setSelectedEdge(e);
  }, []);

  const handleSelectPerson = useCallback((p) => {
    setSelectedEdge(null);
    setSelectedPerson(p);
  }, []);

  const handleJumpToPerson = useCallback((person) => {
    setSelectedDocId(person.document_id);
    setSelectedPerson(person);
    setSelectedEdge(null);
    setActiveView('graph');
  }, []);

  const handleJumpToEdge = useCallback((documentId, edgeId) => {
    setSelectedDocId(documentId);
    setSelectedPerson(null);
    setSelectedEdge(graphEdges.find((e) => e.id === edgeId) || null);
    setActiveView('graph');
  }, [graphEdges]);

  const handleJumpToContradiction = useCallback((contr) => {
    const docId = contr.document_a_id;
    setSelectedDocId(docId);
    setSelectedEdge(null);
    const p = persons.find((pp) => pp.document_id === docId && pp.name === contr.entity_ref);
    setSelectedPerson(p || null);
    setActiveView('graph');
    trackContradictionViewed(contr?.type || 'contradiction');
  }, [persons]);

  const handleJumpToArchive = useCallback((documentId) => {
    setSelectedDocId(documentId);
    setActiveView('archive');
  }, []);

  const handleExport = async () => {
    if (isMonetizationEnabled && plan === 'free') {
      openPaywall('pro_feature');
      return;
    }
    setPdfExportScope('selected');
    setPdfExportOpen(true);
  };

  const handleExportAll = async () => {
    if (isMonetizationEnabled && plan === 'free') {
      openPaywall('pro_feature');
      return;
    }
    setPdfExportScope('all');
    setPdfExportOpen(true);
  };

  const handlePdfDialogClose = () => {
    setPdfExportOpen(false);
  };

  const handlePdfExported = () => {
    logAction('PDF_EXPORTED', { scope: pdfExportScope });
    trackPdfExported(pdfExportScope === 'all' ? documents.length : 1, true);
    showToast('PDF report bol úspešne vygenerovaný.');
  };

  const handleDossierExported = (result) => {
    logAction('COURT_DOSSIER_EXPORTED', {
      scope: pdfExportScope,
      zipSha256: result?.zipSha256,
      tip: result?.chainOfCustody?.tip
    });
    trackCourtDossierExported(result?.manifest?.length || 5);
    showToast('Court Dossier ZIP bol vygenerovaný.');
  };

  const openCrossExam = useCallback((target, kind = 'contradiction') => {
    setCrossExamTarget(target);
    setCrossExamKind(kind);
    setCrossExamOpen(true);
  }, []);

  const handleCrossExamGenerated = useCallback((out) => {
    logAction('CROSS_EXAM_GENERATED', {
      mode: out?.mode?.id || out?.mode,
      count: out?.questions?.length || 0,
      source: out?.source
    });
    trackCrossExamGenerated(out?.mode?.id || 'mild', out?.questions?.length || 0);
  }, [logAction]);

  // Replay controls
  const stopReplay = useCallback(() => {
    if (replayRef.current) {
      clearInterval(replayRef.current);
      replayRef.current = null;
    }
    setReplaying(false);
  }, []);

  const startReplay = useCallback(() => {
    if (!timeEnabled) return;
    setReplaying(true);
    setMaxTime(timeBounds.min);
    let cur = timeBounds.min;
    replayRef.current = setInterval(() => {
      const next = Math.min(cur + 5, timeBounds.max);
      cur = next;
      setMaxTime(next);
      const entered = visibleEdges.filter((e) => {
        const t = parseTimeToMinutes(e.time);
        return t != null && t <= next && t > next - 5;
      });
      if (entered.length) {
        setActiveEdgeId(entered[entered.length - 1].id);
        clearTimeout(pulseRef.current);
        pulseRef.current = setTimeout(() => setActiveEdgeId(null), 2000);
      }
      if (next >= timeBounds.max) {
        clearInterval(replayRef.current);
        replayRef.current = null;
        setReplaying(false);
      }
    }, 800);
  }, [timeEnabled, timeBounds.min, timeBounds.max, visibleEdges]);

  useEffect(() => {
    return () => {
      clearInterval(replayRef.current);
      clearTimeout(pulseRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const chromeHeader = (
    <AppHeader
      documents={documents}
      persons={persons}
      relationships={relationships}
      redFlags={redFlags}
      contradictions={contradictions}
      flaggedPassages={flaggedPassages}
      plan={plan}
      showStats={showStats}
      setShowStats={setShowStats}
      activeShare={activeShare}
      handleShare={handleShare}
      handleRevokeShare={handleRevokeShare}
      readOnly={readOnly}
      scanning={scanning}
      handleScan={handleScan}
      handleBulkScan={handleBulkScan}
      bulkProgress={bulkProgress}
      onCancelProcessing={handleCancelProcessing}
      onExport={handleExport}
      onExportAll={handleExportAll}
      onClearCase={() => {
        if (window.confirm('Naozaj chcete zavrieť aktuálny spis a vrátiť sa na domovskú obrazovku?')) {
          clearCase();
        }
      }}
      onOpenMobileMenu={() => setMobileMenuOpen(true)}
      onOpenSearch={() => setSearchOpen(true)}
      onOpenIntro={() => setIntroOpen(true)}
      onOpenPricing={isMonetizationEnabled ? () => setPricingModalOpen(true) : undefined}
      onOpenTrust={() => setTrustOpen(true)}
      onOpenAudit={() => setAuditOpen(true)}
      onOpenReferral={isMonetizationEnabled ? () => setReferralOpen(true) : undefined}
      onNavigateIdentity={() => setActiveView('identity')}
      sharedBy={sharedBy}
    />
  );

  const bulkBanner = bulkProgress ? (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300 shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <span className="font-medium text-slate-200 truncate">
              {bulkProgress.statusText || `Spracovanie: ${bulkProgress.done} z ${bulkProgress.total}`}
            </span>
            <span className="shrink-0 tabular-nums whitespace-nowrap text-slate-400 text-[11px] hidden sm:inline">
              {bulkProgress.done} ✓ · {bulkProgress.analyzing} ⏳ · {bulkProgress.failed} ✕ / {bulkProgress.total}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 sm:w-44 h-2 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700/60">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${
                    bulkProgress.percent != null
                      ? bulkProgress.percent
                      : bulkProgress.total
                      ? (bulkProgress.done / bulkProgress.total) * 100
                      : 0
                  }%`
                }}
              />
              {bulkProgress.analyzing > 0 && (
                <div
                  className="h-full bg-blue-500 transition-all duration-300 animate-pulse"
                  style={{
                    width: `${bulkProgress.total ? (bulkProgress.analyzing / bulkProgress.total) * 100 : 0}%`
                  }}
                />
              )}
              {bulkProgress.failed > 0 && (
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{
                    width: `${bulkProgress.total ? (bulkProgress.failed / bulkProgress.total) * 100 : 0}%`
                  }}
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleCancelProcessing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-medium transition-colors"
              title="Zastaviť spracovanie zostávajúcich strán"
              aria-label="Zastaviť spracovanie"
            >
              <XOctagon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zastaviť spracovanie</span>
            </button>
          </div>
        </div>
  ) : null;

  return (
    <>
    <AppLayout
      appBar={chromeHeader}
      banner={bulkBanner}
      nav={<MobileBottomNav activeView={activeView} onTabChange={handleViewChange} onSherlock={handleSherlockTab} />}
      overlays={(
        <>
          {!readOnly && (
            <StatsBar
              documents={documents}
              persons={persons}
              relationships={relationships}
              redFlags={redFlags}
              flaggedPassages={flaggedPassages}
              open={showStats}
              onOpenChange={setShowStats}
            />
          )}
          <SherlockChat
            persons={visiblePersons}
            edges={visibleEdges}
            redFlags={visibleRedFlags}
            flaggedPassages={visibleFlaggedPassages}
            claims={visibleClaims}
            events={visibleEvents}
            contradictions={visibleContradictions}
            openSignal={sherlockSignal}
          />
          {(toast || storeToast) && (
            <div
              role="status"
              data-testid="app-toast"
              className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-3xl border border-white text-blue-800 text-sm shadow-xl"
              style={{ bottom: 'calc(var(--sheet-offset) + 0.5rem)' }}
            >
              {toast || storeToast}
            </div>
          )}
          {mobileMenuOpen && (
            <MobileDrawer
              user={currentUser}
              activeView={activeView}
              onNavigate={handleViewChange}
              onClose={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
              onOpenIntro={() => setIntroOpen(true)}
              onOpenPricing={isMonetizationEnabled ? () => setPricingModalOpen(true) : undefined}
              onOpenTrust={() => setTrustOpen(true)}
              onOpenReferral={isMonetizationEnabled ? () => setReferralOpen(true) : undefined}
              onOpenAudit={() => setAuditOpen(true)}
              plan={plan}
              alertCount={redFlags.length + contradictions.length}
            />
          )}
        </>
      )}
    >
      {/* Navigation View Tabs (Desktop & Tablet) */}
      <div className="hidden lg:flex shrink-0 items-center px-4 py-2 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleViewChange('graph')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'graph'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-amber-400" />
            Pavúk vzťahov
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('archive')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'archive'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Spis & Kartotéka
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('map')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'map'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Alibi & Mapa
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('timeline')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'timeline'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Časová os
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('sherlock')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent transition-all"
            title="Otvoriť Sherlock AI vyšetrovacieho asistenta"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            Sherlock AI
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('identity')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'identity'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Prepojené identity
          </button>
        </div>
      </div>

      {/* Main Workspace View: HomeHero if on hero view, otherwise render the selected view */}
      {documents.length === 0 && !loading && (activeView === 'hero' || !activeView) ? (
        <HomeHero onScan={handleScan} onBulkScan={handleBulkScan} scanning={scanning} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 flex min-h-0 overflow-hidden"
          >
            {activeView === 'map' ? (
              <div className="flex-1 p-2 lg:p-4 min-h-0 flex flex-col">
                <ErrorBoundary isWidget={true} onReset={() => fetchData()}>
                  <Suspense fallback={<ViewSkeleton type="map" label="Načítavam Alibi mapu..." />}>
                    <MapView
                      locations={locations}
                      claims={claims}
                      contradictions={contradictions}
                      persons={persons}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            ) : activeView === 'timeline' ? (
              <ErrorBoundary isWidget={true} onReset={() => fetchData()}>
                <Suspense fallback={<ViewSkeleton type="timeline" label="Načítavam časovú os..." />}>
                  <EventTimeline
                    events={visibleEvents}
                    contradictions={visibleContradictions}
                    persons={visiblePersons}
                    selectedPerson={selectedPerson}
                    onSelectPerson={handleJumpToPerson}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : activeView === 'archive' ? (
              <ErrorBoundary isWidget={true}>
                <Suspense fallback={<ViewSkeleton type="archive" label="Načítavam kartotéku spisov..." />}>
                  <ArchiveView
                    documents={documents}
                    persons={persons}
                    relationships={relationships}
                    redFlags={redFlags}
                    flaggedPassages={flaggedPassages}
                    claims={claims}
                    events={events}
                    locations={locations}
                    vehicles={vehicles}
                    contradictions={contradictions}
                    selectedDocId={selectedDocId}
                    onSelectDoc={setSelectedDocId}
                    onJumpToPerson={handleJumpToPerson}
                    onJumpToEdge={handleJumpToEdge}
                    onJumpToContradiction={handleJumpToContradiction}
                    onCrossExamine={(c) => openCrossExam(c, 'contradiction')}
                    readOnly={readOnly}
                    onScan={handleScan}
                    onBulkScan={handleBulkScan}
                    scanning={scanning}
                    bulkProgress={bulkProgress}
                    onCancelProcessing={handleCancelProcessing}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : activeView === 'overview' ? (
              <MobileDashboard
                documents={documents}
                persons={persons}
                relationships={relationships}
                redFlags={redFlags}
                contradictions={contradictions}
                onSelectPerson={handleJumpToPerson}
              />
            ) : activeView === 'identity' ? (
              <IdentityPanel overrides={overrides} persons={persons} onRevokeOverride={handleRevokeOverride} />
            ) : (
              <div className="relative flex-1 flex flex-col lg:flex-row overflow-hidden p-2 lg:p-3 gap-2 lg:gap-3">
                <CollapsibleSidebar
                  side="left"
                  collapsed={leftCollapsed}
                  onToggle={() => setLeftCollapsed((c) => !c)}
                  expandedWidth={272}
                  bubbleIcon={FileText}
                  bubbleLabel={documents.length}
                >
                  <DocumentList
                    documents={documents}
                    selectedDocId={selectedDocId}
                    onSelect={setSelectedDocId}
                    onDelete={readOnly ? null : handleDelete}
                    onRetry={readOnly ? null : handleRetryAnalysis}
                    onRetryContainer={readOnly ? null : handleRetryContainer}
                  />
                </CollapsibleSidebar>

                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <ErrorBoundary isWidget={true}>
                    <Suspense fallback={<ViewSkeleton type="graph" label="Generujem pavúka vzťahov..." />}>
                      <GraphCanvas
                        persons={visiblePersons}
                        graphEdges={visibleEdges}
                        mergedEdges={visibleMerged}
                        selectedPersonId={selectedPerson?.id}
                        onSelectPerson={handleSelectPerson}
                        selectedEdgeId={selectedEdge?.id}
                        onSelectEdge={handleSelectEdge}
                        onShowEvidence={handleJumpToArchive}
                        maxTime={maxTime}
                        timeEnabled={timeEnabled}
                        activeEdgeId={activeEdgeId}
                        flaggedPassages={flaggedPassages}
                        overrides={overrides}
                        onCreateOverrides={handleCreateOverrides}
                        readOnly={readOnly}
                      />
                    </Suspense>
                  </ErrorBoundary>
                  <TimeSlider
                    min={timeBounds.min}
                    max={timeBounds.max}
                    value={maxTime}
                    onChange={setMaxTime}
                    replaying={replaying}
                    onToggleReplay={() => (replaying ? stopReplay() : startReplay())}
                  />
                </div>

                <CollapsibleSidebar
                  side="right"
                  collapsed={rightCollapsed}
                  onToggle={() => setRightCollapsed((c) => !c)}
                  expandedWidth={336}
                  bubbleIcon={ShieldAlert}
                  bubbleLabel={redFlags.length + contradictions.length}
                >
                  <div className="relative w-full h-full flex flex-col bg-white/70 backdrop-blur-3xl border-[1.5px] border-white rounded-[32px] shadow-xl overflow-hidden min-w-0 max-h-[35vh] lg:max-h-none">
                    <PersonPanel
                      person={selectedPerson}
                      edge={selectedEdge}
                      onShowEvidence={handleJumpToArchive}
                      onCrossExamine={(p) => openCrossExam(p, 'person')}
                      onClose={() => {
                        setSelectedPerson(null);
                        setSelectedEdge(null);
                      }}
                    />
                    <RedFlagsPanel
                      redFlags={visibleRedFlags}
                      contradictions={visibleContradictions}
                      onCrossExamine={(c) => openCrossExam(c, 'contradiction')}
                    />
                  </div>
                </CollapsibleSidebar>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </AppLayout>

      <QuickSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        persons={persons}
        relationships={relationships}
        events={events}
        claims={claims}
        redFlags={redFlags}
        documents={documents}
        contradictions={contradictions}
        onSelectPerson={handleJumpToPerson}
        onSelectEdge={handleJumpToEdge}
        onSelectDoc={handleJumpToArchive}
        onSelectEvent={() => setActiveView('timeline')}
      />

      <WelcomeIntroModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
      />

      {isMonetizationEnabled && (
      <PricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
      />
      )}

      {isMonetizationEnabled && (
      <PaywallGate
        isOpen={!!paywallReason}
        onClose={() => setPricingModalOpen(false, null)}
        reason={paywallReason || 'limit_cases'}
      />
      )}

      <TrustPackModal
        isOpen={trustOpen}
        onClose={() => setTrustOpen(false)}
      />

      {isMonetizationEnabled && (
      <ReferralModal
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
      />
      )}

      <AuditLogViewer
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
      />

      <PdfExportDialog
        isOpen={pdfExportOpen}
        onClose={handlePdfDialogClose}
        onExported={handlePdfExported}
        onDossierExported={handleDossierExported}
        documents={pdfExportScope === 'all' ? documents : (selectedDocId ? documents.filter((d) => d.id === selectedDocId) : documents)}
        persons={pdfExportScope === 'all' ? persons : visiblePersons}
        relationships={pdfExportScope === 'all' ? relationships : visibleEdges}
        redFlags={pdfExportScope === 'all' ? redFlags : visibleRedFlags}
        contradictions={pdfExportScope === 'all' ? contradictions : visibleContradictions}
        events={pdfExportScope === 'all' ? events : visibleEvents}
        claims={pdfExportScope === 'all' ? claims : visibleClaims}
        auditLogs={auditLogs}
        graphCanvasElement={typeof document !== 'undefined' ? document.querySelector('.relative.flex-1 canvas') : null}
        mapElement={typeof document !== 'undefined' ? document.querySelector('[data-testid="alibi-map"], .leaflet-container') : null}
        scopeTitle={
          pdfExportScope === 'all'
            ? 'Kompletný vyšetrovací archív'
            : (selectedDocId ? `Výpoveď: ${documents.find((d) => d.id === selectedDocId)?.title || selectedDocId}` : 'Celý prípad')
        }
      />

      <CrossExamDialog
        isOpen={crossExamOpen}
        onClose={() => setCrossExamOpen(false)}
        target={crossExamTarget}
        targetKind={crossExamKind}
        documents={documents}
        claims={claims}
        contradictions={contradictions}
        onGenerated={handleCrossExamGenerated}
      />
    </>
  );
}
