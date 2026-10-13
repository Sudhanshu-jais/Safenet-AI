// Bridge entrypoint for Vercel Express framework runner
const app = require('./dist/index.js');
module.exports = app.default || app;

