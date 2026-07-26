import { render, screen } from "@testing-library/react";
import { forwardRef } from "react";
import { describe, expect, it } from "vitest";

import {
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
  useLink,
  usePathname,
} from "./router-adapter";

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any`. The runtime destructure is the half a
 * published package cannot assume away (same helper as AppShell.test.tsx).
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

function LinkProbe({ bag }: { bag: Record<string, unknown> }) {
  const Link = useLink();
  return (
    <Link to="/safe" {...untypedProps(bag)}>
      go
    </Link>
  );
}

function PathnameProbe() {
  return <span>{usePathname()}</span>;
}

describe("router adapter", () => {
  it("defaults to a plain <a> whose href comes from `to`", () => {
    render(<LinkProbe bag={{}} />);
    expect(screen.getByRole("link", { name: "go" })).toHaveAttribute("href", "/safe");
  });

  it("renders the Link supplied by the provider", () => {
    const CustomLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
      function CustomLink({ to, replace: _replace, children, ...rest }, ref) {
        return (
          <a ref={ref} href={to} data-custom="" {...rest}>
            {children}
          </a>
        );
      },
    );

    render(
      <RouterAdapterProvider value={{ Link: CustomLink }}>
        <LinkProbe bag={{}} />
      </RouterAdapterProvider>,
    );

    expect(screen.getByRole("link", { name: "go" })).toHaveAttribute("data-custom");
  });

  it("reads the pathname through the adapter's hook", () => {
    render(
      <RouterAdapterProvider value={{ Link: forwardRef(() => null) as RouterLinkComponent, usePathname: () => "/here" }}>
        <PathnameProbe />
      </RouterAdapterProvider>,
    );
    expect(screen.getByText("/here")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  #458 — a spread `href` must not win over `to`                    */
  /* ---------------------------------------------------------------- */

  it("a spread `href` cannot override the `to`-derived destination", () => {
    render(<LinkProbe bag={{ href: "https://evil.test", rel: "noopener" }} />);

    const link = screen.getByRole("link", { name: "go" });
    expect(link).toHaveAttribute("href", "/safe");
    // The rest of the bag is still forwarded — the fix strips one key, not all.
    expect(link).toHaveAttribute("rel", "noopener");
  });
});
