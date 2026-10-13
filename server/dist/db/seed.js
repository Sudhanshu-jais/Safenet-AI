"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENARIO_DEFINITIONS = void 0;
exports.seedInitialScenarios = seedInitialScenarios;
exports.seedDemoData = seedDemoData;
exports.clearDemoData = clearDemoData;
const connection_js_1 = require("./connection.js");
exports.SCENARIO_DEFINITIONS = [
    {
        id: 'scn-unavail-resp',
        title: 'Primary Responder Unavailable',
        description: 'Evaluates whether the dispatch workflow detects when the assigned primary unit is offline/unavailable and reliably cascades to a verified secondary responder without dropping the incident.',
        category: 'ASSIGNMENT_FAILOVER',
        rule_version: 'v1.0',
        initial_conditions: {
            location: 'loc-transit',
            incident_priority: 'HIGH',
            primary_responder: 'resp-security-1',
            primary_status: 'UNAVAILABLE',
        },
        failure_condition: {
            type: 'PRIMARY_OFFLINE',
            description: 'Primary responder is marked UNAVAILABLE during critical incident assignment.',
        },
        expected_behavior: {
            detection_required: true,
            fallback_assignment_required: true,
            supervisor_alert_required: true,
            max_failover_latency_seconds: 60,
        },
        pass_criteria: [
            { id: 'chk-1', name: 'Identify Primary Unavailability', description: 'System must explicitly detect that primary responder is UNAVAILABLE.' },
            { id: 'chk-2', name: 'Secondary Unit Selection', description: 'System must select a qualified available secondary responder at the same location.' },
            { id: 'chk-3', name: 'Supervisor Notification', description: 'System must record an escalation notice for operational supervisor.' },
            { id: 'chk-4', name: 'Audit Integrity', description: 'Failover event must be immutably recorded in the audit log.' }
        ],
        active_rule_config: {
            auto_fallback_enabled: false, // In v1.0, fallback is disabled -> triggers initial failure!
            escalation_timeout_seconds: 60,
            supervisor_alert: false,
        }
    },
    {
        id: 'scn-comm-fail',
        title: 'Communication Failure & SLA Timeout',
        description: 'Evaluates system response when dispatched responder fails to acknowledge receipt of an alert within SLA threshold (180s).',
        category: 'COMMUNICATION_SLA',
        rule_version: 'v1.0',
        initial_conditions: {
            location: 'loc-market',
            incident_priority: 'HIGH',
            sla_seconds: 180,
        },
        failure_condition: {
            type: 'NO_ACKNOWLEDGEMENT',
            description: 'Dispatched unit does not transmit acknowledgement signal within 180 seconds.',
        },
        expected_behavior: {
            timeout_detection: true,
            audio_visual_escalation: true,
            alternate_channel_dispatch: true,
        },
        pass_criteria: [
            { id: 'chk-comm-1', name: 'Acknowledge Timer Tracking', description: 'System starts and tracks countdown upon dispatch.' },
            { id: 'chk-comm-2', name: 'Timeout Detection', description: 'System marks dispatch as UNACKNOWLEDGED after threshold.' },
            { id: 'chk-comm-3', name: 'Automated Tier-2 Escalation', description: 'Re-dispatches to backup channel or secondary unit.' }
        ],
        active_rule_config: {
            sla_seconds: 180,
            auto_escalate_on_timeout: true,
        }
    },
    {
        id: 'scn-handoff-fail',
        title: 'Failed Inter-Team Incident Handoff',
        description: 'Evaluates procedure when an incident transitions from Security to Medical/Facility, but the target department team has zero current capacity.',
        category: 'TEAM_HANDOFF',
        rule_version: 'v1.0',
        initial_conditions: {
            location: 'loc-campus',
            origin_role: 'SECURITY',
            target_role: 'MEDICAL',
        },
        failure_condition: {
            type: 'TARGET_ROLE_EXHAUSTED',
            description: 'Target medical team has 0 available responders.',
        },
        expected_behavior: {
            prevent_silent_drop: true,
            retain_origin_custody: true,
            mutual_aid_alert: true,
        },
        pass_criteria: [
            { id: 'chk-hand-1', name: 'Capacity Pre-Check', description: 'Verify target department capacity before releasing initial responder.' },
            { id: 'chk-hand-2', name: 'Prevent Orphaned Incident', description: 'Retain current responder in active state if transfer cannot be accepted.' },
            { id: 'chk-hand-3', name: 'Mutual Aid Escalation', description: 'Trigger mutual aid or supervisor queue alert.' }
        ],
        active_rule_config: {
            require_acceptance_before_release: true,
            allow_orphan_transition: false,
        }
    },
    {
        id: 'scn-ack-timeout',
        title: 'Required Dispatch Confirmation Missing',
        description: 'Tests fail-safe supervisor alert when dispatch acknowledgment is missing or corrupt in network transmission.',
        category: 'DISPATCH_VERIFICATION',
        rule_version: 'v1.0',
        initial_conditions: {
            location: 'loc-transit',
            priority: 'CRITICAL',
        },
        failure_condition: {
            type: 'CORRUPTED_ACK_PACKET',
            description: 'Mobile unit status packet fails validation check.',
        },
        expected_behavior: {
            detect_corrupt_ack: true,
            fallback_telephony_trigger: true,
        },
        pass_criteria: [
            { id: 'chk-ack-1', name: 'Validate Confirmation Token', description: 'Rejects invalid or unverified dispatch tokens.' },
            { id: 'chk-ack-2', name: 'Supervisor Fail-Safe Trigger', description: 'Immediately alerts console supervisor.' }
        ],
        active_rule_config: {
            strict_token_validation: true,
        }
    },
    {
        id: 'scn-after-hours',
        title: 'After-Hours Incident On-Call Matrix',
        description: 'Tests whether incidents occurring outside core operating shifts (22:00 - 06:00) route correctly to verified on-call responders instead of vacant daytime rosters.',
        category: 'SCHEDULE_FAILOVER',
        rule_version: 'v1.0',
        initial_conditions: {
            location: 'loc-campus',
            time_of_day: '02:30',
        },
        failure_condition: {
            type: 'DAYTIME_ROSTER_EMPTY',
            description: 'Standard day-shift roster has no active units logged in.',
        },
        expected_behavior: {
            detect_after_hours: true,
            activate_on_call_roster: true,
        },
        pass_criteria: [
            { id: 'chk-ah-1', name: 'Time-Window Policy Check', description: 'Identifies night-shift operational window.' },
            { id: 'chk-ah-2', name: 'On-Call Matrix Routing', description: 'Pings designated overnight on-call contact list.' }
        ],
        active_rule_config: {
            on_call_routing_active: true,
        }
    }
];
function seedInitialScenarios() {
    const db = (0, connection_js_1.getDatabase)();
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO scenarios (
      id, title, description, category, rule_version,
      initial_conditions_json, failure_condition_json,
      expected_behavior_json, pass_criteria_json,
      active_rule_config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    for (const s of exports.SCENARIO_DEFINITIONS) {
        insertStmt.run(s.id, s.title, s.description, s.category, s.rule_version, JSON.stringify(s.initial_conditions), JSON.stringify(s.failure_condition), JSON.stringify(s.expected_behavior), JSON.stringify(s.pass_criteria), JSON.stringify(s.active_rule_config), now, now);
    }
}
function seedDemoData() {
    const db = (0, connection_js_1.getDatabase)();
    const now = new Date().toISOString();
    // 1. Ensure scenarios exist
    seedInitialScenarios();
    // 2. Demonstration Locations (3 locations)
    const locStmt = db.prepare(`
    INSERT OR REPLACE INTO locations (id, name, type, zone_count, zones_json, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    locStmt.run('loc-campus', 'College Campus', 'CAMPUS', 4, JSON.stringify(['North Quad', 'Science Block', 'Student Union', 'Library Plaza']), 1, now);
    locStmt.run('loc-market', 'Market Area', 'MARKET', 3, JSON.stringify(['Central Bazaar', 'Produce Arcade', 'South Parking Lane']), 1, now);
    locStmt.run('loc-transit', 'Public Transport Hub', 'TRANSIT', 5, JSON.stringify(['Metro Concourse', 'Bus Bay East', 'Ticket Hall', 'Platform 1-2', 'Taxi Stand']), 1, now);
    // 3. Simulated Responders (2 responders)
    const respStmt = db.prepare(`
    INSERT OR REPLACE INTO responders (
      id, name, callsign, role, location_id, availability,
      current_incident_id, max_concurrent_tasks, is_simulated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    respStmt.run('resp-security-1', 'Alex Rivera', 'PATROL-41', 'SECURITY', 'loc-transit', 'AVAILABLE', null, 2, 1, now);
    respStmt.run('resp-med-1', 'Sam Chen', 'MEDIC-12', 'MEDICAL', 'loc-transit', 'AVAILABLE', null, 1, 1, now);
    respStmt.run('resp-backup-1', 'Elena Rostova', 'BACKUP-09', 'SECURITY', 'loc-transit', 'AVAILABLE', null, 2, 1, now);
    // 4. One Simulated Incident
    const incStmt = db.prepare(`
    INSERT OR REPLACE INTO incidents (
      id, title, description, category, location_id, zone, priority, status,
      is_simulation, assigned_responder_id, ai_analysis_json,
      reported_at, acknowledged_at, dispatched_at, resolved_at, created_by,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const demoAiAnalysis = {
        summary: 'Minor pedestrian slip reported near Platform 1 escalator. No structural hazard observed.',
        suggested_category: 'MEDICAL_MINOR',
        suggested_priority: 'LOW',
        missing_information: ['Specific escalator bank identifier', 'Injured party mobility status'],
        reasoning: 'Non-life-threatening injury in busy transit corridor; requires basic first aid and wet floor assessment.',
        source: 'RULE_BASED_FALLBACK',
    };
    incStmt.run('inc-demo-101', 'Minor slip and fall near escalator', 'Commuter slipped on damp surface near Platform 1 escalator. Alert and conscious, complaining of minor knee bruise.', 'MEDICAL_FIRST_AID', 'loc-transit', 'Platform 1-2', 'LOW', 'ACKNOWLEDGED', 1, // is_simulation: 1
    null, JSON.stringify(demoAiAnalysis), now, now, null, null, 'operator-demo', now, now);
    // 5. One Baseline Failed Scenario Run (SCN-001 under Rule v1.0)
    const runStmt = db.prepare(`
    INSERT OR REPLACE INTO scenario_runs (
      id, scenario_id, rule_version, status, started_at, completed_at,
      duration_ms, checks_json, passed_checks, total_checks,
      gaps_identified_json, ai_explanation_json, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const checksBaseline = [
        { id: 'chk-1', name: 'Identify Primary Unavailability', passed: true, expected: 'Primary responder offline detected', observed: 'Status UNAVAILABLE identified' },
        { id: 'chk-2', name: 'Secondary Unit Selection', passed: false, expected: 'Auto-select qualified secondary responder', observed: 'No fallback rule enabled in v1.0; incident stalled in ASSIGNMENT_FAIL' },
        { id: 'chk-3', name: 'Supervisor Notification', passed: false, expected: 'Supervisor queue escalation event', observed: 'No supervisor alert dispatched' },
        { id: 'chk-4', name: 'Audit Integrity', passed: true, expected: 'Record test event', observed: 'Audit record written: AUD-RUN-001' },
    ];
    const gapsBaseline = [
        'Workflow lacks automated failover trigger when primary unit is UNAVAILABLE',
        'Supervisor notification bypasses unattended assignment stalls',
    ];
    const aiExplanationBaseline = {
        summary: 'Scenario failed because rule configuration v1.0 has auto_fallback_enabled set to false.',
        root_cause: 'Missing automated failover routing definition in transit sector dispatch matrix.',
        recommended_action: 'Enable secondary responder fallback and configure supervisor escalation timeout.',
        source: 'DETERMINISTIC_EVALUATOR',
    };
    runStmt.run('run-base-001', 'scn-unavail-resp', 'v1.0', 'FAILED', now, now, 1450, JSON.stringify(checksBaseline), 2, 4, JSON.stringify(gapsBaseline), JSON.stringify(aiExplanationBaseline), 'system-demo');
    // 6. One Linked Corrective Action
    const caStmt = db.prepare(`
    INSERT OR REPLACE INTO corrective_actions (
      id, title, weakness_description, source_run_id, proposed_remedy,
      owner, priority, due_date, status, verification_scenario_id,
      verification_run_id, notes, verified_at, verified_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    caStmt.run('ca-001', 'Implement Automated Secondary Responder Fallback', 'Primary responder unavailability halts dispatch without automated handoff to available backup units in transit sector.', 'run-base-001', 'Update dispatch configuration to Rule v2.0 enabling auto-fallback to secondary qualified unit within 60 seconds.', 'Chief Dispatcher Morgan', 'HIGH', new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], 'OPEN', 'scn-unavail-resp', null, 'Awaiting rule configuration update and verification re-run.', null, null, now, now);
    // 7. Initial Audit Log Entry
    const auditStmt = db.prepare(`
    INSERT OR REPLACE INTO audit_logs (
      id, timestamp, actor_id, actor_role, action_type, entity_type, entity_id, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    auditStmt.run('aud-init-001', now, 'system-seed', 'ADMINISTRATOR', 'SYSTEM_DEMO_SEED', 'SYSTEM', 'all', JSON.stringify({ note: 'Seeded minimal demonstration dataset' }));
    return {
        message: 'Demo dataset successfully seeded.',
        counts: {
            locations: 3,
            responders: 3,
            incidents: 1,
            scenarios: 5,
            scenario_runs: 1,
            corrective_actions: 1,
        }
    };
}
function clearDemoData() {
    const db = (0, connection_js_1.getDatabase)();
    db.exec(`
    DELETE FROM audit_logs WHERE actor_id = 'system-seed';
    DELETE FROM corrective_actions WHERE id = 'ca-001';
    DELETE FROM scenario_runs WHERE id = 'run-base-001';
    DELETE FROM incidents WHERE id = 'inc-demo-101';
    DELETE FROM responders WHERE id IN ('resp-security-1', 'resp-med-1', 'resp-backup-1');
  `);
    return { message: 'Demo dataset removed safely.' };
}
