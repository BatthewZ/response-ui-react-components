import { createContext, forwardRef, type ReactNode, useContext, useMemo, useState } from "react";

import { RouterAdapterProvider, type RouterLinkProps } from "../src";

/**
 * A router in ~30 lines, shared by the demo apps in dev/ (dashboard, blog) so
 * `aria-current`, active link styling, breadcrumb navigation and the mobile
 * drawer's close-on-navigate are real rather than hard-coded. An app passes its
 * own framework's Link + location hook to RouterAdapterProvider instead.
 */

type DemoRouterValue = { pathname: string; navigate: (to: string) => void };

const DemoRouterContext = createContext<DemoRouterValue>({
  pathname: "/",
  navigate: () => {},
});

export function useDemoRouter() {
  return useContext(DemoRouterContext);
}

export function useDemoPathname() {
  return useContext(DemoRouterContext).pathname;
}

const DemoLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(function DemoLink(
  { to, replace: _replace, children, onClick, ...rest },
  ref,
) {
  const { navigate } = useContext(DemoRouterContext);
  return (
    <a
      ref={ref}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

/** Module-level, so the adapter's identity is stable across every demo that mounts one. */
const ADAPTER = { Link: DemoLink, usePathname: useDemoPathname };

export function DemoRouter({
  initialPath,
  children,
}: {
  initialPath: string;
  children: ReactNode;
}) {
  const [pathname, setPathname] = useState(initialPath);
  const value = useMemo(() => ({ pathname, navigate: setPathname }), [pathname]);

  return (
    <DemoRouterContext.Provider value={value}>
      <RouterAdapterProvider value={ADAPTER}>{children}</RouterAdapterProvider>
    </DemoRouterContext.Provider>
  );
}
