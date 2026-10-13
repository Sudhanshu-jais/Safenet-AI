import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Settings2,
  CheckCircle2,
  XCircle,
  History,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { ScenarioRunner } from './ScenarioRunner.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Scenario, ScenarioRun } from '../../types/index.js';

interface ScenarioListProps {
  onOpenCorrectiveAction: (run: ScenarioRun) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  onOpenCorrectiveAction,
  showToast,
}) => {
  const { isAdmin } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [activeRun, setActiveRun] = useState<ScenarioRun | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [ruleVersion, setRuleVersion] = useState('v1.0');
  const [ruleConfig, setRuleConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [scenRes, runsRes] = await Promise.all([
        api.getScenarios(),
        api.getScenarioRuns(),
      ]);
      setScenarios(scenRes.scenarios);
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

  const handleRunScenario = async (scenarioId: string) => {
    setRunningScenarioId(scenarioId);
    try {
      const res = await api.executeScenario(scenarioId);
      setActiveRun(res.run);
      showToast(`Scenario executed: Result is ${res.run.status}`, res.run.status === 'PASSED' ? 'success' : 'warning');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRunningScenarioId(null);
    }
  };

  const handleOpenRuleEditor = (scen: Scenario) => {
    setEditingScenario(scen);
    setRuleVersion(scen.rule_version);
    setRuleConfig(JSON.parse(scen.active_rule_config_json || '{}'));
  };

  const handleSaveRuleConfig = async () => {
    if (!editingScenario) return;
    try {
      await api.updateScenarioRule(editingScenario.id, ruleVersion, ruleConfig);
      showToast(`Rule updated to ${ruleVersion} for ${editingScenario.title}`, 'success');
      setEditingScenario(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">SAFETEST AI — Deterministic Scenario Library</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Test emergency response procedures under controlled failure conditions. All tests run deterministically against backend dispatch logic without modifying real records.
          </p>
        </div>
        <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span>Engine Authority: <strong className="text-slate-800">Deterministic Logic</strong></span>
        </div>
      </div>

      {/* Scenario Library Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scen) => {
          const initCond = JSON.parse(scen.initial_conditions_json || '{}');
          const failCond = JSON.parse(scen.failure_condition_json || '{}');
          const passCriteria = JSON.parse(scen.pass_criteria_json || '[]');
          const isRunning = runningScenarioId === scen.id;

          const recentRun = runs.find(r => r.scenario_id === scen.id);

          return (
            <Card key={scen.id} className="p-4 flex flex-col justify-between hover:border-blue-200 transition-colors">
              <div>
                {/* Header: Title, Category, Version */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{scen.id}</span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{scen.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="primary" size="sm">Rule {scen.rule_version}</Badge>
                    <Badge variant="neutral" size="sm">{scen.category}</Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3 leading-relaxed">{scen.description}</p>

                {/* Condition Box */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] mb-3">
                  <div>
                    <span className="font-semibold text-slate-500">Failure Trigger: </span>
                    <span className="text-red-700 font-medium">{failCond.description || failCond.type}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Criteria: </span>
                    <span className="text-slate-700">{passCriteria.length} verification checks defined</span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Recent Result & Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {recentRun ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {recentRun.status === 'PASSED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                      )}
                      <span className="text-slate-500">Last:</span>
                      <strong className={recentRun.status === 'PASSED' ? 'text-emerald-700' : 'text-red-700'}>
                        {recentRun.status}
                      </strong>
                      <span className="text-slate-400 font-mono text-[10px]">({recentRun.rule_version})</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Not tested yet</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenRuleEditor(scen)}
                      icon={<Settings2 className="w-3.5 h-3.5" />}
                      title="Inspect & configure scenario rule parameters"
                    >
                      Rules
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleRunScenario(scen.id)}
                    isLoading={isRunning}
                    icon={<Play className="w-3.5 h-3.5 fill-current" />}
                  >
                    Run Test
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Test Execution Output Modal */}
      <Modal
        isOpen={Boolean(activeRun)}
        onClose={() => setActiveRun(null)}
        title="SAFETEST AI Execution Results"
        subtitle="Deterministic step assertions, pass/fail evaluation, and gap diagnosis"
        maxWidth="xl"
      >
        {activeRun && (
          <ScenarioRunner
            run={activeRun}
            onRerun={() => handleRunScenario(activeRun.scenario_id)}
            onCreateCorrectiveAction={(r) => {
              setActiveRun(null);
              onOpenCorrectiveAction(r);
            }}
            isRerunning={runningScenarioId === activeRun.scenario_id}
          />
        )}
      </Modal>

      {/* Rule Config Editor Modal */}
      <Modal
        isOpen={Boolean(editingScenario)}
        onClose={() => setEditingScenario(null)}
        title={`Configure Rules for ${editingScenario?.title || ''}`}
        subtitle="Simulate policy modifications (e.g. Rule v1.0 baseline vs Rule v2.0 auto-fallback)"
        maxWidth="md"
      >
        {editingScenario && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rule Policy Version</label>
              <input
                type="text"
                value={ruleVersion}
                onChange={(e) => setRuleVersion(e.target.value)}
                placeholder="e.g. v1.0 or v2.0"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Config fields depending on scenario */}
            {editingScenario.id === 'scn-unavail-resp' && (
              <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block text-xs">Dispatch Failover Toggles:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(ruleConfig.auto_fallback_enabled)}
                    onChange={(e) =>
                      setRuleConfig({ ...ruleConfig, auto_fallback_enabled: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>
                    <strong>auto_fallback_enabled</strong> (Cascade to secondary unit if primary is offline)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(ruleConfig.supervisor_alert)}
                    onChange={(e) =>
                      setRuleConfig({ ...ruleConfig, supervisor_alert: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>
                    <strong>supervisor_alert</strong> (Transmit alert to supervisor console)
                  </span>
                </label>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  <span className="font-semibold text-blue-700">Demonstration Guide:</span> Set to <code>false</code> to trigger deterministic failure (Rule v1.0), then set to <code>true</code> (Rule v2.0) to prove remediation!
                </div>
              </div>
            )}

            {editingScenario.id !== 'scn-unavail-resp' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Raw Rule JSON Config</label>
                <textarea
                  rows={5}
                  value={JSON.stringify(ruleConfig, null, 2)}
                  onChange={(e) => {
                    try {
                      setRuleConfig(JSON.parse(e.target.value));
                    } catch (err) {}
                  }}
                  className="w-full font-mono text-[11px] p-2 rounded-lg border border-slate-200"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="secondary" onClick={() => setEditingScenario(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSaveRuleConfig}>
                Save Rule Policy
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
