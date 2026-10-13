"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incidentService_js_1 = require("../services/incidentService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const { location_id, status, priority, category, is_simulation, search } = req.query;
        const incidents = (0, incidentService_js_1.listIncidents)({
            location_id: location_id,
            status: status,
            priority: priority,
            category: category,
            is_simulation: is_simulation !== undefined ? is_simulation === 'true' || is_simulation === '1' : undefined,
            search: search,
        });
        res.json({ incidents });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const incident = (0, incidentService_js_1.getIncidentById)(req.params.id);
        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }
        const timeline = (0, incidentService_js_1.getIncidentTimeline)(req.params.id);
        res.json({ incident, timeline });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), async (req, res) => {
    try {
        const { title, description, category, location_id, zone, priority, is_simulation } = req.body;
        const user = req.user;
        const incident = await (0, incidentService_js_1.createIncident)({
            title,
            description,
            category,
            location_id,
            zone,
            priority,
            is_simulation,
            actorId: user.id,
            actorRole: user.role,
        });
        res.status(201).json({ incident });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/:id/transition', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), (req, res) => {
    try {
        const { status, notes } = req.body;
        const user = req.user;
        if (!status) {
            res.status(400).json({ error: 'Target status is required' });
            return;
        }
        const updated = (0, incidentService_js_1.transitionIncidentStatus)(req.params.id, status, user.id, user.role, notes);
        res.json({ incident: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/:id/assign', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), (req, res) => {
    try {
        const { responder_id, notes } = req.body;
        const user = req.user;
        if (!responder_id) {
            res.status(400).json({ error: 'responder_id is required' });
            return;
        }
        const updated = (0, incidentService_js_1.assignIncidentResponder)(req.params.id, responder_id, user.id, user.role, notes);
        res.json({ incident: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
