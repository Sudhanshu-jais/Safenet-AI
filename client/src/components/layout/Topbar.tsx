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
  onRefreshData?: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  overview: { title: 'Operational Overview', subtitle: 'Live status of response network, testing metrics & procedural gaps' },
  incidents: { title: 'Module A — Incident Response', subtitle: 'Validated emergency workflow, AI analysis triage & responder dispatch' },
  safetest: { title: 'Module B — SAFETEST AI Engine', subtitle: 'Deterministic procedural stress-testing & failure condition verification' },
  proof: { title: 'Module C — PROOF Verification', subtitle: 'Evidence-based before-and-after audit comparison & regression metrics' },
  corrective: { title: 'Corrective Actions Management', subtitle: 'Closed-loop weakness remediation & verification gating' },
  audit: { title: 'Audit Trail & Compliance Log', subtitle: 'Append-only event journal tracking critical mutations' },
  settings: { title: 'System & Workflow Policies', subtitle: 'Roster matrix, AI provider settings & database configuration' },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onOpenSidebar,
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
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-3 sm:px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">{meta.title}</h1>
            <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
              Active Environment
            </span>
          </div>
          <p className="hidden md:block text-xs text-slate-500 leading-tight">{meta.subtitle}</p>
        </div>
      </div>

      {/* Right Controls: Location Filter, Role Switcher, Seed Action, Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Demonstration Location Selector */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-500 font-medium">Sector:</span>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Sectors (Aggregated)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="hidden sm:inline text-slate-500 font-medium">Role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer text-xs"
          >
            <option value="ADMINISTRATOR">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </div>

        {/* Development Seed Data Button */}
        {isAdmin && (
          <div className="hidden sm:flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeed}
              isLoading={isSeeding}
              icon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
          </button>

          {showNotifications && (
            <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-18 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Operational Broadcasts</span>
                <span className="text-[10px] text-blue-600 font-medium">Deterministic Log</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">SAFETEST Suite Ready</p>
                    <p className="text-[11px] text-blue-700">5 deterministic failure simulation scenarios loaded.</p>
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
                      icon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
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
