// client/tests/run_servers_prod.cjs
// Helper script to start backend and frontend servers (dev mode) and wait until they are ready.

const { spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch'); // lightweight fetch for health checks

// Project root directories
const serverDir = path.resolve(__dirname, '../../server');
const clientDir = path.resolve(__dirname, '..'); // client root (tests folder is inside client)

function startProcess(command, args, cwd, name, extraOptions = {}) {
  const proc = spawn(command, args, { cwd, stdio: 'inherit', shell: true, ...extraOptions });
  proc.on('error', err => console.error(`${name} error:`, err));
  proc.on('exit', code => console.log(`${name} exited with code ${code}`));
  return proc;
}

function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      fetch(url)
        .then(res => {
          if (res.ok) return resolve();
          throw new Error('not ok');
        })
        .catch(() => {
          if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout waiting for ${url}`));
          setTimeout(poll, 500);
        });
    })();
  });
}

console.log('Starting backend server (dev)...');
const backend = startProcess('npm', ['run', 'dev'], serverDir, 'Backend', { env: { ...process.env, PORT: '5001' } });

// Wait a bit before launching frontend so the backend can bind the port
setTimeout(async () => {
  console.log('Starting frontend server (dev)...');
  const frontend = startProcess('npm', ['run', 'dev'], clientDir, 'Frontend');

  // Wait for both servers to respond
  try {
    await waitForUrl('http://localhost:5001/');
    await waitForUrl('http://localhost:5173/');
    console.log('Both servers are up. Launching Playwright test...');
    const testProc = startProcess('node', ['tests/e2e_production.cjs'], clientDir, 'E2E Production Test');
    testProc.on('exit', code => {
      console.log('E2E test finished with code', code);
      // Shut down both servers
      backend.kill();
      frontend.kill();
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    backend.kill();
    frontend.kill();
    process.exit(1);
  }
}, 5000);
