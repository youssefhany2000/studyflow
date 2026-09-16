import { app } from 'electron';
import Database from 'better-sqlite3';
import path from 'node:path';

import { runMigrations } from './schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'studyflow.db');
  db = new Database(dbPath);

  // enforce foreign keys (sqlite turns this off by default)
  db.pragma('foreign_keys = ON');
  
  // use WAL mode for better concurrency and crash safety
  db.pragma('journal_mode = WAL');

  runMigrations(db);

  return db;
}