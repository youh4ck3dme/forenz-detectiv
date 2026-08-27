import { create } from 'zustand';
import { base44 } from '../api/base44Client.js';
import { saveCaseOffline, getCaseOffline, sanitizeCasePayload, purgeInvalidOfflineDocuments } from '../lib/offlineDb.js';
import { trackContradictionDetected } from '../lib/analytics.js';
import { resolveEntityArrayUpdate, makeEntityArraySetter } from './entityArraySetter.js';

export { resolveEntityArrayUpdate } from './entityArraySetter.js';

export const useForenzStore = create((set, get) => ({
  // 1. Dátové entity
  documents: [],
  persons: [],
  relationships: [],
  redFlags: [],
  flaggedPassages: [],
  claims: [],
  events: [],
  locations: [],
  vehicles: [],
  contradictions: [],
  overrides: [],

  // 2. UI a navigácia
  loading: true,
  scanning: false,
  bulkProgress: null,
  toast: '',
  showStats: false,
  activeShare: null,
  activeView: 'hero',
  selectedDocId: null,
  selectedPerson: null,
  selectedEdge: null,
  currentUser: null,
  sherlockSignal: 0,
  maxTime: 0,
  replaying: false,
  activeEdgeId: null,
  leftCollapsed: false,
  rightCollapsed: false,
  searchOpen: false,
  introOpen: false,
  graphFilter: 'all', // 'all' | 'key_hubs' | 'suspects' | 'conflicts'

  // 3. Nastavovače stavu (entity lists support functional updates — see createDocumentRecord)
  setDocuments: makeEntityArraySetter(set, 'documents'),
  setPersons: makeEntityArraySetter(set, 'persons'),
  setRelationships: makeEntityArraySetter(set, 'relationships'),
  setRedFlags: makeEntityArraySetter(set, 'redFlags'),
  setFlaggedPassages: makeEntityArraySetter(set, 'flaggedPassages'),
  setClaims: makeEntityArraySetter(set, 'claims'),
  setEvents: makeEntityArraySetter(set, 'events'),
  setLocations: makeEntityArraySetter(set, 'locations'),
  setVehicles: makeEntityArraySetter(set, 'vehicles'),
  setOverrides: makeEntityArraySetter(set, 'overrides'),
  setContradictions: (contradictionsOrUpdater) => {
    const list = resolveEntityArrayUpdate(get().contradictions, contradictionsOrUpdater);
    set({ contradictions: list });
    if (list.length > 0) {
      const hasAlibi = list.some((c) => c.type === 'alibi' || c.severity === 'high' || c.is_alibi_conflict);
      trackContradictionDetected(list.length, hasAlibi);
    }
  },

  setSelectedDocId: (selectedDocId) => set({ selectedDocId }),
  setSelectedPerson: (selectedPerson) => set({ selectedPerson }),
  setSelectedEdge: (selectedEdge) => set({ selectedEdge }),
  setActiveView: (activeView) => set({ activeView }),
  setMaxTime: (maxTime) => set({ maxTime }),
  setReplaying: (replaying) => set({ replaying }),
  setActiveEdgeId: (activeEdgeId) => set({ activeEdgeId }),
  setScanning: (scanning) => set({ scanning }),
  setBulkProgress: (bulkProgress) => set({ bulkProgress }),
  setShowStats: (updater) => set((s) => ({ showStats: typeof updater === 'function' ? updater(s.showStats) : updater })),
  setActiveShare: (activeShare) => set({ activeShare }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setSherlockSignal: (updater) => set((s) => ({ sherlockSignal: typeof updater === 'function' ? updater(s.sherlockSignal) : updater })),
  setLeftCollapsed: (updater) => set((s) => ({ leftCollapsed: typeof updater === 'function' ? updater(s.leftCollapsed) : updater })),
  setRightCollapsed: (updater) => set((s) => ({ rightCollapsed: typeof updater === 'function' ? updater(s.rightCollapsed) : updater })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setIntroOpen: (introOpen) => set({ introOpen }),
  setGraphFilter: (graphFilter) => set({ graphFilter }),

  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => {
      if (get().toast === msg) set({ toast: '' });
    }, 4000);
  },

  // 3.1 Vyčistenie prípadu (pre návrat na čistý Home)
  clearCase: () => {
    set({
      documents: [],
      persons: [],
      relationships: [],
      locations: [],
      events: [],
      claims: [],
      redFlags: [],
      flaggedPassages: [],
      vehicles: [],
      contradictions: [],
      overrides: [],
      selectedDocId: null,
      selectedPerson: null,
      selectedEdge: null
    });
  },

  // 4. Centralizovaný asynchrónny fetch dát (s offline fallbackom)
  fetchData: async (scope = null, initialData = null) => {
    set({ loading: true });

    if (initialData) {
      const seeded = sanitizeCasePayload(initialData);
      set({
        ...seeded,
        loading: false
      });
      return;
    }

    const hasAuthToken =
      typeof window !== 'undefined' &&
      !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token'));

    await purgeInvalidOfflineDocuments();

    const loadOfflineSnapshot = async (toastMessage) => {
      const offline = await getCaseOffline('current');
      if (!offline) return false;
      const safe = sanitizeCasePayload(offline);
      const hasData =
        safe.documents.length > 0 ||
        safe.persons.length > 0 ||
        safe.events.length > 0 ||
        safe.claims.length > 0;
      if (!hasData) return false;
      set({ ...safe, loading: false });
      if (toastMessage) get().showToast(toastMessage);
      return true;
    };

    // Guest / offline-first: show cached case immediately when backend is unavailable
    if (!hasAuthToken && !scope?.creatorId) {
      const loaded = await loadOfflineSnapshot(null);
      if (loaded) {
        return;
      }
    }

    try {
      let docs, ppl, rels, flags, flagged, clms, evs, locs, vehs, contras, ovs;

      if (scope?.creatorId) {
        if (scope.documentId) {
          docs = [await base44.entities.Document.get(scope.documentId)];
          ppl = await base44.entities.Person.filter({ document_id: scope.documentId });
          rels = await base44.entities.Relationship.filter({ document_id: scope.documentId });
          flags = await base44.entities.RedFlag.filter({ document_id: scope.documentId });
          flagged = await base44.entities.FlaggedPassage.filter({ document_id: scope.documentId });
          clms = await base44.entities.ForensicClaim.filter({ document_id: scope.documentId });
          evs = await base44.entities.Event.filter({ document_id: scope.documentId });
          locs = await base44.entities.Location.filter({ document_id: scope.documentId });
          vehs = await base44.entities.Vehicle.filter({ document_id: scope.documentId });
          contras = await base44.entities.Contradiction.filter({ document_id: scope.documentId });
          ovs = [];
        } else {
          docs = await base44.entities.Document.filter({ created_by_id: scope.creatorId }, '-created_date', 500);
          ppl = await base44.entities.Person.filter({ created_by_id: scope.creatorId }, '-created_date', 1000);
          rels = await base44.entities.Relationship.filter({ created_by_id: scope.creatorId }, '-created_date', 1000);
          flags = await base44.entities.RedFlag.filter({ created_by_id: scope.creatorId }, '-created_date', 1000);
          flagged = await base44.entities.FlaggedPassage.filter({ created_by_id: scope.creatorId }, '-created_date', 1000);
          clms = await base44.entities.ForensicClaim.filter({ created_by_id: scope.creatorId }, '-created_date', 2000);
          evs = await base44.entities.Event.filter({ created_by_id: scope.creatorId }, '-created_date', 1000);
          locs = await base44.entities.Location.filter({ created_by_id: scope.creatorId }, '-created_date', 500);
          vehs = await base44.entities.Vehicle.filter({ created_by_id: scope.creatorId }, '-created_date', 500);
          contras = await base44.entities.Contradiction.filter({ created_by_id: scope.creatorId }, '-created_date', 1000);
          ovs = [];
        }
      } else {
        const [d, p, r, f, fp, c, e, l, v, ct, o] = await Promise.all([
          base44.entities.Document.list('-created_date', 500),
          base44.entities.Person.list('-created_date', 1000),
          base44.entities.Relationship.list('-created_date', 1000),
          base44.entities.RedFlag.list('-created_date', 1000),
          base44.entities.FlaggedPassage.list('-created_date', 1000),
          base44.entities.ForensicClaim.list('-created_date', 2000),
          base44.entities.Event.list('-created_date', 1000),
          base44.entities.Location.list('-created_date', 500),
          base44.entities.Vehicle.list('-created_date', 500),
          base44.entities.Contradiction.list('-created_date', 1000),
          base44.entities.IdentityOverride.list('-created_date', 500)
        ]);
        docs = d; ppl = p; rels = r; flags = f; flagged = fp; clms = c; evs = e; locs = l; vehs = v; contras = ct; ovs = o;
      }

      const freshData = sanitizeCasePayload({
        documents: docs || [],
        persons: ppl || [],
        relationships: rels || [],
        redFlags: flags || [],
        flaggedPassages: flagged || [],
        claims: clms || [],
        events: evs || [],
        locations: locs || [],
        vehicles: vehs || [],
        contradictions: contras || [],
        overrides: ovs || []
      });

      const cloudEmpty =
        freshData.documents.length === 0 &&
        freshData.persons.length === 0 &&
        freshData.events.length === 0;

      if (cloudEmpty && !scope?.creatorId) {
        const restored = await loadOfflineSnapshot('Načítané z offline vyšetrovacieho archívu');
        if (restored) return;
      }

      set({
        ...freshData,
        loading: false
      });

      if (freshData.contradictions && freshData.contradictions.length > 0) {
        const hasAlibi = freshData.contradictions.some((c) => c.type === 'alibi' || c.severity === 'high' || c.is_alibi_conflict);
        trackContradictionDetected(freshData.contradictions.length, hasAlibi);
      }

      // Uloženie do offline IndexedDB
      saveCaseOffline('current', freshData);
    } catch (err) {
      console.error('Fetch zlyhal, skúšam načítať z offline cache:', err);
      const restored = await loadOfflineSnapshot('Načítané z offline vyšetrovacieho archívu');
      if (!restored) {
        set({ loading: false });
        get().showToast('Nepodarilo sa načítať dáta prípadu — skúste nahrať spis znova');
      }
    }
  }
}));
