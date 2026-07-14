import { Router, Response } from 'express';
import { query, run } from '../../db';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { action } = req.body;
    if (!action || typeof action !== 'string') {
      res.status(400).json({ message: 'action is required' });
      return;
    }
    const id = `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await run(
        'INSERT INTO security_audit_log (id, user_id, user_name, action, ip_address) VALUES (?, ?, ?, ?, ?)',
        [id, req.user!.id, req.user!.name, action, req.ip],
      );
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await query(
        'SELECT * FROM security_audit_log ORDER BY date DESC LIMIT 500',
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
