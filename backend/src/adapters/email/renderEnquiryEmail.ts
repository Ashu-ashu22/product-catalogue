import type { Enquiry } from '../../domain/ports.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Collapse line breaks so user input can never break out of a header line. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Pure function: turns an enquiry into email content. Kept separate from the
 * transport so templates can change (or move to a provider's template engine)
 * without touching delivery code — and so it is trivial to test.
 */
export function renderEnquiryEmail(enquiry: Enquiry): {
  subject: string;
  text: string;
  html: string;
} {
  const { product, customer, message, receivedAt } = enquiry;
  const subject = singleLine(`New enquiry: ${product.title} (#${product.id})`);

  const rows: Array<[string, string]> = [
    ['Product', `${product.title} (#${product.id})`],
    ['Name', customer.name],
    ['Email', customer.email],
    ['Phone', customer.phone ?? '—'],
    ['Received', receivedAt.toISOString()],
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    message,
  ].join('\n');

  const html = `
<h2>New product enquiry</h2>
<table cellpadding="4">
${rows.map(([l, v]) => `  <tr><th align="left">${escapeHtml(l)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
<h3>Message</h3>
<p style="white-space: pre-wrap">${escapeHtml(message)}</p>`.trim();

  return { subject, text, html };
}
