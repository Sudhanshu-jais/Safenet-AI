import { getDatabase } from '../db/connection.js';
import { getScenarioRunById, ScenarioCheckResult } from './safetestEngine.js';

export interface RunComparisonResult {
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
    pass_rate_delta: number; // e.g. +50%
    completion_rate_before: number;
    completion_rate_after: number;
    resolved_checks_count: number;
    regressed_checks_count: number;
    duration_delta_ms: number;
  };
  check_diff: Array<{
    check_id: string;
    name: string;
    status_in_a: boolean;
    status_in_b: boolean;
    diff_status: 'RESOLVED' | 'MAINTAINED_PASS' | 'REGRESSED' | 'PERSISTENT_FAIL';
    expected_b: string;
    observed_b: string;
  }>;
  gaps_resolved: string[];
  gaps_persistent: string[];
  gaps_new: string[];
  is_compatible_scenario: boolean;
  notes: string;
}

export function compareScenarioRuns(runAId: string, runBId: string): RunComparisonResult {
  const runA = getScenarioRunById(runAId);
  const runB = getScenarioRunById(runBId);

  if (!runA || !runB) {
    throw new Error('Both run A and run B must exist to generate comparison.');
  }

  const isCompatible = runA.scenario_id === runB.scenario_id;
  const checksA: ScenarioCheckResult[] = JSON.parse(runA.checks_json || '[]');
  const checksB: ScenarioCheckResult[] = JSON.parse(runB.checks_json || '[]');
  const gapsA: string[] = JSON.parse(runA.gaps_identified_json || '[]');
  const gapsB: string[] = JSON.parse(runB.gaps_identified_json || '[]');

  const rateA = runA.total_checks > 0 ? (runA.passed_checks / runA.total_checks) * 100 : 0;
  const rateB = runB.total_checks > 0 ? (runB.passed_checks / runB.total_checks) * 100 : 0;

  const checksAMap = new Map<string, ScenarioCheckResult>();
  checksA.forEach(c => checksAMap.set(c.id, c));

  let resolvedCount = 0;
  let regressedCount = 0;

  const checkDiff = checksB.map(b => {
    const a = checksAMap.get(b.id);
    let diffStatus: 'RESOLVED' | 'MAINTAINED_PASS' | 'REGRESSED' | 'PERSISTENT_FAIL' = 'MAINTAINED_PASS';

    if (!a) {
      diffStatus = b.passed ? 'RESOLVED' : 'PERSISTENT_FAIL';
    } else if (!a.passed && b.passed) {
      diffStatus = 'RESOLVED';
      resolvedCount++;
    } else if (a.passed && !b.passed) {
      diffStatus = 'REGRESSED';
      regressedCount++;
    } else if (!a.passed && !b.passed) {
      diffStatus = 'PERSISTENT_FAIL';
    } else {
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

export function getProofSummary() {
  const db = getDatabase();

  const totalRunsRow = db.prepare('SELECT COUNT(*) as count FROM scenario_runs').get() as any;
  const passedRunsRow = db.prepare("SELECT COUNT(*) as count FROM scenario_runs WHERE status = 'PASSED'").get() as any;
  const totalRuns = totalRunsRow?.count || 0;
  const passedRuns = passedRunsRow?.count || 0;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;

  const totalCARow = db.prepare('SELECT COUNT(*) as count FROM corrective_actions').get() as any;
  const verifiedCARow = db.prepare("SELECT COUNT(*) as count FROM corrective_actions WHERE status = 'VERIFIED'").get() as any;
  const openCARow = db.prepare("SELECT COUNT(*) as count FROM corrective_actions WHERE status IN ('OPEN', 'IN_PROGRESS')").get() as any;

  const passRateOverTime = db.prepare(`
    SELECT DATE(completed_at) as date, 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed
    FROM scenario_runs
    GROUP BY DATE(completed_at)
    ORDER BY date ASC
    LIMIT 14
  `).all() as any[];

  const recurringGaps = db.prepare(`
    SELECT gaps_identified_json FROM scenario_runs WHERE status = 'FAILED'
  `).all() as any[];

  const gapCounts: Record<string, number> = {};
  for (const row of recurringGaps) {
    try {
      const gaps = JSON.parse(row.gaps_identified_json);
      if (Array.isArray(gaps)) {
        for (const g of gaps) {
          gapCounts[g] = (gapCounts[g] || 0) + 1;
        }
      }
    } catch (e) {}
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
