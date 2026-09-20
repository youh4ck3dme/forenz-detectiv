/**
 * Vite middleware: serve /api/analyze and /api/sherlock in local `npm run dev`.
 * Loads MISTRAL_API_KEY from process.env or .env.local.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function loadEnvLocal(root) {
  try {
    const envPath = path.join(root, '.env.local');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function mistralApiPlugin() {
  return {
    name: 'mistral-api-dev',
    async configureServer(server) {
      const root = server.config.root || process.cwd();
      loadEnvLocal(root);
      const analyzeUrl = pathToFileURL(path.join(root, 'api/analyze.js')).href;
      const sherlockUrl = pathToFileURL(path.join(root, 'api/sherlock.js')).href;
      const { default: analyzeHandler } = await import(analyzeUrl);
      const { default: sherlockHandler } = await import(sherlockUrl);

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/analyze' && url !== '/api/sherlock') return next();

        try {
          const body = await readBody(req);
          req.body = body;
          req.method = req.method || 'POST';
          const handler = url === '/api/analyze' ? analyzeHandler : sherlockHandler;
          await handler(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err?.message || 'api_error' }));
        }
      });
    }
  };
}
