import { getDatabase, ISqliteDatabase } from './connection.js';

export const SCENARIO_DEFINITIONS = [
  {
    id: 'scn-unavail-resp',
    title: 'Lone Commuter SOS — Primary Pink Patrol Unavailable',
    description: 'Evaluates whether the women safety dispatch workflow detects when the assigned primary Pink Patrol unit is offline/engaged and reliably cascades to a verified secondary responder without dropping the distress alert.',
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
    title: 'Midnight Escort Request SLA Timeout',
    description: 'Evaluates system response when dispatched female escort responder fails to acknowledge receipt of an alert within SLA threshold (180s).',
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
    title: 'Cab Deviation Inter-Agency Police Handoff',
    description: 'Evaluates procedure when a transit cab deviation alert requires cross-agency handoff to emergency PCR police vans, but the target department team has zero current capacity.',
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
    title: 'Distress Beacon Telemetry Confirmation Missing',
    description: 'Tests fail-safe supervisor alert when a silent mobile SOS signal confirmation packet is missing or corrupt in network transmission.',
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
    title: 'Midnight 02:00 AM Women Safety On-Call Matrix',
    description: 'Tests whether emergency requests occurring outside standard shifts route correctly to verified on-call female marshals and night response units instead of vacant daytime rosters.',
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

export function seedInitialScenarios(targetDb?: ISqliteDatabase): void {
  const db = targetDb || getDatabase();
  const now = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO scenarios (
      id, title, description, category, rule_version,
      initial_conditions_json, failure_condition_json,
      expected_behavior_json, pass_criteria_json,
      active_rule_config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of SCENARIO_DEFINITIONS) {
    insertStmt.run(
      s.id,
      s.title,
      s.description,
      s.category,
      s.rule_version,
      JSON.stringify(s.initial_conditions),
      JSON.stringify(s.failure_condition),
      JSON.stringify(s.expected_behavior),
      JSON.stringify(s.pass_criteria),
      JSON.stringify(s.active_rule_config),
      now,
      now
    );
  }
}

export function seedDemoData(targetDb?: ISqliteDatabase): { message: string; counts: Record<string, number> } {
  const db = targetDb || getDatabase();
  const now = new Date().toISOString();

  // 1. Ensure scenarios exist
  seedInitialScenarios(db);

  // 2. Demonstration Locations (Pilot sectors with extensible architecture)
  const locStmt = db.prepare(`
    INSERT OR REPLACE INTO locations (id, name, type, zone_count, zones_json, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  locStmt.run(
    'loc-campus',
    'University, Campus & Hostel Zones (Pilot - Extensible)',
    'CAMPUS',
    4,
    JSON.stringify(['Girls Hostel Quad', 'Library Dark Pathway', 'Student Center Plaza', 'Science Corridor']),
    1,
    now
  );

  locStmt.run(
    'loc-market',
    'City Center, Markets & Shopping Plazas (Pilot - Extensible)',
    'MARKET',
    4,
    JSON.stringify(['Multi-Level Parking (Women Zone)', 'Desolate Back Alley', 'Main Street Promenade', 'Auto-Rickshaw Stand']),
    1,
    now
  );

  locStmt.run(
    'loc-transit',
    'Metro, Transit & Train Terminals (Pilot - Extensible)',
    'TRANSIT',
    5,
    JSON.stringify(['Ladies Waiting Lounge', 'Metro Concourse Exit 3', 'Outer Cab/Taxi Bay', 'Underpass Walkway', 'Platform 1-2']),
    1,
    now
  );

  // 3. Simulated Responders (6 dedicated Women Safety & Pink Patrol units)
  const respStmt = db.prepare(`
    INSERT OR REPLACE INTO responders (
      id, name, callsign, role, location_id, availability,
      current_incident_id, max_concurrent_tasks, is_simulated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const DEMO_RESPONDERS = [
    { id: 'resp-security-1', name: 'Officer Ananya Sharma', callsign: 'PINK-PATROL-01', role: 'SECURITY', loc: 'loc-transit', avail: 'AVAILABLE', max: 2 },
    { id: 'resp-med-1', name: 'Dr. Meera Sen', callsign: 'TRAUMA-MEDIC-01', role: 'MEDICAL', loc: 'loc-transit', avail: 'AVAILABLE', max: 1 },
    { id: 'resp-backup-1', name: 'Officer Elena Rostova', callsign: 'RAPID-QRT-09', role: 'SECURITY', loc: 'loc-transit', avail: 'AVAILABLE', max: 2 },
    { id: 'resp-campus-1', name: 'Officer Sunita Rao', callsign: 'PINK-PATROL-15', role: 'SECURITY', loc: 'loc-campus', avail: 'AVAILABLE', max: 2 },
    { id: 'resp-campus-2', name: 'Dr. Priya Sharma', callsign: 'FIRST-AID-03', role: 'MEDICAL', loc: 'loc-campus', avail: 'AVAILABLE', max: 1 },
    { id: 'resp-market-1', name: 'Officer Kavita Verma', callsign: 'PINK-PATROL-88', role: 'SECURITY', loc: 'loc-market', avail: 'AVAILABLE', max: 2 },
  ];

  for (const r of DEMO_RESPONDERS) {
    respStmt.run(r.id, r.name, r.callsign, r.role, r.loc, r.avail, null, r.max, 1, now);
  }

  // 4. Comprehensive Women Safety Incidents (20 realistic operational events)
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
      title: '[WOMEN SOS] Persistent individual following student toward Girls Hostel',
      description: 'Student reported unknown person trailing closely from library pathway into dark hostel quad for 15 minutes. Caller waiting inside security foyer.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-campus',
      zone: 'Girls Hostel Quad',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      assigned_responder_id: 'resp-campus-1',
      summary: 'Active stalking incident outside Girls Hostel. Pink Patrol unit intercepted on-site.',
    },
    {
      id: 'inc-102',
      title: 'Night safe transit escort requested from Metro Exit 3',
      description: 'Female commuter requesting accompanied escort from metro terminal exit across poorly lit outer walkway to bus shelter.',
      category: 'SAFE_ESCORT_REQUEST',
      location_id: 'loc-transit',
      zone: 'Metro Concourse Exit 3',
      priority: 'HIGH',
      status: 'ACKNOWLEDGED',
      assigned_responder_id: null,
      summary: 'Night escort request logged. Waiting for dispatch allocation.',
    },
    {
      id: 'inc-103',
      title: '[CAB DISTRESS] Ride-hail vehicle unexpected detour off highway',
      description: 'Passenger triggered SOS from moving cab after driver locked doors and deviated 3km off confirmed route toward unlit industrial area.',
      category: 'CAB_TRANSIT_EMERGENCY',
      location_id: 'loc-transit',
      zone: 'Outer Cab/Taxi Bay',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      assigned_responder_id: 'resp-security-1',
      summary: 'Emergency route deviation. Intercept alert broadcast to highway patrol and QRT.',
    },
    {
      id: 'inc-104',
      title: 'Verbal eve-teasing & harassment group at South Auto Stand',
      description: 'Three individuals blocking pedestrian crossing, making threatening remarks to female commuters waiting for transit.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-market',
      zone: 'Auto-Rickshaw Stand',
      priority: 'HIGH',
      status: 'REPORTED',
      assigned_responder_id: null,
      summary: 'Aggressive loitering and harassment at auto stand. Immediate patrol required.',
    },
    {
      id: 'inc-105',
      title: 'Complete blackout of streetlights on Library Back Pathway',
      description: 'All 6 overhead pathway lights non-functional along 200m stretch frequently used by female students returning to dormitories after 9 PM.',
      category: 'UNSAFE_ENVIRONMENT',
      location_id: 'loc-campus',
      zone: 'Library Dark Pathway',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigned_responder_id: 'resp-campus-1',
      summary: 'Dark pathway identified as severe security risk. Auxiliary lighting trailer deployed and guard stationed.',
    },
    {
      id: 'inc-106',
      title: 'Distress call from Multi-Level Parking Level B2 (Women Zone)',
      description: 'Driver noticed person loitering between parked vehicles attempting to block vehicle door access. Driver locked inside car.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-market',
      zone: 'Multi-Level Parking (Women Zone)',
      priority: 'HIGH',
      status: 'RESOLVED',
      assigned_responder_id: 'resp-market-1',
      summary: 'Market patrol arrived within 3 minutes; suspect fled scene; student escorted safely to main road.',
    },
    {
      id: 'inc-107',
      title: 'Physical altercation & assault threat near Underpass Walkway',
      description: 'Passerby reported male suspect shouting aggressively and attempting to physically seize bag and phone of lone female commuter.',
      category: 'IMMEDIATE_ASSAULT_SOS',
      location_id: 'loc-transit',
      zone: 'Underpass Walkway',
      priority: 'CRITICAL',
      status: 'REPORTED',
      assigned_responder_id: null,
      summary: 'Critical assault threat. High-priority dispatch triggered.',
    },
    {
      id: 'inc-108',
      title: 'Accompanied escort request for evening laboratory researcher',
      description: 'Postgraduate female researcher leaving biochemistry facility at 23:30 requesting safety escort across dark campus quad to main gate.',
      category: 'SAFE_ESCORT_REQUEST',
      location_id: 'loc-campus',
      zone: 'Science Corridor',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      assigned_responder_id: 'resp-campus-1',
      summary: 'Escort assigned; officer walking with researcher.',
    },
    {
      id: 'inc-109',
      title: 'Medical collapse and shock in Ladies Waiting Lounge',
      description: 'Pregnant passenger experiencing acute dehydration and syncope in transit waiting room.',
      category: 'MEDICAL_FIRST_AID',
      location_id: 'loc-transit',
      zone: 'Ladies Waiting Lounge',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assigned_responder_id: 'resp-med-1',
      summary: 'Female emergency medical specialist dispatched with trauma kit.',
    },
    {
      id: 'inc-110',
      title: 'CCTV dead-zone discovered behind Student Center Plaza',
      description: 'Tree branch overgrowth blocking security camera lens #14 covering female dormitory access stairs.',
      category: 'UNSAFE_ENVIRONMENT',
      location_id: 'loc-campus',
      zone: 'Student Center Plaza',
      priority: 'LOW',
      status: 'REPORTED',
      assigned_responder_id: null,
      summary: 'Camera view obstructed; maintenance ticket issued.',
    },
    {
      id: 'inc-111',
      title: 'Suspicious vehicle following commuter near Desolate Back Alley',
      description: 'Unregistered sedan driving with dimmed headlights pacing pedestrian walking home from market.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-market',
      zone: 'Desolate Back Alley',
      priority: 'CRITICAL',
      status: 'ACKNOWLEDGED',
      assigned_responder_id: null,
      summary: 'Vehicle pursuit reported. QRT vehicle dispatched.',
    },
    {
      id: 'inc-112',
      title: 'Panic alarm triggered in Metro Ladies Coach vestibule',
      description: 'In-coach emergency talkback activated reporting hostile confrontation on Platform 1.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-transit',
      zone: 'Platform 1-2',
      priority: 'HIGH',
      status: 'RESOLVED',
      assigned_responder_id: 'resp-security-1',
      summary: 'Pink Patrol boarded train at station stop. Individual removed and detained.',
    },
    {
      id: 'inc-113',
      title: 'Broken emergency call box in Transit Underpass Walkway',
      description: 'Direct 1-tap SOS call box intercom #3 audio speaker defective in pedestrian subway.',
      category: 'UNSAFE_ENVIRONMENT',
      location_id: 'loc-transit',
      zone: 'Underpass Walkway',
      priority: 'MEDIUM',
      status: 'REPORTED',
      assigned_responder_id: null,
      summary: 'Intercom repair scheduled; physical guard assigned during shift.',
    },
    {
      id: 'inc-114',
      title: 'Minor sprain during evasive run from harasser',
      description: 'Student twisted ankle while running toward illuminated campus gate away from aggressive loiterer.',
      category: 'MEDICAL_FIRST_AID',
      location_id: 'loc-campus',
      zone: 'Library Dark Pathway',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      assigned_responder_id: 'resp-campus-2',
      summary: 'First aid bandage applied. Campus security vehicle escorted student to hostel.',
    },
    {
      id: 'inc-115',
      title: 'Night escort request from City Center shopping promenade',
      description: 'Store employee closing shop at midnight requesting patrol escort to Metro station.',
      category: 'SAFE_ESCORT_REQUEST',
      location_id: 'loc-market',
      zone: 'Main Street Promenade',
      priority: 'LOW',
      status: 'ACKNOWLEDGED',
      assigned_responder_id: null,
      summary: 'Market security team queued for escort dispatch.',
    },
    {
      id: 'inc-116',
      title: 'Intoxicated individual refusing to vacate Ladies Waiting Lounge',
      description: 'Unauthorized male entered designated women-only rest area, refusing requests to exit.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-transit',
      zone: 'Ladies Waiting Lounge',
      priority: 'HIGH',
      status: 'RESOLVED',
      assigned_responder_id: 'resp-security-1',
      summary: 'Escorted off premises. Facility secured.',
    },
    {
      id: 'inc-117',
      title: '[WOMEN SOS] Distress signal triggered from auto-rickshaw near market edge',
      description: 'Live mobile phone SOS alert received. GPS coordinates tracking near South Parking Lane.',
      category: 'CAB_TRANSIT_EMERGENCY',
      location_id: 'loc-market',
      zone: 'Auto-Rickshaw Stand',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      assigned_responder_id: 'resp-market-1',
      summary: 'Live GPS distress broadcast active. Officer Kavita Verma en route.',
    },
    {
      id: 'inc-118',
      title: 'Hostel exterior boundary wall breach sensor alert',
      description: 'Infrared fence sensor tripped near east perimeter of Girls Hostel compound.',
      category: 'UNSAFE_ENVIRONMENT',
      location_id: 'loc-campus',
      zone: 'Girls Hostel Quad',
      priority: 'HIGH',
      status: 'REPORTED',
      assigned_responder_id: null,
      summary: 'Immediate patrol sweep dispatched to inspect perimeter fence.',
    },
    {
      id: 'inc-119',
      title: 'Harassment complaint at Metro concourse ticket area',
      description: 'Female commuter reported persistent unsolicited photography and stalking at fare gates.',
      category: 'STALKING_HARASSMENT',
      location_id: 'loc-transit',
      zone: 'Metro Concourse Exit 3',
      priority: 'LOW',
      status: 'RESOLVED',
      assigned_responder_id: 'resp-security-1',
      summary: 'Station security intervened, reviewed CCTV, and issued trespass notice.',
    },
    {
      id: 'inc-120',
      title: 'Flickering illumination in Multi-Level Parking Stairwell',
      description: 'Stairwell B linking parking deck to street has intermittent light strobe, reducing visibility.',
      category: 'UNSAFE_ENVIRONMENT',
      location_id: 'loc-market',
      zone: 'Multi-Level Parking (Women Zone)',
      priority: 'LOW',
      status: 'ACKNOWLEDGED',
      assigned_responder_id: null,
      summary: 'Facilities replacement ticket logged; security sweep ordered.',
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

    incStmt.run(
      inc.id,
      inc.title,
      inc.description,
      inc.category,
      inc.location_id,
      inc.zone,
      inc.priority,
      inc.status,
      1,
      inc.assigned_responder_id,
      JSON.stringify(aiAnalysis),
      now,
      inc.status !== 'REPORTED' ? now : null,
      inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS' || inc.status === 'RESOLVED' ? now : null,
      inc.status === 'RESOLVED' ? now : null,
      'operator-demo',
      now,
      now
    );

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

  runStmt.run(
    'run-base-001',
    'scn-unavail-resp',
    'v1.0',
    'FAILED',
    now,
    now,
    1450,
    JSON.stringify(checksBaseline),
    2,
    4,
    JSON.stringify(['Workflow lacks automated failover trigger when primary unit is UNAVAILABLE', 'Supervisor notification bypasses unattended stalls']),
    JSON.stringify({ summary: 'Failed under Rule v1.0 due to disabled automated failover.', root_cause: 'Missing automated failover definition in dispatch matrix.', recommended_action: 'Upgrade to Rule v2.0.', source: 'DETERMINISTIC_EVALUATOR' }),
    'system-demo'
  );

  runStmt.run(
    'run-verif-001',
    'scn-unavail-resp',
    'v2.0',
    'PASSED',
    now,
    now,
    980,
    JSON.stringify(checksVerified),
    4,
    4,
    JSON.stringify([]),
    JSON.stringify({ summary: 'All 4 verification gates passed under Rule v2.0 with active failover routing.', root_cause: 'None. Procedural compliance 100%.', recommended_action: 'Procedure verified.', source: 'DETERMINISTIC_EVALUATOR' }),
    'admin-1'
  );

  // 6. Linked Actionable Corrective Actions
  const caStmt = db.prepare(`
    INSERT OR REPLACE INTO corrective_actions (
      id, title, weakness_description, source_run_id, proposed_remedy,
      owner, priority, due_date, status, verification_scenario_id,
      verification_run_id, notes, verified_at, verified_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  caStmt.run(
    'ca-001',
    'Implement Automated Secondary Responder Fallback',
    'Primary responder unavailability halts dispatch without automated handoff to available backup units in transit sector.',
    'run-base-001',
    'Update dispatch configuration to Rule v2.0 enabling auto-fallback to secondary qualified unit within 60 seconds.',
    'Chief Dispatcher Morgan',
    'HIGH',
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    'OPEN',
    'scn-unavail-resp',
    null,
    'Awaiting deployment in secondary terminal zones.',
    null,
    null,
    now,
    now
  );

  caStmt.run(
    'ca-002',
    'Standardize Transit Sector Evacuation Handoff Protocol',
    'Procedural gap identified during multi-unit staging simulation at metro concourse.',
    'run-base-001',
    'Enact Rule v2.0 secondary routing matrix with automatic supervisor alert.',
    'Operations Lead Vance',
    'HIGH',
    new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    'VERIFIED',
    'scn-unavail-resp',
    'run-verif-001',
    'Proven passing under test run-verif-001.',
    now,
    'admin-1',
    now,
    now
  );

  // 7. Initial Audit Log Entries
  const auditStmt = db.prepare(`
    INSERT OR REPLACE INTO audit_logs (
      id, timestamp, actor_id, actor_role, action_type, entity_type, entity_id, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  auditStmt.run(
    'aud-init-001',
    now,
    'system-seed',
    'ADMINISTRATOR',
    'SYSTEM_DEMO_SEED',
    'SYSTEM',
    'all',
    JSON.stringify({ note: 'Seeded comprehensive Phase-1 operational intelligence dataset', total_incidents: DEMO_INCIDENTS.length })
  );

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

export function clearDemoData(targetDb?: ISqliteDatabase): { message: string } {
  const db = targetDb || getDatabase();

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

