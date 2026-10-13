import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertOctagon,
  Scale,
  Award,
  Sparkles,
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { api } from '../../services/api.js';
import { ScenarioRun, ComparisonResult } from '../../types/index.js';

interface ComparisonToolProps {
  runs: ScenarioRun[];
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const ComparisonTool: React.FC<ComparisonToolProps> = ({ runs, showToast }) => {
  const [runAId, setRunAId] = useState<string>('');
  const [runBId, setRunBId] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize with the two most recent runs if available
  useEffect(() => {
    if (runs.length >= 2) {
      // Find a failed run for A and a passed run for B if possible
      const failedRun = runs.find(r => r.status === 'FAILED');
      const passedRun = runs.find(r => r.status === 'PASSED');

      if (failedRun && passedRun && failedRun.id !== passedRun.id) {
        setRunAId(failedRun.id);
        setRunBId(passedRun.id);
      } else {
        setRunAId(runs[1].id);
        setRunBId(runs[0].id);
      }
    } else if (runs.length === 1) {
      setRunAId(runs[0].id);
      setRunBId(runs[0].id);
    }
  }, [runs]);

  const handleCompare = async () => {
    if (!runAId || !runBId) {
      showToast('Select both Run A and Run B to generate comparison.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.compareRuns(runAId, runBId);
      setComparison(res.comparison);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (runAId && runBId) {
      handleCompare();
    }
  }, [runAId, runBId]);

  if (runs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-medium">No scenario runs available to compare.</p>
        <p className="text-[11px] text-slate-400 mt-1">Run at least two test scenarios in SAFETEST AI to view comparative proof.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Run Selectors Bar */}
      <Card className="p-4 bg-slate-50/70 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Run A Selector */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Baseline Run (Run A — Pre-Fix)
              </label>
              <select
                value={runAId}
                onChange={(e) => setRunAId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-pink-500"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.scenario_title || r.scenario_id} ({r.rule_version} - {r.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center justify-center pt-5 text-slate-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Run B Selector */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Verification Run (Run B — Post-Fix)
              </label>
              <select
                value={runBId}
                onChange={(e) => setRunBId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-pink-500"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.scenario_title || r.scenario_id} ({r.rule_version} - {r.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:self-end pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleCompare}
              isLoading={loading}
              icon={<Scale className="w-4 h-4" />}
            >
              Recalculate Proof
            </Button>
          </div>
        </div>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-4">
          {/* Key Metrics Summary Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              comparison.metrics.outcome_improved
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-pink-50/60 border-pink-200 text-pink-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 ${
                  comparison.metrics.outcome_improved ? 'bg-emerald-600' : 'bg-pink-600'
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {comparison.metrics.outcome_improved
                      ? 'Procedural Weakness Successfully Resolved & Proven'
                      : 'Audit Benchmark Comparison Result'}
                  </h3>
                  {comparison.metrics.outcome_improved && (
                    <Badge variant="success">PROVEN IMPROVEMENT</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{comparison.notes}</p>
              </div>
            </div>

            {/* Delta Metrics Badges */}
            <div className="flex items-center gap-2 text-center">
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pass Rate Delta</span>
                <span
                  className={`text-base font-bold ${
                    comparison.metrics.pass_rate_delta > 0
                      ? 'text-emerald-600'
                      : comparison.metrics.pass_rate_delta < 0
                      ? 'text-red-600'
                      : 'text-slate-800'
                  }`}
                >
                  {comparison.metrics.pass_rate_delta > 0 ? `+${comparison.metrics.pass_rate_delta}%` : `${comparison.metrics.pass_rate_delta}%`}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Checks Resolved</span>
                <span className="text-base font-bold text-emerald-600">
                  {comparison.metrics.resolved_checks_count}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Regressions</span>
                <span className={`text-base font-bold ${comparison.metrics.regressed_checks_count > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {comparison.metrics.regressed_checks_count}
                </span>
              </div>
            </div>
          </div>

          {/* Check-by-Check Diff Matrix */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Check-by-Check Comparative Verification Matrix
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                {comparison.runA.id} ({comparison.runA.rule_version}) vs {comparison.runB.id} ({comparison.runB.rule_version})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Criteria Check</th>
                    <th className="py-2.5 px-3 text-center">Run A (Pre)</th>
                    <th className="py-2.5 px-3 text-center">Run B (Post)</th>
                    <th className="py-2.5 px-3">Diff Status</th>
                    <th className="py-2.5 px-3">Observed In Run B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparison.check_diff.map((diff) => (
                    <tr key={diff.check_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {diff.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {diff.status_in_a ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 inline" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {diff.status_in_b ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 inline" />
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            diff.diff_status === 'RESOLVED'
                              ? 'success'
                              : diff.diff_status === 'REGRESSED'
                              ? 'critical'
                              : diff.diff_status === 'PERSISTENT_FAIL'
                              ? 'warning'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {diff.diff_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-sm truncate">
                        {diff.observed_b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Gaps Delta Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border-emerald-200 bg-emerald-50/20">
              <h5 className="font-bold text-emerald-900 text-xs mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Procedural Gaps Verified Resolved ({comparison.gaps_resolved.length})</span>
              </h5>
              {comparison.gaps_resolved.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  {comparison.gaps_resolved.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No previous gaps resolved in this comparison.</p>
              )}
            </Card>

            <Card className="p-4 border-slate-200">
              <h5 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>Persistent Gaps Awaiting Remediation ({comparison.gaps_persistent.length})</span>
              </h5>
              {comparison.gaps_persistent.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  {comparison.gaps_persistent.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-emerald-700 font-medium">All baseline gaps eradicated in verification run.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
