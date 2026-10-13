import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { initializeSchema } from './schema.js';
import { seedDemoData } from './seed.js';

export interface ISqliteStatement {
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

export interface ISqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): ISqliteStatement;
  close?: () => void;
}

let dbInstance: ISqliteDatabase | null = null;
let isReady = false;
let readyPromise: Promise<ISqliteDatabase> | null = null;

function normalizeParams(params: any[]): any[] {
  return params.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
}

function createSqlJsAdapter(rawDb: any): ISqliteDatabase {
  return {
    exec(sql: string) {
      rawDb.run(sql);
    },
    prepare(sql: string): ISqliteStatement {
      return {
        run(...params: any[]) {
          const norm = normalizeParams(params);
          rawDb.run(sql, norm);
          return {
            changes: rawDb.getRowsModified ? rawDb.getRowsModified() : 1,
            lastInsertRowid: 0,
          };
        },
        get(...params: any[]) {
          const norm = normalizeParams(params);
          const stmt = rawDb.prepare(sql, norm);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params: any[]) {
          const norm = normalizeParams(params);
          const stmt = rawDb.prepare(sql, norm);
          const results: any[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
      };
    },
    close() {
      try {
        rawDb.close();
      } catch {}
    },
  };
}

function createNodeSqliteAdapter(nativeDb: any): ISqliteDatabase {
  return {
    exec(sql: string) {
      nativeDb.exec(sql);
    },
    prepare(sql: string): ISqliteStatement {
      const stmt = nativeDb.prepare(sql);
      return {
        run(...params: any[]) {
          return stmt.run(...normalizeParams(params));
        },
        get(...params: any[]) {
          return stmt.get(...normalizeParams(params));
        },
        all(...params: any[]) {
          return stmt.all(...normalizeParams(params));
        },
      };
    },
    close() {
      try {
        nativeDb.close();
      } catch {}
    },
  };
}

export async function initDatabase(): Promise<ISqliteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const isMemory = config.dbPath === ':memory:';

  // 1. Attempt native node:sqlite first
  try {
    const sqliteModule = require('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
      if (!isMemory) {
        try {
          const dbDir = path.dirname(config.dbPath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
          }
        } catch {}
      }

      const nativeDb = new sqliteModule.DatabaseSync(config.dbPath);
      nativeDb.exec('PRAGMA foreign_keys = ON;');
      if (!isMemory && config.dbPath !== ':memory:') {
        try { nativeDb.exec('PRAGMA journal_mode = WAL;'); } catch {}
      }

      dbInstance = createNodeSqliteAdapter(nativeDb);
      console.log(`[SAFENET DB] Successfully initialized native node:sqlite (${isMemory ? ':memory:' : config.dbPath})`);
      return dbInstance;
    }
  } catch (err: any) {
    console.warn('[SAFENET DB] node:sqlite unavailable in this environment, using pure JS SQLite fallback (sql-asm.js):', err.message);
  }

  // 2. Fall back to pure JS SQLite (sql-asm.js - works on all Node runtimes & Vercel serverless lambdas)
  try {
    const initSqlJs = require('sql.js/dist/sql-asm.js');
    const SQL = await initSqlJs();
    const rawDb = new SQL.Database();
    rawDb.run('PRAGMA foreign_keys = ON;');
    dbInstance = createSqlJsAdapter(rawDb);
    console.log('[SAFENET DB] Successfully initialized pure JS in-memory SQLite (sql-asm.js)');
    return dbInstance;
  } catch (err: any) {
    console.error('[SAFENET DB] Failed to initialize SQLite engine:', err);
    throw err;
  }
}

export async function ensureDatabaseReady(): Promise<ISqliteDatabase> {
  if (isReady && dbInstance) {
    return dbInstance;
  }
  if (!readyPromise) {
    readyPromise = (async () => {
      const db = await initDatabase();
      try {
        initializeSchema(db);
        seedDemoData(db);
        console.log('[SAFENET AI] Database schema and full Phase-1 operational dataset initialized.');
      } catch (err) {
        console.warn('[SAFENET AI] Schema initialization note:', err);
      }
      isReady = true;
      return db;
    })();
  }
  return readyPromise;
}

export function getDatabase(): ISqliteDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  // Synchronous attempt for node:sqlite if available locally
  try {
    const sqliteModule = require('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
      const nativeDb = new sqliteModule.DatabaseSync(config.dbPath);
      nativeDb.exec('PRAGMA foreign_keys = ON;');
      dbInstance = createNodeSqliteAdapter(nativeDb);
      return dbInstance;
    }
  } catch {}

  throw new Error('Database is initializing. Please await ensureDatabaseReady() before calling getDatabase().');
}

export function closeDatabase(): void {
  if (dbInstance) {
    if (dbInstance.close) {
      dbInstance.close();
    }
    dbInstance = null;
    isReady = false;
    readyPromise = null;
  }
}

