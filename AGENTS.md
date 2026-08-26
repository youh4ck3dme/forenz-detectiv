# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Cursor Cloud specific instructions

Scope of this environment: this is set up as the **frontend dev environment** for the React + Vite app. `npm run dev` serves the app on `http://127.0.0.1:5173/` (Vite is pinned to IPv4 `127.0.0.1` with `strictPort`). The CI gate and standard commands are already documented in `README.md` / `package.json` — the notes below only capture the non-obvious caveats.

- **Node version gotcha (important):** the VM's default `node` on `PATH` (`/exec-daemon/node`) is `v22.14.0`, which is too old to run `npm test`. `npm test` (`scripts/testRunner.mjs`) uses `node --test` on files that import `base44/shared/*.ts`, which needs Node's built-in TypeScript type-stripping (default in Node ≥ 22.18); on 22.14 it fails with `ERR_UNKNOWN_FILE_EXTENSION` for `.ts`. The startup/update script fixes this by symlinking nvm's Node 22.x (currently `v22.22.2`, the nvm default) into `/usr/local/cargo/bin` (the first, world-writable entry on `PATH`, ahead of `/exec-daemon`), so `node`/`npm`/`npx` resolve to the newer runtime. If you ever see the `.ts` extension error, you're on the old node — run `nvm use 22.22.2` (or re-run the symlink) and retry.
- **CI gate = `npm test && npm run lint && npm run typecheck && npm run build`** (per `README.md`). All four pass in this environment (23 integrity/engine tests). This gate does NOT include `test:vitest` or `test:e2e`.
- **`npm run test:vitest`:** scoped to `tests/components/**/*.{test,spec}.{jsx,tsx}` in `vite.config.js` (Vitest cannot bundle `node:test`; root `tests/*.test.js` run via `npm test` only). Currently 6 files / 16 tests — all pass.
- **E2E (`npm run test:e2e`, Playwright):** run `npx playwright install --with-deps chromium` first (not done by the update script). Playwright starts its own dev server on port `5174`, so it does not clash with `npm run dev` on `5173`.
- **Backend dependency (full upload → AI pipeline):** the app talks to a Base44 backend. Two options, both needing user-provided credentials: (1) the hosted backend at `app.base44.com` for the hardcoded `appId` — currently returns **503** (app not deployed), or (2) a local backend via `base44 dev` (Base44 CLI + Deno installed), which requires an interactive `base44 login` (device-code flow to a Base44 account) plus a `MISTRAL_API_KEY` secret for AI analysis. Without a working backend, the app renders and navigates in guest/offline mode but a document upload will fail.
- **Corrupted-storage caveat:** IndexedDB writes are sanitized on load/save (`offlineDb.js`), and Map/Timeline filter null records — but **legacy** bad records written before sanitization can still cause tab crashes. Clear site storage (DevTools → Application → Clear site data, or a fresh incognito window) if „Alibi & Mapa" or „Časová os" show `Modul zlyhal`.
