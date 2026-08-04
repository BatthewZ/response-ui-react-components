import {
  createContext,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
} from "../src";
import { BASE, href } from "./registry";

/**
 * A History-API router, so `/components/card` is a real URL that can be linked, shared
 * and reloaded. Static hosting makes that a two-part claim: this half reads and writes
 * `location`, and `site/vite.config.ts` emits the `404.html` that lets a cold hit on a
 * sub-path reach this code at all.
 *
 * It is also what `RouterAdapterProvider` is for, so the site's own chrome exercises the
 * same injection point a consumer's app uses rather than a stub written for a demo.
 */

type NavigateOptions = { replace?: boolean; hash?: string };

type RouterValue = { path: string; navigate: (to: string, options?: NavigateOptions) => void };

const RouterContext = createContext<RouterValue>({ path: "/", navigate: () => {} });

export const useRouter = () => useContext(RouterContext);

/** `location.pathname` minus the deploy base — always leading-slashed. */
function readPath(): string {
  const { pathname } = window.location;
  const path = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, "");
  return `/${path}`.replace(/\/$/, "") || "/";
}

/** An in-page anchor, a modified click, or a new tab is the browser's job, not ours. */
function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

export const SiteLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function SiteLink({ to, replace, href: _href, children, onClick, ...rest }, ref) {
    const { navigate } = useContext(RouterContext);
    return (
      <a
        ref={ref}
        href={href(to)}
        onClick={(event) => {
          onClick?.(event);
          if (!isPlainLeftClick(event)) return;
          event.preventDefault();
          navigate(to, { replace });
        }}
        {...rest}
      >
        {children}
      </a>
    );
  },
);

export function SiteRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(readPath);

  const navigate = useCallback((to: string, { replace = false, hash = "" }: NavigateOptions = {}) => {
    // One entry for a destination, hash included. Writing the path and then assigning
    // `location.hash` separately pushes two, so leaving a page reached through
    // `theme-contract.md#surfaces` took two presses of Back — the first only dropped
    // the fragment and stayed put.
    const url = href(to) + (hash ? `#${hash}` : "");
    const samePlace = readPath() === to && window.location.hash === (hash ? `#${hash}` : "");
    if (!samePlace) {
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    }
    setPath(to);
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(readPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);

  // One object per path, not one per render: the adapter is context, and a fresh
  // identity would re-render every Link in the chrome on any unrelated state change.
  const adapter = useMemo(() => ({ Link: SiteLink, usePathname: () => path }), [path]);

  return (
    <RouterContext.Provider value={value}>
      <RouterAdapterProvider value={adapter}>{children}</RouterAdapterProvider>
    </RouterContext.Provider>
  );
}

/**
 * Turns the plain `<a>` elements `Markdown` renders into in-app navigation.
 *
 * `Markdown` emits `<a href>` and offers no link slot — by design, it is a renderer, not
 * a router — so a doc's cross-references are intercepted here at the container instead.
 * Anything this does not recognise (an external link, an in-page `#anchor`, a modified
 * click) falls through to the browser untouched.
 */
export function useDocLinkInterceptor(): (event: MouseEvent<HTMLElement>) => void {
  const { navigate } = useRouter();

  return useCallback(
    (event) => {
      if (!isPlainLeftClick(event)) return;
      const anchor = (event.target as HTMLElement).closest?.("a");
      if (!anchor) return;

      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (!raw.startsWith(BASE)) return;

      const [pathname, hash] = raw.slice(BASE.length - 1).split("#");
      event.preventDefault();
      navigate(pathname.replace(/\/$/, "") || "/", { hash });
    },
    [navigate],
  );
}
