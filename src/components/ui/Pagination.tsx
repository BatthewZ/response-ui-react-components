"use client";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { useMediaQuery } from "../../hooks/use-media-query";
import { cn } from "../../util/style";

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
        <ul className="pagination__list">
          {/* First page */}
          {edges && (
            <li>
              <IconButton
                aria-label="First page"
                disabled={isFirst}
                onClick={() => onPageChange(1)}
                className="pagination__nav"
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
              className="pagination__nav"
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
                  className="pagination__ellipsis"
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
                      item === page && "pagination__page--current"
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
            <li className="pagination__info">
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
              className="pagination__nav"
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
                className="pagination__nav"
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
