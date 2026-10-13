// Resilient bridge entrypoint for Vercel Express runner
const express = require('express');
let app;

try {
  const mod = require('./dist/index.js');
  app = mod.default || mod;
} catch (err) {
  console.error('[SAFENET CRITICAL BOOT ERROR]', err);
  app = express();
  app.use((req, res) => {
    res.status(500).json({
      error: 'SAFENET Backend Boot Failure',
      message: err.message,
      stack: err.stack,
      nodeVersion: process.version,
    });
  });
}

module.exports = app;
module.exports.default = app;

