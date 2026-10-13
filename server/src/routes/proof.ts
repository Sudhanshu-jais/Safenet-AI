import { Router, Request, Response } from 'express';
import { getProofSummary, compareScenarioRuns } from '../services/proofService.js';

const router = Router();

router.get('/summary', (req: Request, res: Response) => {
  try {
    const summary = getProofSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/compare', (req: Request, res: Response) => {
  try {
    const { runA, runB } = req.query;
    if (!runA || !runB) {
      res.status(400).json({ error: 'Both runA and runB query parameters are required.' });
      return;
    }

    const comparison = compareScenarioRuns(runA as string, runB as string);
    res.json({ comparison });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
