import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { CorrectiveAction, Scenario, ScenarioRun } from '../../types/index.js';

interface CorrectiveListProps {
  initialRun?: ScenarioRun | null;
  onClearInitialRun?: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const CorrectiveList: React.FC<CorrectiveListProps> = ({
  initialRun,
  onClearInitialRun,
  showToast,
}) => {
  const { isAdmin } = useAuth();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [weakness, setWeakness] = useState('');
  const [proposedRemedy, setProposedRemedy] = useState('');
  const [owner, setOwner] = useState('Chief Dispatcher Morgan');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [verificationScenarioId, setVerificationScenarioId] = useState('');
  const [sourceRunId, setSourceRunId] = useState<string | undefined>(undefined);

  // Verification modal state
  const [verifyingAction, setVerifyingAction] = useState<CorrectiveAction | null>(null);
  const [selectedVerificationRunId, setSelectedVerificationRunId] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [caRes, scenRes, runsRes] = await Promise.all([
        api.getCorrectiveActions({ status: statusFilter || undefined }),
        api.getScenarios(),
        api.getScenarioRuns(),
      ]);
      setActions(caRes.corrective_actions);
      setScenarios(scenRes.scenarios);
      setRuns(runsRes.runs);

      if (scenRes.scenarios.length > 0 && !verificationScenarioId) {
        setVerificationScenarioId(scenRes.scenarios[0].id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Handle auto-opening creation modal when passed an initial failed run
  useEffect(() => {
    if (initialRun) {
      setTitle(`Remediate Weakness in ${initialRun.scenario_title || initialRun.scenario_id}`);
      const gaps: string[] = JSON.parse(initialRun.gaps_identified_json || '[]');
      setWeakness(gaps.join('; ') || 'Procedural check failure observed during scenario execution.');
      setProposedRemedy('Update dispatch failover rules and retest against deterministic criteria.');
      setVerificationScenarioId(initialRun.scenario_id);
      setSourceRunId(initialRun.id);
      setShowCreateModal(true);
      if (onClearInitialRun) onClearInitialRun();
    }
  }, [initialRun]);

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !weakness || !proposedRemedy || !owner || !verificationScenarioId) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.createCorrectiveAction({
        title,
        weakness_description: weakness,
        proposed_remedy: proposedRemedy,
        owner,
        priority,
        verification_scenario_id: verificationScenarioId,
        source_run_id: sourceRunId,
      });

      showToast('Corrective action ticket created successfully', 'success');
      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setTitle('');
    setWeakness('');
    setProposedRemedy('');
    setSourceRunId(undefined);
  };

  const handleUpdateStatus = async (id: string, targetStatus: string, runId?: string, notes?: string) => {
    try {
      await api.updateCorrectiveActionStatus(id, targetStatus, runId, notes);
      showToast(`Action status updated to ${targetStatus}`, 'success');
      setVerifyingAction(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyingAction || !selectedVerificationRunId) {
      showToast('Select a verification scenario run to satisfy the verification gate.', 'warning');
      return;
    }
    await handleUpdateStatus(
      verifyingAction.id,
      'VERIFIED',
      selectedVerificationRunId,
      verificationNotes || undefined
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-pink-600" />
            <h2 className="text-base font-bold text-slate-900">Corrective Action Management</h2>
            <Badge variant="simulation">CLOSED-LOOP REMEDIATION</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Connects SAFETEST AI failure findings to auditable remediation tickets. Status can only be marked VERIFIED when a linked scenario run satisfies all pass criteria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="VERIFIED">VERIFIED</option>
          </select>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading corrective actions...</p>
          </div>
        ) : actions.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Corrective Actions Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Run a scenario test in SAFETEST AI that detects a procedural weakness, then remediate it here.
            </p>
          </Card>
        ) : (
          actions.map((ca) => (
            <Card key={ca.id} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-slate-400 font-bold">{ca.id}</span>
                    <Badge
                      variant={
                        ca.status === 'VERIFIED'
                          ? 'success'
                          : ca.status === 'OPEN'
                          ? 'warning'
                          : 'primary'
                      }
                    >
                      {ca.status}
                    </Badge>
                    <Badge
                      variant={
                        ca.priority === 'CRITICAL' ? 'critical' : ca.priority === 'HIGH' ? 'warning' : 'neutral'
                      }
                      size="sm"
                    >
                      {ca.priority}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{ca.title}</h3>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {ca.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(ca.id, 'IN_PROGRESS')}
                    >
                      Start Work
                    </Button>
                  )}

                  {ca.status !== 'VERIFIED' && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        setVerifyingAction(ca);
                        // Find matching passed runs for this scenario
                        const matchingPassed = runs.filter(
                          r => r.scenario_id === ca.verification_scenario_id && r.status === 'PASSED'
                        );
                        if (matchingPassed.length > 0) {
                          setSelectedVerificationRunId(matchingPassed[0].id);
                        } else {
                          setSelectedVerificationRunId('');
                        }
                      }}
                      icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      Verify & Close
                    </Button>
                  )}

                  {ca.status === 'VERIFIED' && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified by {ca.verified_by}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                    Identified Operational Weakness:
                  </span>
                  <p className="text-slate-800 text-[11px] mt-0.5">{ca.weakness_description}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block text-[10px] uppercase">
                    Proposed Corrective Change:
                  </span>
                  <p className="text-slate-800 text-[11px] mt-0.5">{ca.proposed_remedy}</p>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Owner: <strong className="text-slate-700">{ca.owner}</strong></span>
                  <span>•</span>
                  <span>
                    Verification Benchmark: <strong className="text-pink-700">{ca.verification_scenario_title || ca.verification_scenario_id}</strong>
                  </span>
                </div>
                {ca.verified_at && (
                  <span className="text-emerald-700 font-medium">
                    Verified at: {new Date(ca.verified_at).toLocaleString()}
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Corrective Action Ticket"
        subtitle="Log an identified weakness and assign verification scenario criteria"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAction} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ticket Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement automated fallback responder trigger"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Identified Weakness Description</label>
            <textarea
              rows={2}
              value={weakness}
              onChange={(e) => setWeakness(e.target.value)}
              placeholder="Describe the gap detected during testing..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Proposed Corrective Remedy</label>
            <textarea
              rows={2}
              value={proposedRemedy}
              onChange={(e) => setProposedRemedy(e.target.value)}
              placeholder="Operational rule change or escalation policy update..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Verification Scenario Benchmark</label>
            <select
              value={verificationScenarioId}
              onChange={(e) => setVerificationScenarioId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button size="sm" variant="secondary" onClick={() => setShowCreateModal(false)} type="button">
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={submitting}>
              Create Corrective Action
            </Button>
          </div>
        </form>
      </Modal>

      {/* Strict Verification Gate Modal */}
      <Modal
        isOpen={Boolean(verifyingAction)}
        onClose={() => setVerifyingAction(null)}
        title="Verification Gate Enforcement"
        subtitle="Verification requires deterministic proof from a passed scenario test run"
        maxWidth="md"
      >
        {verifyingAction && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 text-pink-950">
              <span className="font-bold block text-xs">Target Scenario Required:</span>
              <span className="text-[11px] font-medium text-pink-800">
                {verifyingAction.verification_scenario_title || verifyingAction.verification_scenario_id}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Qualifying Verification Test Run: <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedVerificationRunId}
                onChange={(e) => setSelectedVerificationRunId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono"
              >
                <option value="">-- Choose Test Run --</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} ({r.rule_version}) — Status: {r.status} ({r.passed_checks}/{r.total_checks} passed)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                <strong>Enforcement Rule:</strong> If the selected run ended with status FAILED or is for a different scenario, the backend verification gate will strictly reject this transition.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Verification Notes</label>
              <textarea
                rows={2}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="e.g. Verified via SCN-001 rerun under Rule v2.0 with secondary fallback enabled."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="secondary" onClick={() => setVerifyingAction(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={handleVerifySubmit}
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Submit for Verification
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
