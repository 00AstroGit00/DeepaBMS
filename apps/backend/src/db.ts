import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_FILE = path.join(__dirname, '..', 'deepa-bms.db');

export const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to SQLite database at:', DB_FILE);
  }
});

// Run migrations on start
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    fs.readFile(schemaPath, 'utf8', (err, sql) => {
      if (err) {
        return reject(err);
      }
      db.exec(sql, (execErr) => {
        if (execErr) {
          return reject(execErr);
        }
        console.log('Database tables, checks and constraints verified successfully.');
        resolve();
      });
    });
  });
};

export const query = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

export const run = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};
