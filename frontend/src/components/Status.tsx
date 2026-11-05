import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import type { AsyncState } from '../hooks/useAsync';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="status" role="status">
      {label}
    </p>
  );
}

export function ErrorMessage({ error }: { error: Error }) {
  const message =
    error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  return (
    <div className="status status--error" role="alert">
      <p>{message}</p>
      <button type="button" className="button button--secondary" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  );
}

/** Renders loading / error states for a `useAsync` result, or the content. */
export function AsyncContent<T>({
  state,
  children,
}: {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorMessage error={state.error} />;
  return <>{children(state.data)}</>;
}
