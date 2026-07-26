"use client";
import { type LucideIcon,Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useClickOutside } from "../../hooks/use-click-outside";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

import { useLink, usePathname } from "../router/router-adapter";
import { Portal } from "./Portal";
import { Tooltip } from "./Tooltip";

/* ─── Context ─── */

interface AppShellContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  sidebarId: string;
  /** Whether an element carrying `sidebarId` is currently in the document. */
  sidebarPresent: boolean;
  setSidebarPresent: (present: boolean) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

/**
 * The mobile branch, named so the JS side states it once (#397). `AppShell.css`
 * still restates the same condition for the pre-hydration layout, and nothing
 * enforces the match: a media query cannot read a custom property, this package
 * has no CSS build step, and vitest runs with `css: false` — which stubs every
 * CSS request, `?raw` included — so no test here can read the stylesheet. Change
 * one and you must change the other by hand.
 */
const MOBILE_VIEWPORT_QUERY = "(max-width: 639px)";

function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("AppShell compound components must be used within <AppShell>");
  return ctx;
}

/* ─── Root ─── */

type AppShellRootProps = {
  defaultOpen?: boolean;
  /**
   * Controlled mobile-drawer state. Controlled-ness is decided on the FIRST
   * render and never changes, so `open={o ?? undefined}` keeps the shell
   * controlled — a later `undefined` reads as closed rather than switching mode.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultCollapsed?: boolean;
  /** Controlled desktop-rail state; locks on the first render like `open`. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const AppShellRoot = forwardRef<HTMLDivElement, AppShellRootProps>(function AppShellRoot(
  {
    defaultOpen = false,
    open: openProp,
    onOpenChange,
    defaultCollapsed = false,
    collapsed: collapsedProp,
    onCollapsedChange,
    className,
    children,
    ...props
  },
  ref
) {
  // Only `useControllableState` reads the raw props; these refs are the mode
  // lock's one job here — keep feeding the hooks a defined value once
  // controlled, so a later `undefined` reads as closed/expanded rather than
  // handing the shell back internal state the caller cannot see.
  const isOpenControlledRef = useRef(openProp !== undefined);
  const [open, setOpen] = useControllableState<boolean>({
    value: isOpenControlledRef.current ? (openProp ?? false) : undefined,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const isCollapsedControlledRef = useRef(collapsedProp !== undefined);
  const [collapsed, setCollapsed] = useControllableState<boolean>({
    value: isCollapsedControlledRef.current ? (collapsedProp ?? false) : undefined,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarPresent, setSidebarPresent] = useState(false);
  const sidebarId = `app-shell-sidebar-${useId()}`;

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close the mobile drawer on navigation. In an effect, not in render: `setOpen`
  // reaches the caller's `onOpenChange`, and calling that during render logs
  // "Cannot update a component while rendering a different component".
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;
    if (isMobile && open) setOpen(false);
  }, [pathname, isMobile, open, setOpen]);

  const ctx = useMemo(
    () => ({
      open,
      setOpen,
      collapsed,
      setCollapsed,
      isMobile,
      sidebarId,
      sidebarPresent,
      setSidebarPresent,
    }),
    [open, setOpen, collapsed, setCollapsed, isMobile, sidebarId, sidebarPresent]
  );

  return (
    <AppShellContext.Provider value={ctx}>
      <div ref={ref} className={cn("app-shell", className)} {...props}>
        {children}
      </div>
    </AppShellContext.Provider>
  );
});

/* ─── Navbar ─── */

const AppShellNavbar = forwardRef<HTMLElement, ComponentPropsWithRef<"header">>(
  function AppShellNavbar({ className, ...props }, ref) {
    return <header ref={ref} className={cn("app-shell-navbar", className)} role="banner" {...props} />;
  }
);

/* ─── Brand ─── */

const AppShellBrand = forwardRef<HTMLDivElement, ComponentPropsWithRef<"div">>(
  function AppShellBrand({ className, ...props }, ref) {
    return <div ref={ref} className={cn("app-shell-brand", className)} {...props} />;
  }
);

/* ─── NavbarActions ─── */

const AppShellNavbarActions = forwardRef<HTMLDivElement, ComponentPropsWithRef<"div">>(
  function AppShellNavbarActions({ className, ...props }, ref) {
    return <div ref={ref} className={cn("app-shell-navbar-actions", className)} {...props} />;
  }
);

/* ─── Toggle ─── */

const AppShellToggle = forwardRef<HTMLButtonElement, Omit<ComponentPropsWithRef<"button">, "type">>(
  function AppShellToggle({ className, children, onClick, ...props }, ref) {
    const { open, setOpen, collapsed, setCollapsed, isMobile, sidebarId, sidebarPresent } =
      useAppShell();

    function handleClick() {
      if (isMobile) {
        setOpen(!open);
      } else {
        setCollapsed(!collapsed);
      }
    }

    const Icon = isMobile ? Menu : collapsed ? PanelLeft : PanelLeftClose;

    return (
      <button
        ref={ref}
        type="button"
        className={cn("app-shell-toggle", className)}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) handleClick();
        }}
        aria-expanded={isMobile ? open : !collapsed}
        // Only while something actually carries that id: the mobile drawer
        // returns `null` when closed, and a shell may render no Sidebar at all.
        aria-controls={sidebarPresent ? sidebarId : undefined}
        aria-label={
          isMobile
            ? open
              ? "Close navigation"
              : "Open navigation"
            : collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
        }
        {...props}
      >
        {children ?? <Icon size={20} />}
      </button>
    );
  }
);

/* ─── Sidebar ─── */

type AppShellSidebarProps = Omit<ComponentPropsWithRef<"aside">, "role">;

const AppShellSidebar = forwardRef<HTMLElement, AppShellSidebarProps>(
  function AppShellSidebar({ className, children, ...props }, forwardedRef) {
    const { open, setOpen, collapsed, isMobile, sidebarId, setSidebarPresent } = useAppShell();
    const sidebarRef = useRef<HTMLElement>(null);
    const merged = useMemo(() => mergeRefs(forwardedRef, sidebarRef), [forwardedRef, sidebarRef]);

    // A press on a control that owns this sidebar is that control's to answer.
    // `useClickOutside` fires on `mousedown`; the Toggle acts on the `click` a
    // task later, so closing here would be undone by its own reopen and the
    // drawer could never be dismissed from the control that opened it (#387).
    // Keyed off `aria-controls` rather than a ref because the Toggle renders in
    // a sibling subtree — portaled away from the sidebar on mobile — and a shell
    // may carry more than one.
    useClickOutside(
      sidebarRef,
      (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest(`[aria-controls="${sidebarId}"]`)) return;
        setOpen(false);
      },
      isMobile && open
    );
    useFocusTrap(sidebarRef, isMobile && open);

    // Tell the Toggle whether its `aria-controls` target exists: on mobile the
    // sidebar renders nothing while closed.
    const rendered = !isMobile || open;
    useEffect(() => {
      setSidebarPresent(rendered);
      return () => setSidebarPresent(false);
    }, [rendered, setSidebarPresent]);

    useEffect(() => {
      if (!isMobile || !open) return;
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [isMobile, open, setOpen]);

    // Mobile: render in portal
    if (isMobile) {
      if (!open) return null;
      return (
        <Portal>
          <div className="app-shell-scrim" aria-hidden="true" />
          {/* `aria-modal` is undefined on `navigation`, so AT ignored it and
              browsed behind the scrim while the DOM focus trap said otherwise.
              It belongs on a `dialog`, which the drawer now is — the navigation
              landmark stays inside it, where the sidebar's id and props live. */}
          <div role="dialog" aria-modal="true" aria-label="Main navigation">
            <aside
              ref={merged}
              id={sidebarId}
              role="navigation"
              aria-label="Main navigation"
              className={cn("app-shell-sidebar-mobile", className)}
              {...props}
            >
              {children}
            </aside>
          </div>
        </Portal>
      );
    }

    // Desktop: inline sidebar
    return (
      <aside
        ref={merged}
        id={sidebarId}
        role="navigation"
        aria-label="Main navigation"
        data-collapsed={collapsed || undefined}
        className={cn("app-shell-sidebar", className)}
        {...props}
      >
        {children}
      </aside>
    );
  }
);

/* ─── SidebarSection ─── */

type SidebarHeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6";

type SidebarSectionProps = {
  title?: string;
  /**
   * Heading element for `title`. `Swimlane`'s `titleAs` is the same prop with the
   * same default; a shell whose page already uses `h2` for its own sections wants
   * `"h3"` here.
   */
  titleAs?: SidebarHeadingLevel;
} & ComponentPropsWithRef<"div">;

const AppShellSidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  function AppShellSidebarSection(
    { title, titleAs: Heading = "h2", className, children, ...props },
    ref
  ) {
    const { collapsed, isMobile } = useAppShell();
    const showCollapsed = collapsed && !isMobile;

    return (
      <div ref={ref} className={cn("app-shell-sidebar-section", className)} {...props}>
        {/* A heading, not a `<div>` (#395): sidebar groups were unreachable by
            heading navigation. Collapsed, the rail is icons only — but
            `display: none` would take the heading back out of the accessibility
            tree, which is the same trap the link label hit (#388), so it is
            `sr-only` here rather than a rule in AppShell.css. */}
        {title && (
          <Heading
            className={cn("app-shell-sidebar-section-title", showCollapsed && "sr-only")}
          >
            {title}
          </Heading>
        )}
        {children}
      </div>
    );
  }
);

/* ─── SidebarLink ─── */

type SidebarLinkProps = {
  to: string;
  icon?: LucideIcon;
  children: ReactNode;
  /**
   * Not a SidebarLink prop — the destination is `to`, which the router adapter
   * turns into the `href`.
   *
   * Declared `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check: `{...props}` lands after `to` on the adapter's Link,
   * which renders `<a href={to} {...rest}>`, so a spread `href` silently won the
   * destination and the link navigated somewhere else. Now that spread is a
   * compile error, and the destructure below keeps the key off the element
   * regardless.
   */
  href?: never;
} & Omit<ComponentPropsWithRef<"a">, "href" | "children">;

const AppShellSidebarLink = forwardRef<HTMLAnchorElement, SidebarLinkProps>(
  function AppShellSidebarLink(
    { to, icon: Icon, className, children, href: _href, ...props },
    ref
  ) {
    const { collapsed, isMobile } = useAppShell();
    const Link = useLink();
    const pathname = usePathname();

    const isActive = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");
    const showCollapsed = collapsed && !isMobile;

    const link = (
      <Link
        ref={ref}
        to={to}
        className={cn("app-shell-sidebar-link", className)}
        data-active={isActive || undefined}
        aria-current={isActive ? "page" : undefined}
        {...props}
      >
        {Icon && <Icon className="app-shell-sidebar-link-icon" />}
        {/* Collapsed, the rail is icons only — but lucide marks its own svg
            aria-hidden, so hiding the label with `display: none` left the link
            with no accessible name at all (#388). `sr-only` keeps it in the
            accessibility tree while taking it off the screen. */}
        <span className={cn("app-shell-sidebar-link-label", showCollapsed && "sr-only")}>
          {children}
        </span>
      </Link>
    );

    if (showCollapsed) {
      return <Tooltip content={children}>{link}</Tooltip>;
    }

    return link;
  }
);

/* ─── Main ─── */

// A <main>, not a <div>: this is the page's primary content region, and without
// the landmark "skip to main content" has nothing to target and a screen-reader
// user cannot jump past the navbar and sidebar. `.app-shell-main` is styled by
// class, so no rule here depends on the tag.
const AppShellMain = forwardRef<HTMLElement, ComponentPropsWithRef<"main">>(
  function AppShellMain({ className, ...props }, ref) {
    return <main ref={ref} className={cn("app-shell-main", className)} {...props} />;
  }
);

/* ─── Export ─── */

export const AppShell = Object.assign(AppShellRoot, {
  Navbar: AppShellNavbar,
  Brand: AppShellBrand,
  NavbarActions: AppShellNavbarActions,
  Toggle: AppShellToggle,
  Sidebar: AppShellSidebar,
  SidebarSection: AppShellSidebarSection,
  SidebarLink: AppShellSidebarLink,
  Main: AppShellMain,
});
