import React, { useState } from 'react';
import {
  Menu,
  MapPin,
  UserCheck,
  Bell,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import { NavigationTab } from './Sidebar.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLocation } from '../../context/LocationContext.js';
import { UserRole } from '../../types/index.js';
import { Button } from '../common/Button.js';
import { api } from '../../services/api.js';

interface TopbarProps {
  currentTab: NavigationTab;
  onOpenSidebar: () => void;
  onSelectTab?: (tab: NavigationTab) => void;
  onRefreshData?: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  overview: { title: 'Women Safety Operational Overview', subtitle: 'Live status of Pink Patrol network across pilot sectors (Campus, City Markets, Transit Corridors, etc.). Architecture built for city-wide expansion.' },
  incidents: { title: 'Women Safety Incidents & Triage', subtitle: 'Stalking reports, safe night transit requests & Pink Patrol dispatch across campus, market, transit & expanding sectors' },
  citizen: { title: 'Women Safety SOS Portal (Mobile Terminal)', subtitle: '1-tap emergency distress beacon with GPS lock across campuses, commercial centers, transit hubs, and more' },
  safetest: { title: 'SAFETEST AI — Emergency Response Testing Engine', subtitle: "Tests whether emergency-response procedures work when something goes wrong; finds weaknesses before they affect real incidents" },
  proof: { title: 'PROOF — Performance Recording and Outcome Verification Framework', subtitle: 'Measures emergency workflow performance, records incident events & provides measurable before-and-after evidence' },
  corrective: { title: 'Remediation & Dark Corridor Actions', subtitle: 'Closed-loop safety weakness remediation, lighting fixes & verification gating across all pilot and expanding zones' },
  audit: { title: 'Compliance Audit & Distress Ledger', subtitle: 'Append-only event journal tracking distress signals and responder deployments' },
  settings: { title: 'Women Safety Policies & Patrol Roster', subtitle: 'Pink Patrol roster matrix, AI triage parameters & database settings' },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onOpenSidebar,
  onSelectTab,
  onRefreshData,
  showToast,
}) => {
  const { role, setRole, isAdmin } = useAuth();
  const { locations, selectedLocationId, setSelectedLocationId } = useLocation();
  const [isSeeding, setIsSeeding] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const meta = TAB_TITLES[currentTab];

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await api.seedDemoData();
      showToast(res.message, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear demo dataset records?')) return;
    try {
      const res = await api.clearDemoData();
      showToast(res.message, 'warning');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-3 sm:px-4 md:px-6 flex items-center justify-between shrink-0">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2 sm:mr-4">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">{meta.title}</h1>
            <span className="hidden xl:inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
              Pilot Prototype
            </span>
          </div>
          <p className="hidden md:block text-xs text-slate-500 leading-tight truncate">{meta.subtitle}</p>
        </div>
      </div>

      {/* Right Controls: Location Filter, Role Switcher, Seed Action, Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Demonstration Location Selector */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0" />
          <span className="text-slate-500 font-medium">Sector:</span>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            <option value="ALL">All Sectors (Campus, City, Transit, etc.)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
            <option disabled value="EXPANSION">
              + More Cities & Districts...
            </option>
          </select>
        </div>

        {/* Women Phone SOS Quick Launcher */}
        {onSelectTab && (
          <button
            onClick={() => onSelectTab('citizen')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              currentTab === 'citizen'
                ? 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-400/40'
                : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 hover:border-pink-300'
            }`}
            title="Open Women Safety SOS Terminal"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Women SOS</span>
          </button>
        )}

        {/* Role Switcher with Mode Indicator */}
        <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="hidden md:inline text-slate-500 font-medium">Role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer text-xs"
          >
            <option value="ADMINISTRATOR">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="AUDITOR">Auditor</option>
          </select>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-0.5 ${
            role === 'OPERATOR' 
              ? 'bg-amber-100 text-amber-800' 
              : role === 'AUDITOR' 
              ? 'bg-rose-100 text-rose-800' 
              : 'bg-pink-100 text-pink-800'
          }`}>
            {role === 'OPERATOR' ? 'DISPATCH' : role === 'AUDITOR' ? 'AUDIT' : 'GOV'}
          </span>
        </div>

        {/* Development Seed Data Button */}
        {isAdmin && (
          <div className="hidden lg:flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeed}
              isLoading={isSeeding}
              icon={<Sparkles className="w-3.5 h-3.5 text-pink-600" />}
              className="text-xs"
              title="Seed minimal development dataset (3 locations, 2 responders, 1 incident, baseline failed test, 1 corrective action)"
            >
              Seed Demo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-red-600 p-1.5"
              title="Clear demo records"
            >
              Reset
            </Button>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-600" />
          </button>

          {showNotifications && (
            <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-18 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Operational Broadcasts</span>
                <span className="text-[10px] text-pink-600 font-medium">Deterministic Log</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-pink-50/60 border border-pink-100 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-pink-900">SAFETEST Suite Ready</p>
                    <p className="text-[11px] text-pink-700">5 deterministic failure simulation scenarios loaded.</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Simulated Dispatch Guard</p>
                    <p className="text-[11px] text-amber-700">External emergency endpoints labeled as SIMULATED.</p>
                  </div>
                </div>

                {/* Mobile-only seed actions */}
                {isAdmin && (
                  <div className="pt-2 border-t border-slate-100 sm:hidden flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleSeed();
                        setShowNotifications(false);
                      }}
                      isLoading={isSeeding}
                      className="flex-1 text-xs"
                      icon={<Sparkles className="w-3.5 h-3.5 text-pink-600" />}
                    >
                      Seed Demo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        handleClear();
                        setShowNotifications(false);
                      }}
                      className="text-xs text-red-600 hover:bg-red-50"
                    >
                      Reset
                    </Button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-full mt-2 text-center text-[11px] text-slate-500 hover:text-slate-800 py-1"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
