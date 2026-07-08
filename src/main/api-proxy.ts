/**
 * API Proxy Server — OpenAI-compatible local proxy
 * Forwards requests to the upstream Neurasea Grid API.
 */
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { EventEmitter } from 'events';
import type { ProxyStatus, ApiProxyConfig } from '../shared/types';
import { SUPPORTED_MODELS } from '../shared/constants';

/* ────────────────────── Types ────────────────────── */

interface ProxyState {
  server: http.Server | null;
  port: number;
  upstreamUrl: string;
  apiKeyProvider: (() => string) | null;
  requestCount: number;
  startTime: number;
}

interface ProxyResult {
  success: boolean;
  url?: string;
  error?: string;
}

/* ────────────────────── State ────────────────────── */

const state: ProxyState = {
  server: null,
  port: 8787,
  upstreamUrl: '',
  apiKeyProvider: null,
  requestCount: 0,
  startTime: 0,
};

const statusEmitter = new EventEmitter();

/* ────────────────────── Helpers ────────────────────── */

function getApiKey(): string {
  return state.apiKeyProvider ? state.apiKeyProvider() : '';
}

function buildModelsResponse() {
  return {
    object: 'list',
    data: SUPPORTED_MODELS.map((m) => ({
      id: m.id,
      object: 'model',
      created: Date.now(),
      owned_by: 'neurasea',
    })),
  };
}

function getStatus(): ProxyStatus {
  return {
    running: state.server !== null && state.server.listening,
    url: state.server?.listening ? `http://127.0.0.1:${state.port}/v1` : '',
    port: state.port,
    uptime: state.startTime > 0 ? Date.now() - state.startTime : 0,
    requestCount: state.requestCount,
  };
}

function emitStatus(): void {
  statusEmitter.emit('status', getStatus());
}

/* ────────────────────── Request Handler ────────────────────── */

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (url === '/health' || url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', proxy: true }));
    return;
  }

  // Models list
  if (url === '/v1/models' && method === 'GET') {
    state.requestCount++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildModelsResponse()));
    emitStatus();
    return;
  }

  // Proxy chat completions
  if (url === '/v1/chat/completions' && method === 'POST') {
    proxyChatCompletions(req, res);
    return;
  }

  // Proxy completions
  if (url === '/v1/completions' && method === 'POST') {
    proxyRequest(req, res, '/v1/completions');
    return;
  }

  // Proxy embeddings
  if (url === '/v1/embeddings' && method === 'POST') {
    proxyRequest(req, res, '/v1/embeddings');
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/* ────────────────────── Proxy Logic ────────────────────── */

function proxyChatCompletions(req: http.IncomingMessage, res: http.ServerResponse): void {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No API key configured' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const isStream = parsed.stream === true;

      const upstreamUrl = new URL('/v1/chat/completions', state.upstreamUrl);
      const upstreamReq = https.request(
        upstreamUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        },
        (upstreamRes) => {
          state.requestCount++;
          emitStatus();

          res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);

          upstreamRes.pipe(res);
        },
      );

      upstreamReq.on('error', (err) => {
        console.error('[Proxy] Upstream error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Upstream error', message: err.message }));
        }
      });

      upstreamReq.write(JSON.stringify(parsed));
      upstreamReq.end();
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
}

function proxyRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  path: string,
): void {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No API key configured' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const upstreamUrl = new URL(path, state.upstreamUrl);
      const upstreamReq = https.request(
        upstreamUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        },
        (upstreamRes) => {
          state.requestCount++;
          emitStatus();
          res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
          upstreamRes.pipe(res);
        },
      );

      upstreamReq.on('error', (err) => {
        console.error('[Proxy] Upstream error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Upstream error', message: err.message }));
        }
      });

      upstreamReq.write(body);
      upstreamReq.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: (err as Error).message }));
    }
  });
}

/* ────────────────────── Public API ────────────────────── */

export async function startProxy(
  config?: Partial<ApiProxyConfig> & { apiKeyProvider?: () => string },
): Promise<ProxyResult> {
  // Stop existing if running
  if (state.server) {
    await stopProxy();
  }

  const port = config?.port ?? state.port;
  state.port = port;
  state.upstreamUrl = config?.upstreamUrl || 'https://grid.agon.win/api/v1';

  if (config?.apiKey) {
    state.apiKeyProvider = () => config.apiKey!;
  }
  if (config?.apiKeyProvider) {
    state.apiKeyProvider = config.apiKeyProvider;
  }

  return new Promise((resolve) => {
    const server = http.createServer(handleRequest);

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ success: false, error: `Port ${port} is already in use` });
      } else {
        resolve({ success: false, error: err.message });
      }
    });

    server.listen(port, '127.0.0.1', () => {
      state.server = server;
      state.startTime = Date.now();
      state.requestCount = 0;
      console.log(`[Proxy] Server running at http://127.0.0.1:${port}/v1`);
      emitStatus();
      resolve({ success: true, url: `http://127.0.0.1:${port}/v1` });
    });
  });
}

export async function stopProxy(): Promise<void> {
  if (!state.server) return;

  return new Promise((resolve) => {
    state.server!.close(() => {
      state.server = null;
      state.startTime = 0;
      emitStatus();
      console.log('[Proxy] Server stopped');
      resolve();
    });
  });
}

export function getProxyStatus(): ProxyStatus {
  return getStatus();
}

export function onStatusChanged(callback: (status: ProxyStatus) => void): void {
  statusEmitter.on('status', callback);
}
