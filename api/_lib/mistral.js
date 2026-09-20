/**
 * Shared Mistral HTTP helpers for Vercel serverless + Vite middleware.
 * MISTRAL_API_KEY must never be prefixed with VITE_.
 */

export function getMistralApiKey() {
  const key = process.env.MISTRAL_API_KEY || '';
  return key.trim();
}

export async function mistralChat({
  apiKey,
  model,
  messages,
  temperature = 0,
  maxTokens = 2000,
  jsonMode = false,
  timeoutMs = 60000
}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 500) };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.message || data?.error || text.slice(0, 300) || `http_${res.status}`,
        data
      };
    }

    const content = data?.choices?.[0]?.message?.content ?? '';
    return { ok: true, status: res.status, content, data };
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      aborted,
      error: aborted ? 'timeout' : err?.message || 'network_error'
    };
  } finally {
    clearTimeout(timer);
  }
}

export function parseJsonContent(content) {
  if (content && typeof content === 'object') return content;
  const raw = String(content || '{}');
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    try {
      return m ? JSON.parse(m[0]) : {};
    } catch {
      return {};
    }
  }
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 12 * 1024 * 1024) {
        reject(new Error('payload_too_large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
