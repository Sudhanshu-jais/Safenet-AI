import { Router, Request, Response } from 'express';
import {
  createIncident,
  getIncidentById,
  listIncidents,
  getIncidentTimeline,
  transitionIncidentStatus,
  assignIncidentResponder,
  IncidentStatus,
} from '../services/incidentService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { location_id, status, priority, category, is_simulation, search } = req.query;
    const incidents = listIncidents({
      location_id: location_id as string,
      status: status as string,
      priority: priority as string,
      category: category as string,
      is_simulation: is_simulation !== undefined ? is_simulation === 'true' || is_simulation === '1' : undefined,
      search: search as string,
    });
    res.json({ incidents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const incident = getIncidentById(req.params.id);
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    const timeline = getIncidentTimeline(req.params.id);
    res.json({ incident, timeline });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('ADMINISTRATOR', 'OPERATOR'), async (req: Request, res: Response) => {
  try {
    const { title, description, category, location_id, zone, priority, is_simulation } = req.body;
    const user = req.user!;

    const incident = await createIncident({
      title,
      description,
      category,
      location_id,
      zone,
      priority,
      is_simulation,
      actorId: user.id,
      actorRole: user.role,
    });

    res.status(201).json({ incident });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/transition', requireRole('ADMINISTRATOR', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const user = req.user!;

    if (!status) {
      res.status(400).json({ error: 'Target status is required' });
      return;
    }

    const updated = transitionIncidentStatus(
      req.params.id,
      status as IncidentStatus,
      user.id,
      user.role,
      notes
    );

    res.json({ incident: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/assign', requireRole('ADMINISTRATOR', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { responder_id, notes } = req.body;
    const user = req.user!;

    if (!responder_id) {
      res.status(400).json({ error: 'responder_id is required' });
      return;
    }

    const updated = assignIncidentResponder(
      req.params.id,
      responder_id,
      user.id,
      user.role,
      notes
    );

    res.json({ incident: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
