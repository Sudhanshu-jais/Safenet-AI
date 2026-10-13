import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  Download,
  Scale,
  AlertOctagon,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { ComparisonTool } from './ComparisonTool.js';
import { api } from '../../services/api.js';
import { ProofSummary, ScenarioRun } from '../../types/index.js';

interface ProofDashboardProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const ProofDashboard: React.FC<ProofDashboardProps> = ({ showToast }) => {
  const [summary, setSummary] = useState<ProofSummary | null>(null);
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sumRes, runsRes] = await Promise.all([
        api.getProofSummary(),
        api.getScenarioRuns(),
      ]);
      setSummary(sumRes);
      setRuns(runsRes.runs);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportAuditDossier = () => {
    if (!summary || runs.length === 0) {
      showToast('No proof records available to export.', 'warning');
      return;
    }

    const dossier = {
      title: 'SAFENET AI — Operational Response Verification Dossier',
      generated_at: new Date().toISOString(),
      evaluation_authority: 'Deterministic Backend Engine',
      summary_metrics: summary,
      scenario_runs: runs.map(r => ({
        run_id: r.id,
        scenario: r.scenario_title || r.scenario_id,
        rule_version: r.rule_version,
        status: r.status,
        passed_checks: r.passed_checks,
        total_checks: r.total_checks,
        completed_at: r.completed_at,
        gaps: JSON.parse(r.gaps_identified_json || '[]'),
      })),
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safenet-audit-proof-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Compliance audit dossier successfully downloaded.', 'success');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Computing proof calculations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* PROOF Official Framework Banner */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-pink-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">PROOF — Performance Recording and Outcome Verification Framework</h2>
                <Badge variant="simulation">VERIFICATION FRAMEWORK</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                PROOF measures how emergency-response workflows perform and whether corrective changes improve their results. It records incident events, SAFETEST AI test results, completed steps, acknowledgement times, and previously identified weaknesses.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportAuditDossier}
            icon={<Download className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            Export Audit Dossier
          </Button>
        </div>

        {/* Core Purpose & Methodology Details */}
        <div className="p-4 sm:p-5 space-y-3 bg-white text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Main Purpose Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-pink-700 font-bold">
                <Scale className="w-4 h-4 text-pink-600 shrink-0" />
                <span>Main Purpose:</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                Provide <strong>measurable evidence</strong> of whether a tested emergency-response procedure has improved, <strong>rather than simply claiming that a change was successful</strong>.
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                The system compares results from comparable tests conducted before and after a corrective change. It highlights which requirements passed, which failures remain, and whether new problems appeared. It also maintains an audit trail so that results can be reviewed and verified.
              </p>
            </div>

            {/* Practical Example Box */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verification Example:</span>
              </div>
              <p className="text-emerald-950/90 leading-relaxed text-[11px]">
                An initial test shows that a backup responder is not assigned when the primary responder is unavailable. After the fallback rule is corrected, PROOF compares the original and repeat test results to show whether the assignment now succeeds and the required steps are completed.
              </p>
            </div>
          </div>

          {/* Key Output Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-[11px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Key Output:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-700">Test history</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-700">Performance metrics</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-700">Before-and-after comparisons</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-700">Audit records</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-700">Evidence of verified improvements</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Immutable Evidence Ledger</span>
          </div>
        </div>
      </div>

      {/* Proof Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Pass Rate</span>
          <div className="text-2xl font-bold text-slate-900">
            {summary?.scenario_runs.pass_rate !== undefined ? `${summary.scenario_runs.pass_rate}%` : '0%'}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {summary?.scenario_runs.passed}/{summary?.scenario_runs.total} runs passed
          </span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Total Test Runs</span>
          <div className="text-2xl font-bold text-slate-900">
            {summary?.scenario_runs.total ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Deterministic executions</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Verified Actions</span>
          <div className="text-2xl font-bold text-emerald-700">
            {summary?.corrective_actions.verified ?? 0}
          </div>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Closed via passed rerun</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Open Remediations</span>
          <div className="text-2xl font-bold text-amber-700">
            {summary?.corrective_actions.open ?? 0}
          </div>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Awaiting verification</span>
        </Card>
      </div>

      {/* Pass Rate Trend Chart & Recurring Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pass Rate Chart (2 cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verification Pass Rate History
            </h3>
            <span className="text-[10px] text-slate-400">Database Timeseries</span>
          </div>

          <Card className="p-4">
            {summary && summary.trends.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      formatter={(val: any) => [`${val}%`, 'Pass Rate']}
                    />
                    <Line
                      type="monotone"
                      dataKey="pass_rate"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#2563EB' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <TrendingUp className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                <p>Run scenarios across time to populate trend telemetry.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Recurring Gaps Panel (1 col) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recurring Operational Gaps
          </h3>

          <Card className="p-3.5 divide-y divide-slate-100">
            {summary && summary.recurring_gaps.length > 0 ? (
              summary.recurring_gaps.map((item, idx) => (
                <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium text-slate-800 leading-snug">{item.gap}</span>
                  </div>
                  <Badge variant="critical" size="sm">{item.count}x</Badge>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-[11px]">No recurring gaps detected.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Side-by-Side Comparison Section */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-pink-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Before-and-After Audit Comparison Engine
          </h3>
        </div>

        <ComparisonTool runs={runs} showToast={showToast} />
      </div>
    </div>
  );
};
