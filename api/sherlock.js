import { getMistralApiKey, mistralChat, readJsonBody, sendJson } from './_lib/mistral.js';
import { buildSherlockSystemPrompt } from './_lib/prompts.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return sendJson(res, 204, {});
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const apiKey = getMistralApiKey();
  if (!apiKey) {
    return sendJson(res, 503, { ok: false, error: 'MISTRAL_API_KEY missing on server' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: 'invalid_json' });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > 1000) {
    return sendJson(res, 400, { ok: false, error: 'invalid_question' });
  }

  const context = typeof body.context === 'string' ? body.context : '';
  const history = Array.isArray(body.history) ? body.history : [];
  const validHistory = [];
  for (const msg of history.slice(-6)) {
    if (!msg || typeof msg !== 'object') continue;
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const content = typeof msg.text === 'string' ? msg.text.slice(0, 1000) : '';
    if (content) validHistory.push({ role, content });
  }

  const messages = [
    { role: 'system', content: buildSherlockSystemPrompt(context) },
    ...validHistory,
    { role: 'user', content: question }
  ];

  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await mistralChat({
      apiKey,
      model: 'mistral-small-latest',
      temperature: 0.2,
      maxTokens: 800,
      timeoutMs: 45000,
      messages
    });

    if (result.ok) {
      return sendJson(res, 200, {
        ok: true,
        answer: result.content || 'Nemám odpoveď.'
      });
    }

    lastError = result.error || 'mistral_failed';
    const transient = result.status === 0 || result.status === 429 || result.status >= 500;
    if (!transient || attempt === 3) break;
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }

  return sendJson(res, 502, { ok: false, error: lastError });
}
