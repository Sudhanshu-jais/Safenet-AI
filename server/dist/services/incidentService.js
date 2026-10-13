"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncident = createIncident;
exports.getIncidentById = getIncidentById;
exports.listIncidents = listIncidents;
exports.getIncidentTimeline = getIncidentTimeline;
exports.transitionIncidentStatus = transitionIncidentStatus;
exports.assignIncidentResponder = assignIncidentResponder;
const node_crypto_1 = __importDefault(require("node:crypto"));
const connection_js_1 = require("../db/connection.js");
const audit_js_1 = require("../middleware/audit.js");
const aiAnalysisService_js_1 = require("./aiAnalysisService.js");
const responderService_js_1 = require("./responderService.js");
// Valid transition mapping
const VALID_TRANSITIONS = {
    REPORTED: ['ACKNOWLEDGED', 'CANCELLED'],
    ACKNOWLEDGED: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'ACKNOWLEDGED', 'CANCELLED'],
    IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
    RESOLVED: ['ACKNOWLEDGED'], // Allows operational reopening
    CANCELLED: ['REPORTED'],
};
async function createIncident(data) {
    const db = (0, connection_js_1.getDatabase)();
    if (!data.title || !data.description || !data.location_id || !data.zone) {
        throw new Error('Title, description, location, and zone are required fields.');
    }
    // Verify location exists
    const loc = db.prepare('SELECT id, name FROM locations WHERE id = ?').get(data.location_id);
    if (!loc) {
        throw new Error(`Invalid location ID: ${data.location_id}`);
    }
    // Run AI analysis / fallback
    const aiAnalysis = await (0, aiAnalysisService_js_1.analyzeIncidentReport)(data.title, data.description, loc.name, data.zone);
    const id = `inc-${Date.now().toString().slice(-6)}-${node_crypto_1.default.randomBytes(2).toString('hex')}`;
    const now = new Date().toISOString();
    const category = data.category || aiAnalysis.suggested_category;
    const priority = data.priority || aiAnalysis.suggested_priority;
    const isSimulation = data.is_simulation ? 1 : 0;
    const insertStmt = db.prepare(`
    INSERT INTO incidents (
      id, title, description, category, location_id, zone, priority, status,
      is_simulation, assigned_responder_id, ai_analysis_json,
      reported_at, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    insertStmt.run(id, data.title, data.description, category, data.location_id, data.zone, priority, 'REPORTED', isSimulation, null, JSON.stringify(aiAnalysis), now, data.actorId, now, now);
    // Timeline record
    const timelineStmt = db.prepare(`
    INSERT INTO incident_timeline (id, incident_id, from_status, to_status, actor, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    timelineStmt.run(`tl-${Date.now()}`, id, null, 'REPORTED', data.actorId, 'Initial report created', now);
    // Audit log
    (0, audit_js_1.recordAuditLog)({
        actorId: data.actorId,
        actorRole: data.actorRole,
        actionType: 'INCIDENT_CREATED',
        entityType: 'INCIDENT',
        entityId: id,
        details: {
            title: data.title,
            category,
            priority,
            isSimulation,
            locationId: data.location_id,
        }
    });
    return getIncidentById(id);
}
function getIncidentById(id) {
    const db = (0, connection_js_1.getDatabase)();
    const row = db.prepare(`
    SELECT i.*, 
           l.name as location_name,
           r.name as assigned_responder_name,
           r.callsign as assigned_responder_callsign
    FROM incidents i
    LEFT JOIN locations l ON i.location_id = l.id
    LEFT JOIN responders r ON i.assigned_responder_id = r.id
    WHERE i.id = ?
  `).get(id);
    return row || null;
}
function listIncidents(filters) {
    const db = (0, connection_js_1.getDatabase)();
    let query = `
    SELECT i.*, 
           l.name as location_name,
           r.name as assigned_responder_name,
           r.callsign as assigned_responder_callsign
    FROM incidents i
    LEFT JOIN locations l ON i.location_id = l.id
    LEFT JOIN responders r ON i.assigned_responder_id = r.id
    WHERE 1=1
  `;
    const params = [];
    if (filters?.location_id) {
        query += ' AND i.location_id = ?';
        params.push(filters.location_id);
    }
    if (filters?.status) {
        query += ' AND i.status = ?';
        params.push(filters.status);
    }
    if (filters?.priority) {
        query += ' AND i.priority = ?';
        params.push(filters.priority);
    }
    if (filters?.category) {
        query += ' AND i.category = ?';
        params.push(filters.category);
    }
    if (filters?.is_simulation !== undefined) {
        query += ' AND i.is_simulation = ?';
        params.push(filters.is_simulation ? 1 : 0);
    }
    if (filters?.search) {
        query += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.zone LIKE ?)';
        const searchWildcard = `%${filters.search}%`;
        params.push(searchWildcard, searchWildcard, searchWildcard);
    }
    query += ' ORDER BY i.created_at DESC';
    return db.prepare(query).all(...params);
}
function getIncidentTimeline(incidentId) {
    const db = (0, connection_js_1.getDatabase)();
    return db.prepare(`
    SELECT * FROM incident_timeline 
    WHERE incident_id = ? 
    ORDER BY timestamp ASC
  `).all(incidentId);
}
function transitionIncidentStatus(id, targetStatus, actorId, actorRole, notes) {
    const db = (0, connection_js_1.getDatabase)();
    const incident = getIncidentById(id);
    if (!incident) {
        throw new Error(`Incident ${id} not found`);
    }
    const allowed = VALID_TRANSITIONS[incident.status] || [];
    if (!allowed.includes(targetStatus)) {
        throw new Error(`Invalid status transition: cannot transition from '${incident.status}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ') || 'None'}`);
    }
    const now = new Date().toISOString();
    let ackAt = incident.acknowledged_at;
    let resAt = incident.resolved_at;
    if (targetStatus === 'ACKNOWLEDGED' && !ackAt) {
        ackAt = now;
    }
    if (targetStatus === 'RESOLVED') {
        resAt = now;
    }
    db.prepare(`
    UPDATE incidents 
    SET status = ?, acknowledged_at = ?, resolved_at = ?, updated_at = ?
    WHERE id = ?
  `).run(targetStatus, ackAt, resAt, now, id);
    // Record timeline
    db.prepare(`
    INSERT INTO incident_timeline (id, incident_id, from_status, to_status, actor, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`tl-${Date.now()}`, id, incident.status, targetStatus, actorId, notes || `Status transitioned to ${targetStatus}`, now);
    // Record audit
    (0, audit_js_1.recordAuditLog)({
        actorId,
        actorRole,
        actionType: 'INCIDENT_STATUS_TRANSITION',
        entityType: 'INCIDENT',
        entityId: id,
        details: {
            fromStatus: incident.status,
            toStatus: targetStatus,
            notes,
        }
    });
    return getIncidentById(id);
}
function assignIncidentResponder(incidentId, responderId, actorId, actorRole, notes) {
    const db = (0, connection_js_1.getDatabase)();
    const incident = getIncidentById(incidentId);
    if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
    }
    const responder = (0, responderService_js_1.getResponderById)(responderId);
    if (!responder) {
        throw new Error(`Responder ${responderId} not found`);
    }
    if (responder.availability !== 'AVAILABLE') {
        throw new Error(`Cannot assign responder ${responder.name} (${responder.callsign}): current status is '${responder.availability}'. Only AVAILABLE responders may be assigned.`);
    }
    // Location check warning/rule
    if (responder.location_id !== incident.location_id) {
        throw new Error(`Location mismatch: Responder is stationed at ${responder.location_name || responder.location_id}, but incident is at ${incident.location_name || incident.location_id}.`);
    }
    const now = new Date().toISOString();
    // Update incident to ASSIGNED status if it was REPORTED or ACKNOWLEDGED
    let newStatus = incident.status;
    if (incident.status === 'REPORTED' || incident.status === 'ACKNOWLEDGED') {
        newStatus = 'ASSIGNED';
    }
    db.prepare(`
    UPDATE incidents 
    SET assigned_responder_id = ?, status = ?, dispatched_at = ?, updated_at = ?
    WHERE id = ?
  `).run(responderId, newStatus, now, now, incidentId);
    // Update responder to ON_DUTY_BUSY
    db.prepare(`
    UPDATE responders 
    SET availability = 'ON_DUTY_BUSY', current_incident_id = ?
    WHERE id = ?
  `).run(incidentId, responderId);
    // Add timeline entry
    db.prepare(`
    INSERT INTO incident_timeline (id, incident_id, from_status, to_status, actor, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`tl-${Date.now()}`, incidentId, incident.status, newStatus, actorId, notes || `Assigned responder ${responder.name} (${responder.callsign})`, now);
    // Record audit
    (0, audit_js_1.recordAuditLog)({
        actorId,
        actorRole,
        actionType: 'INCIDENT_RESPONDER_ASSIGNED',
        entityType: 'INCIDENT',
        entityId: incidentId,
        details: {
            responderId,
            responderName: responder.name,
            callsign: responder.callsign,
            previousStatus: incident.status,
            newStatus,
        }
    });
    return getIncidentById(incidentId);
}
