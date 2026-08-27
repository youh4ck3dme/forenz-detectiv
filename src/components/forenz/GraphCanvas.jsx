import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { ZoomIn, ZoomOut, Maximize2, UserPlus, Split, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { parseTimeToMinutes, namesMatch } from '@/lib/forenzUtils';
import { calculateGraphMetrics, classifyRelationship } from '@/lib/graphMetrics';

// Helper pre kreslenie osemuholníka (podozrivý) na Canvas
function drawOctagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Helper pre kreslenie trojuholníka (obeť) na Canvas
function drawTriangle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x - r * 0.92, y + r * 0.6);
  ctx.lineTo(x + r * 0.92, y + r * 0.6);
  ctx.closePath();
}

// Helper pre zaoblený obdĺžnik (alibi & label pill)
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Zlúčenie osôb s aplikovaním manuálnych IdentityOverride (merge/split)
function buildMergedNodes(persons, overrides = []) {
  const safePersons = (persons || []).filter((p) => p && p.id && p.name);
  const safeOverrides = (overrides || []).filter((o) => o && o.override_type);
  const merges = safeOverrides.filter((o) => o.override_type === 'merge');
  const splits = safeOverrides.filter((o) => o.override_type === 'split');

  const parent = {};
  safePersons.forEach((p) => (parent[p.id] = p.id));
  const has = (id) => parent[id] != null;
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    parent[find(a)] = find(b);
  };

  // 1. Explicitné zlúčenia
  merges.forEach((o) => {
    if (has(o.source_person_id) && has(o.target_person_id)) union(o.source_person_id, o.target_person_id);
  });

  // 2. Split páry
  const splitSet = new Set();
  const splitPersons = new Set();
  splits.forEach((o) => {
    if (has(o.source_person_id) && has(o.target_person_id)) {
      splitSet.add(o.source_person_id + '|' + o.target_person_id);
      splitSet.add(o.target_person_id + '|' + o.source_person_id);
    }
    if (has(o.source_person_id)) splitPersons.add(o.source_person_id);
    if (has(o.target_person_id)) splitPersons.add(o.target_person_id);
  });

  // 3. Auto-merge podľa mena
  for (let i = 0; i < safePersons.length; i++) {
    for (let j = i + 1; j < safePersons.length; j++) {
      const a = safePersons[i];
      const b = safePersons[j];
      if (find(a.id) === find(b.id)) continue;
      if (splitSet.has(a.id + '|' + b.id)) continue;
      if (namesMatch(a.name, b.name)) union(a.id, b.id);
    }
  }

  // Master osoba
  const masterByRoot = {};
  merges.forEach((o) => {
    if (has(o.target_person_id)) masterByRoot[find(o.target_person_id)] = o.target_person_id;
  });

  const groupMap = {};
  safePersons.forEach((p) => {
    const root = find(p.id);
    if (!groupMap[root]) groupMap[root] = { id: `mn-${root}`, root, persons: [] };
    groupMap[root].persons.push(p);
  });

  const groups = Object.values(groupMap);
  groups.forEach((g) => {
    const masterId = masterByRoot[g.root] || null;
    const master = g.persons.find((pp) => pp.id === masterId);
    g.masterId = masterId;
    g.manualMerge = !!masterId;
    const primary = master || g.persons[0];
    g.name = primary?.name || 'Neznáma osoba';
    g.type = primary?.type;
    g.manualSplit = g.persons.some((p) => splitPersons.has(p.id));
    g.displayName = g.name;
  });

  // Index pre rovnomenné samostatné uzly
  const nameCount = {};
  groups.forEach((g) => (nameCount[g.name] = (nameCount[g.name] || 0) + 1));
  const nameIdx = {};
  groups.forEach((g) => {
    if (nameCount[g.name] > 1) {
      nameIdx[g.name] = (nameIdx[g.name] || 0) + 1;
      g.displayName = `${g.name} [${nameIdx[g.name]}]`;
    }
  });

  return groups;
}

export default function GraphCanvas({
  persons = [],
  graphEdges = [],
  mergedEdges = [],
  selectedPersonId,
  onSelectPerson,
  selectedEdgeId,
  onSelectEdge,
  _onShowEvidence,
  maxTime,
  timeEnabled,
  activeEdgeId,
  _flaggedPassages = [],
  overrides = [],
  onCreateOverrides,
  readOnly = false
}) {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverId, setHoverId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [multiSel, setMultiSel] = useState(new Set());
  const [dialog, setDialog] = useState(null);

  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== 'light';
  const canEdit = !readOnly && !!onCreateOverrides;

  // Farby podľa témy
  const RING = dark
    ? { 'podozrivý': '#f87171', 'svedok': '#60a5fa', 'alibi': '#38bdf8', 'obeť': '#94a3b8' }
    : { 'podozrivý': '#CE1126', 'svedok': '#003DA5', 'alibi': '#0284c7', 'obeť': '#64748b' };

  const C = dark
    ? { bg: '#0f172a', nodeFill: '#1e293b', edge: 'rgba(96,165,250,0.22)', edgeActive: '#60a5fa', edgeRed: '#f87171', name: '#f1f5f9', label: '#94a3b8', time: '#cbd5e1', pill: '#0f172a', pillStroke: 'rgba(255,255,255,0.15)' }
    : { bg: '#f8fafc', nodeFill: '#ffffff', edge: 'rgba(30,64,175,0.20)', edgeActive: '#1d4ed8', edgeRed: '#dc2626', name: '#0f172a', label: '#475569', time: '#1e40af', pill: '#ffffff', pillStroke: 'rgba(30,64,175,0.18)' };

  // Sledovanie veľkosti kontajnera
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Spracovanie zjednotených dát grafu
  const graphData = useMemo(() => {
    const groups = buildMergedNodes(persons, overrides);
    const personToNode = {};
    groups.forEach((g) => g.persons.forEach((p) => (personToNode[p.id] = g.id)));

    const rawEdges = graphEdges.length ? graphEdges : mergedEdges;
    const links = rawEdges
      .map((e) => {
        const s = personToNode[e.source] || e.source;
        const t = personToNode[e.target] || e.target;
        const rel = classifyRelationship(e);
        return {
          id: e.id,
          source: s,
          target: t,
          label: e.label || '',
          time: e.time || '',
          description: e.description || '',
          document_id: e.document_id,
          document_title: e.document_title,
          rel
        };
      })
      .filter((e) => e.source && e.target && e.source !== e.target);

    const { nodesWithMetrics } = calculateGraphMetrics(groups, links);

    const nodes = nodesWithMetrics.map((g) => ({
      ...g,
      r: 15 + Math.min(18, (g.pageRankScore || 0) * 45 + (g.degree || 0) * 1.5)
    }));

    return { nodes, links };
  }, [persons, graphEdges, mergedEdges, overrides]);

  // Časové filtrovanie (earliest time per node)
  const earliestTimeMap = useMemo(() => {
    const map = {};
    graphData.links.forEach((e) => {
      const t = parseTimeToMinutes(e.time);
      if (t == null) return;
      const sId = typeof e.source === 'object' ? e.source.id : e.source;
      const tId = typeof e.target === 'object' ? e.target.id : e.target;
      [sId, tId].forEach((id) => {
        if (!id) return;
        map[id] = map[id] == null ? t : Math.min(map[id], t);
      });
    });
    return map;
  }, [graphData.links]);

  // Susedia pre focus a hover
  const neighbors = useMemo(() => {
    const nMap = new Map();
    graphData.nodes.forEach((n) => nMap.set(n.id, new Set()));
    graphData.links.forEach((l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (nMap.has(sId)) nMap.get(sId).add(tId);
      if (nMap.has(tId)) nMap.get(tId).add(sId);
    });
    return nMap;
  }, [graphData]);

  // Klávesnica Escape pre zrušenie Focus
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setFocusId(null);
        setMultiSel(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Automatické vycentrovanie grafu pri zmene uzlov
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 40);
      }, 500);
    }
  }, [graphData.nodes.length]);

  // Vlastné renderovanie uzlov na Canvas
  const paintNode = useCallback((node, ctx, globalScale) => {
    const { x, y, r, displayName, type, id, persons: nodePersons, manualMerge, manualSplit } = node;
    const ringColor = RING[type] || '#94a3b8';
    const isSelected = selectedPersonId && nodePersons && nodePersons.some((p) => p.id === selectedPersonId);
    const isFocused = focusId === id;
    const isMulti = multiSel.has(id);
    const isHovered = hoverId === id;

    // Time filter opacity
    let opacity = 1;
    if (timeEnabled && maxTime != null) {
      const nodeTime = earliestTimeMap[id];
      if (nodeTime != null && nodeTime > maxTime) {
        opacity = 0.12;
      }
    }

    // Focus & Hover dimmer
    if (focusId && focusId !== id && !neighbors.get(focusId)?.has(id)) {
      opacity *= 0.15;
    }
    if (hoverId && hoverId !== id && !neighbors.get(hoverId)?.has(id)) {
      opacity *= 0.25;
    }

    ctx.save();
    ctx.globalAlpha = opacity;

    // Vonkajší glow / selekcia
    if (isSelected || isFocused || isMulti || isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = isSelected || isHovered ? (dark ? 'rgba(96,165,250,0.35)' : 'rgba(0,61,165,0.25)') : 'rgba(255,255,255,0.2)';
      ctx.fill();

      if (isFocused || isMulti) {
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = ringColor;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Telo uzla podľa typu
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeStyle = ringColor;
    ctx.fillStyle = C.nodeFill;

    if (type === 'podozrivý') {
      drawOctagon(ctx, x, y, r);
    } else if (type === 'obeť') {
      drawTriangle(ctx, x, y, r);
    } else if (type === 'alibi') {
      drawRoundedRect(ctx, x - r, y - r, 2 * r, 2 * r, 6);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    }

    ctx.fill();
    ctx.stroke();

    // Manuálny Merge / Split odznak (Badge)
    if (manualMerge || manualSplit) {
      const bx = x + r * 0.72;
      const by = y - r * 0.72;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, 2 * Math.PI);
      ctx.fillStyle = manualMerge ? '#6366f1' : '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = C.pill;
      ctx.stroke();
    }

    // Menovka (Label Pill) pod uzlom
    const fontSize = Math.max(10, 12 / Math.sqrt(globalScale));
    ctx.font = `600 ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(displayName).width;
    const pillPadding = 6;
    const pillW = textWidth + pillPadding * 2;
    const pillH = fontSize + 6;
    const pillY = y + r + 4;

    ctx.fillStyle = C.pill;
    ctx.globalAlpha = opacity * 0.9;
    drawRoundedRect(ctx, x - pillW / 2, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = C.pillStroke;
    ctx.stroke();

    ctx.fillStyle = C.name;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.5; ctx.strokeStyle = dark ? "rgba(2,6,23,0.9)" : "rgba(255,255,255,0.9)"; ctx.strokeText(displayName, x, pillY + pillH / 2); ctx.fillText(displayName, x, pillY + pillH / 2);

    ctx.restore();
  }, [RING, C, selectedPersonId, focusId, multiSel, hoverId, timeEnabled, maxTime, earliestTimeMap, neighbors, dark]);

  // Vlastné renderovanie hrán na Canvas (Labels & Bezier)
  const paintLink = useCallback((link, ctx, globalScale) => {
    const s = link.source;
    const t = link.target;
    if (!s || !t || typeof s.x !== 'number' || typeof t.x !== 'number') return;

    const isHovered = hoverId && (s.id === hoverId || t.id === hoverId);
    const isFocused = focusId && (s.id === focusId || t.id === focusId);
    const isActive = selectedEdgeId === link.id || activeEdgeId === link.id;

    let opacity = 0.75;
    if (timeEnabled && maxTime != null && link.time) {
      const linkTime = parseTimeToMinutes(link.time);
      if (linkTime != null && linkTime > maxTime) {
        opacity = 0.08;
      }
    }
    if (focusId && !isFocused) opacity *= 0.1;
    if (hoverId && !isHovered) opacity *= 0.2;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Čiara hrany s farebnou hierarchiou vzťahu
    const relColor = link.rel?.color || C.edge;
    const relWidth = link.rel?.strokeWidth || 1.4;

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = isHovered || isFocused || isActive ? C.edgeActive : relColor;
    ctx.lineWidth = isHovered || isFocused || isActive ? Math.max(relWidth, 2.5) : relWidth;
    ctx.stroke();

    // Textový popis na hrane pri primeranom zoome
    if (globalScale >= 0.75 && (link.label || link.time)) {
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      const fontSize = Math.max(8, 10 / Math.sqrt(globalScale));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      if (link.time) {
        ctx.fillStyle = C.time;
        ctx.fillText(link.time, midX, midY - 3);
      }
      if (link.label) {
        ctx.fillStyle = C.label;
        ctx.fillText(link.label, midX, midY + fontSize + 2);
      }
    }

    ctx.restore();
  }, [hoverId, focusId, selectedEdgeId, activeEdgeId, timeEnabled, maxTime, C]);

  // Ovládanie Zoomu
  const handleZoomIn = () => {
    if (!fgRef.current) return;
    const currentZoom = fgRef.current.zoom();
    fgRef.current.zoom(currentZoom * 1.3, 300);
  };
  const handleZoomOut = () => {
    if (!fgRef.current) return;
    const currentZoom = fgRef.current.zoom();
    fgRef.current.zoom(currentZoom / 1.3, 300);
  };
  const handleZoomFit = () => {
    if (!fgRef.current) return;
    fgRef.current.zoomToFit(400, 40);
  };

  // Multi-selekcia
  const toggleMulti = (id) => {
    setMultiSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleNodeClick = (node, event) => {
    if (event && (event.shiftKey || event.ctrlKey) && canEdit) {
      toggleMulti(node.id);
      return;
    }
    setFocusId((prev) => (prev === node.id ? null : node.id));
    setMultiSel(new Set());
    if (node.persons && node.persons.length && onSelectPerson) {
      onSelectPerson(node.persons[0]);
    }
  };

  // Merge / Split Action bar
  const selGroups = [...multiSel].map((id) => graphData.nodes.find((g) => g.id === id)).filter(Boolean);
  const canMerge = canEdit && selGroups.length >= 2;
  const splitGroup = canEdit && selGroups.length === 1 && selGroups[0].persons?.length > 1 ? selGroups[0] : null;
  const showBar = canMerge || !!splitGroup;

  const openMerge = () => setDialog({ mode: 'merge', groups: selGroups, masterId: selGroups[0].id, note: '' });
  const openSplit = () => setDialog({ mode: 'split', groups: [splitGroup], note: '' });

  const handleConfirm = () => {
    if (!dialog) return;
    if (dialog.mode === 'merge') {
      const master = dialog.groups.find((g) => g.id === dialog.masterId);
      if (!master) return;
      const masterAnchor = master.masterId || master.persons[0].id;
      const payloads = dialog.groups
        .filter((g) => g.id !== dialog.masterId)
        .map((g) => ({
          source_person_id: g.masterId || g.persons[0].id,
          target_person_id: masterAnchor,
          override_type: 'merge',
          note: dialog.note || ''
        }));
      onCreateOverrides(payloads);
    } else {
      const ps = dialog.groups[0].persons;
      const payloads = [];
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          payloads.push({ source_person_id: ps[i].id, target_person_id: ps[j].id, override_type: 'split', note: dialog.note || '' });
        }
      }
      onCreateOverrides(payloads);
    }
    setDialog(null);
    setMultiSel(new Set());
  };

  if (!graphData.nodes.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl text-blue-400 min-h-0 m-2">
        <div className="text-center px-6">
          <div className="text-base text-slate-200 font-semibold">Žiadne osoby na zobrazenie v grafe</div>
          <div className="text-xs mt-1 text-slate-400">Naskenujte alebo nahrajte výpoveď pre vytvorenie interaktívneho pavúka vzťahov.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-0 w-full h-full"
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#090d16"
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={paintLink}
        linkCanvasObjectMode={() => 'replace'}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleColor={() => '#60a5fa'}
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => setHoverId(node ? node.id : null)}
        onLinkClick={(link) => onSelectEdge && onSelectEdge(link)}
        onBackgroundClick={() => {
          setFocusId(null);
          setMultiSel(new Set());
        }}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
      />

      {/* Ovládacie tlačidlá Zoomu */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-400 border border-slate-800 flex items-center justify-center shadow-md transition-all"
          title="Priblížiť"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-400 border border-slate-800 flex items-center justify-center shadow-md transition-all"
          title="Oddialiť"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomFit}
          className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-400 border border-slate-800 flex items-center justify-center shadow-md transition-all"
          title="Vycentrovať graf"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legenda typov osôb */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-xs px-3.5 py-2 rounded-xl bg-slate-900/95 border border-slate-800 shadow-md z-20 text-slate-300">
        <Legend color="#f87171" label="Podozrivý" shape="oct" />
        <Legend color="#60a5fa" label="Svedok" shape="circle" />
        <Legend color="#94a3b8" label="Obeť" shape="tri" />
        <Legend color="#38bdf8" label="Alibi" shape="square" />
      </div>

      {/* Focus Mode info */}
      {focusId && (
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-blue-400 shadow-md z-20">
          Focus Mode — stlačte <strong>Esc</strong> pre zrušenie
        </div>
      )}

      {/* Floating Action Bar — zlúčiť / rozdeliť identity */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-3xl liquid-glass-panel shadow-glass-lg"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400 pl-1 font-medium">{multiSel.size} vybraných</span>
            {canMerge && (
              <button
                onClick={openMerge}
                className="liquid-glass-btn liquid-glass-btn-primary"
              >
                <UserPlus className="w-4 h-4" />
                Zlúčiť identity
              </button>
            )}
            {splitGroup && (
              <button
                onClick={openSplit}
                className="liquid-glass-btn liquid-glass-btn-red"
              >
                <Split className="w-4 h-4" />
                Rozdeliť identity
              </button>
            )}
            <button
              onClick={() => setMultiSel(new Set())}
              className="w-9 h-9 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              title="Zrušiť výber"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge / Split confirm dialog */}
      <AlertDialog open={!!dialog} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.mode === 'merge' ? 'Zlúčiť identity' : 'Rozdeliť identity'}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.mode === 'merge'
                ? 'Vyberte hlavnú osobu — jej meno zostane a všetky hrany sa zbehnú do jedného uzla.'
                : 'Tieto rovnomenné osoby sa prestanú automaticky zlučovať a zobrazia sa ako samostatné uzly s indexom.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dialog?.mode === 'merge' && (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {dialog.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setDialog((d) => ({ ...d, masterId: g.id }))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border text-left transition-colors ${
                    dialog.masterId === g.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${dialog.masterId === g.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`} />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{g.displayName}</span>
                  <span className="ml-auto text-[10px] text-slate-400">{g.persons.length} os.</span>
                </button>
              ))}
            </div>
          )}

          {dialog?.mode === 'split' && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {dialog.groups[0].persons.map((p) => (
                <div key={p.id} className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100">
                  {p.name}
                  {p.document_title && <span className="text-[10px] text-slate-400 ml-2">({p.document_title})</span>}
                </div>
              ))}
            </div>
          )}

          <input
            value={dialog?.note || ''}
            onChange={(e) => setDialog((d) => ({ ...d, note: e.target.value }))}
            placeholder="Dôvod (voliteľné)"
            className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-indigo-500"
          />

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={dialog?.mode === 'merge' && !dialog?.masterId}
              className="rounded-2xl"
            >
              Potvrdiť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Legend({ color, label, shape }) {
  let icon;
  if (shape === 'circle') {
    icon = <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />;
  } else if (shape === 'square') {
    icon = <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: color }} />;
  } else if (shape === 'tri') {
    icon = <span className="w-0 h-0 shrink-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `8px solid ${color}` }} />;
  } else {
    icon = <span className="w-3 h-3 rounded-[2px] shrink-0" style={{ background: color }} />;
  }
  return (
    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
      {icon}
      <span>{label}</span>
    </div>
  );
}
