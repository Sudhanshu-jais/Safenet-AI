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

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'CRITICAL':
      return {
        containerClass: 'bg-red-50/90 border-red-200 hover:bg-red-100/90 hover:border-red-300 text-red-950',
        iconClass: 'text-red-600',
        titleClass: 'text-red-950 font-semibold',
        badgeVariant: 'critical' as const,
      };
    case 'HIGH':
      return {
        containerClass: 'bg-amber-50/90 border-amber-200 hover:bg-amber-100/90 hover:border-amber-300 text-amber-950',
        iconClass: 'text-amber-600',
        titleClass: 'text-amber-950 font-medium',
        badgeVariant: 'warning' as const,
      };
    case 'MEDIUM':
      return {
        containerClass: 'bg-sky-50/90 border-sky-200 hover:bg-sky-100/90 hover:border-sky-300 text-sky-950',
        iconClass: 'text-sky-600',
        titleClass: 'text-sky-950 font-medium',
        badgeVariant: 'info' as const,
      };
    case 'LOW':
    default:
      return {
        containerClass: 'bg-slate-50 border-slate-200 hover:bg-slate-100/90 hover:border-slate-300 text-slate-700',
        iconClass: 'text-slate-500',
        titleClass: 'text-slate-700 font-medium',
        badgeVariant: 'neutral' as const,
      };
  }
};

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
            <Compass className="w-4 h-4 text-pink-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Schematic Sector Visualizer
            </h3>
            <Badge variant="simulation" size="sm">TELEMETRY SIMULATION</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Geographic zone coordinates & responder proximity across pilot sectors (Campus, Commercial Centers, Transit Corridors, etc.). Scalable to all municipal wards.
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
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {loc.name}
            </button>
          ))}
          <div
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-slate-100/70 text-slate-400 border border-dashed border-slate-300 flex items-center gap-1 cursor-default shrink-0"
            title="Extensible architecture supports continuous municipal and regional onboarding"
          >
            <span>+ More Sectors & Districts (Expanding...)</span>
          </div>
        </div>
      </div>

      {/* Schematic Layout Canvas */}
      <div className="relative bg-slate-50 rounded-xl border border-slate-200 p-6 min-h-[300px]">
        {/* Sector Legend */}
        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-2.5 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] text-slate-600 shadow-2xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Priority:</span>
          <span className="flex items-center gap-1 font-medium text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Critical
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> High
          </span>
          <span className="flex items-center gap-1 font-medium text-sky-700">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Medium
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Low
          </span>
          <span className="h-3 w-px bg-slate-200 mx-0.5" />
          <span className="flex items-center gap-1 text-pink-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-600" /> Responder
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
                className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs hover:border-pink-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900">{zoneName}</span>
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Incidents in Zone */}
                {zoneIncidents.length > 0 ? (
                  <div className="space-y-1.5 mb-2">
                    {zoneIncidents.map((inc) => {
                      const pConfig = getPriorityConfig(inc.priority);
                      return (
                        <div
                          key={inc.id}
                          onClick={() => onSelectIncident(inc.id)}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between gap-2 ${pConfig.containerClass}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertTriangle className={`w-3 h-3 shrink-0 ${pConfig.iconClass}`} />
                            <span className={`text-[11px] truncate ${pConfig.titleClass}`}>{inc.title}</span>
                          </div>
                          <Badge variant={pConfig.badgeVariant} size="sm" className="shrink-0">{inc.priority}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic mb-2">Zero active incidents</div>
                )}

                {/* Responders in Sector Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-pink-600" />
                    <span>Sector Patrols: {zoneResponders.length}</span>
                  </span>
                  <span className="text-emerald-700 font-medium">Clearance OK</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prototype Pilot Extensibility Banner */}
        <div className="mt-4 p-2.5 rounded-lg bg-white/95 border border-slate-200 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              <strong>Prototype Pilot Coverage:</strong> Active in demonstration sectors (University Campuses, City Markets, Transit Terminals, etc.). Framework designed to scale city-wide.
            </span>
          </div>
          <span className="text-[10px] text-pink-700 font-bold uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded border border-pink-200 shrink-0">
            Phase-2 Ready
          </span>
        </div>
      </div>
    </Card>
  );
};
