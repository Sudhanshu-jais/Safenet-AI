"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
const node_sqlite_1 = require("node:sqlite");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const config_js_1 = require("../config.js");
let dbInstance = null;
function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    const isMemory = config_js_1.config.dbPath === ':memory:';
    // Ensure data directory exists if persisting to disk
    if (!isMemory) {
        try {
            const dbDir = node_path_1.default.dirname(config_js_1.config.dbPath);
            if (!node_fs_1.default.existsSync(dbDir)) {
                node_fs_1.default.mkdirSync(dbDir, { recursive: true });
            }
        }
        catch (err) {
            console.warn('[SAFENET DB] Failed to create data directory, falling back to :memory::', err);
            dbInstance = new node_sqlite_1.DatabaseSync(':memory:');
            dbInstance.exec('PRAGMA foreign_keys = ON;');
            return dbInstance;
        }
    }
    try {
        dbInstance = new node_sqlite_1.DatabaseSync(config_js_1.config.dbPath);
    }
    catch (err) {
        console.warn(`[SAFENET DB] Failed to open ${config_js_1.config.dbPath}, falling back to :memory::`, err);
        dbInstance = new node_sqlite_1.DatabaseSync(':memory:');
    }
    // Enable foreign keys
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    // Only configure disk journal modes for persistent files
    if (!isMemory && config_js_1.config.dbPath !== ':memory:') {
        try {
            dbInstance.exec('PRAGMA journal_mode = WAL;');
        }
        catch {
            try {
                dbInstance.exec('PRAGMA journal_mode = DELETE;');
            }
            catch {
                // Ignored on constrained filesystems
            }
        }
    }
    return dbInstance;
}
function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
