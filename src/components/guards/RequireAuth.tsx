"use client";
import { type ReactNode, useEffect, useRef } from "react";

import { Center } from "../layout";
import { useLink } from "../router/router-adapter";
import { Spinner } from "../ui";

/**
 * RequireAuth — headless gate. Renders one of three branches based on the
 * `status` prop. Knows nothing about your auth library or router.
 *
 *   <RequireAuth status={status} redirect="/login">
 *     <Dashboard />
 *   </RequireAuth>
 *
 * Statuses:
 *   - "loading"          → renders `loadingFallback` (defaults to a centered
 *                          Spinner announcing `loadingLabel`)
 *   - "authenticated"    → renders `children`
 *   - "unauthenticated"  → renders `unauthenticatedFallback`. If absent and
 *                          `redirect` is set, navigates there using the
 *                          configured RouterAdapter Link's underlying anchor.
 *                          Most callers will pass their router's `<Navigate>`
 *                          element via `unauthenticatedFallback` instead.
 *
 * What the default `redirect` path does depends on the adapter, because it
 * clicks whatever `useLink()` returns: with no RouterAdapterProvider that is a
 * plain `<a href>` and the click is a hard navigation; with an adapter
 * installed the click goes through that router's Link, client-side. For a
 * history-API redirect regardless of adapter, pass your router's redirect
 * element through `unauthenticatedFallback`.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type RequireAuthProps = {
  status: AuthStatus;
  redirect?: string;
  loadingFallback?: ReactNode;
  /**
   * Announced while `status` is `"loading"`. `Spinner` is decoration by default,
   * so without this the blocking wait is silent to assistive tech; it is a prop
   * rather than a literal so the wait can be described in the caller's language.
   * `""` drops the announcement, for a page that already says it is loading.
   */
  loadingLabel?: string;
  unauthenticatedFallback?: ReactNode;
  children: ReactNode;
};

function DefaultUnauthenticatedRedirect({ to }: { to: string }) {
  const Link = useLink();
  const linkRef = useRef<HTMLAnchorElement>(null);

  // One click per destination. An inline `ref={(el) => el?.click()}` is a new
  // function on every render, so React detached and re-attached it each time and
  // re-fired the navigation for as long as the status stayed unauthenticated —
  // survivable for a hard reload, a navigation loop for an adapter Link.
  useEffect(() => {
    linkRef.current?.click();
  }, [to]);

  // Render a non-visible link that auto-clicks. Most callers will replace this
  // with their router's <Navigate> via the unauthenticatedFallback prop.
  return (
    <Link to={to} replace style={{ display: "none" }} ref={linkRef}>
      Redirecting…
    </Link>
  );
}

export function RequireAuth({
  status,
  redirect,
  loadingFallback,
  loadingLabel = "Loading",
  unauthenticatedFallback,
  children,
}: RequireAuthProps) {
  if (status === "loading") {
    return (
      <>
        {loadingFallback ?? (
          <Center className="min-h-screen">
            <Spinner size="lg">{loadingLabel || undefined}</Spinner>
          </Center>
        )}
      </>
    );
  }

  if (status === "unauthenticated") {
    if (unauthenticatedFallback) return <>{unauthenticatedFallback}</>;
    if (redirect) return <DefaultUnauthenticatedRedirect to={redirect} />;
    return null;
  }

  return <>{children}</>;
}
