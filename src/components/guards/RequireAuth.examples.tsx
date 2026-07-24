import { type AuthStatus, RequireAuth } from "./RequireAuth";

const authStatus: AuthStatus = "authenticated";

function Dashboard() {
  return <main>Your signed-in dashboard.</main>;
}

function PageSkeleton() {
  return <div aria-hidden>Loading your workspace…</div>;
}

function SignInPrompt() {
  return (
    <section>
      <h1>Please sign in</h1>
      <a href="/login">Go to sign in</a>
    </section>
  );
}

// Stand-in for a router's declarative redirect element (e.g. react-router's <Navigate>).
function Navigate({ to }: { to: string; replace?: boolean }) {
  return <a href={to}>Redirecting…</a>;
}

/** Gate a page: pass the session status and where to send anonymous visitors. */
export function Minimal() {
  return (
    <RequireAuth status={authStatus} redirect="/login">
      <Dashboard />
    </RequireAuth>
  );
}

/** Recommended: hand it your router's <Navigate> for a history-API redirect, not a reload. */
export function WithRouterNavigate() {
  return (
    <RequireAuth
      status={authStatus}
      unauthenticatedFallback={<Navigate to="/login" replace />}
    >
      <Dashboard />
    </RequireAuth>
  );
}

/** Replace the default centered spinner with your own skeleton while the session resolves. */
export function CustomLoading() {
  return (
    <RequireAuth status={authStatus} redirect="/login" loadingFallback={<PageSkeleton />}>
      <Dashboard />
    </RequireAuth>
  );
}

/** Render a sign-in prompt in place instead of navigating away — omit `redirect`, pass UI. */
export function InlineUnauthenticated() {
  return (
    <RequireAuth status={authStatus} unauthenticatedFallback={<SignInPrompt />}>
      <Dashboard />
    </RequireAuth>
  );
}
