"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useState,
} from "react";

import { cn } from "../../util/style";

import { useLink } from "../router/router-adapter";

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
    const [expanded, setExpanded] = useState(false);

    const childArray = Children.toArray(children);

    // Head and tail are clamped so they cannot overlap: `itemsBeforeCollapse=2`
    // + `itemsAfterCollapse=2` over three crumbs used to slice the middle one
    // into both halves, rendering it twice under a duplicate React key. If the
    // two halves cover everything, there is nothing behind the ellipsis and the
    // full trail renders instead (#138).
    const headCount = Math.max(0, Math.min(itemsBeforeCollapse, childArray.length));
    const tailStart = Math.max(headCount, childArray.length - Math.max(0, itemsAfterCollapse));
    const shouldCollapse =
      maxItems !== undefined &&
      !expanded &&
      childArray.length > maxItems &&
      tailStart > headCount;

    let displayedItems: ReactNode[];
    if (shouldCollapse) {
      const before = childArray.slice(0, headCount);
      const after = childArray.slice(tailStart);
      displayedItems = [
        ...before,
        <li key="__ellipsis" className="breadcrumbs__item">
          <button
            type="button"
            className="breadcrumbs__ellipsis"
            aria-label="Show more breadcrumbs"
            onClick={() => setExpanded(true)}
          >
            &hellip;
          </button>
        </li>,
        ...after,
      ];
    } else {
      displayedItems = childArray;
    }

    // Interleave separators between items
    const withSeparators: ReactNode[] = [];
    displayedItems.forEach((child, i) => {
      if (i > 0) {
        withSeparators.push(
          <BreadcrumbsSeparator key={`sep-${i}`}>
            {separator}
          </BreadcrumbsSeparator>,
        );
      }
      withSeparators.push(child);
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
