"use client";
/**
 * RouterAdapter — decouples link rendering from any specific router.
 *
 * Components that need to render navigational links (AppShell.SidebarLink,
 * Breadcrumbs.Item) call `useLink()` to get the active Link component.
 * The default is a plain `<a>`. Apps using react-router-dom (or any other
 * router) wrap the tree once with `<RouterAdapterProvider value={{ Link, usePathname }}>`.
 */

import {
  type AnchorHTMLAttributes,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
  useContext,
} from "react";

export type RouterLinkProps = {
  /** Destination path. */
  to: string;
  /** Replace history entry instead of pushing. */
  replace?: boolean;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export type RouterLinkComponent = ForwardRefExoticComponent<
  RouterLinkProps & RefAttributes<HTMLAnchorElement>
>;

/** Default fallback Link — plain `<a href="...">`. */
const DefaultLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function DefaultLink({ to, replace: _replace, children, ...rest }, ref) {
    return (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    );
  },
) as RouterLinkComponent;

export type RouterAdapterValue = {
  /** Component rendered for navigational links. */
  Link: RouterLinkComponent;
  /** Optional accessor for the current pathname (used for active-link detection). */
  usePathname?: () => string;
};

const DEFAULT_ADAPTER: RouterAdapterValue = {
  Link: DefaultLink,
  usePathname: () => (typeof window !== "undefined" ? window.location.pathname : "/"),
};

const RouterAdapterContext = createContext<RouterAdapterValue>(DEFAULT_ADAPTER);

export function RouterAdapterProvider({
  value,
  children,
}: {
  value: RouterAdapterValue;
  children: ReactNode;
}) {
  return <RouterAdapterContext.Provider value={value}>{children}</RouterAdapterContext.Provider>;
}

/** Returns the configured Link component (defaults to a plain `<a>`). */
export function useLink(): RouterLinkComponent {
  return useContext(RouterAdapterContext).Link;
}

/** Returns the current pathname using the adapter's hook (defaults to window.location). */
export function usePathname(): string {
  const { usePathname: hook } = useContext(RouterAdapterContext);
  // eslint-disable-next-line react-hooks/rules-of-hooks -- adapter is stable per-render
  return (hook ?? DEFAULT_ADAPTER.usePathname!)();
}
