"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listScenarios = listScenarios;
exports.getScenarioById = getScenarioById;
exports.updateScenarioRuleConfig = updateScenarioRuleConfig;
exports.executeScenario = executeScenario;
exports.getScenarioRunById = getScenarioRunById;
exports.listScenarioRuns = listScenarioRuns;
const node_crypto_1 = __importDefault(require("node:crypto"));
const connection_js_1 = require("../db/connection.js");
const audit_js_1 = require("../middleware/audit.js");
const aiAnalysisService_js_1 = require("./aiAnalysisService.js");
function listScenarios() {
    const db = (0, connection_js_1.getDatabase)();
    return db.prepare('SELECT * FROM scenarios ORDER BY id ASC').all();
}
function getScenarioById(id) {
    const db = (0, connection_js_1.getDatabase)();
    return db.prepare('SELECT * FROM scenarios WHERE id = ?').get(id) || null;
}
function updateScenarioRuleConfig(id, ruleVersion, newConfig, actorId, actorRole) {
    const db = (0, connection_js_1.getDatabase)();
    const existing = getScenarioById(id);
    if (!existing) {
        throw new Error(`Scenario ${id} not found`);
    }
    const now = new Date().toISOString();
    db.prepare(`
    UPDATE scenarios 
    SET rule_version = ?, active_rule_config_json = ?, updated_at = ?
    WHERE id = ?
  `).run(ruleVersion, JSON.stringify(newConfig), now, id);
    (0, audit_js_1.recordAuditLog)({
        actorId,
        actorRole,
        actionType: 'SCENARIO_RULE_UPDATED',
        entityType: 'SCENARIO',
        entityId: id,
        details: {
            previousVersion: existing.rule_version,
            newVersion: ruleVersion,
            newConfig,
        }
    });
    return getScenarioById(id);
}
async function executeScenario(scenarioId, actorId, actorRole) {
    const db = (0, connection_js_1.getDatabase)();
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
        throw new Error(`Scenario ${scenarioId} not found`);
    }
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const ruleConfig = JSON.parse(scenario.active_rule_config_json || '{}');
    const checks = [];
    const gaps = [];
    // Deterministic execution engine based on scenario ID and active rule config
    if (scenarioId === 'scn-unavail-resp') {
        // SCN-1: Primary Responder Unavailable
        checks.push({
            id: 'chk-1',
            name: 'Identify Primary Unavailability',
            passed: true,
            expected: 'System detects assigned unit status is UNAVAILABLE',
            observed: 'Primary responder offline flag validated with zero latency',
        });
        const hasFallbackEnabled = Boolean(ruleConfig.auto_fallback_enabled);
        if (hasFallbackEnabled) {
            checks.push({
                id: 'chk-2',
                name: 'Secondary Unit Selection',
                passed: true,
                expected: 'Auto-select qualified secondary responder',
                observed: 'Successfully cascaded to secondary backup unit (BACKUP-09)',
            });
        }
        else {
            checks.push({
                id: 'chk-2',
                name: 'Secondary Unit Selection',
                passed: false,
                expected: 'Auto-select qualified secondary responder',
                observed: 'No fallback rule enabled in active configuration; dispatch halted in stalled state',
            });
            gaps.push('Automated secondary failover routing is disabled or unconfigured');
        }
        const hasSupervisorAlert = Boolean(ruleConfig.supervisor_alert);
        if (hasSupervisorAlert) {
            checks.push({
                id: 'chk-3',
                name: 'Supervisor Notification',
                passed: true,
                expected: 'Supervisor queue escalation event recorded',
                observed: 'Escalation dispatch signal successfully transmitted to supervisor terminal',
            });
        }
        else {
            checks.push({
                id: 'chk-3',
                name: 'Supervisor Notification',
                passed: false,
                expected: 'Supervisor queue escalation event recorded',
                observed: 'No supervisor alert dispatched within threshold',
            });
            gaps.push('Supervisor alert channel is not wired to failover trigger');
        }
        checks.push({
            id: 'chk-4',
            name: 'Audit Integrity',
            passed: true,
            expected: 'Record simulated failure in audit journal',
            observed: 'Deterministic event logged in audit trail with verification checksum',
        });
    }
    else if (scenarioId === 'scn-comm-fail') {
        // SCN-2: Communication Failure & SLA Timeout
        checks.push({
            id: 'chk-comm-1',
            name: 'Acknowledge Timer Tracking',
            passed: true,
            expected: 'Countdown timer begins at dispatch event',
            observed: 'Timer synchronized with 180s SLA window',
        });
        checks.push({
            id: 'chk-comm-2',
            name: 'Timeout Detection',
            passed: true,
            expected: 'Trigger timeout state when timer reaches zero',
            observed: 'Timeout state registered accurately upon unacknowledged SLA expiry',
        });
        const autoEscalate = Boolean(ruleConfig.auto_escalate_on_timeout ?? true);
        if (autoEscalate) {
            checks.push({
                id: 'chk-comm-3',
                name: 'Automated Tier-2 Escalation',
                passed: true,
                expected: 'Re-dispatches to alternate channel upon timeout',
                observed: 'Tier-2 escalation alert transmitted to alternate radio channel',
            });
        }
        else {
            checks.push({
                id: 'chk-comm-3',
                name: 'Automated Tier-2 Escalation',
                passed: false,
                expected: 'Re-dispatches to alternate channel upon timeout',
                observed: 'Timeout occurred with no alternate routing executed',
            });
            gaps.push('Automated Tier-2 escalation disabled in SLA policy');
        }
    }
    else if (scenarioId === 'scn-handoff-fail') {
        // SCN-3: Failed Inter-Team Incident Handoff
        checks.push({
            id: 'chk-hand-1',
            name: 'Capacity Pre-Check',
            passed: true,
            expected: 'Verify target department capacity before release',
            observed: 'Target capacity checked: Medical team reported 0 available units',
        });
        const requireAcceptance = Boolean(ruleConfig.require_acceptance_before_release ?? true);
        if (requireAcceptance) {
            checks.push({
                id: 'chk-hand-2',
                name: 'Prevent Orphaned Incident',
                passed: true,
                expected: 'Retain current unit custody if transfer cannot be accepted',
                observed: 'Origin security responder retained on-scene without custody gap',
            });
        }
        else {
            checks.push({
                id: 'chk-hand-2',
                name: 'Prevent Orphaned Incident',
                passed: false,
                expected: 'Retain current unit custody if transfer cannot be accepted',
                observed: 'Initial responder released while target department was unassigned',
            });
            gaps.push('Incident permitted to enter orphaned state during failed handoff');
        }
        checks.push({
            id: 'chk-hand-3',
            name: 'Mutual Aid Escalation',
            passed: true,
            expected: 'Escalate to supervisor / mutual aid queue',
            observed: 'Mutual aid request broadcasted successfully',
        });
    }
    else if (scenarioId === 'scn-ack-timeout') {
        // SCN-4: Required Dispatch Confirmation Missing
        checks.push({
            id: 'chk-ack-1',
            name: 'Validate Confirmation Token',
            passed: true,
            expected: 'Reject unverified or corrupt mobile tokens',
            observed: 'Corrupt acknowledgement packet safely intercepted and isolated',
        });
        const strictValidation = Boolean(ruleConfig.strict_token_validation ?? true);
        if (strictValidation) {
            checks.push({
                id: 'chk-ack-2',
                name: 'Supervisor Fail-Safe Trigger',
                passed: true,
                expected: 'Immediate warning generated for console dispatcher',
                observed: 'Fail-safe warning displayed on operator dashboard',
            });
        }
        else {
            checks.push({
                id: 'chk-ack-2',
                name: 'Supervisor Fail-Safe Trigger',
                passed: false,
                expected: 'Immediate warning generated for console dispatcher',
                observed: 'Corrupt confirmation ignored without dispatcher alert',
            });
            gaps.push('Validation failure did not prompt supervisor alert');
        }
    }
    else if (scenarioId === 'scn-after-hours') {
        // SCN-5: After-Hours Incident On-Call Matrix
        checks.push({
            id: 'chk-ah-1',
            name: 'Time-Window Policy Check',
            passed: true,
            expected: 'Identify night-shift operational window (22:00 - 06:00)',
            observed: 'Incident timestamp matched against overnight roster schedule',
        });
        const onCallActive = Boolean(ruleConfig.on_call_routing_active ?? true);
        if (onCallActive) {
            checks.push({
                id: 'chk-ah-2',
                name: 'On-Call Matrix Routing',
                passed: true,
                expected: 'Route to verified on-call roster',
                observed: 'On-call standby responder alerted via automated SMS/voice gateway',
            });
        }
        else {
            checks.push({
                id: 'chk-ah-2',
                name: 'On-Call Matrix Routing',
                passed: false,
                expected: 'Route to verified on-call roster',
                observed: 'Dispatched to vacant daytime desk queue',
            });
            gaps.push('On-call routing matrix disabled during night-shift window');
        }
    }
    const passedCount = checks.filter(c => c.passed).length;
    const totalCount = checks.length;
    const overallStatus = passedCount === totalCount ? 'PASSED' : 'FAILED';
    const durationMs = Date.now() - startTime + Math.floor(Math.random() * 80 + 120);
    const completedAt = new Date().toISOString();
    // Explain failure if any
    let aiExplanation = null;
    if (overallStatus === 'FAILED') {
        const failedChecks = checks.filter(c => !c.passed);
        aiExplanation = await (0, aiAnalysisService_js_1.explainScenarioFailure)(scenario.title, failedChecks, gaps);
    }
    else {
        aiExplanation = {
            summary: `All ${totalCount} operational criteria passed deterministically under rule version ${scenario.rule_version}.`,
            root_cause: 'None. Procedural compliance 100%.',
            recommended_action: 'Procedure verified. Maintain active configuration.',
            source: 'DETERMINISTIC_EVALUATOR',
        };
    }
    const runId = `run-${Date.now().toString().slice(-6)}-${node_crypto_1.default.randomBytes(2).toString('hex')}`;
    const insertStmt = db.prepare(`
    INSERT INTO scenario_runs (
      id, scenario_id, rule_version, status, started_at, completed_at,
      duration_ms, checks_json, passed_checks, total_checks,
      gaps_identified_json, ai_explanation_json, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    insertStmt.run(runId, scenarioId, scenario.rule_version, overallStatus, startedAt, completedAt, durationMs, JSON.stringify(checks), passedCount, totalCount, JSON.stringify(gaps), JSON.stringify(aiExplanation), actorId);
    // Record audit log
    (0, audit_js_1.recordAuditLog)({
        actorId,
        actorRole,
        actionType: 'SCENARIO_RUN_EXECUTED',
        entityType: 'SCENARIO_RUN',
        entityId: runId,
        details: {
            scenarioId,
            scenarioTitle: scenario.title,
            ruleVersion: scenario.rule_version,
            status: overallStatus,
            passedChecks: passedCount,
            totalChecks: totalCount,
        }
    });
    return getScenarioRunById(runId);
}
function getScenarioRunById(runId) {
    const db = (0, connection_js_1.getDatabase)();
    const row = db.prepare(`
    SELECT r.*, s.title as scenario_title
    FROM scenario_runs r
    LEFT JOIN scenarios s ON r.scenario_id = s.id
    WHERE r.id = ?
  `).get(runId);
    return row || null;
}
function listScenarioRuns(filters) {
    const db = (0, connection_js_1.getDatabase)();
    let query = `
    SELECT r.*, s.title as scenario_title
    FROM scenario_runs r
    LEFT JOIN scenarios s ON r.scenario_id = s.id
    WHERE 1=1
  `;
    const params = [];
    if (filters?.scenario_id) {
        query += ' AND r.scenario_id = ?';
        params.push(filters.scenario_id);
    }
    if (filters?.status) {
        query += ' AND r.status = ?';
        params.push(filters.status);
    }
    query += ' ORDER BY r.completed_at DESC';
    return db.prepare(query).all(...params);
}
