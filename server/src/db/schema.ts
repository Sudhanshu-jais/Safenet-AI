import { getDatabase, ISqliteDatabase } from './connection.js';

export function initializeSchema(targetDb?: ISqliteDatabase): void {
  const db = targetDb || getDatabase();

  db.exec(`
    -- Locations
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      zone_count INTEGER NOT NULL DEFAULT 1,
      zones_json TEXT NOT NULL DEFAULT '[]',
      is_simulated INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Responders
    CREATE TABLE IF NOT EXISTS responders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      callsign TEXT NOT NULL,
      role TEXT NOT NULL,
      location_id TEXT NOT NULL,
      availability TEXT NOT NULL DEFAULT 'AVAILABLE',
      current_incident_id TEXT,
      max_concurrent_tasks INTEGER NOT NULL DEFAULT 2,
      is_simulated INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
    );

    -- Incidents
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location_id TEXT NOT NULL,
      zone TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'REPORTED',
      is_simulation INTEGER NOT NULL DEFAULT 0,
      assigned_responder_id TEXT,
      ai_analysis_json TEXT,
      reported_at TEXT NOT NULL,
      acknowledged_at TEXT,
      dispatched_at TEXT,
      resolved_at TEXT,
      created_by TEXT NOT NULL DEFAULT 'operator-1',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (assigned_responder_id) REFERENCES responders(id) ON DELETE SET NULL
    );

    -- Incident Timeline / Transitions
    CREATE TABLE IF NOT EXISTS incident_timeline (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor TEXT NOT NULL,
      notes TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    -- Scenarios definition library
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      rule_version TEXT NOT NULL DEFAULT 'v1.0',
      initial_conditions_json TEXT NOT NULL,
      failure_condition_json TEXT NOT NULL,
      expected_behavior_json TEXT NOT NULL,
      pass_criteria_json TEXT NOT NULL,
      active_rule_config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Scenario test runs
    CREATE TABLE IF NOT EXISTS scenario_runs (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      rule_version TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      checks_json TEXT NOT NULL,
      passed_checks INTEGER NOT NULL,
      total_checks INTEGER NOT NULL,
      gaps_identified_json TEXT NOT NULL,
      ai_explanation_json TEXT,
      created_by TEXT NOT NULL DEFAULT 'system',
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );

    -- Corrective Actions
    CREATE TABLE IF NOT EXISTS corrective_actions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      weakness_description TEXT NOT NULL,
      source_run_id TEXT,
      proposed_remedy TEXT NOT NULL,
      owner TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'HIGH',
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      verification_scenario_id TEXT NOT NULL,
      verification_run_id TEXT,
      notes TEXT,
      verified_at TEXT,
      verified_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (source_run_id) REFERENCES scenario_runs(id) ON DELETE SET NULL,
      FOREIGN KEY (verification_scenario_id) REFERENCES scenarios(id)
    );

    -- Audit Logs (Append-Only)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT NOT NULL
    );

    -- Workflow Rule Configs & Settings
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(location_id);
    CREATE INDEX IF NOT EXISTS idx_responders_location ON responders(location_id);
    CREATE INDEX IF NOT EXISTS idx_responders_availability ON responders(availability);
    CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario ON scenario_runs(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  `);
}
