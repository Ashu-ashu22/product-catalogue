import { z } from 'zod';

/** Request contracts. Everything from the outside world is validated here. */

export const productIdParam = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid product id'),
});

export const categorySlugParam = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,64}$/, 'Invalid category'),
});

export const searchQuery = z.object({
  q: z
    .string({ required_error: 'Search term is required' })
    .trim()
    .min(1, 'Search term is required')
    .max(100, 'Search term is too long'),
});

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const enquiryBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: optionalTrimmed(30).refine((v) => v === undefined || /^[+\d][\d\s()-]{5,}$/.test(v), {
    message: 'Enter a valid phone number',
  }),
  message: optionalTrimmed(2000).transform((v) => v ?? ''),
  /**
   * Honeypot: hidden in the UI, so humans leave it empty. Bots that fill every
   * field get a fake success and no email is sent. Cheap spam defence that
   * needs no third-party CAPTCHA account.
   */
  website: z.string().optional(),
});

export type EnquiryBody = z.infer<typeof enquiryBody>;
