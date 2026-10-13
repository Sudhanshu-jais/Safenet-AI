"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const responderService_js_1 = require("../services/responderService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const { location_id, availability, role } = req.query;
        const responders = (0, responderService_js_1.listResponders)({
            location_id: location_id,
            availability: availability,
            role: role,
        });
        res.json({ responders });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/eligible', (req, res) => {
    try {
        const { location_id, role } = req.query;
        if (!location_id) {
            res.status(400).json({ error: 'location_id is required' });
            return;
        }
        const responders = (0, responderService_js_1.findEligibleResponders)(location_id, role);
        res.json({ responders });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:id', (req, res) => {
    try {
        const responder = (0, responderService_js_1.getResponderById)(req.params.id);
        if (!responder) {
            res.status(404).json({ error: 'Responder not found' });
            return;
        }
        res.json({ responder });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/:id/availability', (0, auth_js_1.requireRole)('ADMINISTRATOR', 'OPERATOR'), (req, res) => {
    try {
        const { availability } = req.body;
        const user = req.user;
        if (!availability) {
            res.status(400).json({ error: 'availability is required' });
            return;
        }
        const updated = (0, responderService_js_1.updateResponderAvailability)(req.params.id, availability, user.id, user.role);
        res.json({ responder: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
