import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureDatabaseReady } from './db/connection.js';
import { authMiddleware } from './middleware/auth.js';

import incidentsRouter from './routes/incidents.js';
import respondersRouter from './routes/responders.js';
import scenariosRouter from './routes/scenarios.js';
import correctiveRouter from './routes/corrective.js';
import proofRouter from './routes/proof.js';
import auditRouter from './routes/audit.js';
import systemRouter from './routes/system.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(authMiddleware);

// Ensure database is fully initialized and seeded before handling API requests
app.use(async (_req, res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (err: any) {
    console.error('[SAFENET AI DB Initialization Error]', err);
    res.status(500).json({ error: 'Database initialization failed', message: err?.message || String(err) });
  }
});

// Immediately trigger initialization in background for fast cold starts
ensureDatabaseReady().catch((err) => {
  console.warn('[SAFENET AI Startup DB Note]', err);
});

// Mount API routes (supporting both /api/* and /* for Vercel service rewrites)
const routerMap = [
  { path: 'incidents', router: incidentsRouter },
  { path: 'responders', router: respondersRouter },
  { path: 'scenarios', router: scenariosRouter },
  { path: 'corrective', router: correctiveRouter },
  { path: 'proof', router: proofRouter },
  { path: 'audit', router: auditRouter },
  { path: 'system', router: systemRouter },
];

for (const { path: routePath, router } of routerMap) {
  app.use(`/api/${routePath}`, router);
  app.use(`/${routePath}`, router);
}

// Health check endpoints (available at /api/health, /health, and root /)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ONLINE',
    service: 'SAFENET AI Core Engine',
    version: '1.0.0',
    mode: config.dbPath === ':memory:' ? 'IN_MEMORY' : 'PERSISTENT',
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/', healthHandler);

// 404 JSON fallback handler (prevents Vercel/Express from returning HTML 404s)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl || req.url,
    method: req.method,
  });
});

// Global JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SAFENET AI Global Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// In serverless environments (e.g. Vercel), do NOT call app.listen()
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`[SAFENET AI] Server running on port ${config.port} (env: ${config.nodeEnv})`);
    console.log(`[SAFENET AI] Database initialized at: ${config.dbPath}`);
  });
}

// Export for ES modules and CommonJS Vercel runners
export default app;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  (module.exports as any).default = app;
}

