import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Map,
  Table as TableIcon,
  RefreshCw,
  Smartphone,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge, getPriorityBadgeVariant } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { IncidentForm } from './IncidentForm.js';
import { IncidentDetail } from './IncidentDetail.js';
import { MapView } from './MapView.js';
import { useLocation } from '../../context/LocationContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { Incident, Responder } from '../../types/index.js';

interface IncidentListProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({ showToast }) => {
  const { locations, selectedLocationId } = useLocation();
  const { role, isOperator, isAuditor } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [citizenOnly, setCitizenOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [incRes, respRes] = await Promise.all([
        api.getIncidents({
          location_id: selectedLocationId !== 'ALL' ? selectedLocationId : undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search || undefined,
        }),
        api.getResponders(),
      ]);

      setIncidents(incRes.incidents);
      setResponders(respRes.responders);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLocationId, statusFilter, priorityFilter, search]);

  const handleQuickAck = async (e: React.MouseEvent, incidentId: string) => {
    e.stopPropagation();
    setActionLoadingId(incidentId);
    try {
      await api.transitionIncident(incidentId, 'ACKNOWLEDGED', 'Duty Dispatcher rapid acknowledge');
      showToast('Incident acknowledged and moved to active triage.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const displayedIncidents = citizenOnly 
    ? incidents.filter(i => 
        i.title.includes('WOMEN SOS') || 
        i.title.includes('CITIZEN SOS') || 
        i.title.includes('CAB DISTRESS') || 
        i.category === 'STALKING_HARASSMENT' ||
        i.category === 'SAFE_ESCORT_REQUEST' ||
        i.category === 'CAB_TRANSIT_EMERGENCY' ||
        i.category === 'IMMEDIATE_ASSAULT_SOS'
      )
    : incidents;

  return (
    <div className="space-y-4">
      {/* Role Notice Banner */}
      {isOperator ? (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="font-bold">Pink Patrol Dispatch Triage Active:</span>
            <span>You have live dispatch authority. Click "1-Click Ack" on reported alerts to claim and assign patrol units.</span>
          </div>
          <Badge variant="warning" size="sm">DISPATCH AUTHORITY</Badge>
        </div>
      ) : isAuditor ? (
        <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-between text-xs text-pink-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-pink-600" />
            <span className="font-bold">Women Safety Compliance Inspection Mode:</span>
            <span>Read-only compliance audit trail. Inspect distress lifecycle, officer signatures, and verification timestamps.</span>
          </div>
          <Badge variant="neutral" size="sm">AUDIT ACCESS</Badge>
        </div>
      ) : null}

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Left: Search & Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents by title, description, or zone..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="REPORTED">REPORTED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Women SOS Filter Pill */}
          <button
            type="button"
            onClick={() => setCitizenOnly(!citizenOnly)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              citizenOnly
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Women SOS Only</span>
          </button>
        </div>

        {/* Right: View Toggle & Create Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
              title="Schematic Sector Map"
            >
              <Map className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Refresh Data"
          />

          {!isAuditor && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Report Incident
            </Button>
          )}
        </div>
      </div>

      {/* Pilot Coverage Scope Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">Prototype Scope:</span>
          <span>Active in pilot hubs (Campus, Markets, Transit Corridors, etc.)</span>
          <span className="text-slate-300">•</span>
          <span className="text-pink-600 font-medium">Extensible to all city zones & municipal jurisdictions</span>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
          {selectedLocationId === 'ALL' ? 'All Pilot Sectors (Aggregated)' : locations.find(l => l.id === selectedLocationId)?.name || selectedLocationId}
        </span>
      </div>

      {/* Main View Area: Table vs Schematic Map */}
      {viewMode === 'map' ? (
        <MapView
          locations={locations}
          incidents={displayedIncidents}
          responders={responders}
          onSelectIncident={(id) => setSelectedIncidentId(id)}
        />
      ) : (
        <Card className="overflow-hidden">
          {displayedIncidents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Incidents Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {citizenOnly ? 'No citizen phone SOS records found.' : 'No active incident reports match the selected filters.'}
              </p>
              {!isAuditor && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Report Incident
                </Button>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile Phone Card View (md:hidden) */}
              <div className="md:hidden divide-y divide-slate-100">
                {displayedIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className="p-3.5 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 font-bold">
                        <span>{inc.id}</span>
                        {inc.title.includes('CITIZEN SOS') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-0.5">
                            <Smartphone className="w-2.5 h-2.5" /> SOS
                          </span>
                        )}
                        {inc.is_simulation === 1 && (
                          <Badge variant="simulation" size="sm">SIM</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={getPriorityBadgeVariant(inc.priority)}
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
                              : inc.status === 'ACKNOWLEDGED'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {inc.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{inc.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{inc.description}</p>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
                      <span>{inc.location_name || inc.location_id} • {inc.zone}</span>
                      <span>{new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Incident ID</th>
                      <th className="py-3 px-4">Title & Description</th>
                      <th className="py-3 px-4">Sector / Zone</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Unit</th>
                      <th className="py-3 px-4">Reported</th>
                      {isOperator && <th className="py-3 px-4 text-right">Quick Dispatch</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <span>{inc.id}</span>
                            {inc.title.includes('CITIZEN SOS') && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700" title="Triggered from Citizen Mobile Portal">
                                SOS
                              </span>
                            )}
                          </div>
                          {inc.is_simulation === 1 && (
                            <div className="mt-0.5">
                              <Badge variant="simulation" size="sm">SIM</Badge>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{inc.title}</div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{inc.description}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{inc.location_name || inc.location_id}</div>
                          <div className="text-[11px] text-slate-400">{inc.zone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={getPriorityBadgeVariant(inc.priority)}
                            size="sm"
                          >
                            {inc.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4">
                          {inc.assigned_responder_id ? (
                            <div>
                              <span className="font-medium text-slate-800">{inc.assigned_responder_name}</span>
                              <span className="text-[11px] text-slate-400 block font-mono">
                                ({inc.assigned_responder_callsign})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {isOperator && (
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            {inc.status === 'REPORTED' ? (
                              <button
                                onClick={(e) => handleQuickAck(e, inc.id)}
                                disabled={actionLoadingId === inc.id}
                                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                {actionLoadingId === inc.id ? 'Acking...' : '1-Click Ack'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium">In Flow</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Incident Detail Modal */}
      {selectedIncidentId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedIncidentId(null)}
          title="Incident Command & Verification Dossier"
          maxWidth="2xl"
        >
          <IncidentDetail
            incidentId={selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
            onIncidentUpdated={loadData}
            showToast={showToast}
          />
        </Modal>
      )}

      {/* Create Incident Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Report Emergency Incident (Telemetry Simulator)"
          maxWidth="xl"
        >
          <IncidentForm
            onSuccess={() => {
              setShowCreateModal(false);
              loadData();
            }}
            onCancel={() => setShowCreateModal(false)}
            showToast={showToast}
          />
        </Modal>
      )}
    </div>
  );
};
