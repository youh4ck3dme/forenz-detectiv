# ForenzDetectiv

Inteligentný nástroj na analýzu vyšetrovacích spisov. Pomocou AI (Mistral Pixtral-12B) transformuje písomné výpovede svedkov na prehľadné vizuálne grafy vzťahov, časové osi a detekuje rozpory naprieč dokumentmi — pre efektívnejšie odhaľovanie súvislostí v kriminálnych prípadoch.

Postavené na platforme **Base44** (backend-as-a-service: auth, databáza, integrácie, hosting) s frontendom v **React + Tailwind CSS + shadcn/ui**.

---

## Obsah

1. [Prehľad funkcií](#prehľad-funkcií)
2. [Štruktúra projektu](#štruktúra-projektu)
3. [Setup & spustenie](#setup--spustenie)
4. [Backend](#backend)
5. [AI pipeline](#ai-pipeline)
6. [Entitná schéma](#entitná-schéma)
7. [Bezpečnosť & RLS](#bezpečnosť--rls)
8. [Workflow automatizácie](#workflow-automatizácie)
9. [Frontend](#frontend)
10. [Zdieľanie prípadov](#zdieľanie-prípadov)
11. [MCP integrácia](#mcp-integrácia)

---

## Prehľad funkcií

- **Nahrávanie & spracovanie výpovedí** — jednotlivé aj hromadné (až 100 dokumentov naraz), s PWA prístupom ku kamere pre skenovanie.
- **AI extrakcia** — z obrázku výpovede sa extrahujú osoby, vzťahy, tvrdenia (claims), udalosti, lokality, vozidlá, varovania a varovné pasáže — každé s presným citátom (`source_quote`).
- **Geospatiálna detekcia nemožného alibi** — GPS databáza slovenských miest a Haversine engine overuje fyzikálnu realizovateľnosť presunu medzi výpoveďami (napr. Bratislava $\leftrightarrow$ Košice za 40 minút).
- **Interaktívny graf vzťahov & PageRank** — 2D Canvas silový graf s dynamickým výpočtom PageRank centrality pre detekciu kľúčových organizátorov a farebnou hierarchiou väzieb.
- **Kartotéka (Digitálna kartotéka)** — detailný prehľad dokumentu so všetkými extrahovanými entitami.
- **Cross-document rozpory** — algoritmus porovnáva tvrdenia naprieč dokumentmi a hľadá logické rozpory (čas, miesto, identita, faktá).
- **Sherlock AI chat** — asistent, ktorý odpovedá na otázky nad dátami prípadu (RAG nad entitami).
- **Zustand State Management & Offline IndexedDB** — centralizovaný reaktívny store s offline ukladaním prípadov v teréne.
- **1-tip onboarding** — `QuickTip` pri prvom behu; plný `WelcomeIntroModal` len cez drawer „Sprievodca“ (neblokuje start). Primárny CTA je nahratie reálneho spisu — **žiadny produkčný demo spis**.
- **Liquid Glass Design System** — moderná frosted glass estetika, 3D hĺbka, neon-glow indikátory a vstavaný Dark/Light theme toggle.
- **Automatizovaná testovacia sada** — 23 integritných testov backendu (`npm test`) a 16 UI testov cez Vitest (`npm run test:vitest`, scope `tests/components/`).
- **PDF export** — oficiálny vyšetrovací protokol s tabuľkou osôb, červenými vlajkami a grafom.

---

## Štruktúra projektu

```
├── base44/
│   ├── entities/           # Databázové entity (JSONC schémy: Document, Person, Relationship, Contradiction...)
│   ├── functions/          # Backend funkcie (Deno runtime)
│   │   ├── analyzeDocument/
│   │   ├── detectContradictions/
│   │   ├── generateExpertSummary/
│   │   ├── loadSharedCase/
│   │   ├── recoverStuckDocuments/
│   │   └── sherlockChat/
│   ├── shared/             # Zdieľaná logika naprieč backendom
│   │   ├── forenzCore.ts         # Zdieľané primitívy (časové konverzie, diakritika, Levenshtein)
│   │   ├── geospatialEngine.ts   # GPS databáza SR miest + Haversine cestná kalkulácia
│   │   ├── contradictionEngine.ts # Detekcia rozporov v alibi a čase naprieč spismi
│   │   ├── aiValidation.ts       # Zod validácia & ochrana proti prompt injection
│   │   ├── analyzeCore.ts        # Jadro AI analýzy (timeout, retry, idempotencia)
│   │   └── rateLimit.ts          # Per-user rate limiting
│   ├── workflows/          # Automatizované procesy (Recovery Sweep.jsonc)
│   └── mcp/                # MCP konfigurácia pre AI agentov
├── android/                # TWA scaffolding (twa-manifest.json) — pozri docs/TWA_SETUP.md
├── docs/                   # TWA, Stripe, Looker, Ads, ASO
├── public/
│   ├── manifest.json       # PWA Web App Manifest (PNG 192/512 + SVG)
│   ├── icons/              # icon-192.png, icon-512.png
│   ├── .well-known/        # Digital Asset Links (assetlinks.json)
│   ├── sw.js               # Offline Service Worker
│   └── icon.svg            # Vektorová ikona aplikácie
├── src/
│   ├── api/base44Client.js # Base44 SDK klient
│   ├── components/
│   │   ├── forenz/         # Forenzné komponenty (GraphCanvas, MapView, CameraScanner, EventTimeline, WelcomeIntroModal...)
│   │   └── ui/             # Liquid Glass UI komponenty (Button, Card, Modal, Input, Tooltip, Spinner, ThemeToggle)
│   ├── store/              # useForenzStore.js (Zustand stavový manažment)
│   ├── hooks/              # use-mobile, use-size
│   ├── lib/                # camera.js, graphMetrics.js, offlineDb.js, pdfExporter.js, ocrProcessor.js
│   ├── pages/              # ForenzDetectiv, Dashboard, Login, Register, SharedCase...
│   ├── App.jsx             # Hlavný router s ThemeProviderom a PWA
│   └── index.css           # Liquid Glass Design Tokens & utility triedy
├── tests/
│   ├── integrity.test.js   # 21 testov integrity backendu a rozporov
│   ├── geospatialEngine.test.js # Testy alibi kalkulácie
│   └── components/         # Vitest UI testy (EventTimeline, WelcomeIntroModal)
└── package.json
```

---

## Setup & spustenie

### Inštalácia závislostí
```bash
npm install
```

### Spustenie vývoja (Base44 — backend aj frontend naraz)
```bash
base44 dev
```

### Frontend-only (Vite)
```bash
npm run dev
```

**HMR:** otváraj appku na [http://127.0.0.1:5173/](http://127.0.0.1:5173/) (nie `localhost`). Vite je viazaný na IPv4 `127.0.0.1` so `strictPort`, aby WebSocket HMR bol stabilný.

### Environment (voliteľné)
Skopíruj [`.env.example`](.env.example) → `.env.local`:

| Premenná | Účel |
|----------|------|
| `VITE_SENTRY_DSN` | Error tracking (silent fallback bez DSN) |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Product analytics EU |
| `VITE_STRIPE_PUBLIC_KEY` | Live Stripe Checkout; bez kľúča = fail-closed (žiadny checkout, žiadny lokálny upgrade) |

### Upload-first produkcia
- Produkt **neobsahuje** demo/synthetic case (žiadne BA–KE CTA, žiadne `VITE_ENABLE_DEMO`).
- Primárny tok je vždy **upload → chunk → AI analýza → rozpory**.
- Stripe je **fail-closed**: bez publishable key na fronte a `STRIPE_SECRET_KEY` na Base44 backende checkout zlyhá — žiadny mock checkout ani klientsky upgrade pred platbou.

### Spustenie testov & Kontrola kvality
```bash
# Lokálny CI gate (zdroj pravdy; GitHub Actions môže byť zablokovaný billingom)
npm test && npm run lint && npm run typecheck && npm run build

# UI testy (Vitest)
npm run test:vitest
```

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (test → lint → typecheck → build).

### API kľúč
V Base44 dashboarde alebo cez CLI pridaj tajný kľúč pre Mistral AI:
```bash
base44 secret set MISTRAL_API_KEY your_key_here
```

> Povinný backend secret: `MISTRAL_API_KEY`. Frontend env vyššie sú voliteľné.

### Onboarding & docs
- First-run UX = 1 tip (`QuickTip`); plný sprievodca je v draweri (neblokuje start).
- Remaining ops backlog (RB-01..07): [`docs/REMAINING_BACKLOG.md`](docs/REMAINING_BACKLOG.md)
- Master E2E (12 scenárov): [`docs/E2E_MASTER_SPEC.md`](docs/E2E_MASTER_SPEC.md) — `npm run test:e2e`
- TWA / Play: [`docs/TWA_SETUP.md`](docs/TWA_SETUP.md)
- Stripe: [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md)
- Analytics → Looker: [`docs/LOOKER_POSTHOG.md`](docs/LOOKER_POSTHOG.md)
- Google Ads UTM: [`docs/GOOGLE_ADS.md`](docs/GOOGLE_ADS.md)

---

## Backend

Backend funkcie bežia v Deno runtime (`base44/functions/<name>/entry.ts`) a komunikujú cez Base44 SDK. Zdieľaná logika, ktorú používa viac ako jedna funkcia, je v `base44/shared/` — nikdy sa nesmie kopírovať medzi funkciami.

### Funkcie

| Funkcia | Účel | Kontext |
|---|---|---|
| `analyzeDocument` | Spustí AI analýzu jedného dokumentu. Ownership check + per-user rate limit (100 / 15 min). | User context |
| `detectContradictions` | Manuálne spustenie cross-document detekcie rozporov pre prihláseného používateľa. | User context |
| `loadSharedCase` | Načíta dáta zdieľaného prípadu podľa tokenu (obchádza RLS cez service role, striktná validácia tokenu a expirácie). | User context (RLS bypass) |
| `recoverStuckDocuments` | Recovery sweep — nájde zaseknuté (analyzing > 4 min) a 429-pending dokumenty a znova ich analyzuje alebo označí error. Admin-only auth gate. | Service role |
| `sherlockChat` | AI odpoveď na otázku nad kontextom prípadu (RAG). | User context |

### Zdieľané moduly

- **`analyzeCore.ts`** — jadro AI analýzy: fetch obrázku, volanie Mistralu s timeoutom (60s), retry s exponenciálnym backoffom, idempotentný delete-and-replace entít, štruktúrované logovanie. Používa sa v `analyzeDocument` aj `recoverStuckDocuments`.
- **`aiValidation.ts`** — validácia a normalizácia AI výstupu do entitných schém.
- **`contradictionEngine.ts`** — porovnávanie `ForensicClaim` naprieč dokumentmi toho istého používateľa; deteguje časové, miestne, identitné a faktické rozpory → `Contradiction`.
- **`rateLimit.ts`** — per-user fixné-okno rate limiting (`checkRate`).

---

## AI pipeline

### Post-upload tok (produkcia)
1. **Kontrola veľkosti** — max 50 MB (`validateUploadSize` / `documentPipeline.js`).
2. **Príprava** — obrázky normalizácia (`prepareFileForUpload`); text pass-through.
3. **PDF page-chunking** — multi-page PDF sa client-side (pdf.js) renderuje po stránkach na JPEG (max 40 strán, concurrency 1 na mobile / 2 na desktope). Vznikne `pdf_container` + `pdf_page` Documents (`parent_document_id`, `page_number`). Jednostránkové PDF → jedna JPEG Document bez kontajnera.
4. **Upload** — `UploadFile` → `Document.create(status: pending)` pre každú analytickú jednotku.
5. **AI analýza** — `analyzeDocument` / `runAnalysis` (Pixtral) → zápis entít (iba stránky / obrázky, nie PDF blob).
6. **Rozpory** — `runContradictionDetection` naprieč dokumentmi používateľa.

`PDF_PAGE_CHUNKING_IMPLEMENTED = true` (`src/lib/documentPipeline.js`, `src/lib/pdfPageChunker.js`). **Ops:** po zmene schémy musíš publishnúť Base44 `Document` (`base44 login` → `base44 entities push`), inak produkcia odmietne `parent_document_id` / `page_number` / `page_count` / `source_kind`.

### Model
- **Mistral Pixtral-12B** (`pixtral-12b-2409`) — multimodálny, spracováva obrázok výpovede.
- `temperature: 0`, `response_format: { type: "json_object" }` pre deterministický štruktúrovaný výstup.

### Stavový automat dokumentu
```
pending → analyzing → done
                     ↘ error
                     ↘ pending (pri 429, s next_retry_at)
```

### Robustnosť pipeline
- **Timeout**: 60s pre jedno AI volanie, 20s pre fetch obrázku.
- **Retry s exponenciálnym backoffom**: max 3 pokusy, backoff 3s → 15s s jitterom. Pri 429 rešpektuje `retry-after` hlavičku.
- **Idempotencia**: `runAnalysis()` na začiatku znovu načíta dokument z DB; ak už beží aktívny job (`analyzing` + `processing_job_id` + mladší ako `AI_TIMEOUT_MS`), vráti `already_in_progress`. Delete-and-replace entít prebehne až po úspešnom parsovaní — pri zlyhaní Mistralu staré dáta zostanú neporušené.
- **429 handling**: ak Mistral vráti 429 aj po vyčerpaní retry, dokument sa prestaví na `status=pending` s `next_retry_at` (retry-after alebo fallback 5 min). Recovery Sweep ho automaticky spracuje pri najbližšom behu.
- **Memory management (bulk)**: pri hromadnom nahrávaní sa `base64` a `outFile` explicitne nullujú po uploade, aby GC uvoľnil pamäť — pre 100 dokumentov to bráni pádu prehliadača.

### Audit logovanie
`analyzeCore.ts` produkuje štruktúrované JSON logy pre každý krok:
`analysis_start`, `ai_ok`, `ai_fail`, `ai_backoff`, `entity_write_start`, `entity_write_done`, `retry_scheduled`, `analysis_done`, `analysis_error`, `already_in_progress`, `contradiction_error`.

---

## Entitná schéma

Každá entita má vstavané polia: `id`, `created_date`, `updated_date`, `created_by_id`.

| Entita | Účel | Kľúčové polia |
|---|---|---|
| **Document** | Výpoveď — obrázok + stav spracovania + metadáta | `title`, `image_url`, `status` (pending/analyzing/done/error), `attempt_count`, `last_error`, `next_retry_at`, `processing_job_id`, počítadlá |
| **Person** | Osoba z výpovede | `name`, `type` (podozrivý/svedok/obeť/alibi), `details`, `document_id` |
| **Relationship** | Vzťah medzi osobami | `source_name`, `target_name`, `label`, `time`, `description`, `document_id` |
| **RedFlag** | Varovanie / nezrovnalosť | `description`, `category` (časová_nesúlad/chýbajúce_info/lingvistika/rozpor/iné) |
| **FlaggedPassage** | Citát pasáže signalizujúcej neistotu/rozpor | `text` (presný citát), `category` (neistota/rozpor), `explanation` |
| **ForensicClaim** | Atomické tvrdenie (subject-predicate-object) | `subject`, `predicate`, `object`, `event_date`, `event_time`, `approximate_time`, `time_start/end`, `location`, `source_quote`, `confidence` |
| **Event** | Udalosť | `title`, `type`, `persons[]`, `date`, `time`, `location`, `source_quote`, `confidence` |
| **Location** | Miesto | `name`, `address`, `source_quote`, `confidence` |
| **Vehicle** | Vozidlo | `type`, `brand_model`, `color`, `license_plate`, `owner_name`, `source_quote`, `confidence` |
| **Contradiction** | Rozpor medzi dvoma tvrdeniami | `claim_a_id`, `claim_b_id`, `document_a_id`, `document_b_id`, `entity_ref`, `type`, `severity`, `status` (possible/confirmed/dismissed), `explanation` |
| **SharedCase** | Zdieľaný prípad — token + expirácia | `token`, `document_id`, `expires_at`, `revoked_at`, `created_by`, `created_by_name` |
| **RateLimit** | Fixné-okno počítadlo (admin-only) | `key`, `window`, `count` |
| **User** | Vstavaná entita | `email`, `full_name`, `role` (admin/user) |

> Pravidlá AI extrakcie: každé tvrdenie, udalosť, lokalita a vozidlo **musí** obsahovať `source_quote` — presný doslovný citát zo zdrojovej výpovede. AI nesmie vymýšľať dáta, ktoré dokument neobsahuje.

---

## Bezpečnosť & RLS

### Row-Level Security (per entita)
Všetky forenzné entity (`Document`, `Person`, `Relationship`, `RedFlag`, `FlaggedPassage`, `ForensicClaim`, `Event`, `Location`, `Vehicle`, `Contradiction`, `SharedCase`) majú RLS nastavené na `created_by_id === {{user.id}}` pre read/update/delete — **používateľ vidí a modifikuje len svoje vlastné dáta**. `RateLimit` je admin-only (cez `user_condition: { role: "admin" }`).

### Server-side vynútenie
- **Ownership check**: `analyzeDocument` overuje, že `doc.created_by_id === user.id` pred spustením analýzy (nie len klientska validácia).
- **Auth gate**: `recoverStuckDocuments` volá `base44.auth.me()` a zamietne non-admin volania (401/403) — scheduled sweep beží s admin identitou, takže je preň priepustný.
- **Idempotencia guard**: bráni race condition pri súbežných volaniach analýzy toho istého dokumentu.
- **Rate limiting**: `checkRate` obmedzuje 100 analýz / 15 min per používateľ + rešpektuje Mistral API limity (429 → `next_retry_at`).

### Zdieľanie
`loadSharedCase` obchádza RLS cez service role, ale vynucuje: platný kryptografický token, nezaniknutý (`revoked_at`), neexpirovaný (`expires_at`). Inak vracia 401/403.

---

## Workflow automatizácie

### Recovery Sweep (`base44/workflows/Recovery Sweep.jsonc`)
Scheduled workflow bežiaci každých 5 minút, ktorý volá `recoverStuckDocuments`:
1. Nájde dokumenty zaseknuté v `analyzing` > 4 min (normálna analýza + retry < 190s).
2. Nájde dokumenty v `pending` s `next_retry_at <= now` (429 retry fronta).
3. Pre každý (spoločný CAP 5 dok./beh) — ak `attempt_count >= 3`, označí `error`; inak re-analyzuje cez `runAnalysis`.

---

## Frontend

### Stack
- React 18 + Vite (ESM), Tailwind CSS, shadcn/ui, lucide-react.
- `@tanstack/react-query` (data fetching), `recharts` (dashboard), `jsPDF` (PDF export), `react-leaflet` (mapy), `framer-motion`, `three.js`, `@hello-pangea/dnd`, `react-quill-new`, `react-markdown`.

### Hlavné komponenty (`src/components/forenz/`)
- **GraphCanvas** — vlastná SVG force-directed vizualizácia s drag/zoom, časovou osou a replay.
- **ArchiveView / ArchiveFilmstrip / ArchiveViewer / ArchiveMetaPanel** — digitálna kartotéka s obojsmerným linkingom dokumentov a entít.
- **SherlockChat** — AI chat s lokálnou rýchlov odpoveďou pre jednoduché otázky a LLM pre komplexné.
- **DocumentList, PersonPanel, RedFlagsPanel, TimeSlider, StatsBar** — bočné panely a ovládacie prvky.
- **MobileDrawer, MobileBottomNav, MobileDashboard** — mobilné rozhranie (Liquid Glass, backdrop-blur-xl).

### Stránky (`src/pages/`)
- `ForenzDetectiv` — hlavná stránka, orchestrácia dokumentov / grafu / archívu.
- `Dashboard` — štatistiky (Recharts).
- `SharedCase` — verejné zobrazenie zdieľaného prípadu (len na čítanie).
- `Login / Register / ForgotPassword / ResetPassword / OAuthConsent` — auth toky (email+heslo, Google OAuth, OTP).

### Routing & auth
`src/App.jsx` obsahuje `<AuthProvider>`, `<QueryClientProvider>`, `<Router>`. Authentifikované stránky sú chránené cez `<ProtectedRoute>` (layout route s `<Outlet />`). Auth stránky používajú hard redirect (`window.location.href`) podľa platformových konvencií.

### Design tokeny
`src/index.css` vlastní tokeny (`:root` + `.dark`), `tailwind.config.js` ich mapuje na Tailwind triedy. V JSX sa používajú mapované triedy (`bg-primary`, `font-body`), žiadne hardcoded hodnoty.

---

## Zdieľanie prípadov

1. Používateľ klikne „Zdieľať“ → vygeneruje sa kryptograficky náhodný 24-bajtový token, vytvorí sa `SharedCase` s `expires_at` (+7 dní).
2. Link `${origin}/shared/${token}` sa skopíruje do schránky.
3. Verejná stránka `SharedCase` volá `loadSharedCase`, ktorý validuje token, expiráciu a revokáciu, potom načíta dokumenty/osoby/vzťahy cez service role.
4. Zdieľané zobrazenie je `readOnly` — bez tlačidiel na úpravu/scan.
5. Pôvodný používateľ môže link kedykoľvek zneplatniť (`revoked_at`).

---

## MCP integrácia

`base44/mcp/config.json` sprístupňuje vybrané backend funkcie (`analyzeDocument`, `sherlockChat`) externým AI klientom (ChatGPT, Claude, …) cez MCP server. Detaily konfigurácie pozri v súbore.

---

## Poznámky k údržbe

- **Nová logika pre viac funkcií** → `base44/shared/`, nie kópia do funkcie.
- **Entity schémy** sa zapisujú vždy ako kompletný JSON objekt (`write_file`), nikdy `find_replace`.
- **Nové komponenty** → vlastný súbor (`≤ 50 riadkov`), žiadne pridávanie do existujúcich.
- **Tailwind triedy** ako literály — dynamické mená sa purgovaným buildom odstránia.
- **Importy** cez `@/` alias (nikdy relatívne `src/` cesty).