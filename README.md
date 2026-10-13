# SAFENET AI
## Public Safety Intelligence & Response Verification Network

SAFENET AI is an end-to-end, AI-assisted public safety intelligence and response verification web application.

Its defining operating workflow is:
**REPORT → RESPOND → TEST → IMPROVE → PROVE**

---

### Core Architecture & Connected Modules

1. **Module A — Intelligent Safety Response**
   - Incident reporting form with input validation and simulation tagging (`Simulated` vs `Real`).
   - AI-assisted operational incident triage: generates summary, priority suggestion, and detects missing information. Uses Gemini when `GEMINI_API_KEY` is configured, or an automatic deterministic rule-based operational fallback.
   - Validated status state machine: `Reported → Acknowledged → Assigned → In Progress → Resolved`.
   - Responder registry with availability rules (`AVAILABLE`, `ON_DUTY_BUSY`, `OFF_DUTY`, `UNAVAILABLE`) and location constraints.
   - Interactive schematic sector & zone visualizer.

2. **Module B — SAFETEST AI Scenario Testing Engine**
   - Deterministic backend testing engine that executes controlled failure simulations against real application workflow logic without modifying real records.
   - 5 core scenarios:
     1. Primary responder unavailable (`scn-unavail-resp`)
     2. Communication failure & SLA timeout (`scn-comm-fail`)
     3. Failed inter-team incident handoff (`scn-handoff-fail`)
     4. Required dispatch confirmation missing (`scn-ack-timeout`)
     5. After-hours incident on-call matrix (`scn-after-hours`)
   - Step-by-step verification assertions with Expected vs Observed outcomes.
   - Rule versioning: toggle fallback rules (e.g., Rule v1.0 fails, Rule v2.0 passes).

3. **Module C — PROOF**
   - Side-by-side Before-and-After Run Comparison Matrix.
   - Calculates real pass rate deltas, completion rate before vs after, resolved criteria, persistent gaps, and zero regressions.
   - Historical pass rate trend charts (Recharts).
   - Exportable compliance audit dossier.

4. **Corrective Action Management**
   - Closed-loop remediation tickets directly linked to SAFETEST failure findings.
   - Strict Verification Gate: tickets cannot transition to `VERIFIED` unless backed by a qualifying scenario test run with status `PASSED`.

5. **Append-Only Audit Journal & Access Control**
   - Real role-based access control (`ADMINISTRATOR`, `OPERATOR`, `AUDITOR`).
   - Append-only audit logging for incident creation, transitions, assignments, rule changes, test runs, and verification decisions.

---

### Stack & Prerequisites

- **Runtime**: Node.js v22+ or v24+
- **Database**: `node:sqlite` (Native synchronous SQLite with Write-Ahead Logging, zero C++ compilation dependencies)
- **Backend**: Express, TypeScript, tsx
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts

---

### Installation & Setup

1. **Clone or Navigate to Project**:
   ```bash
   cd d:/application/shafenet
   ```

2. **Install Dependencies**:
   ```bash
   # Server dependencies
   cd server && npm install
   
   # Client dependencies
   cd ../client && npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `server/.env` (optional):
   ```bash
   cp .env.example server/.env
   ```
   *(If `GEMINI_API_KEY` is left blank, SAFETEST AI automatically runs its built-in rule-based operational fallback.)*

4. **Run Automated Test Suite**:
   ```bash
   cd server && npm test
   ```

5. **Start Application**:
   - Backend API server (Port 3001):
     ```bash
     cd server && npm run dev
     ```
   - Frontend Vite Client (Port 5173):
     ```bash
     cd client && npm run dev
     ```
   Open `http://localhost:5173` in your browser.

---

### Step-by-Step Demonstration Journey

1. **Inspect Overview Dashboard**:
   - Notice real metrics computed from SQLite tables (Open incidents, awaiting ack, pass rates).
   - Click **"Seed Demo Data"** to load the minimal demo set (3 sectors, 3 responders, 1 incident, baseline failed test run, 1 corrective action).

2. **Module A — Incident Reporting & Dispatch**:
   - Navigate to **Incident Response**.
   - Click **"Report Incident"**, enter details for `Public Transport Hub` (`Platform 1-2`).
   - Inspect the automated AI triage analysis (summary, suggested priority, detected missing context).
   - Transition status to `ACKNOWLEDGED`.
   - Dispatch an available responder (`AVAILABLE`) and observe duty status transition to `ON_DUTY_BUSY`.
   - Move incident to `IN_PROGRESS` and `RESOLVED`.

3. **Module B — SAFETEST AI Scenario Failure**:
   - Navigate to **SAFETEST AI**.
   - Locate scenario **"Primary Responder Unavailable"** (`scn-unavail-resp`) under **Rule v1.0**.
   - Click **"Run Test"**.
   - Observe deterministic failure: 2 of 4 checks pass, detecting that the system lacked automated secondary failover.
   - Click **"Remediate Weakness"** to create a linked Corrective Action ticket.

4. **Improve & Retest**:
   - In SAFETEST AI, click **"Rules"** on `scn-unavail-resp`.
   - Switch Rule Version to `v2.0` and toggle `auto_fallback_enabled: true` and `supervisor_alert: true`. Save.
   - Click **"Run Test"** again.
   - Observe deterministic pass: 4 of 4 checks pass!

5. **Module C — PROOF & Verification**:
   - Navigate to **PROOF**.
   - Select Run A (Baseline v1.0 FAILED) and Run B (Rerun v2.0 PASSED).
   - Inspect the comparative matrix: outcome transition, +50% pass rate delta, 2 resolved criteria, and 0 regressions.
   - Navigate to **Corrective Actions**, click **"Verify & Close"**, select the passing Run B, and observe verified closure.
