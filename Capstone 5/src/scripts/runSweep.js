import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { runSweep } from '../jobs/dailySweep.job.js';

async function main() {
  console.log('🧹 Running manual sweep...');
  
  await connectDB();
  
  try {
    const run = await runSweep();
    console.log('\n✅ Sweep completed!');
    console.log(`   Records processed: ${run.recordsProcessed}`);
    console.log(`   Anomalies detected: ${run.anomaliesDetected}`);
    console.log(`   New anomalies: ${run.anomaliesNew}`);
    console.log(`   Resolved: ${run.anomaliesResolved}`);
  } catch (error) {
    console.error('❌ Sweep failed:', error.message);
    process.exit(1);
  }
  
  await disconnectDB();
  process.exit(0);
}

main();