import { useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };

/**
 * Runs an async loader whenever `deps` change, cancelling the previous request
 * so a slow old response can never overwrite a newer one (e.g. fast typing
 * between searches or quick category clicks).
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  // Deliberately small hand-rolled fetching hook. If data needs grow (shared
  // cache, retries, pagination) swap for TanStack Query — see DECISIONS.md.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => controller.abort();
    // `load` is intentionally excluded: callers pass inline closures and
    // declare what they depend on through `deps`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
