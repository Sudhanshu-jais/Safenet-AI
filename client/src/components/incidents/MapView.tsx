import React, { useState } from 'react';
import { MapPin, Shield, AlertTriangle, Users, Compass } from 'lucide-react';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Location, Incident, Responder } from '../../types/index.js';

interface MapViewProps {
  locations: Location[];
  incidents: Incident[];
  responders: Responder[];
  onSelectIncident: (incidentId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  locations,
  incidents,
  responders,
  onSelectIncident,
}) => {
  const [selectedLocId, setSelectedLocId] = useState(locations[0]?.id || 'loc-transit');

  const activeLoc = locations.find(l => l.id === selectedLocId);
  const zones: string[] = activeLoc ? JSON.parse(activeLoc.zones_json || '[]') : [];

  const locIncidents = incidents.filter(i => i.location_id === selectedLocId);
  const locResponders = responders.filter(r => r.location_id === selectedLocId);

  return (
    <Card className="p-4 space-y-4">
      {/* Sector Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Schematic Sector Visualizer
            </h3>
            <Badge variant="simulation" size="sm">TELEMETRY SIMULATION</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Geographic zone coordinates and responder proximity grid
          </p>
        </div>

        {/* Sector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocId(loc.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedLocId === loc.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Schematic Layout Canvas */}
      <div className="relative bg-slate-50 rounded-xl border border-slate-200 p-6 min-h-[300px]">
        {/* Sector Legend */}
        <div className="absolute top-3 right-3 flex items-center gap-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Incident
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Responder
          </span>
        </div>

        {/* Zones Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {zones.map((zoneName) => {
            const zoneIncidents = locIncidents.filter(i => i.zone === zoneName);
            const zoneResponders = locResponders.filter(r => r.availability === 'AVAILABLE' || r.availability === 'ON_DUTY_BUSY');

            return (
              <div
                key={zoneName}
                className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900">{zoneName}</span>
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Incidents in Zone */}
                {zoneIncidents.length > 0 ? (
                  <div className="space-y-1.5 mb-2">
                    {zoneIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => onSelectIncident(inc.id)}
                        className="p-1.5 rounded-lg bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100/70 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          <span className="text-[11px] font-medium text-red-900 truncate">{inc.title}</span>
                        </div>
                        <Badge variant="critical" size="sm">{inc.priority}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic mb-2">Zero active incidents</div>
                )}

                {/* Responders in Sector Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>Sector Patrols: {zoneResponders.length}</span>
                  </span>
                  <span className="text-emerald-700 font-medium">Clearance OK</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
