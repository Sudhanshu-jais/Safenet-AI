"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.ensureDatabaseReady = ensureDatabaseReady;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const config_js_1 = require("../config.js");
let dbInstance = null;
let isReady = false;
let readyPromise = null;
function normalizeParams(params) {
    return params.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
}
function createSqlJsAdapter(rawDb) {
    return {
        exec(sql) {
            rawDb.run(sql);
        },
        prepare(sql) {
            return {
                run(...params) {
                    const norm = normalizeParams(params);
                    rawDb.run(sql, norm);
                    return {
                        changes: rawDb.getRowsModified ? rawDb.getRowsModified() : 1,
                        lastInsertRowid: 0,
                    };
                },
                get(...params) {
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
                all(...params) {
                    const norm = normalizeParams(params);
                    const stmt = rawDb.prepare(sql, norm);
                    const results = [];
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
            }
            catch { }
        },
    };
}
function createNodeSqliteAdapter(nativeDb) {
    return {
        exec(sql) {
            nativeDb.exec(sql);
        },
        prepare(sql) {
            const stmt = nativeDb.prepare(sql);
            return {
                run(...params) {
                    return stmt.run(...normalizeParams(params));
                },
                get(...params) {
                    return stmt.get(...normalizeParams(params));
                },
                all(...params) {
                    return stmt.all(...normalizeParams(params));
                },
            };
        },
        close() {
            try {
                nativeDb.close();
            }
            catch { }
        },
    };
}
async function initDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    const isMemory = config_js_1.config.dbPath === ':memory:';
    // 1. Attempt native node:sqlite first
    try {
        const sqliteModule = require('node:sqlite');
        if (sqliteModule && sqliteModule.DatabaseSync) {
            if (!isMemory) {
                try {
                    const dbDir = node_path_1.default.dirname(config_js_1.config.dbPath);
                    if (!node_fs_1.default.existsSync(dbDir)) {
                        node_fs_1.default.mkdirSync(dbDir, { recursive: true });
                    }
                }
                catch { }
            }
            const nativeDb = new sqliteModule.DatabaseSync(config_js_1.config.dbPath);
            nativeDb.exec('PRAGMA foreign_keys = ON;');
            if (!isMemory && config_js_1.config.dbPath !== ':memory:') {
                try {
                    nativeDb.exec('PRAGMA journal_mode = WAL;');
                }
                catch { }
            }
            dbInstance = createNodeSqliteAdapter(nativeDb);
            console.log(`[SAFENET DB] Successfully initialized native node:sqlite (${isMemory ? ':memory:' : config_js_1.config.dbPath})`);
            return dbInstance;
        }
    }
    catch (err) {
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
    }
    catch (err) {
        console.error('[SAFENET DB] Failed to initialize SQLite engine:', err);
        throw err;
    }
}
async function ensureDatabaseReady() {
    if (isReady && dbInstance) {
        return dbInstance;
    }
    if (!readyPromise) {
        readyPromise = (async () => {
            const db = await initDatabase();
            const { initializeSchema } = await import('./schema.js');
            const { seedInitialScenarios } = await import('./seed.js');
            try {
                initializeSchema();
                seedInitialScenarios();
                console.log('[SAFENET AI] Database schema and initial scenarios verified.');
            }
            catch (err) {
                console.warn('[SAFENET AI] Schema initialization note:', err);
            }
            isReady = true;
            return db;
        })();
    }
    return readyPromise;
}
function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    // Synchronous attempt for node:sqlite if available locally
    try {
        const sqliteModule = require('node:sqlite');
        if (sqliteModule && sqliteModule.DatabaseSync) {
            const nativeDb = new sqliteModule.DatabaseSync(config_js_1.config.dbPath);
            nativeDb.exec('PRAGMA foreign_keys = ON;');
            dbInstance = createNodeSqliteAdapter(nativeDb);
            return dbInstance;
        }
    }
    catch { }
    throw new Error('Database is initializing. Please await ensureDatabaseReady() before calling getDatabase().');
}
function closeDatabase() {
    if (dbInstance) {
        if (dbInstance.close) {
            dbInstance.close();
        }
        dbInstance = null;
        isReady = false;
        readyPromise = null;
    }
}
