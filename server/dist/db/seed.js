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
function seedInitialScenarios(targetDb) {
    const db = targetDb || (0, connection_js_1.getDatabase)();
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
function seedDemoData(targetDb) {
    const db = targetDb || (0, connection_js_1.getDatabase)();
    const now = new Date().toISOString();
    // 1. Ensure scenarios exist
    seedInitialScenarios(db);
    // 2. Demonstration Locations (3 locations)
    const locStmt = db.prepare(`
    INSERT OR REPLACE INTO locations (id, name, type, zone_count, zones_json, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    locStmt.run('loc-campus', 'College Campus', 'CAMPUS', 4, JSON.stringify(['North Quad', 'Science Block', 'Student Union', 'Library Plaza']), 1, now);
    locStmt.run('loc-market', 'Market Area', 'MARKET', 3, JSON.stringify(['Central Bazaar', 'Produce Arcade', 'South Parking Lane']), 1, now);
    locStmt.run('loc-transit', 'Public Transport Hub', 'TRANSIT', 5, JSON.stringify(['Metro Concourse', 'Bus Bay East', 'Ticket Hall', 'Platform 1-2', 'Taxi Stand']), 1, now);
    // 3. Simulated Responders (6 responders across all locations)
    const respStmt = db.prepare(`
    INSERT OR REPLACE INTO responders (
      id, name, callsign, role, location_id, availability,
      current_incident_id, max_concurrent_tasks, is_simulated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const DEMO_RESPONDERS = [
        { id: 'resp-security-1', name: 'Alex Rivera', callsign: 'PATROL-41', role: 'SECURITY', loc: 'loc-transit', avail: 'AVAILABLE', max: 2 },
        { id: 'resp-med-1', name: 'Sam Chen', callsign: 'MEDIC-12', role: 'MEDICAL', loc: 'loc-transit', avail: 'AVAILABLE', max: 1 },
        { id: 'resp-backup-1', name: 'Elena Rostova', callsign: 'BACKUP-09', role: 'SECURITY', loc: 'loc-transit', avail: 'AVAILABLE', max: 2 },
        { id: 'resp-campus-1', name: 'Marcus Vance', callsign: 'PATROL-15', role: 'SECURITY', loc: 'loc-campus', avail: 'AVAILABLE', max: 2 },
        { id: 'resp-campus-2', name: 'Dr. Priya Sharma', callsign: 'FIRST-AID-03', role: 'MEDICAL', loc: 'loc-campus', avail: 'AVAILABLE', max: 1 },
        { id: 'resp-market-1', name: 'David Miller', callsign: 'PATROL-88', role: 'SECURITY', loc: 'loc-market', avail: 'AVAILABLE', max: 2 },
    ];
    for (const r of DEMO_RESPONDERS) {
        respStmt.run(r.id, r.name, r.callsign, r.role, r.loc, r.avail, null, r.max, 1, now);
    }
    // 4. Comprehensive Phase-1 Incidents (20 realistic public safety events)
    const incStmt = db.prepare(`
    INSERT OR REPLACE INTO incidents (
      id, title, description, category, location_id, zone, priority, status,
      is_simulation, assigned_responder_id, ai_analysis_json,
      reported_at, acknowledged_at, dispatched_at, resolved_at, created_by,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const timelineStmt = db.prepare(`
    INSERT OR REPLACE INTO incident_timeline (id, incident_id, from_status, to_status, actor, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const DEMO_INCIDENTS = [
        {
            id: 'inc-101',
            title: 'Platform escalator mechanical jam & crowd surge',
            description: 'Sudden stoppage on Platform 1-2 up-escalator during morning peak. Passenger backlog forming rapidly on concourse.',
            category: 'CROWD_SURGE',
            location_id: 'loc-transit',
            zone: 'Platform 1-2',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            assigned_responder_id: 'resp-security-1',
            summary: 'Potential crushing hazard in restricted transit corridor. Immediate crowd diversion required.',
        },
        {
            id: 'inc-102',
            title: 'Minor pedestrian slip near Platform 1 escalator',
            description: 'Commuter slipped on damp surface. Alert and conscious, complaining of minor knee bruise.',
            category: 'MEDICAL_FIRST_AID',
            location_id: 'loc-transit',
            zone: 'Platform 1-2',
            priority: 'LOW',
            status: 'ACKNOWLEDGED',
            assigned_responder_id: null,
            summary: 'Non-life-threatening injury. Basic first aid and floor drying required.',
        },
        {
            id: 'inc-103',
            title: 'Water pipe rupture in Science Block basement',
            description: 'High pressure cold water line burst near chemistry storage. Water accumulation rising toward utility conduits.',
            category: 'INFRASTRUCTURE_HAZARD',
            location_id: 'loc-campus',
            zone: 'Science Block',
            priority: 'CRITICAL',
            status: 'ASSIGNED',
            assigned_responder_id: 'resp-campus-1',
            summary: 'Critical structural risk to electrical distribution. Facilities dispatch dispatched immediately.',
        },
        {
            id: 'inc-104',
            title: 'Electrical short circuit odor in Student Union',
            description: 'Acrid burning smell reported near second floor student lounge ventilation intake.',
            category: 'FIRE_HAZARD',
            location_id: 'loc-campus',
            zone: 'Student Union',
            priority: 'HIGH',
            status: 'REPORTED',
            assigned_responder_id: null,
            summary: 'Electrical insulation failure suspected. Pre-evacuation inspection pending.',
        },
        {
            id: 'inc-105',
            title: 'Unattended baggage near Central Bazaar crossing',
            description: 'Large black duffel bag left unattended beside Produce Arcade information kiosk for over 25 minutes.',
            category: 'SECURITY_PATROL',
            location_id: 'loc-market',
            zone: 'Central Bazaar',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            assigned_responder_id: 'resp-market-1',
            summary: 'Unattended parcel in high-footfall zone. Security perimeter established for K9 assessment.',
        },
        {
            id: 'inc-106',
            title: 'Dehydration and fainting near Library Plaza',
            description: 'Undergraduate student collapsed during outdoor career fair in direct sunlight. Responsive to sternal rub.',
            category: 'MEDICAL_FIRST_AID',
            location_id: 'loc-campus',
            zone: 'Library Plaza',
            priority: 'MEDIUM',
            status: 'RESOLVED',
            assigned_responder_id: 'resp-campus-2',
            summary: 'Patient treated with electrolyte hydration. Vitals normalized, released to student health.',
        },
        {
            id: 'inc-107',
            title: 'Vehicular delivery congestion in South Parking Lane',
            description: 'Three freight delivery trucks blocking emergency fire turnaround lane in south lot.',
            category: 'TRAFFIC_CONGESTION',
            location_id: 'loc-market',
            zone: 'South Parking Lane',
            priority: 'MEDIUM',
            status: 'REPORTED',
            assigned_responder_id: null,
            summary: 'Emergency ingress obstruction. Traffic coordination alert generated.',
        },
        {
            id: 'inc-108',
            title: 'Power grid voltage fluctuation in Metro Concourse',
            description: 'Flickering overhead emergency lighting and automated fare gate resets across concourse west turnstiles.',
            category: 'INFRASTRUCTURE_HAZARD',
            location_id: 'loc-transit',
            zone: 'Metro Concourse',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            assigned_responder_id: 'resp-backup-1',
            summary: 'Transit power sub-panel brownout. Manual turnstile bypass activated.',
        },
        {
            id: 'inc-109',
            title: 'Elderly shopper shortness of breath in Produce Arcade',
            description: 'Senior patron experiencing mild respiratory distress and dizziness near central fountain.',
            category: 'MEDICAL_FIRST_AID',
            location_id: 'loc-market',
            zone: 'Produce Arcade',
            priority: 'HIGH',
            status: 'ASSIGNED',
            assigned_responder_id: null,
            summary: 'Priority medical assessment dispatched. Oxygen canister unit in transit.',
        },
        {
            id: 'inc-110',
            title: 'Campus North Quad gate emergency sensor offline',
            description: 'Perimeter beam sensor loop reporting intermittent loss of telemetry during student influx.',
            category: 'INFRASTRUCTURE_HAZARD',
            location_id: 'loc-campus',
            zone: 'North Quad',
            priority: 'LOW',
            status: 'REPORTED',
            assigned_responder_id: null,
            summary: 'Sensor battery degradation suspected. Physical security backup assigned.',
        },
        {
            id: 'inc-111',
            title: 'Bus Bay East lane barrier malfunction',
            description: 'Automated pneumatic bollard jammed at 45 degree angle, preventing standard transit bus departures.',
            category: 'TRAFFIC_CONGESTION',
            location_id: 'loc-transit',
            zone: 'Bus Bay East',
            priority: 'MEDIUM',
            status: 'ACKNOWLEDGED',
            assigned_responder_id: null,
            summary: 'Surface transit delay alert propagated to dispatch hub.',
        },
        {
            id: 'inc-112',
            title: 'Chemical reagent spill in Science Block laboratory 302',
            description: '2 liters of dilute cleaning solvent spilled onto chemical-resistant flooring. Fume hood operating normally.',
            category: 'INFRASTRUCTURE_HAZARD',
            location_id: 'loc-campus',
            zone: 'Science Block',
            priority: 'HIGH',
            status: 'RESOLVED',
            assigned_responder_id: 'resp-campus-1',
            summary: 'Neutralization powder applied. Room ventilated and verified safe by EHS.',
        },
        {
            id: 'inc-113',
            title: 'Ticket Hall fare kiosk tamper alert',
            description: 'Anti-tamper vibration sensor triggered on central ticket terminal #4.',
            category: 'SECURITY_PATROL',
            location_id: 'loc-transit',
            zone: 'Ticket Hall',
            priority: 'MEDIUM',
            status: 'REPORTED',
            assigned_responder_id: null,
            summary: 'Physical inspection dispatched to rule out coin box tampering.',
        },
        {
            id: 'inc-114',
            title: 'Heat exhaustion during afternoon market rush',
            description: 'Market employee reported feeling dizzy with severe muscle cramps near vendor stall 14.',
            category: 'MEDICAL_FIRST_AID',
            location_id: 'loc-market',
            zone: 'Central Bazaar',
            priority: 'MEDIUM',
            status: 'RESOLVED',
            assigned_responder_id: null,
            summary: 'Treated on scene with cold packs and hydration. Returned to light duties.',
        },
        {
            id: 'inc-115',
            title: 'Taxi Stand queue disturbance & unauthorized access',
            description: 'Unpermitted commercial vehicle attempting to bypass queue barriers near transit dispatch booth.',
            category: 'SECURITY_PATROL',
            location_id: 'loc-transit',
            zone: 'Taxi Stand',
            priority: 'LOW',
            status: 'ACKNOWLEDGED',
            assigned_responder_id: null,
            summary: 'Operator monitoring CCTV; verbal compliance achieved.',
        },
        {
            id: 'inc-116',
            title: 'Trash receptacle smoldering near Student Union patio',
            description: 'Small smoke plume emanating from exterior metal waste bin. Extinguished with water canister, assessing container.',
            category: 'FIRE_HAZARD',
            location_id: 'loc-campus',
            zone: 'Student Union',
            priority: 'LOW',
            status: 'RESOLVED',
            assigned_responder_id: null,
            summary: 'Cigarette discard identified as ignition source. No structural exposure.',
        },
        {
            id: 'inc-117',
            title: 'Crowd surge at Central Bazaar evening festival',
            description: 'Unexpected pedestrian bottleneck at east pedestrian archway following festival stage performance.',
            category: 'CROWD_SURGE',
            location_id: 'loc-market',
            zone: 'Central Bazaar',
            priority: 'CRITICAL',
            status: 'IN_PROGRESS',
            assigned_responder_id: 'resp-market-1',
            summary: 'Secondary exit gates opened. Crowd flow stabilizing under directional marshaling.',
        },
        {
            id: 'inc-118',
            title: 'Elevator emergency telephone offline in Science Block',
            description: 'Routine automated telemetry ping failed for Science Block elevator car 2.',
            category: 'INFRASTRUCTURE_HAZARD',
            location_id: 'loc-campus',
            zone: 'Science Block',
            priority: 'LOW',
            status: 'REPORTED',
            assigned_responder_id: null,
            summary: 'Car grounded to lobby pending intercom diagnostics.',
        },
        {
            id: 'inc-119',
            title: 'Transit concourse shattered display glass',
            description: 'Impact fractured advertising display panel near western turnstiles. Shards contained, area cordoned.',
            category: 'SECURITY_PATROL',
            location_id: 'loc-transit',
            zone: 'Metro Concourse',
            priority: 'LOW',
            status: 'RESOLVED',
            assigned_responder_id: 'resp-security-1',
            summary: 'Debris swept and boarded. Safe pedestrian passage re-established.',
        },
        {
            id: 'inc-120',
            title: 'Produce Arcade refrigeration drainage overflow',
            description: 'Commercial walk-in cooler condensation line overflowed into customer walkway lane.',
            category: 'INFRASTRUCTURE_HAZARD',
            location_id: 'loc-market',
            zone: 'Produce Arcade',
            priority: 'LOW',
            status: 'ACKNOWLEDGED',
            assigned_responder_id: null,
            summary: 'Maintenance notified; caution signs positioned.',
        }
    ];
    for (const inc of DEMO_INCIDENTS) {
        const aiAnalysis = {
            summary: inc.summary,
            suggested_category: inc.category,
            suggested_priority: inc.priority,
            missing_information: [],
            reasoning: 'Autonomous procedural triage and rule validation verified.',
            source: 'RULE_BASED_FALLBACK',
        };
        incStmt.run(inc.id, inc.title, inc.description, inc.category, inc.location_id, inc.zone, inc.priority, inc.status, 1, inc.assigned_responder_id, JSON.stringify(aiAnalysis), now, inc.status !== 'REPORTED' ? now : null, inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS' || inc.status === 'RESOLVED' ? now : null, inc.status === 'RESOLVED' ? now : null, 'operator-demo', now, now);
        timelineStmt.run(`tl-${inc.id}-1`, inc.id, null, 'REPORTED', 'system', 'Initial incident telemetry received', now);
        if (inc.status !== 'REPORTED') {
            timelineStmt.run(`tl-${inc.id}-2`, inc.id, 'REPORTED', inc.status, 'operator-demo', `Status transitioned to ${inc.status}`, now);
        }
    }
    // 5. Baseline Historical Scenario Runs (Demonstrating testing & improvement)
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
    const checksVerified = [
        { id: 'chk-1', name: 'Identify Primary Unavailability', passed: true, expected: 'Primary responder offline detected', observed: 'Status UNAVAILABLE identified in 12ms' },
        { id: 'chk-2', name: 'Secondary Unit Selection', passed: true, expected: 'Auto-select qualified secondary responder', observed: 'Backup unit resp-backup-1 selected automatically' },
        { id: 'chk-3', name: 'Supervisor Notification', passed: true, expected: 'Supervisor queue escalation event', observed: 'Supervisor escalation token ESC-881 dispatched' },
        { id: 'chk-4', name: 'Audit Integrity', passed: true, expected: 'Record test event', observed: 'Audit trail verified with HMAC seal' },
    ];
    runStmt.run('run-base-001', 'scn-unavail-resp', 'v1.0', 'FAILED', now, now, 1450, JSON.stringify(checksBaseline), 2, 4, JSON.stringify(['Workflow lacks automated failover trigger when primary unit is UNAVAILABLE', 'Supervisor notification bypasses unattended stalls']), JSON.stringify({ summary: 'Failed under Rule v1.0 due to disabled automated failover.', root_cause: 'Missing automated failover definition in dispatch matrix.', recommended_action: 'Upgrade to Rule v2.0.', source: 'DETERMINISTIC_EVALUATOR' }), 'system-demo');
    runStmt.run('run-verif-001', 'scn-unavail-resp', 'v2.0', 'PASSED', now, now, 980, JSON.stringify(checksVerified), 4, 4, JSON.stringify([]), JSON.stringify({ summary: 'All 4 verification gates passed under Rule v2.0 with active failover routing.', root_cause: 'None. Procedural compliance 100%.', recommended_action: 'Procedure verified.', source: 'DETERMINISTIC_EVALUATOR' }), 'admin-1');
    // 6. Linked Actionable Corrective Actions
    const caStmt = db.prepare(`
    INSERT OR REPLACE INTO corrective_actions (
      id, title, weakness_description, source_run_id, proposed_remedy,
      owner, priority, due_date, status, verification_scenario_id,
      verification_run_id, notes, verified_at, verified_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    caStmt.run('ca-001', 'Implement Automated Secondary Responder Fallback', 'Primary responder unavailability halts dispatch without automated handoff to available backup units in transit sector.', 'run-base-001', 'Update dispatch configuration to Rule v2.0 enabling auto-fallback to secondary qualified unit within 60 seconds.', 'Chief Dispatcher Morgan', 'HIGH', new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], 'OPEN', 'scn-unavail-resp', null, 'Awaiting deployment in secondary terminal zones.', null, null, now, now);
    caStmt.run('ca-002', 'Standardize Transit Sector Evacuation Handoff Protocol', 'Procedural gap identified during multi-unit staging simulation at metro concourse.', 'run-base-001', 'Enact Rule v2.0 secondary routing matrix with automatic supervisor alert.', 'Operations Lead Vance', 'HIGH', new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], 'VERIFIED', 'scn-unavail-resp', 'run-verif-001', 'Proven passing under test run-verif-001.', now, 'admin-1', now, now);
    // 7. Initial Audit Log Entries
    const auditStmt = db.prepare(`
    INSERT OR REPLACE INTO audit_logs (
      id, timestamp, actor_id, actor_role, action_type, entity_type, entity_id, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    auditStmt.run('aud-init-001', now, 'system-seed', 'ADMINISTRATOR', 'SYSTEM_DEMO_SEED', 'SYSTEM', 'all', JSON.stringify({ note: 'Seeded comprehensive Phase-1 operational intelligence dataset', total_incidents: DEMO_INCIDENTS.length }));
    return {
        message: 'Phase-1 operational network successfully initialized.',
        counts: {
            locations: 3,
            responders: DEMO_RESPONDERS.length,
            incidents: DEMO_INCIDENTS.length,
            scenarios: 5,
            scenario_runs: 2,
            corrective_actions: 2,
        }
    };
}
function clearDemoData(targetDb) {
    const db = targetDb || (0, connection_js_1.getDatabase)();
    db.exec(`
    DELETE FROM audit_logs WHERE actor_id = 'system-seed';
    DELETE FROM corrective_actions WHERE id IN ('ca-001', 'ca-002');
    DELETE FROM scenario_runs WHERE id IN ('run-base-001', 'run-verif-001');
    DELETE FROM incident_timeline WHERE actor = 'system' OR actor = 'operator-demo';
    DELETE FROM incidents WHERE is_simulation = 1;
    DELETE FROM responders WHERE is_simulated = 1;
  `);
    return { message: 'Demo dataset removed safely.' };
}
