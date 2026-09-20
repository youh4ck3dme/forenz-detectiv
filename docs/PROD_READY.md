# PROD-READY report — ForenzDetektív / Alibi

**Date:** 2026-09-20 (UI light theme refresh)  
**URL:** https://forenz-detectiv.vercel.app  
**Alias:** `forenzdetectiv.vercel.app` — **402** (nepoužívať; hlavná URL vyššie)  
**Branch freeze docs:** `cursor/prod-ready-freeze-933f` + light UI `#26`

## Status summary

| Area | Status | Notes |
|------|--------|-------|
| Frontend (Vercel) | READY | HTTP 200, light-only + liquid-glass nav (merged #26) |
| Stripe / paywall | PAUSED | `isMonetizationEnabled=false`; live UI bez Cenník |
| Guest / offline OCR | READY | Live smoke TXT upload PASS |
| Base44 entities | READY | Live appId `6a7ed366df1f1138ad653044` → API 200 |
| Cloud AI (Mistral/Pixtral) | BLOCKED (owner) | Needs `MISTRAL_API_KEY` + functions deploy |
| PostHog EU | CODE READY / KEY MISSING | `disable_session_recording: true`; no `phc_` in prod bundle |
| CSP | OK | No Stripe domains |
| Custom domain | DEFERRED | `forenzdetectiv.sk` |
| TWA / Play / Ads | DEFERRED | RB-05..07 |

## Live smoke (PROMPT-PROD-SMOKE-01)

| # | Scenario | Result |
|---|----------|--------|
| 1 | Empty home + Nahrať, no Cenník | PASS |
| 2 | Guest TXT chronology fixture | PASS |
| 3 | Alibi & Mapa / Časová os — no Modul zlyhal | PASS |
| 4 | Mobile 420×912 Menu drawer, no overflow | PASS |
| 5 | Dashboard → Späť na spis | PASS |
| 6 | Base44 network | INFO — 17 calls, sample status 200 (entities) |

## Owner actions still required for full AI ostro

1. Add secret `MISTRAL_API_KEY` (Base44 for app `6a7ed366…`).
2. `npx base44 login` → deploy functions for that app.
3. Confirm auth origins include both Vercel URLs.
4. Optional: `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST=https://eu.i.posthog.com` on Vercel Production → redeploy.

## Open risks

- Cloud analyzeDocument not verified end-to-end without Mistral.
- GitHub Actions still billing-locked (local CI gate is source of truth).
- Repo default appId fallback (`6a81f5e7…`) differs from live Vercel `VITE_BASE44_APP_ID` — always set env in Production.
