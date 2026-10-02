import helmet from 'helmet';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:3000', 'https://ip-api.com', 'https://ipapi.co'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ['*'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

export const widgetCspMiddleware = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], scriptSrc: ["'self'"] } },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});