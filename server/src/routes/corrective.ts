import { Router, Request, Response } from 'express';
import {
  listCorrectiveActions,
  getCorrectiveActionById,
  createCorrectiveAction,
  updateCorrectiveActionStatus,
  CorrectiveActionStatus,
} from '../services/correctiveService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, priority } = req.query;
    const actions = listCorrectiveActions({
      status: status as string,
      priority: priority as string,
    });
    res.json({ corrective_actions: actions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const action = getCorrectiveActionById(req.params.id);
    if (!action) {
      res.status(404).json({ error: 'Corrective action not found' });
      return;
    }
    res.json({ corrective_action: action });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('ADMINISTRATOR', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const {
      title,
      weakness_description,
      source_run_id,
      proposed_remedy,
      owner,
      priority,
      due_date,
      verification_scenario_id,
    } = req.body;
    const user = req.user!;

    const action = createCorrectiveAction({
      title,
      weakness_description,
      source_run_id,
      proposed_remedy,
      owner,
      priority,
      due_date,
      verification_scenario_id,
      actorId: user.id,
      actorRole: user.role,
    });

    res.status(201).json({ corrective_action: action });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/status', requireRole('ADMINISTRATOR', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { status, verification_run_id, notes } = req.body;
    const user = req.user!;

    if (!status) {
      res.status(400).json({ error: 'Target status is required' });
      return;
    }

    const updated = updateCorrectiveActionStatus(
      req.params.id,
      status as CorrectiveActionStatus,
      verification_run_id,
      user.id,
      user.role,
      notes
    );

    res.json({ corrective_action: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
