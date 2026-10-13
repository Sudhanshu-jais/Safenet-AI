export type UserRole = 'ADMINISTRATOR' | 'OPERATOR' | 'AUDITOR';

export interface Location {
  id: string;
  name: string;
  type: 'CAMPUS' | 'MARKET' | 'TRANSIT';
  zone_count: number;
  zones_json: string;
  is_simulated: number;
}

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

export type IncidentStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IncidentAnalysis {
  summary: string;
  suggested_category: string;
  suggested_priority: IncidentPriority;
  missing_information: string[];
  reasoning: string;
  source: 'GEMINI_AI' | 'RULE_BASED_FALLBACK';
  confidence: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  location_id: string;
  location_name?: string;
  zone: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  is_simulation: number;
  assigned_responder_id: string | null;
  assigned_responder_name?: string;
  assigned_responder_callsign?: string;
  ai_analysis_json: string | null;
  reported_at: string;
  acknowledged_at: string | null;
  dispatched_at: string | null;
  resolved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentTimelineEntry {
  id: string;
  incident_id: string;
  from_status: string | null;
  to_status: string;
  actor: string;
  notes: string | null;
  timestamp: string;
}

export interface ScenarioCheck {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  observed: string;
}

export interface ScenarioRun {
  id: string;
  scenario_id: string;
  scenario_title?: string;
  rule_version: string;
  status: 'PASSED' | 'FAILED';
  started_at: string;
  completed_at: string;
  duration_ms: number;
  checks_json: string;
  passed_checks: number;
  total_checks: number;
  gaps_identified_json: string;
  ai_explanation_json: string | null;
  created_by: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  rule_version: string;
  initial_conditions_json: string;
  failure_condition_json: string;
  expected_behavior_json: string;
  pass_criteria_json: string;
  active_rule_config_json: string;
  created_at: string;
  updated_at: string;
}

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

export interface ComparisonDiffCheck {
  check_id: string;
  name: string;
  status_in_a: boolean;
  status_in_b: boolean;
  diff_status: 'RESOLVED' | 'MAINTAINED_PASS' | 'REGRESSED' | 'PERSISTENT_FAIL';
  expected_b: string;
  observed_b: string;
}

export interface ComparisonResult {
  runA: {
    id: string;
    scenario_id: string;
    scenario_title?: string;
    rule_version: string;
    status: string;
    passed_checks: number;
    total_checks: number;
    pass_rate: number;
    completed_at: string;
  };
  runB: {
    id: string;
    scenario_id: string;
    scenario_title?: string;
    rule_version: string;
    status: string;
    passed_checks: number;
    total_checks: number;
    pass_rate: number;
    completed_at: string;
  };
  metrics: {
    outcome_improved: boolean;
    pass_rate_delta: number;
    completion_rate_before: number;
    completion_rate_after: number;
    resolved_checks_count: number;
    regressed_checks_count: number;
    duration_delta_ms: number;
  };
  check_diff: ComparisonDiffCheck[];
  gaps_resolved: string[];
  gaps_persistent: string[];
  gaps_new: string[];
  is_compatible_scenario: boolean;
  notes: string;
}

export interface ProofSummary {
  scenario_runs: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
  };
  corrective_actions: {
    total: number;
    verified: number;
    open: number;
    verification_rate: number;
  };
  trends: Array<{
    date: string;
    pass_rate: number;
    runs: number;
  }>;
  recurring_gaps: Array<{
    gap: string;
    count: number;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details_json: string;
}

export interface SystemStats {
  open_incidents: number;
  awaiting_acknowledgement: number;
  active_workflows: number;
  unresolved_weaknesses: number;
  latest_pass_rate: number | null;
  total_runs: number;
}
