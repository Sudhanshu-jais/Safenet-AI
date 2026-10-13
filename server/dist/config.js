"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dbPath: process.env.DATABASE_PATH || (process.env.VERCEL ? ':memory:' : node_path_1.default.resolve(process.cwd(), '../data/safenet.db')),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    corsOrigin: process.env.CORS_ORIGIN || '*',
};
