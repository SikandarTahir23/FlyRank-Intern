import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Development server with hot reload using tsx.
 */
const child = spawn('npx', ['tsx', 'watch', join(__dirname, '../src/main.ts')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
  },
});

child.on('error', (err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});

// Handle parent process termination
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));