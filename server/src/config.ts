import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isServerless,
  dbPath: process.env.DATABASE_PATH || (isServerless ? ':memory:' : path.resolve(process.cwd(), '../data/safenet.db')),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
