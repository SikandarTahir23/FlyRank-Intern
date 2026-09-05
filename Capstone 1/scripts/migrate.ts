import { getPool, query, closePool } from '../src/config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration runner.
 * Executes init.sql against the database.
 */
async function migrate(): Promise<void> {
  console.log('🔄 Running database migrations...');
  
  try {
    const pool = getPool();
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    // Read and execute init.sql
    const sqlPath = join(__dirname, '../migrations/init.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    // This is a simple approach - for production, use a proper migration tool
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();