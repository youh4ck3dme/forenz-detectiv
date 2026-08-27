# PROD-READY report — ForenzDetektív / Alibi

**Date:** 2026-08-27  
**URL:** https://forenz-detectiv.vercel.app (alias: https://forenzdetectiv.vercel.app)  
**Branch:** `cursor/base44-ai-deploy-933f`

## Status summary

| Area | Status | Notes |
|------|--------|-------|
| Frontend (Vercel) | READY | HTTP 200, OG → forenz-detectiv.vercel.app |
| Stripe / paywall | PAUSED | `isMonetizationEnabled=false`; live UI bez Cenník |
| Guest / offline OCR | READY | Live smoke TXT upload PASS |
| Base44 backend (owned) | READY | AppId `6a81f5e7f4adbf6a9523b9d8` — secret + 7 functions deployed |
| Cloud AI (Mistral/Pixtral) | BACKEND READY / FRONTEND MISMATCH | Needs Vercel `VITE_BASE44_APP_ID=6a81f5e7…` (currently still baked `6a7ed366…`) |
| PostHog EU | CODE READY / KEY MISSING | `disable_session_recording: true`; no `phc_` in prod bundle |
| CSP | OK | No Stripe domains |
| Custom domain | DEFERRED | `forenzdetectiv.sk` |
| TWA / Play / Ads | DEFERRED | RB-05..07 |

## Base44 AI deploy (this wave)

- Logged in as `youh4ck3dme@gmail.com`
- `MISTRAL_API_KEY` set on app `6a81f5e7f4adbf6a9523b9d8`
- Functions deployed: `analyzeDocument`, `detectContradictions`, `recoverStuckDocuments`, `sherlockChat`, `generateExpertSummary`, `loadSharedCase`, `createCheckoutSession`
- Shared Deno imports fixed: `npm:zod@…`, `npm:haversine-distance@…` (+ Node/Vite remaps)
- App `6a7ed366…` is **not** admin-accessible for this account — do not target it for secrets/deploy

## Live smoke (PROMPT-PROD-SMOKE-01)

| # | Scenario | Result |
|---|----------|--------|
| 1 | Empty home + Nahrať, no Cenník | PASS |
| 2 | Guest TXT chronology fixture | PASS |
| 3 | Alibi & Mapa / Časová os — no Modul zlyhal | PASS |
| 4 | Mobile 420×912 Menu drawer, no overflow | PASS |
| 5 | Dashboard → Späť na spis | PASS |
| 6 | Base44 network | INFO — entities 200 on previous live appId |

## Owner actions still required

1. **Vercel Production env:** set `VITE_BASE44_APP_ID=6a81f5e7f4adbf6a9523b9d8` (and `VITE_BASE44_APP_BASE_URL=https://app.base44.com`), then redeploy.
2. In Base44 dashboard for `6a81f5e7…`, confirm auth allowed origins include:
   - `https://forenz-detectiv.vercel.app`
   - `https://forenzdetectiv.vercel.app`
3. Optional: `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST=https://eu.i.posthog.com` on Vercel Production → redeploy.
4. Smoke cloud AI: upload PDF/PNG → `analyzeDocument` → done.

## Open risks

- Until Vercel appId is switched, production frontend still talks to `6a7ed366…` (no admin / no Mistral secret there).
- GitHub Actions still billing-locked (local CI gate is source of truth).
