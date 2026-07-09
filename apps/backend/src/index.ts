import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, query, run } from './db';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'deepa-bms-secret-key-101';

// Increase body limit to 5mb — /api/sync sends the full app state JSON (~200-500KB)
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined'));

// General API rate limiter (sync polls every 30s, so ~30 req/15min per device, 500 is safe for up to ~16 concurrent devices)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// Stricter limiter for auth endpoint — prevents PIN brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again after 15 minutes.'
});
app.use('/api/auth/', authLimiter);

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

// Route: Centralized State Sync (LWW & Union based merging)
const STATE_FILE = path.join(__dirname, '..', 'deepa-bms-master-state.json');
const STATE_FILE_BAK = STATE_FILE + '.bak';

// ── Simple in-memory Promise-queue mutex ────────────────────────────────────
// Ensures concurrent /api/sync requests are serialized (read-modify-write safety)
let syncQueueTail: Promise<void> = Promise.resolve();
function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = syncQueueTail.then(fn);
  // Keep tail alive but swallow errors (each caller handles their own)
  syncQueueTail = result.then(() => {}, () => {});
  return result;
}

// ── Async file helpers ──────────────────────────────────────────────────────
async function readMasterState(): Promise<any> {
  try {
    const data = await fs.promises.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data.trim());
  } catch (err: any) {
    if (err.code === 'ENOENT') return null; // file doesn't exist yet
    // JSON parse error — try backup
    try {
      const bak = await fs.promises.readFile(STATE_FILE_BAK, 'utf8');
      console.warn('[sync] Primary state file corrupt, restoring from backup.');
      await fs.promises.writeFile(STATE_FILE, bak, 'utf8');
      return JSON.parse(bak.trim());
    } catch {
      return null; // No backup either — fresh start
    }
  }
}

async function writeMasterState(state: any): Promise<void> {
  const json = JSON.stringify(state, null, 2);
  // Write backup first, then primary (crash-safe ordering)
  await fs.promises.writeFile(STATE_FILE_BAK, json, 'utf8');
  await fs.promises.writeFile(STATE_FILE, json, 'utf8');
}

// ── Merge helpers ───────────────────────────────────────────────────────────
function mergeCollections(local: any[] = [], remote: any[] = []): any[] {
  const map = new Map<string, any>();
  remote.forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });
  local.forEach(item => {
    if (item && item.id) {
      const existing = map.get(item.id);
      if (existing) {
        const existingDate = existing.date || existing.importedAt || existing.createdAt || '';
        const localDate = item.date || item.importedAt || item.createdAt || '';
        if (localDate && existingDate && localDate > existingDate) {
          map.set(item.id, item);
        }
      } else {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

function mergeRooms(local: any[] = [], remote: any[] = []): any[] {
  const map = new Map<string, any>();
  remote.forEach(r => map.set(r.id, r));
  local.forEach(r => {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
    } else {
      // Favor occupied status or latest checkin info
      if (r.status === 'occupied' || (existing.status !== 'occupied' && r.status === 'cleaning')) {
        map.set(r.id, r);
      }
    }
  });
  return Array.from(map.values());
}

// ── Sync route ──────────────────────────────────────────────────────────────
app.post('/api/sync', async (req: Request, res: Response) => {
  const { state: localState } = req.body;
  if (!localState) return res.status(400).json({ message: 'Local state is required for sync' });

  try {
    // Serialize all concurrent sync requests through the queue
    const mergedState = await withSyncLock(async () => {
      const masterState = await readMasterState();

      if (!masterState) {
        // First sync ever: server bootstraps from incoming state
        const fresh = { ...localState, ready: true };
        await writeMasterState(fresh);
        return fresh;
      }

      // Merge: master is authoritative base; local additions win for new records
      const merged: any = {
        ready: true,
        users: mergeCollections(localState.users, masterState.users),
        auditLog: mergeCollections(localState.auditLog, masterState.auditLog),
        sales: mergeCollections(localState.sales, masterState.sales),
        txns: mergeCollections(localState.txns, masterState.txns),
        bankMoves: mergeCollections(localState.bankMoves, masterState.bankMoves),
        bankStatements: mergeCollections(localState.bankStatements, masterState.bankStatements),
        rooms: mergeRooms(localState.rooms, masterState.rooms),
        stays: mergeCollections(localState.stays, masterState.stays),
        inventory: mergeCollections(localState.inventory, masterState.inventory),
        stockMoves: mergeCollections(localState.stockMoves, masterState.stockMoves),
        liquor: mergeCollections(localState.liquor, masterState.liquor),
        liquorAudits: mergeCollections(localState.liquorAudits, masterState.liquorAudits),
        credits: mergeCollections(localState.credits, masterState.credits),
        employees: mergeCollections(localState.employees, masterState.employees),
        leaves: mergeCollections(localState.leaves, masterState.leaves),
        announcements: mergeCollections(localState.announcements, masterState.announcements),
        banks: mergeCollections(localState.banks, masterState.banks),
        // Settings: take local but strip serverUrl/lastSyncedAt (device-specific fields)
        settings: {
          ...masterState.settings,
          ...localState.settings,
          serverUrl: masterState.settings?.serverUrl || localState.settings?.serverUrl || '',
          lastSyncedAt: undefined  // Each device tracks its own sync time locally
        }
      };

      await writeMasterState(merged);
      return merged;
    });

    res.json(mergedState);
  } catch (err: any) {
    console.error('[sync] Error:', err.message);
    res.status(500).json({ message: `Sync failed: ${err.message}` });
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

// Centralized error handler (must have 4 args for Express to recognize it as error middleware)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err.stack || err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const startQuickTunnel = (port: number) => {
  console.log('[Tunnel] Starting automated Cloudflare Quick Tunnel...');
  const child = spawn('npx', ['--yes', '@cloudflare/cloudflared', 'tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`], {
    shell: true
  });

  child.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      console.log('\n==================================================');
      console.log('  ⚡ DEEPA BMS IS ACCESSIBLE GLOBALLY! ⚡');
      console.log(`  Public HTTPS URL: \x1b[36m${match[0]}\x1b[0m`);
      console.log('  Enter this URL in Settings -> serverUrl on Android/Windows');
      console.log('==================================================\n');
    }
  });

  child.on('error', (err) => {
    console.error('[Tunnel] Failed to start tunnel process:', err.message);
  });
};

// Initialize & Launch API server
// Bind to 0.0.0.0 so LAN devices (other phones/tablets on same Wi-Fi) can reach the server
initializeDatabase().then(() => {
  seedUsersTable().then(() => {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Deepa BMS API Server listening on http://0.0.0.0:${PORT}`);
      console.log(`LAN devices: connect to http://<this-machine-IP>:${PORT}`);
      
      // Auto-start tunnel if flag or env variable is supplied
      if (process.env.START_TUNNEL === 'true' || process.argv.includes('--tunnel')) {
        startQuickTunnel(Number(PORT));
      }
    });
  });
}).catch((err) => {
  console.error('Failed to launch SQLite database migrations:', err);
});
