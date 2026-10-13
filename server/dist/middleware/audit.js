"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditLog = recordAuditLog;
const node_crypto_1 = __importDefault(require("node:crypto"));
const connection_js_1 = require("../db/connection.js");
function recordAuditLog(entry) {
    try {
        const db = (0, connection_js_1.getDatabase)();
        const id = `aud-${Date.now()}-${node_crypto_1.default.randomBytes(3).toString('hex')}`;
        const timestamp = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor_id, actor_role, action_type, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, timestamp, entry.actorId, entry.actorRole, entry.actionType, entry.entityType, entry.entityId, JSON.stringify(entry.details));
    }
    catch (err) {
        console.error('Failed to write audit log:', err);
    }
}
