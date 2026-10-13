import React from 'react';
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  FlaskConical,
  Award,
  ClipboardCheck,
  History,
  Settings,
  ChevronRight,
  Database,
  X,
  MapPin,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useLocation } from '../../context/LocationContext.js';

export type NavigationTab = 
  | 'overview' 
  | 'incidents' 
  | 'citizen'
  | 'safetest' 
  | 'proof' 
  | 'corrective' 
  | 'audit' 
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { role, userName } = useAuth();
  const { locations, selectedLocationId, setSelectedLocationId } = useLocation();

  const navItems = [
    { id: 'overview' as NavigationTab, label: 'Safety Overview', icon: LayoutDashboard },
    { id: 'incidents' as NavigationTab, label: 'Safety Incidents', icon: ShieldAlert, badge: role === 'OPERATOR' ? 'DISPATCH' : undefined },
    { id: 'citizen' as NavigationTab, label: 'Women SOS (Phone)', icon: Smartphone, badge: 'SOS' },
    { id: 'safetest' as NavigationTab, label: 'SAFETEST AI', icon: FlaskConical, badge: role === 'AUDITOR' ? 'TEST ENGINE' : undefined },
    { id: 'proof' as NavigationTab, label: 'PROOF Framework', icon: Award, badge: role === 'AUDITOR' ? 'VERIFY' : undefined },
    { id: 'corrective' as NavigationTab, label: 'Corrective Actions', icon: ClipboardCheck },
    { id: 'audit' as NavigationTab, label: 'Compliance Audit', icon: History, badge: role === 'AUDITOR' ? 'LOG' : undefined },
    { id: 'settings' as NavigationTab, label: 'Network Policies', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 md:w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out shadow-xl md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header & Mobile Close */}
        <div className="h-16 px-4 md:px-5 border-b border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-sm shadow-pink-500/20 shrink-0">
              <Shield className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base leading-none">SAFENET</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200 leading-none">
                  WOMEN
                </span>
              </div>
              <p className="text-[10px] text-pink-700 font-semibold tracking-tight mt-1">Women Safety Network</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operating Process Banner */}
        <div className="mx-3 my-2 px-3 py-2 bg-pink-50/40 border border-pink-200/70 rounded-lg">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Operating Architecture
          </div>
          <div className="text-[9.5px] font-bold text-pink-800 flex items-center justify-between tracking-tighter">
            <span>REPORT</span>
            <ChevronRight className="w-2.5 h-2.5 text-pink-400 shrink-0" />
            <span>RESPOND</span>
            <ChevronRight className="w-2.5 h-2.5 text-pink-400 shrink-0" />
            <span>TEST</span>
            <ChevronRight className="w-2.5 h-2.5 text-pink-400 shrink-0" />
            <span>IMPROVE</span>
            <ChevronRight className="w-2.5 h-2.5 text-pink-400 shrink-0" />
            <span>PROVE</span>
          </div>
        </div>

        {/* Mobile-Only Sector Selector (convenient for phone users) */}
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-pink-50/60 border border-pink-100 lg:hidden">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-pink-900 uppercase tracking-wider mb-1">
            <MapPin className="w-3 h-3 text-pink-600" />
            <span>Active Sector</span>
          </div>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full text-xs py-1 px-1.5 bg-white rounded border border-pink-200 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Sectors (Campus, City, Transit, etc.)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
            <option disabled value="EXPANSION">
              + More Cities & Districts (Expanding...)
            </option>
          </select>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-pink-50 text-pink-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-pink-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* System & Session Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="px-3 py-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600">Active Operator</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {role}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-900 truncate">{userName}</div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>node:sqlite (WAL)</span>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACID Sync
              </span>
            </div>
            <div className="mt-1.5 text-[9px] text-slate-400 text-center font-medium">
              Prototype Pilot • Extensible to Any City / Campus
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
