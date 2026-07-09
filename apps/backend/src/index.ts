import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, query, run } from './db';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'deepa-bms-secret-key-101';

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate Limiter to mitigate DDoS/Brute-force PIN checks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// User auth payload structure
interface AuthUser {
  id: string;
  name: string;
  role: string;
}

// Extend express Request interface
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Authentication middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Authorization token required' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired session token' });
    req.user = decoded as AuthUser;
    next();
  });
};

// Route: Lockscreen authenticate
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: 'Security PIN is required' });

  try {
    const users = await query('SELECT * FROM users WHERE pin_hash = ? AND active = 1', [pin]); // Simple comparison for demo PIN locks
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid lockscreen security PIN' });
    }
    const user = users[0];
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Route: Sales register
app.get('/api/sales', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query('SELECT * FROM sales ORDER BY date DESC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/sales', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id, date, dept, description, amount, gstRate, gstAmount, total, mode, billNo } = req.body;
  try {
    await run(
      'INSERT INTO sales (id, date, dept, description, amount, gst_rate, gst_amount, total, mode, bill_no, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, date, dept, description, amount, gstRate, gstAmount, total, mode, billNo, req.user?.id]
    );
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Route: Hotel rooms
app.get('/api/rooms', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query('SELECT * FROM rooms');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Route: F&B Kitchen Inventory
app.get('/api/inventory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query('SELECT * FROM inventory');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Route: Bar Liquor stock
app.get('/api/liquor', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query('SELECT * FROM liquor');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Route: Employees
app.get('/api/employees', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query('SELECT * FROM employees');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Seed Initial User database on boot
const seedUsersTable = async () => {
  const users = await query('SELECT COUNT(*) as count FROM users');
  if (users[0].count === 0) {
    await run("INSERT INTO users (id, name, role, pin_hash) VALUES ('u-owner', 'Deepa (Owner)', 'owner', '1234')");
    await run("INSERT INTO users (id, name, role, pin_hash) VALUES ('u-manager', 'Rajan (Manager)', 'manager', '2345')");
    await run("INSERT INTO users (id, name, role, pin_hash) VALUES ('u-cashier', 'Sreeja (Cashier)', 'cashier', '3456')");
    console.log('Seeded default user accounts.');
  }
};

// Initialize & Launch API server
initializeDatabase().then(() => {
  seedUsersTable().then(() => {
    app.listen(PORT, () => {
      console.log(`Deepa BMS API Server listening on port ${PORT}`);
    });
  });
}).catch((err) => {
  console.error('Failed to launch SQLite database migrations:', err);
});
