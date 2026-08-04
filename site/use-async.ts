import { useEffect, useState } from "react";

/**
 * Runs an async loader and reports its outcome, dropping results that arrive after the
 * inputs changed.
 *
 * The staleness guard is the whole point: routes here resolve chunks over the network, so
 * clicking Card then Button while Card is still in flight is ordinary. Without the
 * `cancelled` flag the slower response wins and the page shows a document the URL does
 * not name — a race that only appears on a slow connection, which is exactly where nobody
 * is testing.
 */
export type AsyncState<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "failed"; error: Error };

export function useAsync<T>(load: () => Promise<T>, key: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    load().then(
      (value) => {
        if (!cancelled) setState({ status: "ready", value });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: "failed", error: error instanceof Error ? error : new Error(String(error)) });
        }
      },
    );

    return () => {
      cancelled = true;
    };
    // Keyed on `key`, not `load`: the loader is a fresh closure on every render of the
    // registry entry, so depending on it would restart the fetch forever.
  }, [key]);

  return state;
}
