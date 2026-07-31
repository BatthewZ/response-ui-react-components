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
import { cn, type SlotClassNames } from "../../util/style";

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

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `AppShell.css` keeps the page grid, the navbar-height token, the section
 * heading and two `@keyframes`, and argues each one at source. Everything else
 * this component draws is here. Every BEM name survives as a declaration-free
 * marker (AGENTS.md §"Class names outlive their declarations"), and each
 * constant is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the enter tokens are read as
 * custom properties in the bracket spelling — `ease-enter` generates nothing.
 * `hover:` compiles to `@media (hover: hover) { &:hover }`, so the toggle's and
 * the link's hover washes no longer paint on a coarse pointer; that matches the
 * rest of the package.
 *
 * `rounded-[0.375rem]`, not `rounded-md`: this package re-points `--radius-md`
 * at `--RADIUS-MD`, so `rounded-md` is a theme value rather than the 6px the
 * stylesheet asked for. The literal is what was written, so the literal is what
 * converts.
 */
const navbarClasses =
  "col-span-full row-start-1 sticky top-0 z-10 flex items-center gap-2 h-[var(--app-shell-navbar-height)] px-4 bg-surface-0 border-b border-border-default";

const brandClasses = "flex items-center gap-2 font-bold text-fg-primary whitespace-nowrap";

const navbarActionsClasses = "flex items-center gap-2 ml-auto";

/**
 * `padding: 0`, `border: none` and `background: transparent` were in the
 * stylesheet and are NOT restated: Tailwind Preflight already gives `<button>`
 * `margin: 0`, `padding: 0`, `border: 0 solid`, `background-color: transparent`
 * and `background-image: none` — checked against
 * `node_modules/tailwindcss/preflight.css`, the same reliance `Button.tsx` ships
 * with no reset at all.
 */
const appShellToggleClasses =
  "inline-flex items-center justify-center size-9 shrink-0 rounded-[0.375rem] text-fg-secondary cursor-pointer transition-[background,color] duration-[var(--MOTION-DURATION-ENTER)] ease-[var(--MOTION-EASE-ENTER)] motion-reduce:transition-none hover:bg-surface-2 hover:text-fg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

const sidebarSectionClasses = "flex flex-col gap-0.5";

/**
 * The divider between adjacent sections. `[&+&]` emits
 * `.<class> + .<class>`, which is the same selector the stylesheet had — both
 * siblings carry the class, so it matches exactly the same pairs. It is NOT
 * `not-first:`, which would also fire on a section preceded by something else.
 */
const sidebarSectionAdjacentClasses =
  "[&+&]:mt-4 [&+&]:pt-4 [&+&]:border-t [&+&]:border-border-default";

/**
 * `text-[length:…]`, not `text-body-1`: the stylesheet set `font-size` and left
 * `line-height` to inherit, and `text-body-1` would drag its
 * `--BodyText-1-line-height` companion in with it and grow every rail row.
 */
const sidebarLinkClasses =
  "flex items-center gap-3 px-3 py-2 rounded-[0.375rem] no-underline text-fg-secondary text-[length:var(--BodyText-1)] font-semibold whitespace-nowrap overflow-hidden transition-[background,color] duration-[var(--MOTION-DURATION-ENTER)] ease-[var(--MOTION-EASE-ENTER)] motion-reduce:transition-none hover:bg-surface-2 hover:text-fg-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

/**
 * Current page. The accent draws the edge, not the letters: --C-ACCENT ink over
 * its own 10% wash measured 2.46:1 / 2.83:1 in two of the example themes against
 * a resting link's 7.40 / 5.95, so marking a link current made it the least
 * legible item in the sidebar. --C-TEXT-PRIMARY reads 10.8–15.4:1 on that same
 * wash in all four themes — the current link is now the most legible one — and
 * the inset accent edge (Calendar's [data-today] marker recipe) carries "you are
 * here" on a channel the 10% wash cannot carry alone.
 *
 * Passed AFTER `sidebarLinkClasses`, so tailwind-merge resolves `color` and
 * `background` the modifier's way: base-vs-modifier converted as a pair rather
 * than half of it.
 */
const sidebarLinkActiveClasses =
  "bg-[color-mix(in_oklch,var(--C-ACCENT)_10%,transparent)] shadow-[inset_0_0_0_1px_var(--C-ACCENT)] text-fg-primary";

/** Collapsed: centre the icon and drop the inline padding to a square. */
const sidebarLinkCollapsedClasses = "justify-center p-2";

const sidebarLinkIconClasses = "shrink-0 size-5";

const sidebarLinkLabelClasses = "overflow-hidden text-ellipsis";

/**
 * The fallback in the `var()` matches Drawer.css / CommandPalette.css: without
 * the token layer the scrim would otherwise be transparent rather than 50%
 * black.
 */
const scrimClasses =
  "fixed inset-0 z-49 bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))] animate-[app-shell-fade-in_var(--MOTION-DURATION-ENTER)_var(--MOTION-EASE-ENTER)] motion-reduce:animate-none";

const sidebarMobileClasses =
  "fixed top-0 left-0 bottom-0 z-50 w-70 max-w-[calc(100vw-3.5rem)] flex flex-col overflow-y-auto p-2 bg-surface-0 border-r border-border-default shadow-lg animate-[app-shell-slide-in_var(--MOTION-DURATION-ENTER)_var(--MOTION-EASE-ENTER)] motion-reduce:animate-none";

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
    return (
      <header
        ref={ref}
        className={cn("app-shell-navbar", navbarClasses, className)}
        role="banner"
        {...props}
      />
    );
  }
);

/* ─── Brand ─── */

const AppShellBrand = forwardRef<HTMLDivElement, ComponentPropsWithRef<"div">>(
  function AppShellBrand({ className, ...props }, ref) {
    return <div ref={ref} className={cn("app-shell-brand", brandClasses, className)} {...props} />;
  }
);

/* ─── NavbarActions ─── */

const AppShellNavbarActions = forwardRef<HTMLDivElement, ComponentPropsWithRef<"div">>(
  function AppShellNavbarActions({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("app-shell-navbar-actions", navbarActionsClasses, className)}
        {...props}
      />
    );
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
        className={cn("app-shell-toggle", appShellToggleClasses, className)}
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

type AppShellSidebarProps = {
  /**
   * Class overrides for the internals this component renders. `className` lands
   * on the `<aside>` in both branches — the inline rail on desktop and the
   * portaled drawer on mobile — so the scrim behind that drawer is the one
   * element it cannot reach. The union is written out here so an unknown key is
   * a type error rather than a silently ignored one.
   *
   * The scrim renders only on mobile, and only while the drawer is open.
   */
  classNames?: SlotClassNames<"scrim">;
} & Omit<ComponentPropsWithRef<"aside">, "role">;

const AppShellSidebar = forwardRef<HTMLElement, AppShellSidebarProps>(
  function AppShellSidebar({ className, classNames, children, ...props }, forwardedRef) {
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
          <div
            className={cn("app-shell-scrim", scrimClasses, classNames?.scrim)}
            aria-hidden="true"
          />
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
              className={cn("app-shell-sidebar-mobile", sidebarMobileClasses, className)}
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
  /**
   * Class overrides for the internals this component renders. `className` is the
   * section box and `children` are the caller's own links, so the heading is the
   * only element with no route. The union is written out here so an unknown key
   * is a type error rather than a silently ignored one.
   *
   * The class is **appended** to the heading's own: collapsed, that includes
   * `sr-only`, which is what keeps the group reachable by heading navigation
   * while the rail shows icons only.
   */
  classNames?: SlotClassNames<"groupHeader">;
} & ComponentPropsWithRef<"div">;

const AppShellSidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  function AppShellSidebarSection(
    { title, titleAs: Heading = "h2", className, classNames, children, ...props },
    ref
  ) {
    const { collapsed, isMobile } = useAppShell();
    const showCollapsed = collapsed && !isMobile;

    return (
      <div
        ref={ref}
        className={cn(
          "app-shell-sidebar-section",
          sidebarSectionClasses,
          sidebarSectionAdjacentClasses,
          className
        )}
        {...props}
      >
        {/* A heading, not a `<div>` (#395): sidebar groups were unreachable by
            heading navigation. Collapsed, the rail is icons only — but
            `display: none` would take the heading back out of the accessibility
            tree, which is the same trap the link label hit (#388), so it is
            `sr-only` here rather than a rule in AppShell.css. */}
        {title && (
          <Heading
            className={cn(
              "app-shell-sidebar-section-title",
              showCollapsed && "sr-only",
              classNames?.groupHeader
            )}
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
  /**
   * Class overrides for the internals this component renders. `className` is the
   * anchor, so these two reach the parts inside it. The union is written out
   * here so an unknown key is a type error rather than a silently ignored one.
   *
   * `icon` is a component reference, not an element, so `itemIcon` is handed to
   * it as its `className` prop and the icon library decides what to do with it —
   * there is nothing here to merge it against beyond this component's own hook.
   * `itemLabel` is **appended**: collapsed, the label's own class list includes
   * `sr-only`, which is what leaves the link with an accessible name.
   */
  classNames?: SlotClassNames<"itemIcon" | "itemLabel">;
} & Omit<ComponentPropsWithRef<"a">, "href" | "children">;

const AppShellSidebarLink = forwardRef<HTMLAnchorElement, SidebarLinkProps>(
  function AppShellSidebarLink(
    { to, icon: Icon, className, classNames, children, href: _href, ...props },
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
        className={cn(
          "app-shell-sidebar-link",
          sidebarLinkClasses,
          isActive && sidebarLinkActiveClasses,
          showCollapsed && sidebarLinkCollapsedClasses,
          className
        )}
        data-active={isActive || undefined}
        aria-current={isActive ? "page" : undefined}
        {...props}
      >
        {Icon && (
          <Icon
            className={cn(
              "app-shell-sidebar-link-icon",
              sidebarLinkIconClasses,
              classNames?.itemIcon
            )}
          />
        )}
        {/* Collapsed, the rail is icons only — but lucide marks its own svg
            aria-hidden, so hiding the label with `display: none` left the link
            with no accessible name at all (#388). `sr-only` keeps it in the
            accessibility tree while taking it off the screen. */}
        <span
          className={cn(
            "app-shell-sidebar-link-label",
            sidebarLinkLabelClasses,
            showCollapsed && "sr-only",
            classNames?.itemLabel
          )}
        >
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
