import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Cpu,
  Users,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  ToggleLeft,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { api } from '../../services/api.js';
import { Responder } from '../../types/index.js';

interface SettingsProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
  onRefreshData?: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({ showToast, onRefreshData }) => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResponders = async () => {
    try {
      const res = await api.getResponders();
      setResponders(res.responders);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponders();
  }, []);

  const handleToggleAvailability = async (id: string, current: string) => {
    const next = current === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    try {
      await api.updateResponderAvailability(id, next);
      showToast(`Responder availability changed to ${next}`, 'success');
      loadResponders();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSeed = async () => {
    try {
      const res = await api.seedDemoData();
      showToast(res.message, 'success');
      loadResponders();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all demo dataset records?')) return;
    try {
      const res = await api.clearDemoData();
      showToast(res.message, 'warning');
      loadResponders();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-pink-600" />
            <h2 className="text-base font-bold text-slate-900">System Configuration & Responders</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational policies, responder roster availability toggles, and database management.
          </p>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Status */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Persistent Relational Database</span>
            </div>
            <Badge variant="success">WAL MODE (ACID)</Badge>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Running Node.js native <code>node:sqlite</code> with Write-Ahead Logging. Real SQL schema with foreign key integrity, transactional isolation, and immutable audit logs.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
            Storage: data/safenet.db
          </div>
        </Card>

        {/* AI Engine Status */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Cpu className="w-4 h-4 text-pink-600" />
              <span>AI Operational Engine</span>
            </div>
            <Badge variant="primary">HYBRID RESILIENT</Badge>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Supports live Google Gemini API when <code>GEMINI_API_KEY</code> is configured. Automatically falls back to deterministic rule-based operational taxonomy if external API is offline or unconfigured.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            Safety Guard: Never makes predictive criminality assessments.
          </div>
        </Card>
      </div>

      {/* Responder Roster Management */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Responder Registry & Availability Controller
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Interactive Demo Control</span>
        </div>

        <p className="text-[11px] text-slate-500">
          Toggle unit availability below to manually reproduce responder offline failure conditions for SAFETEST AI.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Callsign / Name</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Current Availability</th>
                <th className="py-2.5 px-3 text-right">Quick Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {responders.map((resp) => (
                <tr key={resp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900">{resp.name}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">({resp.callsign})</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{resp.role}</td>
                  <td className="py-2.5 px-3 text-slate-600">{resp.location_name || resp.location_id}</td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant={
                        resp.availability === 'AVAILABLE'
                          ? 'success'
                          : resp.availability === 'ON_DUTY_BUSY'
                          ? 'primary'
                          : 'critical'
                      }
                      size="sm"
                    >
                      {resp.availability}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      size="sm"
                      variant={resp.availability === 'AVAILABLE' ? 'danger' : 'outline'}
                      onClick={() => handleToggleAvailability(resp.id, resp.availability)}
                      className="text-xs"
                    >
                      {resp.availability === 'AVAILABLE' ? 'Set Offline' : 'Set Available'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dataset Reset & Management */}
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Demonstration Dataset Administration
        </h3>
        <p className="text-[11px] text-slate-500">
          The SAFETEST AI demo dataset currently features demonstration sectors (Campus, Markets, Transit, etc.), Pink Patrol responders, baseline testing scenarios, and corrective tickets. System architecture is built to expand city-wide across all municipal wards and regional zones.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeed}
            icon={<Sparkles className="w-3.5 h-3.5 text-pink-600" />}
          >
            Re-Seed Demo Dataset
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="text-red-600 hover:text-red-700"
          >
            Clear Demo Dataset
          </Button>
        </div>
      </Card>
    </div>
  );
};
