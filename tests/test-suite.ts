import assert from 'node:assert';
import { initializeSchema } from '../server/src/db/schema.js';
import { seedDemoData } from '../server/src/db/seed.js';
import { createIncident, transitionIncidentStatus, assignIncidentResponder } from '../server/src/services/incidentService.js';
import { updateResponderAvailability, getResponderById } from '../server/src/services/responderService.js';
import { executeScenario, updateScenarioRuleConfig } from '../server/src/services/safetestEngine.js';
import { createCorrectiveAction, updateCorrectiveActionStatus } from '../server/src/services/correctiveService.js';
import { compareScenarioRuns, getProofSummary } from '../server/src/services/proofService.js';

let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('\n--- STARTING SAFENET AI COMPREHENSIVE TEST SUITE ---\n');

  // Initialize DB and Seed Demo Data
  initializeSchema();
  seedDemoData();

  console.log('1. INCIDENT WORKFLOW & STATE TRANSITIONS');
  await test('should create an incident with validated fields and AI/rule analysis', async () => {
    const inc = await createIncident({
      title: 'Power grid surge in main terminal',
      description: 'Sparks observed from electrical panel near Platform 3.',
      location_id: 'loc-transit',
      zone: 'Platform 1-2',
      priority: 'HIGH',
      is_simulation: true,
      actorId: 'admin-1',
      actorRole: 'ADMINISTRATOR',
    });

    assert.ok(inc.id, 'Incident must have generated ID');
    assert.strictEqual(inc.status, 'REPORTED');
    assert.strictEqual(inc.location_id, 'loc-transit');
    assert.ok(inc.ai_analysis_json, 'AI analysis json must be present');
  });

  await test('should reject invalid status transition (e.g. REPORTED directly to RESOLVED)', () => {
    assert.throws(() => {
      transitionIncidentStatus('inc-demo-101', 'RESOLVED', 'admin-1', 'ADMINISTRATOR');
    }, /Invalid status transition/);
  });

  await test('should allow valid status transitions (REPORTED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED)', async () => {
    const newInc = await createIncident({
      title: 'Water pipe leak in restroom',
      description: 'Minor overflow on floor tiles',
      location_id: 'loc-campus',
      zone: 'Student Union',
      priority: 'LOW',
      is_simulation: true,
      actorId: 'operator-1',
      actorRole: 'OPERATOR',
    });

    const ack = transitionIncidentStatus(newInc.id, 'ACKNOWLEDGED', 'operator-1', 'OPERATOR');
    assert.strictEqual(ack.status, 'ACKNOWLEDGED');
    assert.ok(ack.acknowledged_at, 'Acknowledged timestamp must be set');

    const inProg = transitionIncidentStatus(newInc.id, 'IN_PROGRESS', 'operator-1', 'OPERATOR');
    assert.strictEqual(inProg.status, 'IN_PROGRESS');

    const resolved = transitionIncidentStatus(newInc.id, 'RESOLVED', 'operator-1', 'OPERATOR');
    assert.strictEqual(resolved.status, 'RESOLVED');
    assert.ok(resolved.resolved_at, 'Resolved timestamp must be set');
  });

  console.log('\n2. RESPONDER AVAILABILITY & ASSIGNMENT RULES');
  await test('should reject assignment if responder is UNAVAILABLE', async () => {
    // Set responder to UNAVAILABLE
    updateResponderAvailability('resp-security-1', 'UNAVAILABLE', 'admin-1', 'ADMINISTRATOR');

    const testInc = await createIncident({
      title: 'Security patrol request',
      description: 'Suspicious unattended baggage at bus depot',
      location_id: 'loc-transit',
      zone: 'Bus Bay East',
      priority: 'HIGH',
      is_simulation: true,
      actorId: 'operator-1',
      actorRole: 'OPERATOR',
    });

    assert.throws(() => {
      assignIncidentResponder(testInc.id, 'resp-security-1', 'operator-1', 'OPERATOR');
    }, /Cannot assign responder.*UNAVAILABLE/);
  });

  await test('should reject assignment if responder location does not match incident location', async () => {
    // resp-security-1 is at loc-transit, try assigning to loc-campus
    updateResponderAvailability('resp-security-1', 'AVAILABLE', 'admin-1', 'ADMINISTRATOR');

    const campusInc = await createIncident({
      title: 'Campus gate congestion',
      description: 'Vehicle blocking North Quad entrance',
      location_id: 'loc-campus',
      zone: 'North Quad',
      priority: 'LOW',
      is_simulation: true,
      actorId: 'operator-1',
      actorRole: 'OPERATOR',
    });

    assert.throws(() => {
      assignIncidentResponder(campusInc.id, 'resp-security-1', 'operator-1', 'OPERATOR');
    }, /Location mismatch/);
  });

  await test('should successfully assign matching AVAILABLE responder and update status to ASSIGNED', async () => {
    updateResponderAvailability('resp-backup-1', 'AVAILABLE', 'admin-1', 'ADMINISTRATOR');

    const transitInc = await createIncident({
      title: 'Platform crowd control assist',
      description: 'Heavy passenger volume during peak hour',
      location_id: 'loc-transit',
      zone: 'Platform 1-2',
      priority: 'MEDIUM',
      is_simulation: true,
      actorId: 'operator-1',
      actorRole: 'OPERATOR',
    });

    const assigned = assignIncidentResponder(transitInc.id, 'resp-backup-1', 'operator-1', 'OPERATOR');
    assert.strictEqual(assigned.status, 'ASSIGNED');
    assert.strictEqual(assigned.assigned_responder_id, 'resp-backup-1');

    const resp = getResponderById('resp-backup-1');
    assert.strictEqual(resp?.availability, 'ON_DUTY_BUSY');
  });

  console.log('\n3. SAFETEST AI DETERMINISTIC SCENARIO ENGINE & RULE VERSIONING');
  let baselineRunId = '';
  await test('should deterministically FAIL scenario SCN-001 under Rule v1.0 (fallback disabled)', async () => {
    // Ensure rule v1.0 config
    updateScenarioRuleConfig(
      'scn-unavail-resp',
      'v1.0',
      { auto_fallback_enabled: false, supervisor_alert: false },
      'admin-1',
      'ADMINISTRATOR'
    );

    const runResult = await executeScenario('scn-unavail-resp', 'admin-1', 'ADMINISTRATOR');
    baselineRunId = runResult.id;

    assert.strictEqual(runResult.status, 'FAILED');
    assert.strictEqual(runResult.passed_checks, 2);
    assert.strictEqual(runResult.total_checks, 4);
    assert.ok(runResult.gaps_identified_json.includes('Automated secondary failover routing is disabled'));
  });

  let improvedRunId = '';
  await test('should deterministically PASS scenario SCN-001 under Rule v2.0 (fallback enabled)', async () => {
    // Update rule to v2.0
    updateScenarioRuleConfig(
      'scn-unavail-resp',
      'v2.0',
      { auto_fallback_enabled: true, supervisor_alert: true, escalation_timeout_seconds: 45 },
      'admin-1',
      'ADMINISTRATOR'
    );

    const runResult = await executeScenario('scn-unavail-resp', 'admin-1', 'ADMINISTRATOR');
    improvedRunId = runResult.id;

    assert.strictEqual(runResult.status, 'PASSED');
    assert.strictEqual(runResult.passed_checks, 4);
    assert.strictEqual(runResult.total_checks, 4);
  });

  console.log('\n4. CORRECTIVE ACTION VERIFICATION GATE');
  let caId = '';
  await test('should create a corrective action linked to failed scenario run', () => {
    const ca = createCorrectiveAction({
      title: 'Implement dynamic backup dispatch fallback',
      weakness_description: 'Transit sector dispatch stalled when primary unit was unavailable.',
      source_run_id: baselineRunId,
      proposed_remedy: 'Enable Rule v2.0 automated failover with supervisor escalation alert.',
      owner: 'Dispatcher Rivera',
      priority: 'CRITICAL',
      verification_scenario_id: 'scn-unavail-resp',
      actorId: 'admin-1',
      actorRole: 'ADMINISTRATOR',
    });

    caId = ca.id;
    assert.strictEqual(ca.status, 'OPEN');
  });

  await test('should REJECT marking corrective action VERIFIED if linked run failed', () => {
    assert.throws(() => {
      updateCorrectiveActionStatus(caId, 'VERIFIED', baselineRunId, 'admin-1', 'ADMINISTRATOR');
    }, /Verification failed: Linked test run.*ended with status 'FAILED'/);
  });

  await test('should APPROVE marking corrective action VERIFIED when linked run passes', () => {
    const verified = updateCorrectiveActionStatus(caId, 'VERIFIED', improvedRunId, 'admin-1', 'ADMINISTRATOR', 'Verified via SCN-001 Rule v2.0 rerun.');
    assert.strictEqual(verified.status, 'VERIFIED');
    assert.ok(verified.verified_at, 'Verified timestamp must be populated');
    assert.strictEqual(verified.verified_by, 'admin-1');
  });

  console.log('\n5. PROOF BEFORE-AND-AFTER COMPARISON & METRICS');
  await test('should compute side-by-side run comparison showing resolved criteria and +50% delta', () => {
    const comp = compareScenarioRuns(baselineRunId, improvedRunId);

    assert.strictEqual(comp.metrics.outcome_improved, true);
    assert.strictEqual(comp.metrics.completion_rate_before, 50);
    assert.strictEqual(comp.metrics.completion_rate_after, 100);
    assert.strictEqual(comp.metrics.pass_rate_delta, 50);
    assert.strictEqual(comp.metrics.resolved_checks_count, 2);
    assert.strictEqual(comp.metrics.regressed_checks_count, 0);
    assert.strictEqual(comp.gaps_resolved.length > 0, true);
  });

  await test('should compute accurate database summary metrics without fake data', () => {
    const summary = getProofSummary();
    assert.ok(summary.scenario_runs.total >= 2);
    assert.ok(summary.scenario_runs.pass_rate >= 0);
    assert.ok(summary.corrective_actions.total >= 1);
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
  console.log(`========================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
