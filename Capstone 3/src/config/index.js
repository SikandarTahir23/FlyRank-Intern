import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'billing',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    ssl: process.env.DB_SSL === 'true',
    max: Number(process.env.DB_POOL_MAX ?? 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    apiVersion: '2024-04-10',
    testMode: process.env.NODE_ENV !== 'production',
    prices: {
      free: process.env.STRIPE_PRICE_FREE_TEST ?? '',
      pro: process.env.STRIPE_PRICE_PRO_TEST ?? ''
    }
  },

  idempotency: {
    ttlHours: Number(process.env.IDEMPOTENCY_TTL_HOURS ?? 24)
  },

  rateLimit: {
    windowMs: 60000,
    maxRequests: 100
  }
};

export function validateEnv() {
  if (env.nodeEnv === 'production') {
    const required = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}