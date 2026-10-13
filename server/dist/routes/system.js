"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_js_1 = require("../db/connection.js");
const seed_js_1 = require("../db/seed.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/locations', (req, res) => {
    try {
        const db = (0, connection_js_1.getDatabase)();
        const locations = db.prepare('SELECT * FROM locations ORDER BY name ASC').all();
        res.json({ locations });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/stats', (req, res) => {
    try {
        const db = (0, connection_js_1.getDatabase)();
        const openIncidents = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status != 'RESOLVED' AND status != 'CANCELLED'").get()?.count || 0;
        const awaitingAck = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status = 'REPORTED'").get()?.count || 0;
        const activeWorkflows = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status IN ('ASSIGNED', 'IN_PROGRESS')").get()?.count || 0;
        const unresolvedGaps = db.prepare("SELECT COUNT(*) as count FROM corrective_actions WHERE status IN ('OPEN', 'IN_PROGRESS')").get()?.count || 0;
        const runsTotal = db.prepare('SELECT COUNT(*) as count FROM scenario_runs').get()?.count || 0;
        const runsPassed = db.prepare("SELECT COUNT(*) as count FROM scenario_runs WHERE status = 'PASSED'").get()?.count || 0;
        const passRate = runsTotal > 0 ? Math.round((runsPassed / runsTotal) * 100) : null;
        res.json({
            stats: {
                open_incidents: openIncidents,
                awaiting_acknowledgement: awaitingAck,
                active_workflows: activeWorkflows,
                unresolved_weaknesses: unresolvedGaps,
                latest_pass_rate: passRate,
                total_runs: runsTotal,
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/seed', (0, auth_js_1.requireRole)('ADMINISTRATOR'), (req, res) => {
    try {
        const result = (0, seed_js_1.seedDemoData)();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/clear', (0, auth_js_1.requireRole)('ADMINISTRATOR'), (req, res) => {
    try {
        const result = (0, seed_js_1.clearDemoData)();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
