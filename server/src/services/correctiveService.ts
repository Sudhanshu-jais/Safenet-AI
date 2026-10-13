import crypto from 'node:crypto';
import { getDatabase } from '../db/connection.js';
import { recordAuditLog } from '../middleware/audit.js';
import { getScenarioRunById } from './safetestEngine.js';

export type CorrectiveActionStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_VERIFICATION' | 'VERIFIED' | 'REOPENED';
export type CorrectiveActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CorrectiveAction {
  id: string;
  title: string;
  weakness_description: string;
  source_run_id: string | null;
  proposed_remedy: string;
  owner: string;
  priority: CorrectiveActionPriority;
  due_date: string | null;
  status: CorrectiveActionStatus;
  verification_scenario_id: string;
  verification_scenario_title?: string;
  verification_run_id: string | null;
  notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export function createCorrectiveAction(data: {
  title: string;
  weakness_description: string;
  source_run_id?: string;
  proposed_remedy: string;
  owner: string;
  priority?: CorrectiveActionPriority;
  due_date?: string;
  verification_scenario_id: string;
  actorId?: string;
  actorRole?: string;
}): CorrectiveAction {
  const db = getDatabase();

  if (!data.title || !data.weakness_description || !data.proposed_remedy || !data.owner || !data.verification_scenario_id) {
    throw new Error('Title, weakness description, proposed remedy, owner, and verification scenario are required.');
  }

  const id = `ca-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();
  const priority = data.priority || 'HIGH';

  const insertStmt = db.prepare(`
    INSERT INTO corrective_actions (
      id, title, weakness_description, source_run_id, proposed_remedy,
      owner, priority, due_date, status, verification_scenario_id,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    id,
    data.title,
    data.weakness_description,
    data.source_run_id || null,
    data.proposed_remedy,
    data.owner,
    priority,
    data.due_date || null,
    'OPEN',
    data.verification_scenario_id,
    'Created from operational weakness evaluation.',
    now,
    now
  );

  recordAuditLog({
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

  return getCorrectiveActionById(id)!;
}

export function getCorrectiveActionById(id: string): CorrectiveAction | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT ca.*, s.title as verification_scenario_title
    FROM corrective_actions ca
    LEFT JOIN scenarios s ON ca.verification_scenario_id = s.id
    WHERE ca.id = ?
  `).get(id) as unknown as CorrectiveAction | undefined;

  return row || null;
}

export function listCorrectiveActions(filters?: { status?: string; priority?: string }): CorrectiveAction[] {
  const db = getDatabase();
  let query = `
    SELECT ca.*, s.title as verification_scenario_title
    FROM corrective_actions ca
    LEFT JOIN scenarios s ON ca.verification_scenario_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.status) {
    query += ' AND ca.status = ?';
    params.push(filters.status);
  }
  if (filters?.priority) {
    query += ' AND ca.priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY ca.created_at DESC';
  return db.prepare(query).all(...params) as unknown as CorrectiveAction[];
}

export function updateCorrectiveActionStatus(
  id: string,
  targetStatus: CorrectiveActionStatus,
  verificationRunId: string | undefined,
  actorId: string,
  actorRole: string,
  notes?: string
): CorrectiveAction {
  const db = getDatabase();
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
      throw new Error(
        'Verification gate error: A verification scenario run ID must be provided to verify this corrective action.'
      );
    }

    const testRun = getScenarioRunById(linkedRunId);
    if (!testRun) {
      throw new Error(`Verification run ${linkedRunId} does not exist in scenario run records.`);
    }

    if (testRun.scenario_id !== action.verification_scenario_id) {
      throw new Error(
        `Verification run scenario mismatch: Run ${linkedRunId} is for scenario '${testRun.scenario_id}', but action requires scenario '${action.verification_scenario_id}'.`
      );
    }

    if (testRun.status !== 'PASSED') {
      throw new Error(
        `Verification failed: Linked test run ${linkedRunId} ended with status '${testRun.status}' (${testRun.passed_checks}/${testRun.total_checks} checks passed). An action can only be marked VERIFIED when all scenario criteria PASS.`
      );
    }

    verifiedAt = now;
    verifiedBy = actorId;
  }

  db.prepare(`
    UPDATE corrective_actions 
    SET status = ?, verification_run_id = ?, notes = COALESCE(?, notes), verified_at = ?, verified_by = ?, updated_at = ?
    WHERE id = ?
  `).run(targetStatus, linkedRunId ?? null, notes ?? null, verifiedAt ?? null, verifiedBy ?? null, now, id);

  recordAuditLog({
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

  return getCorrectiveActionById(id)!;
}
