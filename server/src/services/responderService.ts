import { getDatabase } from '../db/connection.js';
import { recordAuditLog } from '../middleware/audit.js';

export interface Responder {
  id: string;
  name: string;
  callsign: string;
  role: string;
  location_id: string;
  location_name?: string;
  availability: 'AVAILABLE' | 'ON_DUTY_BUSY' | 'OFF_DUTY' | 'UNAVAILABLE';
  current_incident_id: string | null;
  max_concurrent_tasks: number;
  is_simulated: number;
  created_at: string;
}

export function listResponders(filters?: { location_id?: string; availability?: string; role?: string }): Responder[] {
  const db = getDatabase();
  let query = `
    SELECT r.*, l.name as location_name 
    FROM responders r
    LEFT JOIN locations l ON r.location_id = l.id
    WHERE 1=1
  `;
  const params: any[] = [];

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
  return db.prepare(query).all(...params) as unknown as Responder[];
}

export function getResponderById(id: string): Responder | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT r.*, l.name as location_name 
    FROM responders r
    LEFT JOIN locations l ON r.location_id = l.id
    WHERE r.id = ?
  `).get(id);

  return (row as unknown as Responder) || null;
}

export function updateResponderAvailability(
  id: string,
  availability: 'AVAILABLE' | 'ON_DUTY_BUSY' | 'OFF_DUTY' | 'UNAVAILABLE',
  actorId: string,
  actorRole: string
): Responder {
  const db = getDatabase();
  const existing = getResponderById(id);
  if (!existing) {
    throw new Error(`Responder ${id} not found`);
  }

  db.prepare('UPDATE responders SET availability = ? WHERE id = ?').run(availability, id);

  recordAuditLog({
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

  return getResponderById(id)!;
}

export function findEligibleResponders(locationId: string, role?: string): Responder[] {
  const db = getDatabase();
  let query = `
    SELECT r.*, l.name as location_name
    FROM responders r
    LEFT JOIN locations l ON r.location_id = l.id
    WHERE r.location_id = ? AND r.availability = 'AVAILABLE'
  `;
  const params: any[] = [locationId];

  if (role) {
    query += ' AND r.role = ?';
    params.push(role);
  }

  return db.prepare(query).all(...params) as unknown as Responder[];
}
