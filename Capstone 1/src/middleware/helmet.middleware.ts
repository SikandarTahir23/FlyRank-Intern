import helmet from 'helmet';

/**
 * Helmet configuration for security headers.
 * Applied to all routes.
 * 
 * For widget.js, we use a more permissive CSP to allow inline scripts
 * since the widget is served from our own domain.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // widget.js may use inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:3000', 'https://ip-api.com', 'https://ipapi.co'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ['*'], // Allow embedding in iframes
    },
  },
  crossOriginEmbedderPolicy: false, // Required for widget embedding
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Additional CSP for widget.js endpoint - more permissive for static asset
 */
export const widgetCspMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});