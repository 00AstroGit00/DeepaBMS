import { Router, Response } from 'express';
import { query } from '../../db';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await query('SELECT * FROM employees');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
