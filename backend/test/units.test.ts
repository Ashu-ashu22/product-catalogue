import { describe, expect, it } from 'vitest';
import { renderEnquiryEmail } from '../src/adapters/email/renderEnquiryEmail.js';
import { slugify } from '../src/adapters/fakestore/mapper.js';
import { loadConfig } from '../src/config.js';

describe('renderEnquiryEmail', () => {
  const enquiry = {
    product: { id: '3', title: 'Mens Cotton Jacket' },
    customer: { name: '<script>alert(1)</script>', email: 'x@example.com' },
    message: 'Line 1\n<b>bold</b>',
    receivedAt: new Date('2026-11-04T10:00:00Z'),
  };

  it('escapes customer input in the HTML body', () => {
    const { html } = renderEnquiryEmail(enquiry);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('includes all details in the plain-text body', () => {
    const { text, subject } = renderEnquiryEmail(enquiry);
    expect(subject).toBe('New enquiry: Mens Cotton Jacket (#3)');
    expect(text).toContain('Email: x@example.com');
    expect(text).toContain('Phone: —');
    expect(text).toContain('Line 1\n<b>bold</b>');
  });

  it('never lets a line break into the subject', () => {
    const { subject } = renderEnquiryEmail({
      ...enquiry,
      product: { id: '3', title: 'Jacket\r\nBcc: victim@example.com' },
    });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe('slugify', () => {
  it.each([
    ["men's clothing", 'mens-clothing'],
    ['Women’s Clothing', 'womens-clothing'],
    ['  Home & Garden ', 'home-garden'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('loadConfig', () => {
  it('applies sensible local defaults', () => {
    const config = loadConfig({});
    expect(config.FEATURED_PRODUCT_IDS).toEqual(['1', '5', '9', '13', '18']);
    expect(config.SMTP_PORT).toBe(1025);
    expect(config.SMTP_SECURE).toBe(false);
  });

  it('parses comma-separated lists', () => {
    const config = loadConfig({ FEATURED_PRODUCT_IDS: ' 2, 4 ,6 ', CORS_ORIGINS: 'http://a.test,http://b.test' });
    expect(config.FEATURED_PRODUCT_IDS).toEqual(['2', '4', '6']);
    expect(config.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('fails fast with a readable message on bad config', () => {
    expect(() => loadConfig({ SALES_INBOX: 'nope', PORT: 'abc' })).toThrow(
      /Invalid configuration:[\s\S]*SALES_INBOX[\s\S]*PORT|Invalid configuration:[\s\S]*PORT[\s\S]*SALES_INBOX/,
    );
  });
});
