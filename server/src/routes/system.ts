import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';
import { seedDemoData, clearDemoData } from '../db/seed.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/locations', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const locations = db.prepare('SELECT * FROM locations ORDER BY name ASC').all();
    res.json({ locations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const openIncidents = (db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status != 'RESOLVED' AND status != 'CANCELLED'").get() as any)?.count || 0;
    const awaitingAck = (db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status = 'REPORTED'").get() as any)?.count || 0;
    const activeWorkflows = (db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status IN ('ASSIGNED', 'IN_PROGRESS')").get() as any)?.count || 0;
    const unresolvedGaps = (db.prepare("SELECT COUNT(*) as count FROM corrective_actions WHERE status IN ('OPEN', 'IN_PROGRESS')").get() as any)?.count || 0;

    const runsTotal = (db.prepare('SELECT COUNT(*) as count FROM scenario_runs').get() as any)?.count || 0;
    const runsPassed = (db.prepare("SELECT COUNT(*) as count FROM scenario_runs WHERE status = 'PASSED'").get() as any)?.count || 0;
    const passRate = runsTotal > 0 ? Math.round((runsPassed / runsTotal) * 100) : null;

    res.json({
      stats: {
        open_incidents: openIncidents,
        awaiting_acknowledgement: awaitingAck,
        active_workflows: activeWorkflows,
        unresolved_weaknesses: unresolvedGaps,
        latest_pass_rate: passRate,
        total_runs: runsTotal,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seed', requireRole('ADMINISTRATOR'), (req: Request, res: Response) => {
  try {
    const result = seedDemoData();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clear', requireRole('ADMINISTRATOR'), (req: Request, res: Response) => {
  try {
    const result = clearDemoData();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
