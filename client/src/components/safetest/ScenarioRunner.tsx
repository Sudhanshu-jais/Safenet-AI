import React, { useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Sparkles,
  ClipboardPlus,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { api } from '../../services/api.js';
import { ScenarioRun, ScenarioCheck } from '../../types/index.js';

interface ScenarioRunnerProps {
  run: ScenarioRun;
  onRerun: () => void;
  onCreateCorrectiveAction: (run: ScenarioRun) => void;
  isRerunning?: boolean;
}

export const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({
  run,
  onRerun,
  onCreateCorrectiveAction,
  isRerunning = false,
}) => {
  const checks: ScenarioCheck[] = JSON.parse(run.checks_json || '[]');
  const gaps: string[] = JSON.parse(run.gaps_identified_json || '[]');
  const aiExplanation = run.ai_explanation_json ? JSON.parse(run.ai_explanation_json) : null;

  return (
    <div className="space-y-4 text-xs">
      {/* Run Summary Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          run.status === 'PASSED'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-red-50/70 border-red-200 text-red-950'
        }`}
      >
        <div className="flex items-center gap-3">
          {run.status === 'PASSED' ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {run.scenario_title || run.scenario_id}
              </h3>
              <Badge variant={run.status === 'PASSED' ? 'success' : 'critical'}>
                {run.status}
              </Badge>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
              <span>Run ID: <strong className="font-mono text-slate-800">{run.id}</strong></span>
              <span>•</span>
              <span>Rule Version: <strong className="font-semibold text-slate-800">{run.rule_version}</strong></span>
              <span>•</span>
              <span>Duration: <strong className="font-mono">{run.duration_ms}ms</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {run.status === 'FAILED' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onCreateCorrectiveAction(run)}
              icon={<ClipboardPlus className="w-3.5 h-3.5" />}
            >
              Remediate Weakness
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRerun}
            isLoading={isRerunning}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Rerun Scenario
          </Button>
        </div>
      </div>

      {/* Deterministic Check Verification Grid */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Deterministic Verification Checks ({run.passed_checks}/{run.total_checks} Satisfied)
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Deterministic Backend Engine</span>
        </div>

        <div className="space-y-2">
          {checks.map((chk, idx) => (
            <div
              key={chk.id || idx}
              className={`p-3 rounded-xl border transition-colors ${
                chk.passed
                  ? 'bg-slate-50/70 border-slate-200'
                  : 'bg-red-50/50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-bold text-slate-900 text-xs">{chk.name}</span>
                </div>
                <Badge variant={chk.passed ? 'success' : 'critical'} size="sm">
                  {chk.passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded bg-white border border-slate-200/80">
                  <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                    Expected System Behavior:
                  </span>
                  <span className="text-slate-700">{chk.expected}</span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200/80">
                  <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                    Observed Deterministic Result:
                  </span>
                  <span className={chk.passed ? 'text-slate-800' : 'text-red-700 font-medium'}>
                    {chk.observed}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Identified Procedural Gaps (if failed) */}
      {gaps.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50/30">
          <div className="flex items-center gap-2 mb-2 text-red-900 font-bold text-xs">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            <span>Identified Operational & Procedural Gaps</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-700">
            {gaps.map((g, idx) => (
              <li key={idx} className="font-medium text-[11px]">{g}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* AI Diagnostic Explanation */}
      {aiExplanation && (
        <Card className="p-4 border-blue-200 bg-blue-50/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>AI Operational Diagnosis</span>
            </div>
            <Badge variant="neutral" size="sm">{aiExplanation.source}</Badge>
          </div>
          <p className="text-slate-700 mb-2 leading-relaxed">{aiExplanation.summary}</p>
          <div className="pt-2 border-t border-blue-100 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <span className="font-semibold text-slate-600 block text-[10px] uppercase">Root Cause:</span>
              <span className="text-slate-800">{aiExplanation.root_cause}</span>
            </div>
            <div className="flex-1">
              <span className="font-semibold text-slate-600 block text-[10px] uppercase">Recommended Fix:</span>
              <span className="text-slate-800 font-medium">{aiExplanation.recommended_action}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
