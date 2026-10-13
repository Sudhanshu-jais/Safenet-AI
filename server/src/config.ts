import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DATABASE_PATH || (process.env.VERCEL ? ':memory:' : path.resolve(process.cwd(), '../data/safenet.db')),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
