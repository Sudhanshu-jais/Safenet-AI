#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const rootDir = path.resolve(__dirname, '..');
console.log('Starting SAFENET AI Full Stack (Backend: 3001 | Frontend: 5173)...');
function startProcess(name, prefix, cwd, args) {
  const proc = spawn(npmCmd, args, { cwd, stdio: 'inherit', env: process.env, shell: isWin });
  return proc;
}
const serverProc = startProcess('server', 'SERVER', path.join(rootDir, 'server'), ['run', 'dev']);
const clientProc = startProcess('client', 'CLIENT', path.join(rootDir, 'client'), ['run', 'dev']);
function shutdown() {
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
