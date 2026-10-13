import React, { useState } from 'react';
import { ShieldAlert, Sparkles, CheckCircle2, Crosshair, MapPin } from 'lucide-react';
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
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [category, setCategory] = useState('STALKING_HARASSMENT');
  const [isSimulation, setIsSimulation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setIsLocating(false);
        showToast(`GPS Location acquired: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`, 'success');
        if (!zone && zones.length > 0) {
          setZone(zones[0]);
        }
      },
      (err) => {
        setIsLocating(false);
        showToast(`Could not acquire GPS: ${err.message}. Using demo sector.`, 'warning');
        setGpsCoords({ lat: 28.6139, lng: 77.2090, accuracy: 20 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
      const finalDesc = gpsCoords
        ? `${description} [GPS Coordinates: ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)} (±${gpsCoords.accuracy}m)]`
        : description;

      const res = await api.createIncident({
        title,
        description: finalDesc,
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
          Safety Incident Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Unknown person following student along Library pathway toward Hostel"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        {errors.title && <p className="text-[11px] text-red-500 mt-0.5">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Detailed Safety Report & Threat Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe threat behavior, cab/vehicle number if applicable, physical description of individual, and caller shelter location..."
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        {errors.description && <p className="text-[11px] text-red-500 mt-0.5">{errors.description}</p>}
      </div>

      {/* Location Sector & Zone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Location & Area Details</span>
          <button
            type="button"
            onClick={handleAutoLocate}
            disabled={isLocating}
            className="text-xs font-semibold text-pink-600 hover:text-pink-800 flex items-center gap-1 bg-pink-50 hover:bg-pink-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring GPS...' : 'Auto-Detect My Location'}</span>
          </button>
        </div>

        {gpsCoords && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>GPS Locked: {gpsCoords.lat.toFixed(4)}°, {gpsCoords.lng.toFixed(4)}° (±{gpsCoords.accuracy}m accuracy)</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Demonstration Sector (Campus, Market, Transit, etc.) <span className="text-red-500">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setZone('');
              }}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
              <option disabled value="EXPANSION">
                + More City Sectors & Municipal Wards (Expanding...)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Zone / Area / Spot <span className="text-red-500">*</span>
            </label>
            {zones.length > 0 ? (
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select Sector Zone</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
                <option value="Other Area / Landmark / Street / More">
                  + Other Area / Landmark / Street / More...
                </option>
              </select>
            ) : (
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. Concourse North, Street 4, etc."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            )}
            {errors.zone && <p className="text-[11px] text-red-500 mt-0.5">{errors.zone}</p>}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 italic mt-1">
          Prototype deployment active in representative sectors (Universities, Commercial Hubs, Transit, etc.). System architecture supports infinite municipal expansion.
        </p>
    </div>

      {/* Category & Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="STALKING_HARASSMENT">Stalking & Harassment</option>
            <option value="SAFE_ESCORT_REQUEST">Safe Night Escort Request</option>
            <option value="CAB_TRANSIT_EMERGENCY">Suspicious Cab / Route Deviation</option>
            <option value="IMMEDIATE_ASSAULT_SOS">Immediate Assault / Violent Threat</option>
            <option value="UNSAFE_ENVIRONMENT">Unsafe Dark Area / Broken Streetlights</option>
            <option value="MEDICAL_FIRST_AID">Medical Emergency / First Aid</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Triage Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="LOW">Low (Preventative / Lighting report)</option>
            <option value="MEDIUM">Medium (Escort / General request)</option>
            <option value="HIGH">High (Active harassment / Dark corridor)</option>
            <option value="CRITICAL">Critical (Immediate danger / Stalking SOS)</option>
          </select>
        </div>
      </div>

      {/* AI Triage Notice */}
      <div className="p-3 rounded-lg bg-pink-50/70 border border-pink-200/80 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-pink-950 leading-relaxed">
          <span className="font-semibold text-pink-900">Women Safety AI Triage:</span> Upon submission, report text is analyzed by SAFENET's Pink Shield operational engine (Gemini LLM with deterministic rule fallback) to evaluate threat level, extract vehicle/shelter indicators, and assign the nearest Pink Patrol or QRT unit.
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
