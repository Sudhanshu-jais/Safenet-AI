"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listResponders = listResponders;
exports.getResponderById = getResponderById;
exports.updateResponderAvailability = updateResponderAvailability;
exports.findEligibleResponders = findEligibleResponders;
const connection_js_1 = require("../db/connection.js");
const audit_js_1 = require("../middleware/audit.js");
function listResponders(filters) {
    const db = (0, connection_js_1.getDatabase)();
    let query = `
    SELECT r.*, l.name as location_name 
    FROM responders r
    LEFT JOIN locations l ON r.location_id = l.id
    WHERE 1=1
  `;
    const params = [];
    if (filters?.location_id) {
        query += ' AND r.location_id = ?';
        params.push(filters.location_id);
    }
    if (filters?.availability) {
        query += ' AND r.availability = ?';
        params.push(filters.availability);
    }
    if (filters?.role) {
        query += ' AND r.role = ?';
        params.push(filters.role);
    }
    query += ' ORDER BY r.name ASC';
    return db.prepare(query).all(...params);
}
function getResponderById(id) {
    const db = (0, connection_js_1.getDatabase)();
    const row = db.prepare(`
    SELECT r.*, l.name as location_name 
    FROM responders r
    LEFT JOIN locations l ON r.location_id = l.id
    WHERE r.id = ?
  `).get(id);
    return row || null;
}
function updateResponderAvailability(id, availability, actorId, actorRole) {
    const db = (0, connection_js_1.getDatabase)();
    const existing = getResponderById(id);
    if (!existing) {
        throw new Error(`Responder ${id} not found`);
    }
    db.prepare('UPDATE responders SET availability = ? WHERE id = ?').run(availability, id);
    (0, audit_js_1.recordAuditLog)({
        actorId,
        actorRole,
        actionType: 'RESPONDER_AVAILABILITY_CHANGED',
        entityType: 'RESPONDER',
        entityId: id,
        details: {
            previous: existing.availability,
            updated: availability,
        }
    });
    return getResponderById(id);
}
function findEligibleResponders(locationId, role) {
    const db = (0, connection_js_1.getDatabase)();
    let query = `
    SELECT r.*, l.name as location_name
    FROM responders r
    LEFT JOIN locations l ON r.location_id = l.id
    WHERE r.location_id = ? AND r.availability = 'AVAILABLE'
  `;
    const params = [locationId];
    if (role) {
        query += ' AND r.role = ?';
        params.push(role);
    }
    return db.prepare(query).all(...params);
}
