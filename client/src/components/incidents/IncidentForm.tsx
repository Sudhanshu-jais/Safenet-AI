import React, { useState } from 'react';
import { ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button.js';
import { useLocation } from '../../context/LocationContext.js';
import { api } from '../../services/api.js';
import { Incident } from '../../types/index.js';

interface IncidentFormProps {
  onSuccess: (incident: Incident) => void;
  onCancel: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({
  onSuccess,
  onCancel,
  showToast,
}) => {
  const { locations } = useLocation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState(locations[0]?.id || 'loc-transit');
  const [zone, setZone] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [category, setCategory] = useState('INFRASTRUCTURE_HAZARD');
  const [isSimulation, setIsSimulation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedLoc = locations.find(l => l.id === locationId);
  const zones: string[] = selectedLoc ? JSON.parse(selectedLoc.zones_json || '[]') : [];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!description.trim()) errs.description = 'Incident description is required';
    if (!locationId) errs.locationId = 'Sector is required';
    if (!zone.trim()) errs.zone = 'Zone or area is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.createIncident({
        title,
        description,
        location_id: locationId,
        zone,
        priority,
        category,
        is_simulation: isSimulation,
      });

      showToast('Incident successfully reported and triaged', 'success');
      onSuccess(res.incident);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Simulation Toggle Banner */}
      <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-purple-900 block">Report Classification</span>
          <span className="text-[11px] text-purple-700">
            {isSimulation ? 'Simulated Incident (Controlled test record)' : 'Live Operational Incident'}
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isSimulation}
            onChange={(e) => setIsSimulation(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Incident Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Unattended suspicious bag near ticketing counter"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.title && <p className="text-[11px] text-red-500 mt-0.5">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Detailed Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe visible circumstances, hazards, and immediate responder needs..."
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.description && <p className="text-[11px] text-red-500 mt-0.5">{errors.description}</p>}
      </div>

      {/* Location Sector & Zone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Demonstration Sector <span className="text-red-500">*</span>
          </label>
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setZone('');
            }}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Zone / Area <span className="text-red-500">*</span>
          </label>
          {zones.length > 0 ? (
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Sector Zone</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g. Concourse North"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {errors.zone && <p className="text-[11px] text-red-500 mt-0.5">{errors.zone}</p>}
        </div>
      </div>

      {/* Category & Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="INFRASTRUCTURE_HAZARD">Infrastructure Hazard</option>
            <option value="SECURITY_DISRUPTION">Security Disruption</option>
            <option value="MEDICAL_FIRST_AID">Medical / First Aid</option>
            <option value="FIRE_SMOKE_ALARM">Fire / Smoke Alarm</option>
            <option value="CROWD_SURGE">Crowd Surge / Bottleneck</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Triage Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="LOW">Low (Routine response)</option>
            <option value="MEDIUM">Medium (Standard dispatch)</option>
            <option value="HIGH">High (Urgent response required)</option>
            <option value="CRITICAL">Critical (Immediate danger)</option>
          </select>
        </div>
      </div>

      {/* AI Triage Notice */}
      <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-900 leading-relaxed">
          <span className="font-semibold">Automated AI Triage:</span> Upon submission, report text will be triaged by SAFENET's operational engine (Gemini LLM or rule-based fallback) to generate summary, priority verification, and detected missing information.
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <Button size="md" variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          size="md"
          variant="primary"
          type="submit"
          isLoading={loading}
          icon={<ShieldAlert className="w-4 h-4" />}
        >
          Submit Report
        </Button>
      </div>
    </form>
  );
};
