import 'dotenv/config';

const env = process.env;
const list = (v, d = '') => (v ?? d).split(',').map((s) => s.trim()).filter(Boolean);
const port = Number(env.PORT ?? 5050);

/**
 * Accepts the plain domain ("sandboxXXXX.mailgun.org") or a pasted Mailgun dashboard URL
 * (".../mg/sending/sandboxXXXX.mailgun.org/settings") and returns just the sending domain.
 */
export function mailgunDomain(raw = '') {
  const v = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!v) return '';
  const candidates = v
    .replace(/^https?:\/\//, '')
    .split(/[/?#]/)
    .filter((part) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(part) && !/^(app|api|www)\.(eu\.)?mailgun\.(com|net)$/i.test(part));
  return (candidates.find((c) => /mailgun\.org$/i.test(c)) ?? candidates[0] ?? '').toLowerCase();
}

/** All settings come from backend/.env — nothing is hard-coded. */
export const config = {
  port,
  isProd: env.NODE_ENV === 'production',
  corsOrigins: list(env.CORS_ORIGINS, 'http://localhost:5173,http://localhost:5174,http://localhost:4173'),
  appUrl: env.APP_URL ?? 'http://localhost:5173',
  apiUrl: env.API_URL ?? `http://localhost:${port}`,

  jwtSecret: env.JWT_SECRET ?? '',
  jwtExpiresIn: env.JWT_EXPIRES_IN ?? '2h',
  /** Without Firebase Admin, accept the frontend's user info in development only. */
  allowInsecureDev: env.ALLOW_INSECURE_DEV ? env.ALLOW_INSECURE_DEV === 'true' : env.NODE_ENV !== 'production',

  gemini: {
    apiKey: (env.GEMINI_API_KEY ?? '').trim(),
    model: (env.GEMINI_MODEL || '').trim() || 'gemini-3.8-flash',
  },

  mailgun: {
    apiKey: (env.MAILGUN_API_KEY ?? '').trim(),
    domain: mailgunDomain(env.MAILGUN_DOMAIN),
    /** Use https://api.eu.mailgun.net for EU-region Mailgun accounts. */
    baseUrl: (env.MAILGUN_API_BASE ?? 'https://api.mailgun.net').replace(/\/$/, ''),
  },
};

export const features = {
  ai: Boolean(config.gemini.apiKey),
  email: Boolean(config.mailgun.apiKey && config.mailgun.domain),
};

if (!config.jwtSecret) {
  if (config.isProd) throw new Error('JWT_SECRET must be set in production');
  config.jwtSecret = 'dev-only-jwt-secret';
  console.warn('[config] JWT_SECRET is not set — using a development-only secret.');
}
