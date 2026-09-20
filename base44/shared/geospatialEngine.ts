// Geospatiálny a cestovný motor pre ForenzDetectiv.
// Vypočítava vzdialenosti medzi slovenskými a európskymi mestami,
// minimálny potrebný čas na presun a deteguje fyzikálne nemožné alibi.
import haversine from 'npm:haversine-distance@1.2.4';
import { parseTimeToMinutes } from './forenzCore.ts';

export interface GeoLocation {
  lat: number;
  lng: number;
}

// 1. Zoznam kľúčových slovenských miest a okresov s GPS súradnicami
export const SLOVAK_LOCATIONS: Record<string, GeoLocation> = {
  bratislava: { lat: 48.1486, lng: 17.1077 },
  kosice: { lat: 48.7164, lng: 21.2611 },
  presov: { lat: 48.9984, lng: 21.2393 },
  zilina: { lat: 49.2231, lng: 18.7394 },
  banskabystrica: { lat: 48.7363, lng: 19.1462 },
  nitra: { lat: 48.3061, lng: 18.0764 },
  trnava: { lat: 48.3774, lng: 17.5883 },
  trencin: { lat: 48.8945, lng: 18.0444 },
  poprad: { lat: 49.0512, lng: 20.2975 },
  martin: { lat: 49.0645, lng: 18.9221 },
  prievidza: { lat: 48.7718, lng: 18.6253 },
  zvolen: { lat: 48.5763, lng: 19.1278 },
  povazskabystrica: { lat: 49.1215, lng: 18.4419 },
  michalovce: { lat: 48.7554, lng: 21.9195 },
  novezamky: { lat: 47.9854, lng: 18.1611 },
  spisskanovaves: { lat: 48.9439, lng: 20.5678 },
  komarno: { lat: 47.7636, lng: 18.1278 },
  humenne: { lat: 48.9378, lng: 21.9084 },
  levice: { lat: 48.2156, lng: 18.6072 },
  bardejov: { lat: 49.2918, lng: 21.2758 },
  liptovskymikulas: { lat: 49.0806, lng: 19.6167 },
  lucenec: { lat: 48.3328, lng: 19.6672 },
  piestany: { lat: 48.5915, lng: 17.8289 },
  ruzomberok: { lat: 49.0748, lng: 19.3039 },
  topolcany: { lat: 48.5606, lng: 18.1758 },
  trebisov: { lat: 48.6286, lng: 21.7194 },
  cadca: { lat: 49.4386, lng: 18.7903 },
  dubnicanadvahom: { lat: 48.9597, lng: 18.1742 },
  rimavskasobota: { lat: 48.3828, lng: 20.0222 },
  partizanske: { lat: 48.6272, lng: 18.3761 },
  vranovnadtoplou: { lat: 48.8883, lng: 21.6847 },
  dunajskastreda: { lat: 47.9936, lng: 17.6186 },
  sala: { lat: 48.1517, lng: 17.8806 },
  hlohovec: { lat: 48.4319, lng: 17.8031 },
  senica: { lat: 48.6792, lng: 17.3669 },
  pezinok: { lat: 48.2892, lng: 17.2667 },
  banovcenadbebravou: { lat: 48.7189, lng: 18.2583 },
  dolnykubin: { lat: 49.2094, lng: 19.2997 },
  senec: { lat: 48.2197, lng: 17.4003 },
  malacky: { lat: 48.4361, lng: 17.0219 },
  roznava: { lat: 48.6606, lng: 20.5375 },
  brezno: { lat: 48.8044, lng: 19.6364 },
  vieden: { lat: 48.2082, lng: 16.3738 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  praha: { lat: 50.0755, lng: 14.4378 },
  prague: { lat: 50.0755, lng: 14.4378 },
  budapest: { lat: 47.4979, lng: 19.0402 },
  krakov: { lat: 50.0647, lng: 19.9450 }
};

// Normalizácia názvu lokácie pre vyhľadávanie v slovenskej databáze
export function normalizeLocationName(loc: string): string {
  return String(loc || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(v meste|okres|mesto|vo|do|pri|na|v)\s+/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

// Získanie GPS súradníc z názvu lokácie
export function resolveLocationCoords(loc: string): GeoLocation | null {
  const norm = normalizeLocationName(loc);
  if (!norm) return null;

  // 1. Priama zhoda
  if (SLOVAK_LOCATIONS[norm]) {
    return SLOVAK_LOCATIONS[norm];
  }

  // 2. Substring a kmeňová zhoda (Košiciach -> Košice, Žiline -> Žilina, Poprade -> Poprad)
  for (const [key, coords] of Object.entries(SLOVAK_LOCATIONS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return coords;
    }
    const stem = key.length > 5 ? key.slice(0, 5) : key.slice(0, 4);
    if (norm.startsWith(stem) || norm.includes(stem)) {
      return coords;
    }
  }

  return null;
}

// Výpočet vzdialenosti medzi dvoma miestami v kilometroch (Haversine formula)
export function getDistanceBetweenLocationsKm(locA: string, locB: string): number | null {
  const coordsA = resolveLocationCoords(locA);
  const coordsB = resolveLocationCoords(locB);
  if (!coordsA || !coordsB) return null;

  const meters = haversine(
    { latitude: coordsA.lat, longitude: coordsA.lng },
    { latitude: coordsB.lat, longitude: coordsB.lng }
  );

  // Vzdušná vzdialenosť * 1.25 koeficient pre reálnu cestnú sieť
  const roadDistanceKm = Math.round((meters / 1000) * 1.22);
  return roadDistanceKm;
}

// Výpočet minimálneho času jazdy autom (minúty)
export function getMinTravelTimeMinutes(distanceKm: number): number {
  if (distanceKm <= 5) return 8; // Lokálny presun v rámci mesta
  if (distanceKm <= 30) return Math.round((distanceKm / 60) * 60) + 5; // Medzimestská cesta
  // Diaľnica / rýchlostná cesta (priemerná reálna rýchlosť ~95 km/h + 10 min rezerva)
  return Math.round((distanceKm / 95) * 60) + 10;
}

export interface TravelFeasibilityResult {
  isFeasible: boolean;
  distanceKm: number;
  minCarMinutes: number;
  actualDiffMinutes: number;
  severity: 'critical' | 'high' | 'medium' | 'none';
  explanation: string;
}

// Vyhodnotenie uskutočniteľnosti presunu medzi dvoma svedeckými výpoveďami
export function evaluateTravelFeasibility(
  locA: string,
  timeA: string,
  locB: string,
  timeB: string,
  personName: string = 'Osoba'
): TravelFeasibilityResult | null {
  const distanceKm = getDistanceBetweenLocationsKm(locA, locB);
  if (distanceKm === null || distanceKm < 15) return null; // Rovnaké alebo blízke mesto

  const tA = parseTimeToMinutes(timeA);
  const tB = parseTimeToMinutes(timeB);
  if (tA === null || tB === null) return null;

  const actualDiffMinutes = Math.abs(tA - tB);
  const minCarMinutes = getMinTravelTimeMinutes(distanceKm);

  // Ak je časový rozdiel menší ako minimálny čas jazdy
  if (actualDiffMinutes < minCarMinutes) {
    const hours = Math.floor(minCarMinutes / 60);
    const mins = minCarMinutes % 60;
    const timeFormatted = hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;

    const diffHours = Math.floor(actualDiffMinutes / 60);
    const diffMins = actualDiffMinutes % 60;
    const diffFormatted = diffHours > 0 ? `${diffHours} h ${diffMins} min` : `${diffMins} min`;

    const severity: 'critical' | 'high' = actualDiffMinutes < minCarMinutes * 0.5 ? 'critical' : 'high';

    const explanation =
      `Fyzikálne nemožný presun: ${personName} sa podľa výpovedí nachádzal v dvoch rôznych mestách (${locA} @ ${timeA} a ${locB} @ ${timeB}). ` +
      `Cestná vzdialenosť je približne ${distanceKm} km (minimálny čas jazdy autom je ${timeFormatted}), avšak časový rozdiel medzi svedectvami bol iba ${diffFormatted}.`;

    return {
      isFeasible: false,
      distanceKm,
      minCarMinutes,
      actualDiffMinutes,
      severity,
      explanation
    };
  }

  return {
    isFeasible: true,
    distanceKm,
    minCarMinutes,
    actualDiffMinutes,
    severity: 'none',
    explanation: 'Presun je časovo a fyzikálne uskutočniteľný.'
  };
}
