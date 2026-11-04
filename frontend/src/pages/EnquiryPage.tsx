import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { EnquiryRequest, Product } from '../api/types';
import { AsyncContent } from '../components/Status';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type Fields = Required<Pick<EnquiryRequest, 'name' | 'email' | 'phone' | 'message'>> & {
  website: string;
};
type FieldErrors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = { name: '', email: '', phone: '', message: '', website: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Quick client-side checks for instant feedback. The server re-validates
 * everything — this is UX, not security.
 */
function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = 'Name is required';
  if (!fields.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(fields.email.trim())) errors.email = 'Enter a valid email address';
  return errors;
}

export function EnquiryPage() {
  const { id = '' } = useParams();
  const state = useAsync((signal) => api.getProduct(id, signal), [id]);
  useDocumentTitle('Enquiry');

  return <AsyncContent state={state}>{(product) => <EnquiryForm product={product} />}</AsyncContent>;
}

function EnquiryForm({ product }: { product: Product }) {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const thankYouRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === 'sent') thankYouRef.current?.focus();
  }, [status]);

  const update = (name: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [name]: e.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === 'submitting') return;
    const clientErrors = validate(fields);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    setStatus('submitting');
    try {
      await api.sendEnquiry(product.id, fields);
      setStatus('sent');
    } catch (error) {
      setStatus('idle');
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields as FieldErrors);
      }
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <section className="thank-you">
        <h1 tabIndex={-1} ref={thankYouRef}>
          Thank you
        </h1>
        <p>
          We've received your enquiry about <strong>{product.title}</strong>. Our sales team will be in
          touch at <strong>{fields.email.trim()}</strong> soon.
        </p>
        <Link to="/" className="button">
          Continue browsing
        </Link>
      </section>
    );
  }

  const fieldProps = (name: keyof Fields) => ({
    id: `enquiry-${name}`,
    name,
    value: fields[name],
    onChange: update(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `enquiry-${name}-error` : undefined,
  });
  const errorFor = (name: keyof Fields) =>
    errors[name] && (
      <p id={`enquiry-${name}-error`} className="field__error">
        {errors[name]}
      </p>
    );

  return (
    <section className="enquiry">
      <p>
        <Link to={`/products/${encodeURIComponent(product.id)}`}>← Back to product</Link>
      </p>
      <h1>Enquire about {product.title}</h1>
      <p>Leave your details and our sales team will get back to you.</p>

      {formError && (
        <div className="status status--error" role="alert">
          {formError}
        </div>
      )}

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="enquiry-name">Name *</label>
          <input {...fieldProps('name')} autoComplete="name" maxLength={100} required />
          {errorFor('name')}
        </div>
        <div className="field">
          <label htmlFor="enquiry-email">Email *</label>
          <input {...fieldProps('email')} type="email" autoComplete="email" maxLength={254} required />
          {errorFor('email')}
        </div>
        <div className="field">
          <label htmlFor="enquiry-phone">Phone (optional)</label>
          <input {...fieldProps('phone')} type="tel" autoComplete="tel" maxLength={30} />
          {errorFor('phone')}
        </div>
        <div className="field">
          <label htmlFor="enquiry-message">Message (optional)</label>
          <textarea {...fieldProps('message')} rows={5} maxLength={2000} />
          {errorFor('message')}
        </div>
        {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="enquiry-website">Website</label>
          <input {...fieldProps('website')} tabIndex={-1} autoComplete="off" />
        </div>
        <button type="submit" className="button button--large" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send enquiry'}
        </button>
      </form>
    </section>
  );
}
