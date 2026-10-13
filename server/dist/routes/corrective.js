"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const correctiveService_js_1 = require("../services/correctiveService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const { status, priority } = req.query;
        const actions = (0, correctiveService_js_1.listCorrectiveActions)({
            status: status,
            priority: priority,
        });
        res.json({ corrective_actions: actions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const action = (0, correctiveService_js_1.getCorrectiveActionById)(req.params.id);
        if (!action) {
            res.status(404).json({ error: 'Corrective action not found' });
            return;
        }
        res.json({ corrective_action: action });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), (req, res) => {
    try {
        const { title, weakness_description, source_run_id, proposed_remedy, owner, priority, due_date, verification_scenario_id, } = req.body;
        const user = req.user;
        const action = (0, correctiveService_js_1.createCorrectiveAction)({
            title,
            weakness_description,
            source_run_id,
            proposed_remedy,
            owner,
            priority,
            due_date,
            verification_scenario_id,
            actorId: user.id,
            actorRole: user.role,
        });
        res.status(201).json({ corrective_action: action });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.patch('/:id/status', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), (req, res) => {
    try {
        const { status, verification_run_id, notes } = req.body;
        const user = req.user;
        if (!status) {
            res.status(400).json({ error: 'Target status is required' });
            return;
        }
        const updated = (0, correctiveService_js_1.updateCorrectiveActionStatus)(req.params.id, status, verification_run_id, user.id, user.role, notes);
        res.json({ corrective_action: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
