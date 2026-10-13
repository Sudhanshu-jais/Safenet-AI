import { Router, Request, Response } from 'express';
import {
  listResponders,
  getResponderById,
  updateResponderAvailability,
  findEligibleResponders,
} from '../services/responderService.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { location_id, availability, role } = req.query;
    const responders = listResponders({
      location_id: location_id as string,
      availability: availability as string,
      role: role as string,
    });
    res.json({ responders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/eligible', (req: Request, res: Response) => {
  try {
    const { location_id, role } = req.query;
    if (!location_id) {
      res.status(400).json({ error: 'location_id is required' });
      return;
    }
    const responders = findEligibleResponders(location_id as string, role as string);
    res.json({ responders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const responder = getResponderById(req.params.id);
    if (!responder) {
      res.status(404).json({ error: 'Responder not found' });
      return;
    }
    res.json({ responder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/availability', requireRole('ADMINISTRATOR', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { availability } = req.body;
    const user = req.user!;

    if (!availability) {
      res.status(400).json({ error: 'availability is required' });
      return;
    }

    const updated = updateResponderAvailability(
      req.params.id,
      availability,
      user.id,
      user.role
    );

    res.json({ responder: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
