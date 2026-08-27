#!/usr/bin/env node
/**
 * One-shot production CLI setup (Base44 + optional Vercel).
 * Requires: logged-in Base44 CLI (`npx base44 whoami`) and env MISTRAL_API_KEY.
 *
 * Usage:
 *   MISTRAL_API_KEY=... node scripts/prodCliSetup.mjs
 * Optional:
 *   BASE44_APP_ID=6a81f5e7f4adbf6a9523b9d8
 *   VITE_POSTHOG_KEY=phc_...
 *   VERCEL_TOKEN=...
 */
import { spawnSync } from 'node:child_process';

// Default = app owned by youh4ck3dme (admin). Live Vercel must set the same VITE_BASE44_APP_ID.
const APP_ID = process.env.BASE44_APP_ID || '6a81f5e7f4adbf6a9523b9d8';
const ORIGINS = [
  'https://forenz-detectiv.vercel.app',
  'https://forenzdetectiv.vercel.app'
];

function run(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env, shell: false, ...opts });
  if (r.status !== 0) {
    throw new Error(`Command failed (${r.status}): ${cmd} ${args.join(' ')}`);
  }
}

function npxBase44(args) {
  run('npx', ['base44@latest', '--app-id', APP_ID, ...args]);
}

function main() {
  console.log(`Target Base44 appId: ${APP_ID}`);
  run('npx', ['base44@latest', 'whoami']);

  const mistral = process.env.MISTRAL_API_KEY;
  if (!mistral) {
    console.error('Missing MISTRAL_API_KEY in environment.');
    process.exit(1);
  }

  // Set server secret (never VITE_)
  npxBase44(['secrets', 'set', `MISTRAL_API_KEY=${mistral}`]);
  npxBase44(['secrets', 'list']);

  // Deploy entities + functions (no site build — Vercel owns frontend)
  npxBase44(['deploy', '-y', '--no-build']);

  console.log('\nAuth origins to verify in Base44 dashboard / auth config:');
  for (const o of ORIGINS) console.log(`  - ${o}`);

  // Optional PostHog via Vercel CLI if token present
  const ph = process.env.VITE_POSTHOG_KEY;
  const vercelToken = process.env.VERCEL_TOKEN;
  if (ph && vercelToken) {
    process.env.VERCEL_TOKEN = vercelToken;
    run('npx', ['vercel', 'env', 'add', 'VITE_POSTHOG_KEY', 'production', '--force'], {
      input: `${ph}\n`,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    run('npx', ['vercel', 'env', 'add', 'VITE_POSTHOG_HOST', 'production', '--force'], {
      input: 'https://eu.i.posthog.com\n',
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log('PostHog env set — trigger redeploy from Vercel dashboard or: npx vercel --prod');
  } else {
    console.log('\nSkipped Vercel PostHog env (set VITE_POSTHOG_KEY + VERCEL_TOKEN to automate).');
  }

  console.log('\nDONE. Smoke: upload a small PDF on https://forenz-detectiv.vercel.app');
}

main();
