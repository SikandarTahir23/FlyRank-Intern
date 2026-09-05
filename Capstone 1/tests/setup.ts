import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test environment variables
config({ path: path.resolve(__dirname, '../.env.example') });

// Set test-specific env vars
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/capstone';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MOCK_GEO_FAILURE_A = 'false';
process.env.MOCK_GEO_FAILURE_ALL = 'false';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress expected error logs during tests
  if (args[0]?.includes?.('Rate limiter error') || 
      args[0]?.includes?.('Notification side effect failed')) {
    return;
  }
  originalConsoleError.apply(console, args);
};