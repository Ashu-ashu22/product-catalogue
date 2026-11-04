import nodemailer, { type Transporter } from 'nodemailer';
import { UpstreamError } from '../../domain/errors.js';
import type { Enquiry, EnquiryNotifier } from '../../domain/ports.js';
import { renderEnquiryEmail } from './renderEnquiryEmail.js';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  salesInbox: string;
}

/**
 * Sends enquiries over SMTP. Locally this points at Mailpit (a free, fake
 * inbox in Docker). In production it can point at Amazon SES's SMTP endpoint
 * or any other provider purely through environment variables.
 */
export class SmtpEnquiryNotifier implements EnquiryNotifier {
  private readonly transporter: Transporter;

  constructor(
    private readonly options: SmtpOptions,
    transporter?: Transporter,
  ) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        auth: options.user ? { user: options.user, pass: options.pass } : undefined,
      });
  }

  async notify(enquiry: Enquiry): Promise<void> {
    const { subject, text, html } = renderEnquiryEmail(enquiry);
    try {
      await this.transporter.sendMail({
        from: this.options.from,
        to: this.options.salesInbox,
        // Sales can hit "Reply" to answer the customer directly.
        replyTo: { name: enquiry.customer.name, address: enquiry.customer.email },
        subject,
        text,
        html,
      });
    } catch (cause) {
      throw new UpstreamError('Failed to send enquiry email', { cause });
    }
  }
}
