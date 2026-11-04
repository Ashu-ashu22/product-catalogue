import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { NotFoundError, UpstreamError } from '../domain/errors.js';

export interface ApiError {
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UPSTREAM_ERROR' | 'INTERNAL_ERROR';
    message: string;
    fields?: Record<string, string>;
  };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiError = { error: { code: 'NOT_FOUND', message: 'Route not found' } };
  res.status(404).json(body);
};

/**
 * Maps domain errors to HTTP. Internal details are logged, never returned to
 * the client.
 */
export function createErrorHandler(logger: Pick<Console, 'error'> = console): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join('.') || '_';
        fields[key] ??= issue.message;
      }
      const body: ApiError = {
        error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields', fields },
      };
      return res.status(400).json(body);
    }
    if (err instanceof NotFoundError) {
      const body: ApiError = { error: { code: 'NOT_FOUND', message: err.message } };
      return res.status(404).json(body);
    }
    if (err instanceof UpstreamError) {
      logger.error(err); // Node prints the chained `cause` for us
      const body: ApiError = {
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'A service we depend on is unavailable. Please try again shortly.',
        },
      };
      return res.status(502).json(body);
    }
    // body-parser errors (malformed JSON, payload too large) carry a status.
    if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
      const body: ApiError = { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } };
      return res.status(err.status).json(body);
    }

    logger.error(err);
    const body: ApiError = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };
    return res.status(500).json(body);
  };
}
