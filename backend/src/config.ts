import { z } from 'zod';

const csv = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

/**
 * All configuration comes from environment variables and is validated once at
 * startup. A bad config crashes the process immediately with a clear message,
 * rather than failing on the first customer request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Comma-separated list of allowed browser origins. Empty = same-origin only. */
  CORS_ORIGINS: z.string().default('').transform(csv),

  PRODUCT_SOURCE_URL: z.string().url().default('https://fakestoreapi.com'),
  PRODUCT_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  PRODUCT_SOURCE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  /** The "top rated" products the business has hand-picked for the home page. */
  FEATURED_PRODUCT_IDS: z
    .string()
    .default('1,5,9,13,18')
    .transform(csv)
    .pipe(z.array(z.string().min(1)).min(1, 'FEATURED_PRODUCT_IDS needs at least one id')),
  TOP_RATED_PER_CATEGORY: z.coerce.number().int().min(1).default(3),

  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: booleanString,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1).default('Catalogue <no-reply@catalogue.local>'),
  SALES_INBOX: z.string().email().default('sales@catalogue.local'),

  ENQUIRY_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${details}`);
  }
  return result.data;
}
