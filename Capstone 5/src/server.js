import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { startDailySweep, stopDailySweep } from './jobs/dailySweep.job.js';

const PORT = process.env.PORT || 3000;

let server;

async function start() {
  try {
    await connectDB();
    startDailySweep();
    
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  stopDailySweep();
  
  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('Forced shutdown');
      process.exit(1);
    }, 10000);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();