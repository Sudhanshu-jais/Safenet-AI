import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const isMemory = config.dbPath === ':memory:';

  // Ensure data directory exists if persisting to disk
  if (!isMemory) {
    try {
      const dbDir = path.dirname(config.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[SAFENET DB] Failed to create data directory, falling back to :memory::', err);
      dbInstance = new DatabaseSync(':memory:');
      dbInstance.exec('PRAGMA foreign_keys = ON;');
      return dbInstance;
    }
  }

  try {
    dbInstance = new DatabaseSync(config.dbPath);
  } catch (err) {
    console.warn(`[SAFENET DB] Failed to open ${config.dbPath}, falling back to :memory::`, err);
    dbInstance = new DatabaseSync(':memory:');
  }
  
  // Enable foreign keys
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  
  // Only configure disk journal modes for persistent files
  if (!isMemory && config.dbPath !== ':memory:') {
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
    } catch {
      try {
        dbInstance.exec('PRAGMA journal_mode = DELETE;');
      } catch {
        // Ignored on constrained filesystems
      }
    }
  }

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
