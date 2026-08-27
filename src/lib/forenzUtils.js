// Konverzia časového reťazca "HH:MM" na minúty od polnoci.
export function parseTimeToMinutes(time) {
  if (!time) return null;
  const m = String(time).match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Spustí async funkcie nad poľom položiek s obmedzeným počtom súbežných volaní.
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

export function removeDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Fuzzy porovnanie mien pre cross-case zlúčenie (Jano vs Ján).
export function namesMatch(a, b) {
  const na = removeDiacritics(a);
  const nb = removeDiacritics(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return levenshtein(na, nb) <= 2 && Math.abs(na.length - nb.length) <= 2;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

export const TYPE_COLOR = {
  'podozrivý': '#ef4444',
  'obvinený': '#dc2626',
  'svedok': '#3b82f6',
  'poškodený': '#ea580c',
  'obeť': '#f97316',
  'znalec': '#8b5cf6',
  'alibi': '#22c55e',
  'iná osoba': '#64748b'
};