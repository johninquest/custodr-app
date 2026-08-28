import { execSync } from 'child_process';

const ports = process.argv.slice(2).map(Number).filter(Boolean);
const targetPorts = ports.length > 0 ? ports : [8080, 5173];

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      // Find PID holding port on Windows
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`✓ Terminated process (PID ${pid}) on port ${port}`);
        } catch (_) {}
      }
      if (pids.size === 0) {
        console.log(`✓ Port ${port} is free`);
      }
    } else {
      // Unix / macOS
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      console.log(`✓ Port ${port} is free`);
    }
  } catch (err) {
    console.log(`✓ Port ${port} is free`);
  }
}

for (const port of targetPorts) {
  freePort(port);
}
