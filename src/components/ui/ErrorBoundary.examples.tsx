import { lazy, Suspense } from "react";

import { Button } from "./Button";
import { ErrorBoundary } from "./ErrorBoundary";
import { Spinner } from "./Spinner";

function Dashboard() {
  return <main>Your workspace dashboard.</main>;
}

function RevenueChart() {
  return <figure>Revenue, last 12 months</figure>;
}

function ActivityList() {
  return <ul aria-label="Recent activity"></ul>;
}

/** Stand-in for the current route path from your router. */
const pathname = "/reports";

function RouteView() {
  return <main>Quarterly reports</main>;
}

function publishPost() {}

function showToast(message: string) {
  void message;
}

const ReportsPage = lazy(async () => ({
  default: () => <article>Quarterly report</article>,
}));

/** Wrap the tree you refuse to lose: one throw below this point swaps in the
 *  fallback instead of unmounting the whole React root. */
export function Minimal() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

/** The innermost boundary wins, so a crash in one panel leaves its siblings mounted —
 *  the outer boundary stays in reserve for everything the inner one can't see. */
export function ScopedBoundary() {
  return (
    <ErrorBoundary>
      <main>
        <h1>Revenue</h1>
        <ErrorBoundary>
          <RevenueChart />
        </ErrorBoundary>
        <ActivityList />
      </main>
    </ErrorBoundary>
  );
}

/** There is no `onReset` or `resetKeys` — a changing `key` remounts the boundary, which
 *  is the only way a caller can clear a latched error without the user clicking. */
export function ResetOnNavigation() {
  return (
    <ErrorBoundary key={pathname}>
      <RouteView />
    </ErrorBoundary>
  );
}

/** Errors thrown in event handlers are never caught — the boundary sits outside that
 *  call stack, so the handler owns its own `try`/`catch`. */
export function HandlerErrorsNeedTryCatch() {
  return (
    <ErrorBoundary>
      <Button
        onClick={() => {
          try {
            publishPost();
          } catch (error) {
            showToast(`Couldn't publish: ${String(error)}`);
          }
        }}
      >
        Publish post
      </Button>
    </ErrorBoundary>
  );
}

/** Pair with Suspense for lazy routes: Suspense owns the wait, the boundary owns the
 *  failure — a chunk that fails to load throws during render and lands here. */
export function WithSuspense() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner size="lg" />}>
        <ReportsPage />
      </Suspense>
    </ErrorBoundary>
  );
}
