/** Thrown when a requested resource does not exist. Mapped to HTTP 404. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when an upstream dependency (product source, email provider) fails.
 * Mapped to HTTP 502 so the client can distinguish "our bug" from "their outage".
 */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}
