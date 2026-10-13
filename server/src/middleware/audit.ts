import crypto from 'node:crypto';
import { getDatabase } from '../db/connection.js';
import { UserRole } from './auth.js';

export interface AuditLogEntry {
  actorId: string;
  actorRole: UserRole | string;
  actionType: string;
  entityType: 'INCIDENT' | 'RESPONDER' | 'SCENARIO' | 'SCENARIO_RUN' | 'CORRECTIVE_ACTION' | 'SYSTEM';
  entityId: string;
  details: Record<string, any>;
}

export function recordAuditLog(entry: AuditLogEntry): void {
  try {
    const db = getDatabase();
    const id = `aud-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor_id, actor_role, action_type, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      timestamp,
      entry.actorId || 'system',
      entry.actorRole || 'SYSTEM',
      entry.actionType,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.details)
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
