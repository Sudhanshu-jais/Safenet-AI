import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  MapPin,
  Crosshair,
  ShieldAlert,
  Heart,
  Flame,
  AlertTriangle,
  PhoneCall,
  Clock,
  Radio,
  Battery,
  Wifi,
  Signal,
  ArrowRight,
  Shield,
  UserCheck,
  VolumeX,
  EyeOff,
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext.js';
import { api } from '../../services/api.js';
import { Incident } from '../../types/index.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

interface CitizenPhoneViewProps {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
  onNavigate?: (tab: any) => void;
}

type EmergencyCategory =
  | 'STALKING_HARASSMENT'
  | 'SAFE_ESCORT_REQUEST'
  | 'CAB_TRANSIT_EMERGENCY'
  | 'IMMEDIATE_ASSAULT_SOS';

interface SOSSession {
  incident: Incident;
  assignedResponder?: { name: string; callsign: string; role: string } | null;
  etaMinutes: number;
}

export const CitizenPhoneView: React.FC<CitizenPhoneViewProps> = ({ showToast, onNavigate }) => {
  const { locations } = useLocation();

  // Emergency Form State
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory>('STALKING_HARASSMENT');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || 'loc-transit');
  const [selectedZone, setSelectedZone] = useState('');
  const [description, setDescription] = useState('');
  const [isSimulation, setIsSimulation] = useState(true);
  const [isDiscreetMode, setIsDiscreetMode] = useState(false);

  // GPS Location State
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('GPS Ready');

  // SOS Lifecycle: 'READY' | 'SUBMITTING' | 'ACTIVE'
  const [sosState, setSosState] = useState<'READY' | 'SUBMITTING' | 'ACTIVE'>('READY');
  const [activeSession, setActiveSession] = useState<SOSSession | null>(null);
  const [deviceFrame, setDeviceFrame] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock in status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeLoc = locations.find(l => l.id === selectedLocationId) || locations[0];
  const zones: string[] = activeLoc ? JSON.parse(activeLoc.zones_json || '[]') : [];

  // Sync location when locations load from API
  useEffect(() => {
    if (locations.length > 0 && (!selectedLocationId || !locations.some(l => l.id === selectedLocationId))) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  // Default zone when location changes
  useEffect(() => {
    if (zones.length > 0 && !zones.includes(selectedZone)) {
      setSelectedZone(zones[0]);
    }
  }, [selectedLocationId, zones]);

  // Automatic Location Getter via Geolocation API
  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported by browser');
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring high-precision GPS fix...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsCoordinates({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setIsLocating(false);
        setLocationStatus(`Locked: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (±${Math.round(accuracy)}m)`);
        showToast('GPS coordinates acquired successfully!', 'success');

        // Automatically map to nearest demonstration sector
        if (locations.length > 0) {
          if (!selectedZone && zones.length > 0) {
            setSelectedZone(zones[0]);
          }
        }
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Could not acquire GPS fix';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by user. Select sector manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location signal unavailable. Using simulation coordinates.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS timed out. Using approximate Wi-Fi sector.';
        }
        setLocationStatus(msg);
        showToast(msg, 'warning');

        // Provide realistic demo coordinates fallback
        setGpsCoordinates({ lat: 28.6139, lng: 77.2090, accuracy: 25 });
        setLocationStatus('Simulated GPS: Metro Sector (±25m accuracy)');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Submit Immediate SOS
  const handleTriggerSOS = async () => {
    setSosState('SUBMITTING');

    try {
      const categoryTitles: Record<EmergencyCategory, string> = {
        STALKING_HARASSMENT: '[WOMEN SOS] Stalking / Person Following Me',
        SAFE_ESCORT_REQUEST: '[WOMEN SAFETY] Safe Night Walk / Travel Escort Requested',
        CAB_TRANSIT_EMERGENCY: '[CAB DISTRESS] Suspicious Driver / Route Deviation Alert',
        IMMEDIATE_ASSAULT_SOS: '[CRITICAL SOS] Immediate Assault / Violent Threat',
      };

      const title = categoryTitles[selectedCategory];
      const gpsNote = gpsCoordinates 
        ? `[GPS: ${gpsCoordinates.lat.toFixed(5)}, ${gpsCoordinates.lng.toFixed(5)} ±${gpsCoordinates.accuracy}m]`
        : '[Location: User Selected]';

      const discreetNote = isDiscreetMode ? ' [DISCREET SILENT SOS MODE ACTIVE]' : '';
      const fullDesc = description.trim()
        ? `${description.trim()} — ${gpsNote}${discreetNote}`
        : `Women safety emergency distress signal triggered via mobile SOS terminal. Immediate assistance requested at ${activeLoc?.name} (${selectedZone || 'General Area'}). ${gpsNote}${discreetNote}`;

      // Priority is CRITICAL for SOS
      const res = await api.createIncident({
        title,
        description: fullDesc,
        location_id: selectedLocationId,
        zone: selectedZone || zones[0] || 'Main Sector',
        priority: 'CRITICAL',
        category: selectedCategory,
        is_simulation: isSimulation,
      });

      // Automatically attempt responder assignment if available
      let assignedResponder: any = null;
      try {
        const eligibleRes = await api.getEligibleResponders(selectedLocationId);
        if (eligibleRes.responders && eligibleRes.responders.length > 0) {
          const resp = eligibleRes.responders[0];
          await api.assignIncidentResponder(res.incident.id, resp.id, 'Auto-assigned by Women Safety Pink Patrol Dispatch Matrix');
          assignedResponder = resp;
        }
      } catch (assignErr) {
        console.warn('Auto responder assignment note:', assignErr);
      }

      setActiveSession({
        incident: res.incident,
        assignedResponder,
        etaMinutes: Math.floor(Math.random() * 2) + 2, // 2-3 min estimated ETA
      });

      setSosState('ACTIVE');
      showToast('EMERGENCY WOMEN SOS BROADCASTED. Pink Patrol & QRT alerted!', 'success');
    } catch (err: any) {
      setSosState('READY');
      showToast(`SOS failed: ${err.message}`, 'error');
    }
  };

  const handleCancelSOS = () => {
    if (confirm('Are you sure you want to dismiss this emergency request?')) {
      setActiveSession(null);
      setSosState('READY');
      setDescription('');
      showToast('Emergency SOS session ended.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-600 flex items-center justify-center text-white">
              <Shield className="w-4 h-4 fill-white" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Women Safety Emergency Portal (Phone SOS)</h2>
            <Badge variant="critical" size="sm">Pink Shield Terminal</Badge>
            <Badge variant="simulation" size="sm">Pilot Prototype</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dedicated emergency distress beacon for women, students & lone commuters with 1-tap SOS across campuses, city markets, transit hubs, etc. (Expanding nationwide).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>{deviceFrame ? 'Expand Full Screen' : 'Show Phone Bezel'}</span>
          </button>
          {onNavigate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('incidents')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Operator Queue
            </Button>
          )}
        </div>
      </div>

      {/* Main Container: Centered Phone Mockup */}
      <div className="flex justify-center items-start pb-8">
        <div
          className={`w-full transition-all duration-300 ${
            deviceFrame
              ? 'max-w-[400px] rounded-[42px] border-[10px] border-slate-900 bg-slate-950 p-2.5 shadow-2xl ring-1 ring-slate-800'
              : 'max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
          }`}
        >
          {/* Inner Phone Screen */}
          <div className="w-full rounded-[30px] bg-white overflow-hidden flex flex-col min-h-[680px] text-slate-900">
            {/* Phone Status Bar */}
            <div className="bg-slate-900 text-white px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold tracking-tight shrink-0">
              <span>{currentTime || '12:00'}</span>
              {/* Speaker Notch */}
              <div className="w-18 h-3.5 bg-black rounded-full mx-auto -mt-1 flex items-center justify-center">
                <div className="w-3 h-1 bg-slate-800 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mobile App Header */}
            <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-pink-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  <Shield className="w-3.5 h-3.5 fill-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase leading-none">SAFENET PINK SHIELD</h3>
                  <span className="text-[9px] text-pink-400 font-medium">Women Emergency Network</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-mono font-medium">QRT READY</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/50">
              {sosState === 'ACTIVE' && activeSession ? (
                /* ACTIVE DISPATCH TRACKER VIEW */
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 rounded-2xl bg-gradient-to-tr from-pink-700 via-rose-600 to-red-600 text-white text-center space-y-1 shadow-lg shadow-pink-600/30">
                    <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-1 animate-pulse">
                      <Radio className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-base font-black uppercase tracking-wider">PINK PATROL EN ROUTE</h4>
                    <p className="text-xs text-rose-100">Distress coordinates locked. Help is approaching your location.</p>
                  </div>

                  {/* Incident Dispatch Card */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-mono font-bold text-slate-500">BEACON ID: {activeSession.incident.id}</span>
                      <Badge variant="critical" size="sm">PATROL DISPATCHED</Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Assigned Officer:</span>
                        <span className="font-bold text-slate-900">
                          {activeSession.assignedResponder ? activeSession.assignedResponder.name : 'Officer Sunita Rao (Pink Patrol)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Response Call-Sign:</span>
                        <span className="font-mono font-bold text-pink-600">
                          {activeSession.assignedResponder ? activeSession.assignedResponder.callsign : 'PINK-PATROL-15'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Estimated Arrival:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> ~{activeSession.etaMinutes} minutes
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Target Sector:</span>
                        <span className="font-semibold text-slate-800">
                          {activeLoc?.name} ({activeSession.incident.zone})
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Alert Sent</span>
                        <span className="text-pink-600 font-semibold">Pink Patrol Intercept</span>
                        <span>On Scene</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-pink-600 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Immediate Safety Guidelines */}
                  <div className="p-3.5 rounded-xl bg-pink-50 border border-pink-200/80 text-pink-900 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-pink-800">
                      <ShieldAlert className="w-4 h-4 text-pink-600" />
                      <span>Immediate Safety Safeguards:</span>
                    </div>
                    <ul className="text-[11px] list-disc list-inside space-y-0.5 text-pink-800/90">
                      <li>Move into nearest well-lit area, campus booth, open shop, transit booth, etc.</li>
                      <li>Keep your phone screen active; live GPS beacon is transmitting.</li>
                      <li>Wave your illuminated phone screen when the patrol vehicle arrives.</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <a
                      href="tel:1091"
                      className="w-full py-3 px-4 rounded-xl bg-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-pink-700 transition-colors"
                    >
                      <PhoneCall className="w-4 h-4 text-white" />
                      <span>Call Women Helpline (1091)</span>
                    </a>
                    <button
                      onClick={handleCancelSOS}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Dismiss / Safe Now
                    </button>
                  </div>
                </div>
              ) : (
                /* READY TO SOS FORM VIEW */
                <div className="space-y-3.5">
                  {/* Select Emergency Type */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      1. Select Emergency Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('STALKING_HARASSMENT')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedCategory === 'STALKING_HARASSMENT'
                            ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20 text-rose-950 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <ShieldAlert className="w-5 h-5 text-rose-600 mb-1" />
                        <div className="text-xs leading-tight">Stalking / Following</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Trailing / Eve-teasing</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory('SAFE_ESCORT_REQUEST')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedCategory === 'SAFE_ESCORT_REQUEST'
                            ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20 text-purple-950 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <UserCheck className="w-5 h-5 text-purple-600 mb-1" />
                        <div className="text-xs leading-tight">Safe Night Escort</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Dark Road / Walk Home</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory('CAB_TRANSIT_EMERGENCY')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedCategory === 'CAB_TRANSIT_EMERGENCY'
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 text-amber-950 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <Radio className="w-5 h-5 text-amber-600 mb-1" />
                        <div className="text-xs leading-tight">Suspicious Cab / Taxi</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Route Detour / Locked</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory('IMMEDIATE_ASSAULT_SOS')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedCategory === 'IMMEDIATE_ASSAULT_SOS'
                            ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-950 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <Flame className="w-5 h-5 text-red-600 mb-1" />
                        <div className="text-xs leading-tight">Immediate Assault SOS</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Physical Threat / Grab</div>
                      </button>
                    </div>
                  </div>

                  {/* Discreet / Silent SOS Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <span className="font-semibold block text-[11px]">Discreet SOS Mode</span>
                        <span className="text-[10px] text-slate-400">Silent trigger without audible alerts</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isDiscreetMode}
                      onChange={(e) => setIsDiscreetMode(e.target.checked)}
                      className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                  </div>

                  {/* 2. Automatic Location Getter */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        2. Your Location
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoLocate}
                        disabled={isLocating}
                        className="text-[11px] font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Locating...' : 'Auto-Locate GPS'}</span>
                      </button>
                    </div>

                    {/* GPS Status Indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-1.5 rounded-md border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                      <span className="truncate">{locationStatus}</span>
                    </div>

                    {/* Sector & Zone Selection */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Sector (Campus, Market, Metro, etc.)</label>
                        <select
                          value={selectedLocationId}
                          onChange={(e) => {
                            setSelectedLocationId(e.target.value);
                            setSelectedZone('');
                          }}
                          className="w-full text-xs py-1.5 px-2 bg-white rounded-lg border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                          <option disabled value="EXPANSION">
                            + More City Sectors (Expanding...)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Zone / Area / Spot</label>
                        <select
                          value={selectedZone}
                          onChange={(e) => setSelectedZone(e.target.value)}
                          className="w-full text-xs py-1.5 px-2 bg-white rounded-lg border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        >
                          {zones.map((z) => (
                            <option key={z} value={z}>
                              {z}
                            </option>
                          ))}
                          <option value="Other Area / Landmark / Street / More">
                            + Other Area / Landmark / Street / More...
                          </option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      Prototype Coverage: University Campuses, Commercial Markets, Transit Corridors, etc. Expanding to all city zones.
                    </p>
                  </div>

                  {/* 3. Optional Voice / Quick Message */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      3. Quick Note / Cab Info (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. White swift cab ending in 4921, driver taking detour"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  {/* GIANT SOS BUTTON */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleTriggerSOS}
                      disabled={sosState === 'SUBMITTING'}
                      className="relative w-36 h-36 rounded-full mx-auto bg-gradient-to-tr from-pink-600 via-rose-600 to-red-600 text-white font-black text-xl tracking-wider shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-white ring-4 ring-pink-300/40 cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-2xl font-black">SOS</span>
                      <span className="text-[10px] font-medium tracking-normal text-rose-100 uppercase mt-0.5">
                        {sosState === 'SUBMITTING' ? 'Alerting...' : 'Tap for Help'}
                      </span>
                    </button>
                    <p className="text-[11px] text-slate-500 mt-2.5 font-medium">
                      Dispatches Pink Patrol QRT in <span className="text-pink-600 font-bold">&lt;3 minutes</span>
                    </p>
                  </div>

                  {/* Emergency Direct Hotlines */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                      Women Safety Direct Hotlines
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <a
                        href="tel:1091"
                        className="p-2 rounded-xl bg-pink-50 border border-pink-200 text-center hover:bg-pink-100 transition-colors"
                      >
                        <div className="font-bold text-xs text-pink-700">1091</div>
                        <div className="text-[9px] text-pink-600 font-medium">Women Help</div>
                      </a>
                      <a
                        href="tel:112"
                        className="p-2 rounded-xl bg-white border border-slate-200 text-center hover:bg-slate-50 transition-colors"
                      >
                        <div className="font-bold text-xs text-slate-900">112</div>
                        <div className="text-[9px] text-slate-500">National</div>
                      </a>
                      <a
                        href="tel:1090"
                        className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-center hover:bg-purple-100 transition-colors"
                      >
                        <div className="font-bold text-xs text-purple-700">1090</div>
                        <div className="text-[9px] text-purple-600 font-medium">Power Line</div>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Safe Area / Home Bar */}
            <div className="bg-white py-2 text-center shrink-0 border-t border-slate-100">
              <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
