import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { LocationProvider } from './context/LocationContext.js';
import { Sidebar, NavigationTab } from './components/layout/Sidebar.js';
import { Topbar } from './components/layout/Topbar.js';
import { ToastContainer, ToastMessage } from './components/common/Toast.js';

import { OverviewDashboard } from './components/overview/OverviewDashboard.js';
import { IncidentList } from './components/incidents/IncidentList.js';
import { ScenarioList } from './components/safetest/ScenarioList.js';
import { ProofDashboard } from './components/proof/ProofDashboard.js';
import { CorrectiveList } from './components/corrective/CorrectiveList.js';
import { AuditHistoryView } from './components/audit/AuditHistoryView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { CitizenPhoneView } from './components/citizen/CitizenPhoneView.js';
import { ScenarioRun } from './types/index.js';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [passedRunForRemediation, setPassedRunForRemediation] = useState<ScenarioRun | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenCorrectiveFromRun = (run: ScenarioRun) => {
    setPassedRunForRemediation(run);
    setCurrentTab('corrective');
  };

  return (
    <div className="min-h-screen bg-app flex text-textPrimary">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentTab={currentTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectTab={setCurrentTab}
          showToast={showToast}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewDashboard onNavigate={setCurrentTab} showToast={showToast} />
          )}

          {currentTab === 'citizen' && (
            <CitizenPhoneView showToast={showToast} onNavigate={setCurrentTab} />
          )}

          {currentTab === 'incidents' && (
            <IncidentList showToast={showToast} />
          )}

          {currentTab === 'safetest' && (
            <ScenarioList
              onOpenCorrectiveAction={handleOpenCorrectiveFromRun}
              showToast={showToast}
            />
          )}

          {currentTab === 'proof' && (
            <ProofDashboard showToast={showToast} />
          )}

          {currentTab === 'corrective' && (
            <CorrectiveList
              initialRun={passedRunForRemediation}
              onClearInitialRun={() => setPassedRunForRemediation(null)}
              showToast={showToast}
            />
          )}

          {currentTab === 'audit' && (
            <AuditHistoryView showToast={showToast} />
          )}

          {currentTab === 'settings' && (
            <SettingsView showToast={showToast} />
          )}
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </AuthProvider>
  );
}
