"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_js_1 = require("./config.js");
const schema_js_1 = require("./db/schema.js");
const seed_js_1 = require("./db/seed.js");
const auth_js_1 = require("./middleware/auth.js");
const incidents_js_1 = __importDefault(require("./routes/incidents.js"));
const responders_js_1 = __importDefault(require("./routes/responders.js"));
const scenarios_js_1 = __importDefault(require("./routes/scenarios.js"));
const corrective_js_1 = __importDefault(require("./routes/corrective.js"));
const proof_js_1 = __importDefault(require("./routes/proof.js"));
const audit_js_1 = __importDefault(require("./routes/audit.js"));
const system_js_1 = __importDefault(require("./routes/system.js"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(auth_js_1.authMiddleware);
// Initialize DB schema & default scenarios safely
try {
    (0, schema_js_1.initializeSchema)();
    (0, seed_js_1.seedInitialScenarios)();
    console.log('[SAFENET AI] Database schema initialized and seeded successfully.');
}
catch (err) {
    console.error('[SAFENET AI] DB initialization warning:', err);
}
// Mount API routes (supporting both /api/* and /* for Vercel service rewrites)
const routerMap = [
    { path: 'incidents', router: incidents_js_1.default },
    { path: 'responders', router: responders_js_1.default },
    { path: 'scenarios', router: scenarios_js_1.default },
    { path: 'corrective', router: corrective_js_1.default },
    { path: 'proof', router: proof_js_1.default },
    { path: 'audit', router: audit_js_1.default },
    { path: 'system', router: system_js_1.default },
];
for (const { path: routePath, router } of routerMap) {
    app.use(`/api/${routePath}`, router);
    app.use(`/${routePath}`, router);
}
// Health check endpoints (available at /api/health, /health, and root /)
const healthHandler = (_req, res) => {
    res.json({
        status: 'ONLINE',
        service: 'SAFENET AI Core Engine',
        version: '1.0.0',
        mode: config_js_1.config.dbPath === ':memory:' ? 'IN_MEMORY' : 'PERSISTENT',
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
app.use((err, _req, res, _next) => {
    console.error('[SAFENET AI Global Error]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_ERROR',
    });
});
// In serverless environments (e.g. Vercel), do NOT call app.listen()
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(config_js_1.config.port, () => {
        console.log(`[SAFENET AI] Server running on port ${config_js_1.config.port} (env: ${config_js_1.config.nodeEnv})`);
        console.log(`[SAFENET AI] Database initialized at: ${config_js_1.config.dbPath}`);
    });
}
// Export for ES modules and CommonJS Vercel runners
exports.default = app;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
    module.exports.default = app;
}
