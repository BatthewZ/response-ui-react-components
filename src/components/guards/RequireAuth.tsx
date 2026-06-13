"use client";
import type { ReactNode } from "react";

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
 *   - "loading"          → renders `loadingFallback` (defaults to a centered Spinner)
 *   - "authenticated"    → renders `children`
 *   - "unauthenticated"  → renders `unauthenticatedFallback`. If absent and
 *                          `redirect` is set, navigates there using the
 *                          configured RouterAdapter Link's underlying anchor.
 *                          Most callers will pass their router's `<Navigate>`
 *                          element via `unauthenticatedFallback` instead.
 *
 * The default unauthenticated path uses a hard navigation via `<a>` because
 * the headless adapter is intentionally render-only. If you need history-API
 * navigation (recommended), pass your router's redirect element directly.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type RequireAuthProps = {
  status: AuthStatus;
  redirect?: string;
  loadingFallback?: ReactNode;
  unauthenticatedFallback?: ReactNode;
  children: ReactNode;
};

function DefaultUnauthenticatedRedirect({ to }: { to: string }) {
  const Link = useLink();
  // Render a non-visible link that auto-clicks. Most callers will replace this
  // with their router's <Navigate> via the unauthenticatedFallback prop.
  return (
    <Link to={to} replace style={{ display: "none" }} ref={(el) => el?.click()}>
      Redirecting…
    </Link>
  );
}

export function RequireAuth({
  status,
  redirect,
  loadingFallback,
  unauthenticatedFallback,
  children,
}: RequireAuthProps) {
  if (status === "loading") {
    return (
      <>
        {loadingFallback ?? (
          <Center className="min-h-screen">
            <Spinner size="lg" />
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
