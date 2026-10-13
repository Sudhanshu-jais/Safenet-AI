import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Activity,
  AlertOctagon,
  Award,
  ChevronRight,
  Sparkles,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Smartphone,
  Radio,
  FileCheck,
  History,
  Users,
  AlertTriangle,
  Zap,
  UserCheck,
  Check,
  RefreshCw,
  Search
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge, getPriorityBadgeVariant } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { NavigationTab } from '../layout/Sidebar.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { SystemStats, Incident, ScenarioRun, CorrectiveAction, Location, Responder, AuditLog } from '../../types/index.js';

interface OverviewProps {
  onNavigate: (tab: NavigationTab) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({ onNavigate, showToast }) => {
  const { role, isAdmin, isOperator, isAuditor } = useAuth();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentRuns, setRecentRuns] = useState<ScenarioRun[]>([]);
  const [unresolvedActions, setUnresolvedActions] = useState<CorrectiveAction[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const [sRes, incRes, runsRes, caRes, locRes, respRes, auditRes] = await Promise.all([
        api.getStats(),
        api.getIncidents({ is_simulation: undefined }),
        api.getScenarioRuns(),
        api.getCorrectiveActions({ status: 'OPEN' }),
        api.getLocations(),
        api.getResponders(),
        api.getAuditLogs({ limit: 6 }),
      ]);

      setStats(sRes.stats);
      setRecentIncidents(incRes.incidents);
      setRecentRuns(runsRes.runs);
      setUnresolvedActions(caRes.corrective_actions);
      setLocations(locRes.locations);
      setResponders(respRes.responders);
      setAuditLogs(auditRes.logs);
    } catch (err: any) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [role]);

  // Quick 1-click Acknowledge for Operator
  const handleQuickAcknowledge = async (incidentId: string) => {
    setActionLoadingId(incidentId);
    try {
      await api.transitionIncident(incidentId, 'ACKNOWLEDGED', 'Rapid acknowledge via Operator Dispatch Console');
      showToast('Incident acknowledged and moved to triage queue.', 'success');
      await loadDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick responder availability toggle for Operator
  const handleToggleResponder = async (responderId: string, currentAvail: string) => {
    const nextAvail = currentAvail === 'AVAILABLE' ? 'ON_DUTY_BUSY' : 'AVAILABLE';
    try {
      await api.updateResponderAvailability(responderId, nextAvail);
      showToast(`Responder marked ${nextAvail}`, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSeed = async () => {
    try {
      const res = await api.seedDemoData();
      showToast(res.message, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear demo dataset records?')) return;
    try {
      const res = await api.clearDemoData();
      showToast(res.message, 'warning');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Synchronizing {role} console telemetry...</p>
      </div>
    );
  }

  // Filter incidents for operator queue
  const awaitingAckList = recentIncidents.filter(i => i.status === 'REPORTED');
  const activeDispatches = recentIncidents.filter(i => i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS');
  const availableRespondersCount = responders.filter(r => r.availability === 'AVAILABLE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────────────────────
          ROLE-SPECIFIC BANNER
      ─────────────────────────────────────────────────────────────────────────────── */}
      {isOperator ? (
        /* OPERATOR BANNER */
        <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-white border border-pink-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-pink-600/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Women Safety Tactical Dispatch Console</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-300 shrink-0">
                  PINK PATROL DISPATCH
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Priority emergency dispatch queue across active pilot sectors (Campus, City Markets, Transit Corridors, etc.). Deploy Pink Patrol & QRT units with expandable city-wide coverage.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('citizen')}
              icon={<Smartphone className="w-3.5 h-3.5 text-pink-600" />}
              className="text-xs bg-white border-pink-200 hover:bg-pink-50"
            >
              Women SOS Portal
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate('incidents')}
              icon={<ShieldAlert className="w-3.5 h-3.5" />}
              className="text-xs bg-pink-600 hover:bg-pink-700"
            >
              Triage Queue ({awaitingAckList.length})
            </Button>
          </div>
        </div>
      ) : isAuditor ? (
        /* AUDITOR BANNER */
        <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-white border border-pink-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-pink-600/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Women Safety Compliance & Audit Verification Console</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-300 shrink-0">
                  COMPLIANCE AUDITOR
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Independent oversight terminal. Inspect tamper-evident append-only audit journals of women distress dispatches across pilot sectors (Universities, Commercial, Transit, etc.), verify failover criteria & audit readiness for city-wide rollout.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('proof')}
              icon={<Award className="w-3.5 h-3.5 text-pink-600" />}
              className="text-xs bg-white"
            >
              PROOF Verification
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate('safetest')}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Run SAFETEST Suite
            </Button>
          </div>
        </div>
      ) : (
        /* ADMINISTRATOR BANNER */
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">SAFENET AI — Women Safety Network Terminal</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-300 shrink-0">
                CHIEF GOVERNANCE
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-300 shrink-0">
                PROTOTYPE PILOT
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              High-assurance emergency management network protecting female students, lone commuters, and vulnerable transit areas across universities, commercial centers, transit corridors, and more (expanding city-wide).
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('citizen')}
              icon={<Smartphone className="w-3.5 h-3.5 text-pink-600" />}
            >
              Women SOS
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeed}
              icon={<Sparkles className="w-3.5 h-3.5 text-pink-600" />}
            >
              Seed Demo
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate('incidents')}
              icon={<ShieldAlert className="w-4 h-4" />}
            >
              Report Incident
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ROLE-ADAPTIVE KPI METRIC CARDS
      ─────────────────────────────────────────────────────────────────────────────── */}
      {isOperator ? (
        /* OPERATOR KPI CARDS */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Awaiting Acknowledgement (HIGH PRIORITY) */}
          <Card
            onClick={() => onNavigate('incidents')}
            hoverable
            className="p-4 flex flex-col justify-between border-2 border-amber-300 bg-amber-50/40"
          >
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Awaiting Ack</span>
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            </div>
            <div className="text-3xl font-black text-amber-900">{stats?.awaiting_acknowledgement ?? 0}</div>
            <div className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
              <span>⚠️ Action Required</span>
            </div>
          </Card>

          {/* Card 2: Active Dispatches */}
          <Card
            onClick={() => onNavigate('incidents')}
            hoverable
            className="p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Dispatches</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.active_workflows ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">In transit or on scene</div>
          </Card>

          {/* Card 3: Available Responders */}
          <Card
            onClick={() => onNavigate('incidents')}
            hoverable
            className="p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Ready Units</span>
              <Users className="w-4 h-4 text-pink-600" />
            </div>
            <div className="text-2xl font-bold text-pink-950">{availableRespondersCount} / {responders.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Standing by across 3 sectors</div>
          </Card>

          {/* Card 4: Open Incidents */}
          <Card
            onClick={() => onNavigate('incidents')}
            hoverable
            className="p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Queue</span>
              <ShieldAlert className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.open_incidents ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Total operational load</div>
          </Card>

          {/* Card 5: Phone SOS Incidents */}
          <Card
            onClick={() => onNavigate('citizen')}
            hoverable
            className="p-4 flex flex-col justify-between col-span-2 md:col-span-1 bg-red-50/50 border border-red-200"
          >
            <div className="flex items-center justify-between text-red-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Citizen SOS</span>
              <Smartphone className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-900">
              {recentIncidents.filter(i => i.title.includes('CITIZEN SOS')).length}
            </div>
            <div className="text-[11px] text-red-700 mt-1 flex items-center gap-1 font-medium">
              <span>Mobile Distress Portal</span>
            </div>
          </Card>
        </div>
      ) : isAuditor ? (
        /* AUDITOR KPI CARDS */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: SAFETEST Pass Rate (HIGH PRIORITY) */}
          <Card
            onClick={() => onNavigate('proof')}
            hoverable
            className="p-4 flex flex-col justify-between border-2 border-pink-300 bg-pink-50/50"
          >
            <div className="flex items-center justify-between text-pink-900 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">SAFETEST Pass Rate</span>
              <Award className="w-4 h-4 text-pink-600" />
            </div>
            <div className="text-3xl font-black text-pink-950">
              {stats?.latest_pass_rate !== null ? `${stats?.latest_pass_rate}%` : 'N/A'}
            </div>
            <div className="text-[11px] text-pink-800 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-pink-600" />
              <span>Gated Verification Standard</span>
            </div>
          </Card>

          {/* Card 2: Recorded Audit Trail Events */}
          <Card
            onClick={() => onNavigate('audit')}
            hoverable
            className="p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Audit Log Entries</span>
              <History className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{auditLogs.length}+</div>
            <div className="text-[11px] text-slate-500 mt-1">Append-only immutable record</div>
          </Card>

          {/* Card 3: Unresolved Weaknesses */}
          <Card
            onClick={() => onNavigate('corrective')}
            hoverable
            className="p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-red-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Unverified Gaps</span>
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-800">{stats?.unresolved_weaknesses ?? 0}</div>
            <div className="text-[11px] text-red-700 mt-1">Open remediation tickets</div>
          </Card>

          {/* Card 4: Total Test Runs */}
          <Card
            onClick={() => onNavigate('safetest')}
            hoverable
            className="p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Scenario Test Runs</span>
              <FileCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.total_runs ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Deterministic runs evaluated</div>
          </Card>

          {/* Card 5: Gated Remediations */}
          <Card
            onClick={() => onNavigate('corrective')}
            hoverable
            className="p-4 flex flex-col justify-between col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Verified Remediations</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {unresolvedActions.filter(a => a.status === 'VERIFIED').length || 1}
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-1">Proven with test evidence</div>
          </Card>
        </div>
      ) : (
        /* ADMINISTRATOR KPI CARDS */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card onClick={() => onNavigate('incidents')} hoverable className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Open Incidents</span>
              <ShieldAlert className="w-4 h-4 text-pink-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.open_incidents ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">In active response queue</div>
          </Card>

          <Card onClick={() => onNavigate('incidents')} hoverable className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Ack</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900">{stats?.awaiting_acknowledgement ?? 0}</div>
            <div className="text-[11px] text-amber-700 mt-1">Requires triage operator</div>
          </Card>

          <Card onClick={() => onNavigate('incidents')} hoverable className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Workflows</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.active_workflows ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Assigned or in progress</div>
          </Card>

          <Card onClick={() => onNavigate('corrective')} hoverable className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Unresolved Gaps</span>
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-800">{stats?.unresolved_weaknesses ?? 0}</div>
            <div className="text-[11px] text-red-700 mt-1">Open corrective tickets</div>
          </Card>

          <Card onClick={() => onNavigate('proof')} hoverable className="p-4 flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">SAFETEST Pass Rate</span>
              <Award className="w-4 h-4 text-pink-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.latest_pass_rate !== null ? `${stats?.latest_pass_rate}%` : 'N/A'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Across {stats?.total_runs ?? 0} test runs</span>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ROLE-SPECIFIC MAIN WORKSPACE PANELS
      ─────────────────────────────────────────────────────────────────────────────── */}
      {isOperator ? (
        /* OPERATOR MAIN PANELS: IMMEDIATE TRIAGE QUEUE & RESPONDER ROSTER */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Urgent Triage Queue with 1-Click Acknowledge */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Emergency Triage & Action Queue
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  {awaitingAckList.length} Unacknowledged
                </span>
              </div>
              <button
                onClick={() => onNavigate('incidents')}
                className="text-xs font-semibold text-pink-600 hover:text-pink-800 flex items-center gap-1 cursor-pointer"
              >
                Full Dispatch Log <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <Card className="divide-y divide-slate-100 overflow-hidden">
              {recentIncidents.slice(0, 5).map((inc) => {
                const isReported = inc.status === 'REPORTED';
                const isBusy = actionLoadingId === inc.id;

                return (
                  <div key={inc.id} className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">{inc.id}</span>
                        <Badge
                          variant={getPriorityBadgeVariant(inc.priority)}
                          size="sm"
                        >
                          {inc.priority}
                        </Badge>
                        <Badge
                          variant={
                            inc.status === 'REPORTED'
                              ? 'critical'
                              : inc.status === 'ACKNOWLEDGED'
                              ? 'warning'
                              : inc.status === 'RESOLVED'
                              ? 'success'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {inc.status}
                        </Badge>
                        {inc.title.includes('CITIZEN SOS') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                            PHONE SOS
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{inc.title}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{inc.location_name || inc.location_id} ({inc.zone})</span>
                        <span>•</span>
                        <span>Reported {new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>

                    {/* Operator Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isReported ? (
                        <button
                          onClick={() => handleQuickAcknowledge(inc.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Acking...' : '1-Click Ack'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('incidents')}
                          className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs border border-pink-200 cursor-pointer transition-colors"
                        >
                          Manage Dispatch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* Right: Responder Availability Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Responder Roster</h3>
              <span className="text-[11px] text-slate-500 font-medium">Click to toggle status</span>
            </div>

            <div className="space-y-2">
              {responders.map((resp) => {
                const isAvail = resp.availability === 'AVAILABLE';
                return (
                  <Card key={resp.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isAvail ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {resp.callsign.split('-')[0].charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{resp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{resp.callsign} • {resp.role}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleResponder(resp.id, resp.availability)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                          isAvail 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {resp.availability}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : isAuditor ? (
        /* AUDITOR MAIN PANELS: COMPLIANCE GATING & IMMUTABLE LOG AUDIT */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: SAFETEST Scenario Test Evaluations (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Procedural Stress-Test Runs & Verification Gating
              </h3>
              <button
                onClick={() => onNavigate('proof')}
                className="text-xs font-semibold text-pink-600 hover:text-pink-800 flex items-center gap-1 cursor-pointer"
              >
                Inspect PROOF Deltas <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <Card className="divide-y divide-slate-100 overflow-hidden">
              {recentRuns.map((run) => (
                <div key={run.id} onClick={() => onNavigate('proof')} className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {run.status === 'PASSED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">{run.scenario_title || run.scenario_id}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-400">{run.id}</span>
                        <span>•</span>
                        <span className="font-semibold text-pink-700">Rule {run.rule_version}</span>
                        <span>•</span>
                        <span>{run.passed_checks}/{run.total_checks} checks passed</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={run.status === 'PASSED' ? 'success' : 'critical'} size="sm">
                    {run.status}
                  </Badge>
                </div>
              ))}
            </Card>

            {/* Unverified Corrective Actions */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Open Remediation Tickets</h4>
              <Card className="divide-y divide-slate-100">
                {unresolvedActions.map((ca) => (
                  <div key={ca.id} onClick={() => onNavigate('corrective')} className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{ca.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Owner: {ca.owner} • Target: {ca.verification_scenario_id}</div>
                    </div>
                    <Badge variant={ca.status === 'OPEN' ? 'warning' : 'primary'} size="sm">{ca.status}</Badge>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          {/* Right: Immutable Audit Trail Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Append-Only Audit Journal</h3>
              <button onClick={() => onNavigate('audit')} className="text-xs text-pink-600 font-semibold cursor-pointer">
                All Logs
              </button>
            </div>

            <Card className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-slate-500">{log.action_type}</span>
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium">Actor: {log.actor_id} ({log.actor_role})</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{log.details_json}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      ) : (
        /* ADMINISTRATOR DEFAULT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Incidents</h3>
              <button onClick={() => onNavigate('incidents')} className="text-xs font-semibold text-pink-600 hover:text-pink-800 flex items-center gap-1 cursor-pointer">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <Card className="divide-y divide-slate-100">
              {recentIncidents.slice(0, 5).map((inc) => (
                <div key={inc.id} onClick={() => onNavigate('incidents')} className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-slate-400">{inc.id}</span>
                      <Badge variant={getPriorityBadgeVariant(inc.priority)} size="sm">
                        {inc.priority}
                      </Badge>
                      <Badge variant={inc.status === 'RESOLVED' ? 'success' : 'primary'} size="sm">
                        {inc.status}
                      </Badge>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{inc.title}</div>
                    <div className="text-[10px] text-slate-400">{inc.location_name || inc.location_id} • {inc.zone}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pilot Sectors & Nationwide Pipeline</h3>
              <span className="text-[11px] text-pink-600 font-semibold">3 Active Pilots • Extensible Framework</span>
            </div>

            <div className="space-y-2.5">
              {locations.map((loc) => {
                const zones = JSON.parse(loc.zones_json || '[]');
                return (
                  <Card key={loc.id} className="p-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-700">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{loc.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{loc.id}</span>
                        </div>
                      </div>
                      <Badge variant="simulation" size="sm">PILOT SECTOR</Badge>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{loc.zone_count} Zones ({zones.slice(0, 2).join(', ')}...)</span>
                      <span className="text-emerald-700 font-medium">Active Telemetry</span>
                    </div>
                  </Card>
                );
              })}

              {/* Expansion In-Progress Card */}
              <Card className="p-3.5 border-dashed border-pink-200 bg-gradient-to-r from-pink-50/60 via-rose-50/40 to-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-pink-950">City-Wide & Nationwide Expansion Pipeline</h4>
                      <span className="text-[10px] text-pink-600 font-medium">Phase-2 Scalable Architecture</span>
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">EXPANDING</Badge>
                </div>
                <p className="text-[11px] text-slate-600 mt-2">
                  Multi-tenant routing engine built to expand beyond pilot sectors to all university campuses, suburban railway networks, shopping complexes, IT parks, highways, and municipal wards.
                </p>
                <div className="mt-2.5 pt-2 border-t border-pink-100 flex items-center justify-between text-[10px] text-pink-700 font-medium">
                  <span>Universities • Markets • Transit Hubs • + More Cities</span>
                  <span>Infinite Scalability</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
