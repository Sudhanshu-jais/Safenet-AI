import {
  Incident,
  IncidentTimelineEntry,
  Responder,
  Scenario,
  ScenarioRun,
  CorrectiveAction,
  ProofSummary,
  ComparisonResult,
  AuditLog,
  SystemStats,
  Location,
  UserRole,
} from '../types/index.js';

let activeRole: UserRole = 'ADMINISTRATOR';
let activeUserId = 'admin-1';

export function setActiveUser(role: UserRole, id?: string) {
  activeRole = role;
  activeUserId = id || (role === 'ADMINISTRATOR' ? 'admin-1' : role === 'OPERATOR' ? 'operator-1' : 'auditor-1');
}

export function getActiveRole(): UserRole {
  return activeRole;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': activeRole,
    'x-user-id': activeUserId,
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.error(`[API Network Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw new Error(`Network connection error to ${endpoint}: ${err.message || 'Failed to fetch'}`);
  }

  const rawText = await response.text();
  let data: any = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Non-JSON response (e.g. Vercel plain text/HTML 500 error page)
    console.warn(`[API Non-JSON Response] ${response.status} from ${endpoint}:`, rawText);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${rawText.slice(0, 150) || response.statusText}`);
    }
    throw new Error(`Expected JSON from ${endpoint}, received: ${rawText.slice(0, 150)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // System & Overview
  getStats: () => request<{ stats: SystemStats }>('/api/system/stats'),
  getLocations: () => request<{ locations: Location[] }>('/api/system/locations'),
  seedDemoData: () => request<{ message: string; counts: Record<string, number> }>('/api/system/seed', { method: 'POST' }),
  clearDemoData: () => request<{ message: string }>('/api/system/clear', { method: 'POST' }),

  // Incidents
  getIncidents: (filters?: { location_id?: string; status?: string; priority?: string; category?: string; is_simulation?: boolean; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.location_id) params.append('location_id', filters.location_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.is_simulation !== undefined) params.append('is_simulation', String(filters.is_simulation));
    if (filters?.search) params.append('search', filters.search);
    return request<{ incidents: Incident[] }>(`/api/incidents?${params.toString()}`);
  },
  getIncidentById: (id: string) => request<{ incident: Incident; timeline: IncidentTimelineEntry[] }>(`/api/incidents/${id}`),
  createIncident: (data: { title: string; description: string; category?: string; location_id: string; zone: string; priority?: string; is_simulation?: boolean }) =>
    request<{ incident: Incident }>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transitionIncident: (id: string, status: string, notes?: string) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),
  assignIncidentResponder: (id: string, responder_id: string, notes?: string) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ responder_id, notes }),
    }),

  // Responders
  getResponders: (filters?: { location_id?: string; availability?: string; role?: string }) => {
    const params = new URLSearchParams();
    if (filters?.location_id) params.append('location_id', filters.location_id);
    if (filters?.availability) params.append('availability', filters.availability);
    if (filters?.role) params.append('role', filters.role);
    return request<{ responders: Responder[] }>(`/api/responders?${params.toString()}`);
  },
  getEligibleResponders: (location_id: string, role?: string) => {
    const params = new URLSearchParams({ location_id });
    if (role) params.append('role', role);
    return request<{ responders: Responder[] }>(`/api/responders/eligible?${params.toString()}`);
  },
  updateResponderAvailability: (id: string, availability: string) =>
    request<{ responder: Responder }>(`/api/responders/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    }),

  // SAFETEST Scenarios
  getScenarios: () => request<{ scenarios: Scenario[] }>('/api/scenarios'),
  getScenarioById: (id: string) => request<{ scenario: Scenario }>(`/api/scenarios/${id}`),
  getScenarioRuns: (filters?: { scenario_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.scenario_id) params.append('scenario_id', filters.scenario_id);
    if (filters?.status) params.append('status', filters.status);
    return request<{ runs: ScenarioRun[] }>(`/api/scenarios/runs?${params.toString()}`);
  },
  getScenarioRunById: (id: string) => request<{ run: ScenarioRun }>(`/api/scenarios/runs/${id}`),
  executeScenario: (id: string) => request<{ run: ScenarioRun }>(`/api/scenarios/${id}/run`, { method: 'POST' }),
  updateScenarioRule: (id: string, rule_version: string, config: Record<string, any>) =>
    request<{ scenario: Scenario }>(`/api/scenarios/${id}/rule`, {
      method: 'PATCH',
      body: JSON.stringify({ rule_version, config }),
    }),

  // Corrective Actions
  getCorrectiveActions: (filters?: { status?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    return request<{ corrective_actions: CorrectiveAction[] }>(`/api/corrective?${params.toString()}`);
  },
  getCorrectiveActionById: (id: string) => request<{ corrective_action: CorrectiveAction }>(`/api/corrective/${id}`),
  createCorrectiveAction: (data: {
    title: string;
    weakness_description: string;
    source_run_id?: string;
    proposed_remedy: string;
    owner: string;
    priority?: string;
    due_date?: string;
    verification_scenario_id: string;
  }) => request<{ corrective_action: CorrectiveAction }>('/api/corrective', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCorrectiveActionStatus: (id: string, status: string, verification_run_id?: string, notes?: string) =>
    request<{ corrective_action: CorrectiveAction }>(`/api/corrective/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, verification_run_id, notes }),
    }),

  // PROOF
  getProofSummary: () => request<ProofSummary>('/api/proof/summary'),
  compareRuns: (runA: string, runB: string) =>
    request<{ comparison: ComparisonResult }>(`/api/proof/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}`),

  // Audit Logs
  getAuditLogs: (filters?: { entity_type?: string; action_type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.action_type) params.append('action_type', filters.action_type);
    if (filters?.limit) params.append('limit', String(filters.limit));
    return request<{ logs: AuditLog[] }>(`/api/audit?${params.toString()}`);
  },
};
