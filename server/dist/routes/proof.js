"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const proofService_js_1 = require("../services/proofService.js");
const router = (0, express_1.Router)();
router.get('/summary', (req, res) => {
    try {
        const summary = (0, proofService_js_1.getProofSummary)();
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/compare', (req, res) => {
    try {
        const { runA, runB } = req.query;
        if (!runA || !runB) {
            res.status(400).json({ error: 'Both runA and runB query parameters are required.' });
            return;
        }
        const comparison = (0, proofService_js_1.compareScenarioRuns)(runA, runB);
        res.json({ comparison });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
