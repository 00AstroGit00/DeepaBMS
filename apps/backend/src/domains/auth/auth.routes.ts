import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../db';
import { signToken } from '../../middleware/auth';
import { validate, LOGIN_SCHEMA } from '../../middleware/validate';

const router = Router();

router.post(
  '/login',
  validate(LOGIN_SCHEMA),
  async (req: Request, res: Response) => {
    const { pin } = req.body;

    try {
      const users = await query('SELECT * FROM users WHERE active = 1');
      let matchedUser: any = null;
      for (const u of users) {
        const valid = await bcrypt.compare(pin, u.pin_hash);
        if (valid) {
          matchedUser = u;
          break;
        }
      }
      if (!matchedUser) {
        res.status(401).json({ message: 'Invalid lockscreen security PIN' });
        return;
      }
      const token = signToken({
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        employeeId: matchedUser.employee_id || undefined,
      });

      res.json({
        token,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          role: matchedUser.role,
          employeeId: matchedUser.employee_id || undefined,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
