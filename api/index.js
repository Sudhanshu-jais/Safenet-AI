// Vercel Serverless Function Entry Point for SAFENET AI
process.env.VERCEL = process.env.VERCEL || '1';
const app = require('../server/dist/index.js');

module.exports = app.default || app;
