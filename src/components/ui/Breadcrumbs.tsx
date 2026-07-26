"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  type ReactNode,
  useContext,
  useState,
} from "react";

import { cn } from "../../util/style";

import { useLink, usePathname } from "../router/router-adapter";

// Context
type BreadcrumbsContextValue = { separator: ReactNode };
const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null);
function useBreadcrumbsContext() {
  const ctx = useContext(BreadcrumbsContext);
  if (!ctx)
    throw new Error(
      "Breadcrumbs compound components must be used within <Breadcrumbs>",
    );
  return ctx;
}

// Root
type BreadcrumbsProps = {
  separator?: ReactNode;
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
} & Omit<ComponentPropsWithRef<"nav">, "children"> & { children: ReactNode };

const BreadcrumbsRoot = forwardRef<HTMLElement, BreadcrumbsProps>(
  function Breadcrumbs(
    {
      separator = "/",
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 1,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const pathname = usePathname();
    const childArray = Children.toArray(children);

    // #146: a caller-rendered `Breadcrumbs.Separator` is a per-gap override of
    // the root's own, not another crumb. Pairing it with the crumb it precedes
    // is what makes the exported sub-part usable: the root no longer wraps it
    // in two more separators (`/ › /`), and the collapse arithmetic below
    // counts crumbs — which is what `maxItems` means — rather than list items.
    // A separator with no crumb after it has no gap to sit in and is dropped.
    const crumbs: { node: ReactNode; separator?: ReactNode }[] = [];
    let pendingSeparator: ReactNode | undefined;
    for (const child of childArray) {
      if (isValidElement(child) && child.type === BreadcrumbsSeparator) {
        pendingSeparator = child;
        continue;
      }
      crumbs.push({ node: child, separator: pendingSeparator });
      pendingSeparator = undefined;
    }

    // #139: remember WHICH trail was expanded, not that one was. A boolean is
    // set once and nothing ever unsets it, so a single <Breadcrumbs> kept
    // mounted across navigations stayed expanded for the life of the page.
    // Keyed to the quantity that changes: the current pathname plus the crumbs'
    // own React keys (`Children.toArray` gives every element one, derived from
    // the caller's where there is one). A new route, or a re-keyed trail on the
    // same route, is a different trail and starts collapsed — with no effect,
    // no remount and no `key={pathname}` on the caller's side.
    const trailId = JSON.stringify([
      pathname,
      ...crumbs.map(({ node }) => (isValidElement(node) ? node.key : null)),
    ]);
    const [expandedTrail, setExpandedTrail] = useState<string | null>(null);
    const expanded = expandedTrail === trailId;

    // Head and tail are clamped so they cannot overlap: `itemsBeforeCollapse=2`
    // + `itemsAfterCollapse=2` over three crumbs used to slice the middle one
    // into both halves, rendering it twice under a duplicate React key. If the
    // two halves cover everything, there is nothing behind the ellipsis and the
    // full trail renders instead (#138).
    const headCount = Math.max(0, Math.min(itemsBeforeCollapse, crumbs.length));
    const tailStart = Math.max(headCount, crumbs.length - Math.max(0, itemsAfterCollapse));
    const shouldCollapse =
      maxItems !== undefined &&
      !expanded &&
      crumbs.length > maxItems &&
      tailStart > headCount;

    let displayedItems: { node: ReactNode; separator?: ReactNode }[];
    if (shouldCollapse) {
      displayedItems = [
        ...crumbs.slice(0, headCount),
        {
          node: (
            <li key="__ellipsis" className="breadcrumbs__item">
              <button
                type="button"
                className="breadcrumbs__ellipsis"
                aria-label="Show more breadcrumbs"
                onClick={() => setExpandedTrail(trailId)}
              >
                &hellip;
              </button>
            </li>
          ),
        },
        // The first crumb after the ellipsis takes the root's separator: the
        // caller wrote theirs against a gap that is now hidden.
        ...crumbs.slice(tailStart).map((c, i) => (i === 0 ? { node: c.node } : c)),
      ];
    } else {
      displayedItems = crumbs;
    }

    // Interleave separators between items
    const withSeparators: ReactNode[] = [];
    displayedItems.forEach(({ node, separator: own }, i) => {
      if (i > 0) {
        withSeparators.push(
          own ?? (
            <BreadcrumbsSeparator key={`sep-${i}`}>
              {separator}
            </BreadcrumbsSeparator>
          ),
        );
      }
      withSeparators.push(node);
    });

    return (
      <BreadcrumbsContext.Provider value={{ separator }}>
        <nav
          ref={ref}
          aria-label="Breadcrumb"
          className={cn("breadcrumbs", className)}
          {...props}
        >
          {/* `role="list"` restores what `list-style: none` drops in Safari +
              VoiceOver. Set here because rest props land on the <nav>, so a
              caller has no way to put it back (#145). */}
          <ol role="list" className="breadcrumbs__list">
            {withSeparators}
          </ol>
        </nav>
      </BreadcrumbsContext.Provider>
    );
  },
);

// Item
type BreadcrumbsItemProps = {
  href?: string;
  current?: boolean;
} & ComponentPropsWithRef<"li">;

const BreadcrumbsItem = forwardRef<HTMLLIElement, BreadcrumbsItemProps>(
  function BreadcrumbsItem({ href, current, className, children, ...props }, ref) {
    useBreadcrumbsContext();
    const Link = useLink();

    return (
      <li ref={ref} className={cn("breadcrumbs__item", className)} {...props}>
        {current ? (
          <span className="breadcrumbs__current" aria-current="page">
            {children}
          </span>
        ) : href ? (
          <Link to={href} className="breadcrumbs__link">
            {children}
          </Link>
        ) : (
          <span className="breadcrumbs__text">{children}</span>
        )}
      </li>
    );
  },
);

// Separator
type BreadcrumbsSeparatorProps = ComponentPropsWithRef<"li">;

const BreadcrumbsSeparator = forwardRef<HTMLLIElement, BreadcrumbsSeparatorProps>(
  function BreadcrumbsSeparator({ className, children, ...props }, ref) {
    useBreadcrumbsContext();

    return (
      <li
        ref={ref}
        role="presentation"
        className={cn("breadcrumbs__separator", className)}
        {...props}
      >
        <span aria-hidden="true">{children}</span>
      </li>
    );
  },
);

export const Breadcrumbs = Object.assign(BreadcrumbsRoot, {
  Item: BreadcrumbsItem,
  Separator: BreadcrumbsSeparator,
});
