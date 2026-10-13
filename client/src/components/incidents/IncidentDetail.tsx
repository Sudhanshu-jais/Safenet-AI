import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { api } from '../../services/api.js';
import { Incident, IncidentTimelineEntry, Responder, IncidentAnalysis } from '../../types/index.js';

interface IncidentDetailProps {
  incidentId: string;
  onClose: () => void;
  onUpdate: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incidentId,
  onClose,
  onUpdate,
  showToast,
}) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEntry[]>([]);
  const [eligibleResponders, setEligibleResponders] = useState<Responder[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getIncidentById(incidentId);
      setIncident(res.incident);
      setTimeline(res.timeline);

      // Load eligible responders for this incident's location
      if (res.incident.location_id) {
        const respRes = await api.getEligibleResponders(res.incident.location_id);
        setEligibleResponders(respRes.responders);
        if (respRes.responders.length > 0) {
          setSelectedResponderId(respRes.responders[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [incidentId]);

  if (loading || !incident) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading incident details...</p>
      </div>
    );
  }

  const aiAnalysis: IncidentAnalysis | null = incident.ai_analysis_json
    ? JSON.parse(incident.ai_analysis_json)
    : null;

  const handleStatusTransition = async (targetStatus: string) => {
    setActionLoading(true);
    try {
      await api.transitionIncident(incident.id, targetStatus, transitionNotes || undefined);
      showToast(`Incident status updated to ${targetStatus}`, 'success');
      setTransitionNotes('');
      await loadData();
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignResponder = async () => {
    if (!selectedResponderId) return;
    setActionLoading(true);
    try {
      await api.assignIncidentResponder(incident.id, selectedResponderId, transitionNotes || undefined);
      showToast('Responder successfully assigned and notified', 'success');
      setTransitionNotes('');
      await loadData();
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-slate-500 font-bold">{incident.id}</span>
            <Badge
              variant={
                incident.status === 'RESOLVED'
                  ? 'success'
                  : incident.status === 'ASSIGNED' || incident.status === 'IN_PROGRESS'
                  ? 'primary'
                  : 'warning'
              }
            >
              {incident.status}
            </Badge>
            <Badge
              variant={
                incident.priority === 'CRITICAL' ? 'critical' : incident.priority === 'HIGH' ? 'warning' : 'neutral'
              }
            >
              {incident.priority}
            </Badge>
            {incident.is_simulation === 1 && <Badge variant="simulation">SIMULATION</Badge>}
          </div>
          <h2 className="text-base font-bold text-slate-900">{incident.title}</h2>
          <p className="text-slate-500 mt-0.5">
            Sector: <strong className="text-slate-700">{incident.location_name || incident.location_id}</strong> • Zone: <strong className="text-slate-700">{incident.zone}</strong>
          </p>
        </div>
        <div className="text-[11px] text-slate-400 sm:text-right">
          <div>Reported: {new Date(incident.reported_at).toLocaleTimeString()}</div>
          {incident.acknowledged_at && (
            <div>Acknowledged: {new Date(incident.acknowledged_at).toLocaleTimeString()}</div>
          )}
        </div>
      </div>

      {/* Description */}
      <Card className="p-4">
        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">Description</h4>
        <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{incident.description}</p>
      </Card>

      {/* AI Triage Analysis Card */}
      {aiAnalysis && (
        <Card className="p-4 border-blue-200/80 bg-blue-50/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>AI-Assisted Operational Triage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Source:</span>
              <Badge variant={aiAnalysis.source === 'GEMINI_AI' ? 'primary' : 'neutral'} size="sm">
                {aiAnalysis.source}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold text-slate-700">Operational Summary:</span>{' '}
              <span className="text-slate-600">{aiAnalysis.summary}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
              <div>
                <span className="font-semibold text-slate-700">Recommended Category:</span>{' '}
                <span className="text-slate-900 font-medium">{aiAnalysis.suggested_category}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Recommended Priority:</span>{' '}
                <span className="text-slate-900 font-medium">{aiAnalysis.suggested_priority}</span>
              </div>
            </div>

            {aiAnalysis.missing_information?.length > 0 && (
              <div className="pt-2 border-t border-blue-100">
                <span className="font-semibold text-amber-800 block mb-1">
                  Missing Operational Context Detected:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  {aiAnalysis.missing_information.map((item, idx) => (
                    <li key={idx} className="text-[11px]">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-1.5 text-[11px] text-slate-500 italic">
              Rationale: {aiAnalysis.reasoning}
            </div>
          </div>
        </Card>
      )}

      {/* Responder Assignment Section */}
      <Card className="p-4">
        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>Responder Assignment & Dispatch</span>
        </h4>

        {incident.assigned_responder_id ? (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-emerald-900 text-xs">
                Assigned Unit: {incident.assigned_responder_name} ({incident.assigned_responder_callsign})
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                Dispatched at: {incident.dispatched_at ? new Date(incident.dispatched_at).toLocaleTimeString() : 'Pending'}
              </div>
            </div>
            <Badge variant="success">ASSIGNED & ACTIVE</Badge>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Only units currently stationed in sector <strong>{incident.location_name || incident.location_id}</strong> with status <code>AVAILABLE</code> can be dispatched.
            </p>

            {eligibleResponders.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {eligibleResponders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.callsign} - {r.role}) — AVAILABLE
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAssignResponder}
                  isLoading={actionLoading}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Dispatch Unit
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                No responders currently AVAILABLE in this sector. (Evaluates secondary failover rules).
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Validated Status Transitions */}
      <Card className="p-4">
        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-600" />
          <span>Workflow Status Transitions</span>
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          {incident.status === 'REPORTED' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleStatusTransition('ACKNOWLEDGED')}
              isLoading={actionLoading}
            >
              Acknowledge Incident
            </Button>
          )}

          {(incident.status === 'ACKNOWLEDGED' || incident.status === 'ASSIGNED') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleStatusTransition('IN_PROGRESS')}
              isLoading={actionLoading}
            >
              Mark In Progress
            </Button>
          )}

          {incident.status === 'IN_PROGRESS' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleStatusTransition('RESOLVED')}
              isLoading={actionLoading}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Resolve Incident
            </Button>
          )}

          {incident.status !== 'RESOLVED' && incident.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusTransition('CANCELLED')}
              isLoading={actionLoading}
              className="text-red-600 hover:text-red-700"
            >
              Cancel Incident
            </Button>
          )}
        </div>
      </Card>

      {/* Audit Timeline */}
      <Card className="p-4">
        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-600" />
          <span>Incident Audit Timeline</span>
        </h4>

        <div className="space-y-2 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 pl-6">
          {timeline.map((entry) => (
            <div key={entry.id} className="relative">
              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white ring-1 ring-slate-200" />
              <div className="text-xs font-semibold text-slate-900">
                {entry.to_status}
                {entry.from_status && <span className="text-slate-400 font-normal"> (from {entry.from_status})</span>}
              </div>
              <div className="text-[11px] text-slate-500">
                {entry.notes || 'Status changed'} • by <strong className="text-slate-700">{entry.actor}</strong> at {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
