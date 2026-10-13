import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeSchema } from './db/schema.js';
import { seedInitialScenarios } from './db/seed.js';
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

// Initialize DB schema & default scenarios
initializeSchema();
seedInitialScenarios();

// Mount API routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/responders', respondersRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/corrective', correctiveRouter);
app.use('/api/proof', proofRouter);
app.use('/api/audit', auditRouter);
app.use('/api/system', systemRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'SAFENET AI Core Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`[SAFENET AI] Server running on port ${config.port} (env: ${config.nodeEnv})`);
    console.log(`[SAFENET AI] Database initialized at: ${config.dbPath}`);
  });
}

export default app;
