import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveLocationCoords } from '../../../base44/shared/geospatialEngine.ts';
import { MapPin, AlertTriangle, Filter } from 'lucide-react';
import { trackAlibiChecked } from '@/lib/analytics';
import { useAuditStore } from '@/store/useAuditStore';
import AlibiImpossibleShareCard from './AlibiImpossibleShareCard';

const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid #020617;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
      ">
        ${label || '•'}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16]
  });
};

export default function MapView({
  locations = [],
  claims = [],
  contradictions = [],
  persons = [],
  className = ''
}) {
  const [selectedPersonFilter, setSelectedPersonFilter] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState(null);

  const safeLocations = useMemo(
    () => (locations || []).filter((loc) => loc && (loc.name || loc.address)),
    [locations]
  );
  const safeClaims = useMemo(
    () => (claims || []).filter((c) => c && c.id),
    [claims]
  );
  const safeContradictions = useMemo(
    () => (contradictions || []).filter((c) => c && c.id),
    [contradictions]
  );
  const safePersons = useMemo(
    () => (persons || []).filter((p) => p && p.name),
    [persons]
  );

  const mapPoints = useMemo(() => {
    const points = [];
    const seen = new Set();

    safeLocations.forEach((loc) => {
      const label = (loc.name || loc.address || '').trim();
      const coords = resolveLocationCoords(label);
      if (coords && label && !seen.has(label)) {
        seen.add(label);
        points.push({
          id: loc.id || label,
          name: label,
          address: loc.address,
          lat: coords.lat,
          lng: coords.lng,
          type: 'location',
          color: '#3b82f6'
        });
      }
    });

    safeClaims.forEach((c) => {
      const claimLocation = (c.location || '').trim();
      if (claimLocation && !seen.has(claimLocation)) {
        const coords = resolveLocationCoords(claimLocation);
        if (coords) {
          seen.add(claimLocation);
          points.push({
            id: c.id,
            name: claimLocation,
            subject: c.subject,
            time: c.event_time,
            lat: coords.lat,
            lng: coords.lng,
            type: 'claim',
            color: '#10b981'
          });
        }
      }
    });

    return points;
  }, [safeLocations, safeClaims]);

  const impossibleRoutes = useMemo(() => {
    const routes = [];
    safeContradictions
      .filter((c) => c.type === 'geospatial_impossible_travel' || c.type === 'geografická_nesúlad' || c.type === 'Geograficky nemožné alibi')
      .forEach((c) => {
        const claimA = safeClaims.find((cl) => cl.id === c.claim_a_id);
        const claimB = safeClaims.find((cl) => cl.id === c.claim_b_id);
        const locA = c.locationA || c.locA || claimA?.location;
        const locB = c.locationB || c.locB || claimB?.location;

        if (locA && locB) {
          const coordsA = resolveLocationCoords(locA);
          const coordsB = resolveLocationCoords(locB);
          if (coordsA && coordsB) {
            routes.push({
              id: c.id,
              positions: [
                [coordsA.lat, coordsA.lng],
                [coordsB.lat, coordsB.lng]
              ],
              explanation: c.explanation || c.description,
              subject: c.person || c.entity_ref || claimA?.subject || 'Podozrivá osoba',
              speedKmh: c.requiredSpeedKmH || c.speed_kmh || 0,
              distanceKm: c.distanceKm || c.distance_km || 0
            });
          }
        }
      });
    return routes;
  }, [safeContradictions, safeClaims]);

  const trackedAlibiRef = useRef(false);
  useEffect(() => {
    if (trackedAlibiRef.current || impossibleRoutes.length === 0) return;
    trackedAlibiRef.current = true;
    const first = impossibleRoutes[0];
    trackAlibiChecked('impossible', first.speedKmh || 0, first.distanceKm || 0);
    useAuditStore.getState().logAction('CONTRADICTION_FLAGGED', {
      type: 'alibi_impossible',
      count: impossibleRoutes.length
    });
  }, [impossibleRoutes]);

  // Všetci unikátni aktéri s trasou
  const subjectsWithRoutes = useMemo(() => {
    const subs = new Set();
    impossibleRoutes.forEach((r) => {
      if (r.subject) subs.add(r.subject);
    });
    return Array.from(subs);
  }, [impossibleRoutes]);

  const filteredRoutes = useMemo(() => {
    if (selectedPersonFilter === 'ALL') return impossibleRoutes;
    return impossibleRoutes.filter((r) => r.subject === selectedPersonFilter);
  }, [impossibleRoutes, selectedPersonFilter]);

  const defaultCenter = [48.7363, 19.1462];

  return (
    <div className={`w-full h-full relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl flex flex-col ${className}`}>
      {/* Horná info lišta mapy */}
      <div className="px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-900">Geografická mapa vyšetrovania & Alibi</h3>
        </div>

        {/* Person Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {subjectsWithRoutes.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
              <Filter className="w-3 h-3 text-slate-400" />
              <button
                type="button"
                onClick={() => setSelectedPersonFilter('ALL')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  selectedPersonFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                Všetky trasy
              </button>
              {subjectsWithRoutes.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedPersonFilter(sub)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    selectedPersonFilter === sub ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          <span className="flex items-center gap-1.5 text-blue-400 font-medium bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {mapPoints.length} lokalít
          </span>
          {impossibleRoutes.length > 0 && (
            <span className="flex items-center gap-1.5 text-red-400 font-semibold bg-red-950/60 px-2 py-0.5 rounded-lg border border-red-800">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> {filteredRoutes.length} nemožných presunov
            </span>
          )}
        </div>
      </div>

      {/* Alibi Impossible Share Card Modal */}
      {selectedRoute && (
        <AlibiImpossibleShareCard
          routes={[selectedRoute]}
          persons={safePersons}
          onClose={() => setSelectedRoute(null)}
        />
      )}

      {/* Map Container s tmavou témou */}
      <div className="flex-1 w-full h-full min-h-[360px] relative z-0 bg-white">
        <MapContainer
          center={defaultCenter}
          zoom={7}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', minHeight: '360px', background: '#020617' }}
          className="map-dark-tiles"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {mapPoints.map((pt) => (
            <Marker
              key={pt.id}
              position={[pt.lat, pt.lng]}
              icon={createCustomIcon(pt.color, (pt.name || '—').slice(0, 2).toUpperCase())}
            >
              <Popup>
                <div className="p-1 min-w-[140px] text-slate-900 font-sans">
                  <h4 className="font-bold text-sm">{pt.name}</h4>
                  {pt.address && <p className="text-xs text-slate-600 mt-0.5">{pt.address}</p>}
                  {pt.subject && (
                    <p className="text-xs text-blue-700 font-medium mt-1">
                      Osoba: {pt.subject} {pt.time ? `(${pt.time})` : ''}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {filteredRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.positions}
              pathOptions={{
                color: '#ef4444',
                weight: 4,
                dashArray: '6, 8',
                opacity: 0.9
              }}
              eventHandlers={{
                click: () => setSelectedRoute(route)
              }}
            >
              <Popup>
                <div className="p-2 max-w-xs text-slate-900 font-sans">
                  <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs mb-1">
                    <AlertTriangle className="w-4 h-4" /> Nemožné alibi: {route.subject}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{route.explanation}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoute(route);
                    }}
                    className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Zobraziť detail
                  </button>
                </div>
              </Popup>
            </Polyline>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
