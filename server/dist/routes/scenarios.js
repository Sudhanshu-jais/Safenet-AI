"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const safetestEngine_js_1 = require("../services/safetestEngine.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const scenarios = (0, safetestEngine_js_1.listScenarios)();
        res.json({ scenarios });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/runs', (req, res) => {
    try {
        const { scenario_id, status } = req.query;
        const runs = (0, safetestEngine_js_1.listScenarioRuns)({
            scenario_id: scenario_id,
            status: status,
        });
        res.json({ runs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/runs/:id', (req, res) => {
    try {
        const run = (0, safetestEngine_js_1.getScenarioRunById)(req.params.id);
        if (!run) {
            res.status(404).json({ error: 'Scenario run not found' });
            return;
        }
        res.json({ run });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const scenario = (0, safetestEngine_js_1.getScenarioById)(req.params.id);
        if (!scenario) {
            res.status(404).json({ error: 'Scenario not found' });
            return;
        }
        res.json({ scenario });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/:id/rule', (0, auth_js_1.requireRole)('ADMINISTRATOR'), (req, res) => {
    try {
        const { rule_version, config } = req.body;
        const user = req.user;
        if (!rule_version || !config) {
            res.status(400).json({ error: 'rule_version and config object are required' });
            return;
        }
        const updated = (0, safetestEngine_js_1.updateScenarioRuleConfig)(req.params.id, rule_version, config, user.id, user.role);
        res.json({ scenario: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/:id/run', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), async (req, res) => {
    try {
        const user = req.user;
        const runResult = await (0, safetestEngine_js_1.executeScenario)(req.params.id, user.id, user.role);
        res.status(201).json({ run: runResult });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
