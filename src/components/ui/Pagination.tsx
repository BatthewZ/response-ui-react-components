"use client";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { useMediaQuery } from "../../hooks/use-media-query";
import { cn, type SlotClassNames } from "../../util/style";

import { IconButton } from "./IconButton";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Page items to render. When windowed, always returns `siblingCount * 2 + 5`
 * items regardless of page — fixed-width slots + constant count = no layout
 * shift. Ellipsis only when a gap hides 2+ pages; a single hidden page shows
 * as its number.
 */
function getPageRange(
  page: number,
  totalPages: number,
  siblingCount: number
): (number | "ellipsis")[] {
  const totalSlots = siblingCount * 2 + 5;

  // Few enough to show all.
  if (totalPages <= totalSlots) {
    return range(1, totalPages);
  }

  // Contiguous block at the un-collapsed end; keeps head/tail count == totalSlots.
  const blockSize = siblingCount * 2 + 3;

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, totalPages);

  // Ellipsis only when the gap hides 2+ pages.
  const showLeftEllipsis = leftSibling > 3;
  const showRightEllipsis = rightSibling < totalPages - 2;

  // Near the start: [1 … blockSize, ellipsis, last]
  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, blockSize), "ellipsis", totalPages];
  }

  // Near the end: [1, ellipsis, last-blockSize+1 … last]
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, "ellipsis", ...range(totalPages - blockSize + 1, totalPages)];
  }

  // Middle: [1, ellipsis, leftSibling … rightSibling, ellipsis, last]
  return [1, "ellipsis", ...range(leftSibling, rightSibling), "ellipsis", totalPages];
}

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Pagination.css` keeps one rule — `.pagination__page { all: unset }` — and says
 * why at source. Everything else this component draws is here, and every BEM name
 * survives as a declaration-free marker (AGENTS.md §"Class names outlive their
 * declarations").
 *
 * Each constant is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties in the bracket spelling — `ease-shift` generates nothing.
 *
 * `pointer-coarse:` is the touch block from the stylesheet: hit targets grow to
 * ~44px and the gap widens. `hover:` compiles to
 * `@media (hover: hover) { &:hover }`, so the hover wash no longer paints on a
 * coarse pointer — that matches the rest of the package.
 */
const listClasses =
  // `list-none m-0 p-0` restate what Preflight already gives `<ul>`; kept
  // explicit so the row does not depend on Preflight being enabled.
  "flex items-center gap-r6 list-none m-0 p-0 pointer-coarse:gap-r5";

const pageClasses =
  "box-border inline-flex items-center justify-center min-w-8 h-8 px-r6 rounded-sm text-body-2 tabular-nums text-fg-secondary cursor-pointer transition-[color,background-color] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none pointer-coarse:min-w-11 pointer-coarse:h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

/**
 * The current page, and the base-vs-modifier inversion this conversion had to
 * answer: `color` and `cursor` are set on `.pagination__page` too, so converting
 * only the base would have put it in `@layer utilities` above the modifier that
 * must beat it. Both are converted, and `cn()`'s tailwind-merge resolves the pair
 * at the call site — the modifier is passed after the base, so it wins.
 *
 * `text-fg-on-accent` is the contract's partner for an `--C-ACCENT` fill. Do NOT
 * "simplify" it to `text-fg-on-primary`: one theme sets `--C-TEXT-ON-PRIMARY`
 * byte-identical to `--C-ACCENT`, so the page number renders at 1.00:1 and
 * disappears.
 *
 * Deliberately no `pointer-events-none`: the current page stays focusable and
 * hit-testable so `aria-current="page"` remains reachable; the click handler is
 * what refuses to re-fire.
 */
const pageCurrentClasses = "bg-accent text-fg-on-accent font-semibold cursor-default";

/** Only a non-current page washes on hover; the current one keeps its fill. */
const pageHoverClasses = "hover:bg-surface-2 hover:text-fg-primary";

const ellipsisClasses =
  "inline-flex items-center justify-center min-w-8 h-8 text-fg-muted text-[length:var(--BodyText-2)] tracking-[0.1em] select-none pointer-coarse:min-w-11 pointer-coarse:h-11";

const infoClasses =
  "inline-flex items-center px-r5 text-body-2 text-fg-secondary whitespace-nowrap";

/** The four stepping controls. `IconButton` paints the rest of the box. */
const navClasses = "pointer-coarse:min-w-11 pointer-coarse:min-h-11";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  /** First/last chevrons. Default: off for `full` (numbers cover boundaries), on for `compact`. */
  showEdges?: boolean;
  variant?: "full" | "compact";
  /** Collapse to `compact` below this viewport width. Number (px) or CSS length ("40rem"). */
  compactBelow?: number | string;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * `<nav>`, so everything inside it — the list, the four stepping controls, the
   * page buttons and the compact readout — is otherwise unreachable.
   *
   * The four controls take **four** keys rather than one, because they are four
   * roles wearing one class today (`pagination__nav`): hiding the edge jumps
   * while keeping the steps has no route under a single key.
   *
   * `page` and `ellipsis` land on **every** instance — both are generated from
   * `page`/`totalPages` and no key can name one. `first`, `last` and `info`
   * render conditionally (`showEdges`, `variant`), so a class on them is silent
   * rather than wrong when the control is not on screen.
   */
  classNames?: SlotClassNames<
    "list" | "first" | "prev" | "next" | "last" | "page" | "ellipsis" | "info"
  >;
} & Omit<ComponentPropsWithRef<"nav">, "children">;

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      page,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showEdges,
      variant = "full",
      compactBelow,
      className,
      classNames,
      ...props
    },
    ref
  ) {
    // "not all" never matches, keeping the hook inert when `compactBelow` is unset.
    const compactQuery =
      compactBelow == null
        ? null
        : typeof compactBelow === "number"
          ? `(width < ${compactBelow}px)`
          : `(width < ${compactBelow})`;
    const belowBreakpoint = useMediaQuery(compactQuery ?? "not all");
    const effectiveVariant =
      compactQuery && belowBreakpoint ? "compact" : variant;

    // Redundant in `full` (numbers shown), essential in `compact` (none).
    const edges = showEdges ?? effectiveVariant === "compact";

    const isFirst = page <= 1;
    const isLast = page >= totalPages;

    return (
      <nav
        ref={ref}
        aria-label="Pagination"
        className={cn("pagination", className)}
        {...props}
      >
        <ul className={cn("pagination__list", listClasses, classNames?.list)}>
          {/* First page */}
          {edges && (
            <li>
              <IconButton
                aria-label="First page"
                disabled={isFirst}
                onClick={() => onPageChange(1)}
                className={cn("pagination__nav", navClasses, classNames?.first)}
              >
                <ChevronsLeft size={16} />
              </IconButton>
            </li>
          )}

          {/* Prev button */}
          <li>
            <IconButton
              aria-label="Previous page"
              disabled={isFirst}
              onClick={() => onPageChange(page - 1)}
              className={cn("pagination__nav", navClasses, classNames?.prev)}
            >
              <ChevronLeft size={16} />
            </IconButton>
          </li>

          {effectiveVariant === "full" ? (
            // Page number buttons
            getPageRange(page, totalPages, siblingCount).map((item, i) =>
              item === "ellipsis" ? (
                <li
                  key={`ellipsis-${i}`}
                  className={cn("pagination__ellipsis", ellipsisClasses, classNames?.ellipsis)}
                  aria-hidden="true"
                >
                  <span>&hellip;</span>
                </li>
              ) : (
                <li key={item}>
                  <button
                    type="button"
                    className={cn(
                      "pagination__page",
                      pageClasses,
                      // Current AFTER the base, so tailwind-merge resolves
                      // `color`/`cursor` the modifier's way — the source-order
                      // invariant the stylesheet used to carry.
                      item === page
                        ? "pagination__page--current " + pageCurrentClasses
                        : pageHoverClasses,
                      classNames?.page
                    )}
                    aria-current={item === page ? "page" : undefined}
                    aria-label={`Page ${item}`}
                    // Stays focusable so `aria-current` is reachable; native
                    // `disabled` would drop it from the tab order and a11y tree.
                    onClick={() => {
                      if (item !== page) onPageChange(item);
                    }}
                  >
                    {item}
                  </button>
                </li>
              )
            )
          ) : (
            // Compact: "Page X of Y"
            <li className={cn("pagination__info", infoClasses, classNames?.info)}>
              <span>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
            </li>
          )}

          {/* Next button */}
          <li>
            <IconButton
              aria-label="Next page"
              disabled={isLast}
              onClick={() => onPageChange(page + 1)}
              className={cn("pagination__nav", navClasses, classNames?.next)}
            >
              <ChevronRight size={16} />
            </IconButton>
          </li>

          {/* Last page */}
          {edges && (
            <li>
              <IconButton
                aria-label="Last page"
                disabled={isLast}
                onClick={() => onPageChange(totalPages)}
                className={cn("pagination__nav", navClasses, classNames?.last)}
              >
                <ChevronsRight size={16} />
              </IconButton>
            </li>
          )}
        </ul>
      </nav>
    );
  }
);
