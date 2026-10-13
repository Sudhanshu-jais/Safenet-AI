"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorrectiveAction = createCorrectiveAction;
exports.getCorrectiveActionById = getCorrectiveActionById;
exports.listCorrectiveActions = listCorrectiveActions;
exports.updateCorrectiveActionStatus = updateCorrectiveActionStatus;
const node_crypto_1 = __importDefault(require("node:crypto"));
const connection_js_1 = require("../db/connection.js");
const audit_js_1 = require("../middleware/audit.js");
const safetestEngine_js_1 = require("./safetestEngine.js");
function createCorrectiveAction(data) {
    const db = (0, connection_js_1.getDatabase)();
    if (!data.title || !data.weakness_description || !data.proposed_remedy || !data.owner || !data.verification_scenario_id) {
        throw new Error('Title, weakness description, proposed remedy, owner, and verification scenario are required.');
    }
    const id = `ca-${Date.now().toString().slice(-6)}-${node_crypto_1.default.randomBytes(2).toString('hex')}`;
    const now = new Date().toISOString();
    const priority = data.priority || 'HIGH';
    const insertStmt = db.prepare(`
    INSERT INTO corrective_actions (
      id, title, weakness_description, source_run_id, proposed_remedy,
      owner, priority, due_date, status, verification_scenario_id,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    insertStmt.run(id, data.title, data.weakness_description, data.source_run_id || null, data.proposed_remedy, data.owner, priority, data.due_date || null, 'OPEN', data.verification_scenario_id, 'Created from operational weakness evaluation.', now, now);
    (0, audit_js_1.recordAuditLog)({
        actorId: data.actorId || 'system',
        actorRole: data.actorRole || 'SYSTEM',
        actionType: 'CORRECTIVE_ACTION_CREATED',
        entityType: 'CORRECTIVE_ACTION',
        entityId: id,
        details: {
            title: data.title,
            weakness: data.weakness_description,
            owner: data.owner,
            sourceRunId: data.source_run_id,
            verificationScenarioId: data.verification_scenario_id,
        }
    });
    return getCorrectiveActionById(id);
}
function getCorrectiveActionById(id) {
    const db = (0, connection_js_1.getDatabase)();
    const row = db.prepare(`
    SELECT ca.*, s.title as verification_scenario_title
    FROM corrective_actions ca
    LEFT JOIN scenarios s ON ca.verification_scenario_id = s.id
    WHERE ca.id = ?
  `).get(id);
    return row || null;
}
function listCorrectiveActions(filters) {
    const db = (0, connection_js_1.getDatabase)();
    let query = `
    SELECT ca.*, s.title as verification_scenario_title
    FROM corrective_actions ca
    LEFT JOIN scenarios s ON ca.verification_scenario_id = s.id
    WHERE 1=1
  `;
    const params = [];
    if (filters?.status) {
        query += ' AND ca.status = ?';
        params.push(filters.status);
    }
    if (filters?.priority) {
        query += ' AND ca.priority = ?';
        params.push(filters.priority);
    }
    query += ' ORDER BY ca.created_at DESC';
    return db.prepare(query).all(...params);
}
function updateCorrectiveActionStatus(id, targetStatus, verificationRunId, actorId, actorRole, notes) {
    const db = (0, connection_js_1.getDatabase)();
    const action = getCorrectiveActionById(id);
    if (!action) {
        throw new Error(`Corrective action ${id} not found`);
    }
    const now = new Date().toISOString();
    let verifiedAt = action.verified_at;
    let verifiedBy = action.verified_by;
    let linkedRunId = verificationRunId || action.verification_run_id;
    // Strict Verification Gate: Cannot be marked VERIFIED without a valid passing test run
    if (targetStatus === 'VERIFIED') {
        if (!linkedRunId) {
            throw new Error('Verification gate error: A verification scenario run ID must be provided to verify this corrective action.');
        }
        const testRun = (0, safetestEngine_js_1.getScenarioRunById)(linkedRunId);
        if (!testRun) {
            throw new Error(`Verification run ${linkedRunId} does not exist in scenario run records.`);
        }
        if (testRun.scenario_id !== action.verification_scenario_id) {
            throw new Error(`Verification run scenario mismatch: Run ${linkedRunId} is for scenario '${testRun.scenario_id}', but action requires scenario '${action.verification_scenario_id}'.`);
        }
        if (testRun.status !== 'PASSED') {
            throw new Error(`Verification failed: Linked test run ${linkedRunId} ended with status '${testRun.status}' (${testRun.passed_checks}/${testRun.total_checks} checks passed). An action can only be marked VERIFIED when all scenario criteria PASS.`);
        }
        verifiedAt = now;
        verifiedBy = actorId;
    }
    db.prepare(`
    UPDATE corrective_actions 
    SET status = ?, verification_run_id = ?, notes = COALESCE(?, notes), verified_at = ?, verified_by = ?, updated_at = ?
    WHERE id = ?
  `).run(targetStatus, linkedRunId ?? null, notes ?? null, verifiedAt ?? null, verifiedBy ?? null, now, id);
    (0, audit_js_1.recordAuditLog)({
        actorId,
        actorRole,
        actionType: 'CORRECTIVE_ACTION_STATUS_CHANGED',
        entityType: 'CORRECTIVE_ACTION',
        entityId: id,
        details: {
            fromStatus: action.status,
            toStatus: targetStatus,
            verificationRunId: linkedRunId,
            notes,
        }
    });
    return getCorrectiveActionById(id);
}
