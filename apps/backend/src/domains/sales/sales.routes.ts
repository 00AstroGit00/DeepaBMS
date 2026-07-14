import { Router, Response } from 'express';
import { query, run } from '../../db';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { validate, CREATE_SALE_SCHEMA } from '../../middleware/validate';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'cashier', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await query('SELECT * FROM sales ORDER BY date DESC');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize('owner', 'manager', 'cashier', 'accountant'),
  validate(CREATE_SALE_SCHEMA),
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      id,
      date,
      dept,
      description,
      amount,
      gstRate,
      gstAmount,
      total,
      mode,
      billNo,
    } = req.body;
    try {
      await run(
        'INSERT INTO sales (id, date, dept, description, amount, gst_rate, gst_amount, total, mode, bill_no, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          date,
          dept,
          description,
          amount,
          gstRate,
          gstAmount,
          total,
          mode,
          billNo,
          req.user?.id,
        ],
      );
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
