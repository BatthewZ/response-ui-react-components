import { render, screen } from "@testing-library/react";
import { forwardRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
} from "../router/router-adapter";
import { RequireAuth } from "./RequireAuth";

/**
 * A Link that records clicks and renders no `href`, so jsdom is never asked to
 * navigate. `to` is dropped on purpose — the assertion is how often the gate
 * clicks, not where it points.
 */
function trackingAdapter(onClick: () => void) {
  const Link = forwardRef<HTMLAnchorElement, RouterLinkProps>(function TrackingLink(
    { to: _to, replace: _replace, href: _href, children, ...rest },
    ref,
  ) {
    return (
      <a ref={ref} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }) as RouterLinkComponent;
  return { Link };
}

describe("RequireAuth", () => {
  // Spinner became decoration-by-default when N spinners stopped being N live
  // regions. That left this gate's blocking wait silent: the only thing on
  // screen was an aria-hidden spinner.
  it("announces the wait while the auth check is in flight", () => {
    render(
      <RequireAuth status="loading">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("says it in the caller's language", () => {
    render(
      <RequireAuth status="loading" loadingLabel="Vérification…">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Vérification…");
  });

  // `""` has to drop the announcement, as it does on Badge/Alert/Toast — passing
  // it through to Spinner would leave an empty live region instead.
  it("drops the announcement when loadingLabel is empty", () => {
    render(
      <RequireAuth status="loading" loadingLabel="">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("leaves a caller-supplied loadingFallback entirely alone", () => {
    render(
      <RequireAuth status="loading" loadingFallback={<p>mine</p>}>
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByText("mine")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clicks the default redirect link exactly once across re-renders", () => {
    const onClick = vi.fn();
    const adapter = trackingAdapter(onClick);

    const { rerender } = render(
      <RouterAdapterProvider value={adapter}>
        <RequireAuth status="unauthenticated" redirect="/login">
          <p>secret</p>
        </RequireAuth>
      </RouterAdapterProvider>,
    );
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <RouterAdapterProvider value={adapter}>
        <RequireAuth status="unauthenticated" redirect="/login">
          <p>secret</p>
        </RequireAuth>
      </RouterAdapterProvider>,
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("re-fires when the redirect destination changes", () => {
    const onClick = vi.fn();
    const adapter = trackingAdapter(onClick);

    const { rerender } = render(
      <RouterAdapterProvider value={adapter}>
        <RequireAuth status="unauthenticated" redirect="/login">
          <p>secret</p>
        </RequireAuth>
      </RouterAdapterProvider>,
    );
    rerender(
      <RouterAdapterProvider value={adapter}>
        <RequireAuth status="unauthenticated" redirect="/signin">
          <p>secret</p>
        </RequireAuth>
      </RouterAdapterProvider>,
    );

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("renders children once authenticated", () => {
    render(
      <RequireAuth status="authenticated">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
