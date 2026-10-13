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
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { NavigationTab } from '../layout/Sidebar.js';
import { api } from '../../services/api.js';
import { SystemStats, Incident, ScenarioRun, CorrectiveAction, Location } from '../../types/index.js';

interface OverviewProps {
  onNavigate: (tab: NavigationTab) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const OverviewDashboard: React.FC<OverviewProps> = ({ onNavigate, showToast }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentRuns, setRecentRuns] = useState<ScenarioRun[]>([]);
  const [unresolvedActions, setUnresolvedActions] = useState<CorrectiveAction[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sRes, incRes, runsRes, caRes, locRes] = await Promise.all([
        api.getStats(),
        api.getIncidents({ is_simulation: undefined }),
        api.getScenarioRuns(),
        api.getCorrectiveActions({ status: 'OPEN' }),
        api.getLocations(),
      ]);

      setStats(sRes.stats);
      setRecentIncidents(incRes.incidents.slice(0, 5));
      setRecentRuns(runsRes.runs.slice(0, 4));
      setUnresolvedActions(caRes.corrective_actions.slice(0, 4));
      setLocations(locRes.locations);
    } catch (err: any) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSeed = async () => {
    try {
      const res = await api.seedDemoData();
      showToast(res.message, 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Synchronizing database metrics...</p>
      </div>
    );
  }

  const isEmpty = (stats?.total_runs === 0 && recentIncidents.length === 0);

  return (
    <div className="space-y-6">
      {/* Welcome / Mode Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">SAFENET AI Operational Terminal</h2>
            <Badge variant="simulation">Verified Sandbox Active</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time public safety telemetry, deterministic procedural failure testing, and audit verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEmpty && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeed}
              icon={<Sparkles className="w-4 h-4 text-blue-600" />}
            >
              Seed Minimal Demo Data
            </Button>
          )}
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

      {/* 5 Compact Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Open Incidents */}
        <Card
          onClick={() => onNavigate('incidents')}
          hoverable
          className="p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Incidents</span>
            <ShieldAlert className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.open_incidents ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>In active response queue</span>
          </div>
        </Card>

        {/* Card 2: Awaiting Ack */}
        <Card
          onClick={() => onNavigate('incidents')}
          hoverable
          className="p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Ack</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">{stats?.awaiting_acknowledgement ?? 0}</div>
          <div className="text-[11px] text-amber-700 mt-1">Requires triage operator</div>
        </Card>

        {/* Card 3: Active Workflows */}
        <Card
          onClick={() => onNavigate('incidents')}
          hoverable
          className="p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Workflows</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.active_workflows ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Assigned or in progress</div>
        </Card>

        {/* Card 4: Unresolved Weaknesses */}
        <Card
          onClick={() => onNavigate('corrective')}
          hoverable
          className="p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unresolved Gaps</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-800">{stats?.unresolved_weaknesses ?? 0}</div>
          <div className="text-[11px] text-red-700 mt-1">Open corrective tickets</div>
        </Card>

        {/* Card 5: SAFETEST Pass Rate */}
        <Card
          onClick={() => onNavigate('proof')}
          hoverable
          className="p-4 flex flex-col justify-between col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SAFETEST Pass Rate</span>
            <Award className="w-4 h-4 text-blue-600" />
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

      {/* Main Grid: Incidents & Demonstration Sectors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Incidents (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Incidents</h3>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <Card className="overflow-hidden">
            {recentIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium">No incidents logged yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Use the seed button or report a simulated incident to begin.</p>
              </div>
            ) : (
              <div>
                {/* Mobile View (sm:hidden) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {recentIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => onNavigate('incidents')}
                      className="p-3 hover:bg-slate-50 cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-500">{inc.id}</span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              inc.priority === 'CRITICAL' ? 'critical' : inc.priority === 'HIGH' ? 'warning' : 'neutral'
                            }
                            size="sm"
                          >
                            {inc.priority}
                          </Badge>
                          <Badge
                            variant={
                              inc.status === 'RESOLVED'
                                ? 'success'
                                : inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS'
                                ? 'primary'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {inc.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="font-semibold text-xs text-slate-900 truncate">{inc.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{inc.location_name || inc.location_id}</span>
                        <span>{new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet & Desktop Table (hidden sm:block) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5">ID / Sector</th>
                        <th className="py-2.5 px-3.5">Title</th>
                        <th className="py-2.5 px-3.5">Priority</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentIncidents.map((inc) => (
                        <tr
                          key={inc.id}
                          onClick={() => onNavigate('incidents')}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3.5 font-mono text-slate-600">
                            <div>{inc.id}</div>
                            <div className="text-[10px] text-slate-400">{inc.location_name || inc.location_id}</div>
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-xs truncate">
                            {inc.title}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <Badge
                              variant={
                                inc.priority === 'CRITICAL' ? 'critical' : inc.priority === 'HIGH' ? 'warning' : 'neutral'
                              }
                              size="sm"
                            >
                              {inc.priority}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <Badge
                              variant={
                                inc.status === 'RESOLVED'
                                  ? 'success'
                                  : inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS'
                                  ? 'primary'
                                  : inc.status === 'ACKNOWLEDGED'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {inc.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {inc.is_simulation === 1 ? (
                              <Badge variant="simulation" size="sm">SIM</Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">REAL</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Supported Demonstration Locations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Demonstration Sectors</h3>
            <span className="text-[11px] text-slate-500 font-medium">3 Configured</span>
          </div>

          <div className="space-y-2.5">
            {locations.map((loc) => {
              const zones = JSON.parse(loc.zones_json || '[]');
              return (
                <Card key={loc.id} className="p-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{loc.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{loc.id}</span>
                      </div>
                    </div>
                    <Badge variant="simulation" size="sm">DEMO SECTOR</Badge>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{loc.zone_count} Zones ({zones.slice(0, 2).join(', ')}...)</span>
                    <span className="text-emerald-700 font-medium">Active Telemetry</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Grid: SAFETEST Runs & Corrective Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Recent SAFETEST Runs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent SAFETEST Runs</h3>
            <button
              onClick={() => onNavigate('safetest')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Run Scenario <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <Card className="divide-y divide-slate-100">
            {recentRuns.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <p className="text-xs">No scenario runs logged yet.</p>
              </div>
            ) : (
              recentRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => onNavigate('proof')}
                  className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between"
                >
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
                        <span>Rule {run.rule_version}</span>
                        <span>•</span>
                        <span>{run.passed_checks}/{run.total_checks} checks passed</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={run.status === 'PASSED' ? 'success' : 'critical'} size="sm">
                    {run.status}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Panel 2: Unresolved Corrective Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Unresolved Corrective Actions</h3>
            <button
              onClick={() => onNavigate('corrective')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Manage Tickets <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <Card className="divide-y divide-slate-100">
            {unresolvedActions.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-xs font-medium">All corrective actions resolved & verified.</p>
              </div>
            ) : (
              unresolvedActions.map((ca) => (
                <div
                  key={ca.id}
                  onClick={() => onNavigate('corrective')}
                  className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="max-w-[80%]">
                    <div className="text-xs font-bold text-slate-900 truncate">{ca.title}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{ca.weakness_description}</div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>Owner: {ca.owner}</span>
                      <span>•</span>
                      <span>Target: {ca.verification_scenario_title || ca.verification_scenario_id}</span>
                    </div>
                  </div>
                  <Badge variant={ca.status === 'OPEN' ? 'warning' : 'primary'} size="sm">
                    {ca.status}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
