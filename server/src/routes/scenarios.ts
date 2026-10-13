import { Router, Request, Response } from 'express';
import {
  listScenarios,
  getScenarioById,
  updateScenarioRuleConfig,
  executeScenario,
  listScenarioRuns,
  getScenarioRunById,
} from '../services/safetestEngine.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const scenarios = listScenarios();
    res.json({ scenarios });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/runs', (req: Request, res: Response) => {
  try {
    const { scenario_id, status } = req.query;
    const runs = listScenarioRuns({
      scenario_id: scenario_id as string,
      status: status as string,
    });
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/runs/:id', (req: Request, res: Response) => {
  try {
    const run = getScenarioRunById(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Scenario run not found' });
      return;
    }
    res.json({ run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const scenario = getScenarioById(req.params.id);
    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    res.json({ scenario });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/rule', requireRole('ADMINISTRATOR'), (req: Request, res: Response) => {
  try {
    const { rule_version, config } = req.body;
    const user = req.user!;

    if (!rule_version || !config) {
      res.status(400).json({ error: 'rule_version and config object are required' });
      return;
    }

    const updated = updateScenarioRuleConfig(
      req.params.id,
      rule_version,
      config,
      user.id,
      user.role
    );

    res.json({ scenario: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/run', requireRole('ADMINISTRATOR', 'OPERATOR'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const runResult = await executeScenario(req.params.id, user.id, user.role);
    res.status(201).json({ run: runResult });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
