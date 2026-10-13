import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/connection.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { entity_type, action_type, limit = '50' } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }
    if (action_type) {
      query += ' AND action_type = ?';
      params.push(action_type);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit as string, 10) || 50);

    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
