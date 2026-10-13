import React, { useState, useEffect } from 'react';
import { History, Shield, Filter, RefreshCw, FileText } from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { api } from '../../services/api.js';
import { AuditLog } from '../../types/index.js';

interface AuditHistoryProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const AuditHistoryView: React.FC<AuditHistoryProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const res = await api.getAuditLogs({
        entity_type: entityFilter || undefined,
        action_type: actionFilter || undefined,
        limit: 100,
      });
      setLogs(res.logs);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter, actionFilter]);

  return (
    <div className="space-y-4 text-xs">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Append-Only Audit Journal</h2>
            <Badge variant="simulation">IMMUTABLE LOG</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically timestamped audit log of all system mutations, incident transitions, test executions, and verification decisions.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="">All Entities</option>
            <option value="INCIDENT">INCIDENT</option>
            <option value="RESPONDER">RESPONDER</option>
            <option value="SCENARIO">SCENARIO</option>
            <option value="SCENARIO_RUN">SCENARIO_RUN</option>
            <option value="CORRECTIVE_ACTION">CORRECTIVE_ACTION</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={loadLogs}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Log Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Fetching audit journal entries...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
            <p>No audit events match current criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">Actor / Role</th>
                  <th className="py-2.5 px-3.5">Action Type</th>
                  <th className="py-2.5 px-3.5">Entity</th>
                  <th className="py-2.5 px-3.5">Audit Detail Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  let details: any = {};
                  try {
                    details = JSON.parse(log.details_json);
                  } catch (e) {}

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{log.actor_id}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">[{log.actor_role}]</span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <Badge variant="primary" size="sm">{log.action_type}</Badge>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{log.entity_type}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{log.entity_id}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 max-w-md truncate">
                        {JSON.stringify(details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
