import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { query, run } from '../db';
import type { SeedModule } from './types';

interface SeedUser {
  id: string;
  name: string;
  role: string;
  pin: string;
}

export const authSeed: SeedModule = {
  name: 'auth',
  dependsOn: [],

  async run(): Promise<void> {
    const users = await query('SELECT COUNT(*) as count FROM users');
    if (users[0].count > 0) {
      console.log('[seed] Users table already seeded, skipping.');
      return;
    }

    // M1-1: Never seed weak, well-known default PINs in production. In demo/dev
    // mode we still use documented demo PINs but force a password change on
    // first login. In production we generate strong per-user PINs that must be
    // rotated through the setup wizard before any access is granted.
    const demoMode =
      process.env.SEED_DEMO === 'true' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === undefined;

    const saltRounds = 10;
    const seedUsers: SeedUser[] = [
      { id: 'u-owner', name: 'Deepa (Owner)', role: 'owner', pin: '' },
      { id: 'u-manager', name: 'Rajan (Manager)', role: 'manager', pin: '' },
      { id: 'u-cashier', name: 'Sreeja (Cashier)', role: 'cashier', pin: '' },
    ];

    for (const u of seedUsers) {
      if (demoMode) {
        u.pin =
          u.role === 'owner' ? '1234' : u.role === 'manager' ? '2345' : '3456';
      } else {
        u.pin = randomBytes(4).toString('hex').slice(0, 8);
      }
    }

    for (const u of seedUsers) {
      const pinHash = await bcrypt.hash(u.pin, saltRounds);
      await run(
        'INSERT INTO users (id, name, role, pin_hash, force_password_change) VALUES (?, ?, ?, ?, 1)',
        [u.id, u.name, u.role, pinHash],
      );
    }

    if (demoMode) {
      console.log(
        '[seed] DEMO users seeded. Default PINs (force change on first login): owner=1234, manager=2345, cashier=3456',
      );
    } else {
      console.warn(
        '[seed] PRODUCTION: generated strong one-time PINs. Set SEED_DEMO=true to use documented demo PINs. ' +
          'Users must complete setup wizard rotation. Generated PINs:\n' +
          seedUsers.map((u) => `  ${u.role} (${u.id}): ${u.pin}`).join('\n'),
      );
    }
    console.log(
      '[seed] Seeded default user accounts (password change forced).',
    );
  },

  async verify(): Promise<boolean> {
    const users = await query('SELECT COUNT(*) as count FROM users');
    return users[0].count >= 3;
  },
};
