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

import { cn, type SlotClassNames } from "../../util/style";

import { useLink, usePathname } from "../router/router-adapter";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Breadcrumbs.css` is gone; every rule it held is here. Each constant is one
 * flat string literal because the docs and focus guards resolve hoisted
 * constants textually and a composed one would not resolve.
 *
 * `list-style: none`, `margin: 0` and `padding: 0` are not restated: Preflight
 * gives every `ol` all three (checked in the compiled base layer), so the
 * stylesheet was re-stating it. `role="list"` on the element is what restores
 * what `list-style: none` drops in Safari + VoiceOver, and that is markup, not
 * CSS.
 */
const breadcrumbsListClasses = "flex flex-wrap items-center gap-r6 text-body-2";

const breadcrumbsItemClasses = "inline-flex items-center";

/**
 * `transition-colors` rather than `transition-[color]`: it is the package idiom
 * and the extra properties it covers are ones nothing here changes. Note that
 * `hover:` compiles to `@media (hover: hover) { &:hover }`, so a coarse pointer
 * no longer gets the hover ink on tap — that matches the rest of the package.
 */
const breadcrumbsLinkClasses =
  "rounded-sm text-fg-secondary no-underline transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

const breadcrumbsCurrentClasses = "font-semibold text-fg-primary";

const breadcrumbsTextClasses = "text-fg-secondary";

const breadcrumbsDividerClasses = "inline-flex items-center select-none text-fg-muted";

/**
 * The ellipsis used to start from `all: unset` and rebuild itself in fourteen
 * declarations after it. A reset cannot be transposed into a class list —
 * Tailwind emits arbitrary-property utilities LAST in `@layer utilities`, so
 * `[all:unset]` would land after `inline-flex`, `cursor-pointer` and the rest,
 * wipe them, and start beating `classNames.ellipsis` as well. The escape is
 * enumeration rather than transposition, and it was measured against the
 * compiled Preflight: a `<button>` already gets `box-sizing: border-box`,
 * `margin: 0`, `padding: 0`, `border: 0 solid`, `background-color: transparent`,
 * `font: inherit`, `letter-spacing: inherit`, `color: inherit`,
 * `border-radius: 0` and `appearance: button`, which is every property the old
 * rule restated afterwards. The one thing `all: unset` did that Preflight does
 * not is drop the UA's centred `text-align`, and `inline-flex` +
 * `justify-center` already made that irrelevant.
 *
 * `min-w-[1.5em]` and `tracking-[0.1em]` stay `em`-relative literals rather than
 * contract variables, so they track `--BodyText-2` instead of being themeable in
 * their own right.
 */
const breadcrumbsEllipsisClasses =
  "inline-flex min-w-[1.5em] cursor-pointer items-center justify-center rounded-sm px-r6 text-body-2 leading-none tracking-[0.1em] text-fg-muted transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:bg-surface-2 hover:text-fg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

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
  /**
   * Class overrides for the two elements the root renders itself. `className` is
   * the `<nav>`; the crumbs and the rules between them are `Breadcrumbs.Item`
   * and `Breadcrumbs.Divider`, which carry their own `className`.
   *
   * `ellipsis` is the expand control, which only exists while `maxItems` is
   * collapsing the trail — a class on it is silent, not wrong, when it is not.
   */
  classNames?: SlotClassNames<"list" | "ellipsis">;
} & Omit<ComponentPropsWithRef<"nav">, "children"> & { children: ReactNode };

const BreadcrumbsRoot = forwardRef<HTMLElement, BreadcrumbsProps>(
  function Breadcrumbs(
    {
      separator = "/",
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 1,
      className,
      classNames,
      children,
      ...props
    },
    ref,
  ) {
    const pathname = usePathname();
    const childArray = Children.toArray(children);

    // #146: a caller-rendered `Breadcrumbs.Divider` is a per-gap override of
    // the root's own, not another crumb. Pairing it with the crumb it precedes
    // is what makes the exported sub-part usable: the root no longer wraps it
    // in two more separators (`/ › /`), and the collapse arithmetic below
    // counts crumbs — which is what `maxItems` means — rather than list items.
    // A separator with no crumb after it has no gap to sit in and is dropped.
    const crumbs: { node: ReactNode; separator?: ReactNode }[] = [];
    let pendingSeparator: ReactNode | undefined;
    for (const child of childArray) {
      if (isValidElement(child) && child.type === BreadcrumbsDivider) {
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
            <li
              key="__ellipsis"
              // slot:(a) the list-item shell the expand control sits in. It
              // carries the same layout hook every crumb does, and the crumb's
              // is reached by `Breadcrumbs.Item`'s own `className` — a second
              // key spelled `item` here would be that subcomponent's word for
              // an element it does not render.
              className={cn("breadcrumbs__item", breadcrumbsItemClasses)}
            >
              <button
                type="button"
                className={cn("breadcrumbs__ellipsis", breadcrumbsEllipsisClasses, classNames?.ellipsis)}
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
            <BreadcrumbsDivider key={`sep-${i}`}>
              {separator}
            </BreadcrumbsDivider>
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
          <ol role="list" className={cn("breadcrumbs__list", breadcrumbsListClasses, classNames?.list)}>
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
  /**
   * Class overrides for the crumb's inner element. `className` is the `<li>`,
   * and which of the three renders inside it is decided here from `current` and
   * `href`, so each gets its own key rather than one that would silently move.
   */
  classNames?: SlotClassNames<"current" | "link" | "text">;
} & ComponentPropsWithRef<"li">;

const BreadcrumbsItem = forwardRef<HTMLLIElement, BreadcrumbsItemProps>(
  function BreadcrumbsItem({ href, current, className, classNames, children, ...props }, ref) {
    useBreadcrumbsContext();
    const Link = useLink();

    return (
      <li ref={ref} className={cn("breadcrumbs__item", breadcrumbsItemClasses, className)} {...props}>
        {current ? (
          <span className={cn("breadcrumbs__current", breadcrumbsCurrentClasses, classNames?.current)} aria-current="page">
            {children}
          </span>
        ) : href ? (
          <Link to={href} className={cn("breadcrumbs__link", breadcrumbsLinkClasses, classNames?.link)}>
            {children}
          </Link>
        ) : (
          <span className={cn("breadcrumbs__text", breadcrumbsTextClasses, classNames?.text)}>{children}</span>
        )}
      </li>
    );
  },
);

// Divider
type BreadcrumbsDividerProps = ComponentPropsWithRef<"li">;

const BreadcrumbsDivider = forwardRef<HTMLLIElement, BreadcrumbsDividerProps>(
  function BreadcrumbsDivider({ className, children, ...props }, ref) {
    useBreadcrumbsContext();

    return (
      <li
        ref={ref}
        role="presentation"
        className={cn("breadcrumbs__separator", breadcrumbsDividerClasses, className)}
        {...props}
      >
        <span aria-hidden="true">{children}</span>
      </li>
    );
  },
);

export const Breadcrumbs = Object.assign(BreadcrumbsRoot, {
  Item: BreadcrumbsItem,
  Divider: BreadcrumbsDivider,
});
