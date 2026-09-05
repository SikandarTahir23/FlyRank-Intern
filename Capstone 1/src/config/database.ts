import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { getConfig } from './index.js';

let pool: Pool | null = null;

/**
 * Creates a PostgreSQL connection pool.
 * Uses the DATABASE_URL from validated configuration.
 */
export function createPool(): Pool {
  const config = getConfig();
  
  const poolConfig: PoolConfig = {
    connectionString: config.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  const newPool = new Pool(poolConfig);

  newPool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  return newPool;
}

/**
 * Returns the singleton database pool.
 * Creates it on first access.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

/**
 * Executes a query with automatic retry on transient failures.
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
  }
  
  return result;
}

/**
 * Executes a query within a transaction.
 * @param callback - Function that receives a client and performs operations
 * @returns Result of the callback
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes the database pool.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}