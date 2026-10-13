"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_js_1 = require("../db/connection.js");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const db = (0, connection_js_1.getDatabase)();
        const { entity_type, action_type, limit = '50' } = req.query;
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];
        if (entity_type) {
            query += ' AND entity_type = ?';
            params.push(entity_type);
        }
        if (action_type) {
            query += ' AND action_type = ?';
            params.push(action_type);
        }
        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(parseInt(limit, 10) || 50);
        const logs = db.prepare(query).all(...params);
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
