"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareScenarioRuns = compareScenarioRuns;
exports.getProofSummary = getProofSummary;
const connection_js_1 = require("../db/connection.js");
const safetestEngine_js_1 = require("./safetestEngine.js");
function compareScenarioRuns(runAId, runBId) {
    const runA = (0, safetestEngine_js_1.getScenarioRunById)(runAId);
    const runB = (0, safetestEngine_js_1.getScenarioRunById)(runBId);
    if (!runA || !runB) {
        throw new Error('Both run A and run B must exist to generate comparison.');
    }
    const isCompatible = runA.scenario_id === runB.scenario_id;
    const checksA = JSON.parse(runA.checks_json || '[]');
    const checksB = JSON.parse(runB.checks_json || '[]');
    const gapsA = JSON.parse(runA.gaps_identified_json || '[]');
    const gapsB = JSON.parse(runB.gaps_identified_json || '[]');
    const rateA = runA.total_checks > 0 ? (runA.passed_checks / runA.total_checks) * 100 : 0;
    const rateB = runB.total_checks > 0 ? (runB.passed_checks / runB.total_checks) * 100 : 0;
    const checksAMap = new Map();
    checksA.forEach(c => checksAMap.set(c.id, c));
    let resolvedCount = 0;
    let regressedCount = 0;
    const checkDiff = checksB.map(b => {
        const a = checksAMap.get(b.id);
        let diffStatus = 'MAINTAINED_PASS';
        if (!a) {
            diffStatus = b.passed ? 'RESOLVED' : 'PERSISTENT_FAIL';
        }
        else if (!a.passed && b.passed) {
            diffStatus = 'RESOLVED';
            resolvedCount++;
        }
        else if (a.passed && !b.passed) {
            diffStatus = 'REGRESSED';
            regressedCount++;
        }
        else if (!a.passed && !b.passed) {
            diffStatus = 'PERSISTENT_FAIL';
        }
        else {
            diffStatus = 'MAINTAINED_PASS';
        }
        return {
            check_id: b.id,
            name: b.name,
            status_in_a: a ? a.passed : false,
            status_in_b: b.passed,
            diff_status: diffStatus,
            expected_b: b.expected,
            observed_b: b.observed,
        };
    });
    const gapsResolved = gapsA.filter(g => !gapsB.includes(g));
    const gapsPersistent = gapsA.filter(g => gapsB.includes(g));
    const gapsNew = gapsB.filter(g => !gapsA.includes(g));
    return {
        runA: {
            id: runA.id,
            scenario_id: runA.scenario_id,
            scenario_title: runA.scenario_title,
            rule_version: runA.rule_version,
            status: runA.status,
            passed_checks: runA.passed_checks,
            total_checks: runA.total_checks,
            pass_rate: Math.round(rateA),
            completed_at: runA.completed_at,
        },
        runB: {
            id: runB.id,
            scenario_id: runB.scenario_id,
            scenario_title: runB.scenario_title,
            rule_version: runB.rule_version,
            status: runB.status,
            passed_checks: runB.passed_checks,
            total_checks: runB.total_checks,
            pass_rate: Math.round(rateB),
            completed_at: runB.completed_at,
        },
        metrics: {
            outcome_improved: runA.status === 'FAILED' && runB.status === 'PASSED',
            pass_rate_delta: Math.round(rateB - rateA),
            completion_rate_before: Math.round(rateA),
            completion_rate_after: Math.round(rateB),
            resolved_checks_count: resolvedCount,
            regressed_checks_count: regressedCount,
            duration_delta_ms: runB.duration_ms - runA.duration_ms,
        },
        check_diff: checkDiff,
        gaps_resolved: gapsResolved,
        gaps_persistent: gapsPersistent,
        gaps_new: gapsNew,
        is_compatible_scenario: isCompatible,
        notes: isCompatible
            ? `Comparison evaluated against identical scenario profile (${runA.scenario_title}).`
            : 'Warning: Comparing runs across differing scenarios may yield disparate criteria benchmarks.',
    };
}
function getProofSummary() {
    const db = (0, connection_js_1.getDatabase)();
    const totalRunsRow = db.prepare('SELECT COUNT(*) as count FROM scenario_runs').get();
    const passedRunsRow = db.prepare("SELECT COUNT(*) as count FROM scenario_runs WHERE status = 'PASSED'").get();
    const totalRuns = totalRunsRow?.count || 0;
    const passedRuns = passedRunsRow?.count || 0;
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
    const totalCARow = db.prepare('SELECT COUNT(*) as count FROM corrective_actions').get();
    const verifiedCARow = db.prepare("SELECT COUNT(*) as count FROM corrective_actions WHERE status = 'VERIFIED'").get();
    const openCARow = db.prepare("SELECT COUNT(*) as count FROM corrective_actions WHERE status IN ('OPEN', 'IN_PROGRESS')").get();
    const passRateOverTime = db.prepare(`
    SELECT DATE(completed_at) as date, 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed
    FROM scenario_runs
    GROUP BY DATE(completed_at)
    ORDER BY date ASC
    LIMIT 14
  `).all();
    const recurringGaps = db.prepare(`
    SELECT gaps_identified_json FROM scenario_runs WHERE status = 'FAILED'
  `).all();
    const gapCounts = {};
    for (const row of recurringGaps) {
        try {
            const gaps = JSON.parse(row.gaps_identified_json);
            if (Array.isArray(gaps)) {
                for (const g of gaps) {
                    gapCounts[g] = (gapCounts[g] || 0) + 1;
                }
            }
        }
        catch (e) { }
    }
    const gapRankings = Object.entries(gapCounts)
        .map(([gap, count]) => ({ gap, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    return {
        scenario_runs: {
            total: totalRuns,
            passed: passedRuns,
            failed: totalRuns - passedRuns,
            pass_rate: passRate,
        },
        corrective_actions: {
            total: totalCARow?.count || 0,
            verified: verifiedCARow?.count || 0,
            open: openCARow?.count || 0,
            verification_rate: totalCARow?.count > 0 ? Math.round(((verifiedCARow?.count || 0) / totalCARow.count) * 100) : 0,
        },
        trends: passRateOverTime.map(t => ({
            date: t.date,
            pass_rate: t.total > 0 ? Math.round((t.passed / t.total) * 100) : 0,
            runs: t.total,
        })),
        recurring_gaps: gapRankings,
    };
}
