import { createClient } from '@base44/sdk';
import { appParams } from '../lib/app-params.js';

// Deaktivácia interného Base44 SDK analytics v guest / standalone režime
if (typeof globalThis !== 'undefined') {
  if (!globalThis.base44SharedInstances) {
    globalThis.base44SharedInstances = {};
  }
  globalThis.base44SharedInstances.analytics = {
    instance: {
      requestsQueue: [],
      isProcessing: false,
      isHeartBeatProcessing: false,
      wasInitializationTracked: true,
      sessionContext: {
        user_id: null,
        session_id: 'guest-session'
      },
      sessionStartTime: null,
      config: {
        enabled: false,
        maxQueueSize: 0,
        throttleTime: 999999,
        batchSize: 0,
        heartBeatInterval: 999999
      }
    }
  };
}

const { appId, apiKey, token, functionsVersion, appBaseUrl } = appParams;

// Create a client configured to communicate directly with Base44 platform
// (optional legacy auth/entities/share — AI uses /api → Mistral instead)
export const base44 = createClient({
  appId: appId || '6a81f5e7f4adbf6a9523b9d8',
  token,
  headers: apiKey ? { api_key: apiKey } : undefined,
  functionsVersion: functionsVersion || 'v1',
  serverUrl: appBaseUrl || 'https://app.base44.com',
  requiresAuth: false,
  appBaseUrl: appBaseUrl || 'https://app.base44.com'
});

// Block legacy Base44 AI function names — use src/lib/aiClient.js → /api/*
const BLOCKED_AI_FUNCTIONS = new Set([
  'analyzeDocument',
  'sherlockChat',
  'generateExpertSummary',
  'recoverStuckDocuments',
  'generateCrossExamination'
]);
const originalInvoke = base44.functions?.invoke?.bind(base44.functions);
if (originalInvoke) {
  base44.functions.invoke = async (name, payload) => {
    if (BLOCKED_AI_FUNCTIONS.has(String(name))) {
      throw new Error(
        `Base44 AI function "${name}" is disabled. Use /api Mistral routes via aiClient.`
      );
    }
    return originalInvoke(name, payload);
  };
}

// Bezpečný wrapper pre base44.auth.me — bez fake admin guest používateľa
const originalMe = base44.auth.me ? base44.auth.me.bind(base44.auth) : null;
if (originalMe) {
  base44.auth.me = async () => {
    const isBrowser = typeof window !== 'undefined';
    const storedToken = isBrowser
      ? localStorage.getItem('base44_access_token') || localStorage.getItem('token') || appParams?.token
      : null;

    if (!storedToken) {
      return null;
    }

    try {
      return await originalMe();
    } catch {
      return null;
    }
  };
}
