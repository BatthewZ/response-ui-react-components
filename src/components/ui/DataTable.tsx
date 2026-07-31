"use client";
import { ChevronRight } from "lucide-react";
import {
  type ComponentPropsWithRef,
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { cn, type SlotClassNames } from "../../util/style";
import { Checkbox } from "../form/Checkbox";
import {
  areAllSelected,
  cellToString,
  type ColumnDef,
  cycleSort,
  defaultComparator,
  isSomeSelected,
  type SortState,
  toggleAllKeys,
  toggleKey,
} from "./data-table-utils";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "./EmptyState";
import { Pagination } from "./Pagination";
import { Skeleton } from "./Skeleton";
import { Table, type TableProps } from "./Table";

// Re-export shared types so existing import paths (`./DataTable`, the `ui`
// barrel) stay valid.
export type { ColumnDef, SortState } from "./data-table-utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type DataTableProps<T> = {
  // Data
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T, index: number) => string | number;

  // Sorting (controlled/uncontrolled)
  /**
   * Controlled sort state; `null` means "sorted by nothing". When provided
   * (including as `null`), the table assumes the server (or consumer) performs
   * sorting and will NOT reorder rows itself. If both `sort` and `defaultSort`
   * are passed, `sort` (controlled) wins.
   *
   * Controlled-ness is decided on the FIRST render and never changes, so
   * round-tripping the `null` that `onSortChange` emits — or a legacy
   * `sort={sort ?? undefined}` — keeps the table controlled.
   */
  sort?: SortState | null;
  /** Seeds the uncontrolled sort state on mount. Ignored when `sort` is controlled. */
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  sortComparator?: (a: T, b: T, columnKey: string, direction: "asc" | "desc") => number;

  // Selection
  selectable?: boolean;
  /** Controlled selection. Omit it and the table keeps its own (uncontrolled). */
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /**
   * Accessible name for a row's selection checkbox. Without it the name is
   * `Select row ${rowKey}` — English, and reading out a raw key
   * ("Select row 8f3a-91c2-4de1") to anyone using it.
   */
  rowLabel?: (row: T, index: number) => string;

  // Expansion
  /**
   * When provided, every row gains a leading expander toggle. Expanding a row
   * renders this content in a full-width detail row beneath it. Expansion state
   * is uncontrolled by default; pass `expandedKeys` + `onExpandedChange` to
   * control it.
   */
  renderExpanded?: (row: T, index: number) => ReactNode;
  expandedKeys?: Set<string | number>;
  onExpandedChange?: (keys: Set<string | number>) => void;

  // Pagination
  /**
   * Enables client-side pagination. When set (> 0), the table slices the
   * (already sorted) dataset down to the current page. Derives
   * `totalPages = max(1, ceil(data.length / pageSize))`. If both `pageSize`
   * and `totalPages` are passed, the `pageSize` derivation wins.
   */
  pageSize?: number;
  /** Current page (1-based). Controlled when provided alongside `onPageChange`. */
  page?: number;
  /** Seeds the uncontrolled page on mount. Ignored when `page` is controlled. */
  defaultPage?: number;
  /** Total page count for pure server-side display pagination (ignored when `pageSize` is set). */
  totalPages?: number;
  onPageChange?: (page: number) => void;

  // Display
  density?: "dense" | "comfortable" | "spacious";
  striped?: boolean;
  stickyHeader?: boolean;
  /**
   * Caps the height of the scrolling area, in px for a number. `stickyHeader`
   * pins `<thead>` against that area rather than the page, and it is
   * content-height by default — so in ordinary block flow there is nothing to
   * scroll past the header until this is set. (A height-bounded flex or grid
   * parent bounds it too, since a scroll container's automatic minimum size is
   * zero; this is the route that does not depend on the layout around it.)
   */
  maxHeight?: number | string;

  // Loading
  loading?: boolean;
  loadingRowCount?: number;

  // Empty state
  emptyContent?: ReactNode;

  /**
   * Optional slot rendered between the table and the pagination block. Use for
   * lazy/infinite loading: the consumer accumulates rows into `data`, keeps
   * `sort` controlled, passes a "Load more" button / IntersectionObserver
   * sentinel here, and omits the pagination props.
   */
  footer?: ReactNode;

  // Overrides
  /** Classes for the outermost element — the block wrapping table, footer and pager. */
  className?: string;
  /**
   * Class overrides for the internals this component renders on top of `Table`.
   * `className` is the root, so there is no `root` key.
   *
   * - `expandToggle` — the per-row expander button (every expandable row).
   * - `expandedCell` — the full-width `<td>` a detail row lives in.
   * - `expandedBody` — the padded box holding `renderExpanded`'s output.
   *
   * The table's own anatomy is `Table`'s: use its subcomponents, or `tableProps`
   * for the `<table>` element.
   */
  classNames?: SlotClassNames<"expandToggle" | "expandedCell" | "expandedBody">;
  /**
   * Props for the inner `<table>`, forwarded to `Table`'s own hatch. Merged
   * into the `aria-busy` this component sets from `loading` rather than
   * replacing it, so a caller adding an `aria-label` does not silently drop the
   * busy state.
   */
  tableProps?: TableProps["tableProps"];
  /**
   * Props for the pagination block, when one is rendered. The only route to it:
   * the pager is constructed here and `className` lands on the root, so without
   * this a caller cannot reach it at all.
   *
   * Spread raw, with no `cn()`: this component puts no class on `Pagination`,
   * and `Pagination` merges an incoming `className` with its own base class.
   */
  paginationProps?: Omit<
    ComponentPropsWithRef<typeof Pagination>,
    "page" | "totalPages" | "onPageChange"
  >;
};

/* ------------------------------------------------------------------ */
/*  DataTable                                                          */
/* ------------------------------------------------------------------ */

// Stable identity for the uncontrolled selection seed. Never mutated: every
// selection helper returns a new Set.
const EMPTY_SELECTION: Set<string | number> = new Set();

/**
 * Generic data table with sorting, selection, pagination, loading, and empty states.
 *
 * Three wiring modes:
 *
 * 1. **Client-everything** — pass `pageSize` (and optionally `defaultSort`).
 *    The table sorts the WHOLE dataset, slices it to the current page, and
 *    derives the page count itself. Uncontrolled sort + page state are managed
 *    internally. Select-all selects the visible page.
 *
 * 2. **Server-controlled** — pass `sort` + `onSortChange` together with
 *    `page` + `totalPages` + `onPageChange`, and DO NOT pass `pageSize`. The
 *    table is pure display: it never reorders or slices rows; the server owns
 *    sorting and paging.
 *
 * 3. **Hybrid / server-paged** — when paging is server-side, never enable
 *    uncontrolled sorting: it would sort only the currently visible page.
 *    Use controlled `sort` so the server sorts the full dataset.
 *
 * Lazy loading: do not look for an onEndReached prop — instead accumulate rows
 * into `data`, keep `sort` controlled, and render a sentinel via `footer`.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  sort: sortProp,
  defaultSort,
  onSortChange,
  sortComparator,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowLabel,
  renderExpanded,
  expandedKeys,
  onExpandedChange,
  pageSize,
  page: pageProp,
  defaultPage,
  totalPages: totalPagesProp,
  onPageChange,
  density = "comfortable",
  striped = false,
  stickyHeader = false,
  maxHeight,
  loading = false,
  loadingRowCount = 5,
  emptyContent,
  footer,
  className,
  classNames,
  tableProps,
  paginationProps,
}: DataTableProps<T>) {
  // Sort mode locks on the first render: `onSortChange` emits `null` for
  // "unsorted", and a consumer feeding that straight back must not flip the
  // table to uncontrolled mid-life. Only `useControllableState` reads the raw
  // prop; this ref exists because the hook does not expose which mode it chose,
  // and the "does the table reorder rows?" decision below needs it. Once
  // controlled, a later `undefined` (the legacy `sort={sort ?? undefined}`) is
  // read as `null` rather than as a mode switch.
  const isControlledSortRef = useRef(sortProp !== undefined);
  const isControlledSort = isControlledSortRef.current;
  const [currentSort, setCurrentSort] = useControllableState<SortState | null>({
    value: isControlledSort ? (sortProp ?? null) : undefined,
    defaultValue: defaultSort ?? null,
    onChange: onSortChange,
  });

  // Client pagination is active when pageSize is a positive number.
  const clientPaged = typeof pageSize === "number" && pageSize > 0;

  // Page mode locks on the first render for the same reason sort does: a parent
  // writing `page={x ?? undefined}` must not flip the table uncontrolled
  // mid-life. The ref mirrors the lock `useControllableState` keeps internally
  // but does not expose, which the reset-on-sort and server-pagination
  // decisions below both read.
  const isControlledPageRef = useRef(pageProp !== undefined);
  const isControlledPage = isControlledPageRef.current;
  const [rawPage, setPage] = useControllableState<number>({
    value: isControlledPage ? (pageProp ?? 1) : undefined,
    defaultValue: defaultPage ?? 1,
    onChange: onPageChange,
  });

  function handleSort(columnKey: string) {
    setCurrentSort(cycleSort(currentSort, columnKey));

    // In client mode, a sort change resets the uncontrolled page to 1.
    if (!isControlledSort && clientPaged && !isControlledPage) {
      setPage(1);
    }
  }

  // Sort the WHOLE dataset first (client/uncontrolled only). When sort is
  // controlled, assume the server already sorted.
  const sortedData = useMemo(() => {
    if (!currentSort || isControlledSort) return data;
    const comparator = sortComparator ?? defaultComparator;
    return [...data].sort((a, b) =>
      comparator(a, b, currentSort.key, currentSort.direction)
    );
  }, [data, currentSort, isControlledSort, sortComparator]);

  // Derive client pagination state. totalPages derives from pageSize when
  // client-paged (this wins over any passed totalPages).
  const derivedTotalPages = clientPaged
    ? Math.max(1, Math.ceil(sortedData.length / pageSize))
    : (totalPagesProp ?? 1);

  // Current page value, clamped so shrinking data can't strand an out-of-range page.
  const currentPage = clientPaged
    ? Math.min(Math.max(1, rawPage), derivedTotalPages)
    : rawPage;

  // Slice the SORTED data down to the current page (AFTER sorting).
  const pageData = useMemo(() => {
    if (!clientPaged) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, clientPaged, currentPage, pageSize]);

  // Index of the current page's first row within `sortedData` — what turns a
  // slice-relative position into the dataset index the callbacks promise.
  //
  // Zero unless we are the ones slicing: in server mode the consumer hands us
  // one page and never tells us `pageSize`, so the offset is unknowable here
  // and `i` is already the only index we can honestly report.
  const rowOffset = clientPaged ? (currentPage - 1) * pageSize : 0;

  // Selection helpers operate on the CURRENT PAGE slice. Select-all selects the
  // visible page only.
  const visibleKeys = useMemo(
    () => pageData.map((row, i) => rowKey(row, rowOffset + i)),
    [pageData, rowKey, rowOffset]
  );
  // Uncontrolled unless the consumer drives it, so `selectable` on its own
  // gives working checkboxes rather than inert ones (#359) — the same contract
  // the expansion state below already had.
  const [selection, setSelection] = useControllableState<Set<string | number>>({
    value: selectedKeys,
    defaultValue: EMPTY_SELECTION,
    onChange: onSelectionChange,
  });

  const allSelected = areAllSelected(visibleKeys, selection);
  const someSelected = isSomeSelected(visibleKeys, selection);

  function handleSelectAll() {
    setSelection(toggleAllKeys(selection, visibleKeys));
  }

  function handleSelectRow(key: string | number) {
    setSelection(toggleKey(selection, key));
  }

  // Expansion (controllable; uncontrolled by default so it works out of the box).
  const expandable = typeof renderExpanded === "function";
  const [expanded, setExpanded] = useControllableState<Set<string | number>>({
    value: expandedKeys,
    defaultValue: new Set(),
    onChange: onExpandedChange,
  });

  function toggleExpanded(key: string | number) {
    setExpanded(toggleKey(expanded, key));
  }

  // Column count (including the optional expander and selection columns).
  const totalColumns =
    columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0);

  // Decide whether to render pagination:
  // - client mode: when derived page count > 1 (no onPageChange required)
  // - server mode: `totalPages` + `onPageChange` — the props that say a pager
  //   belongs here and give it something to render and somewhere to report.
  //
  // Deliberately NOT gated on the paging mode: a parent that mounts with
  // `page={undefined}` and supplies it once the first fetch lands is locked
  // uncontrolled, and losing the page VALUE is the documented cost of the lock.
  // Losing the pager itself is not — an uncontrolled page still drives the same
  // block from internal state and still reports through `onPageChange`.
  const showClientPagination = clientPaged && derivedTotalPages > 1;
  const showServerPagination =
    !clientPaged && totalPagesProp != null && !!onPageChange;
  const showPagination = showClientPagination || showServerPagination;

  function renderPaginationBlock() {
    if (!showPagination) return null;
    return (
      <div
        // slot:(a) a centring shim around the pager, with nothing of its own to
        // vary. The pager it positions is reachable through `paginationProps`,
        // and the block around both is `className`.
        className="mt-r3 flex justify-center"
      >
        <Pagination
          {...paginationProps}
          page={currentPage}
          totalPages={derivedTotalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    );
  }

  // ONE header for every state. The loading and empty bodies used to carry
  // hand-maintained copies of this block, which drifted apart (#363/#364).
  function renderHeader() {
    return (
      <Table.Head>
        <Table.Row>
          {expandable && (
            <Table.HeaderCell
              // slot:(a) the width reservation for the expander column, sized
              // to the toggle this component renders under it. A caller class
              // here re-sizes a column whose only content the component owns.
              className="w-10"
            />
          )}
          {selectable && (
            <Table.HeaderCell
              // slot:(a) the width reservation for the checkbox column — same
              // shape as the expander column above.
              className="w-10"
            >
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={handleSelectAll}
                aria-label="Select all rows"
              />
            </Table.HeaderCell>
          )}
          {columns.map((col) => (
            <Table.HeaderCell
              key={col.key}
              style={{
                width: col.width,
                textAlign: col.align,
              }}
              sortDirection={
                col.sortable
                  ? currentSort?.key === col.key
                    ? currentSort.direction
                    : false
                  : undefined
              }
              onSort={col.sortable ? () => handleSort(col.key) : undefined}
              sortLabel={col.sortLabel}
            >
              {col.header}
            </Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Head>
    );
  }

  function renderLoadingRows() {
    return Array.from({ length: loadingRowCount }, (_, i) => (
      <Table.Row key={i}>
        {expandable && (
          <Table.Cell>
            <Skeleton variant="rectangular" width={16} height={16} aria-hidden="true" />
          </Table.Cell>
        )}
        {selectable && (
          <Table.Cell>
            <Skeleton variant="rectangular" width={16} height={16} aria-hidden="true" />
          </Table.Cell>
        )}
        {columns.map((col) => (
          <Table.Cell key={col.key}>
            <Skeleton variant="text" aria-hidden="true" />
          </Table.Cell>
        ))}
      </Table.Row>
    ));
  }

  function renderEmptyRow() {
    return (
      <Table.Row>
        <Table.Cell colSpan={totalColumns}>
          {emptyContent ?? (
            <EmptyState size="md">
              <EmptyStateTitle>No data</EmptyStateTitle>
              <EmptyStateDescription>There are no items to display.</EmptyStateDescription>
            </EmptyState>
          )}
        </Table.Cell>
      </Table.Row>
    );
  }

  function renderRows() {
    return pageData.map((row, slot) => {
      const i = rowOffset + slot;
      const key = rowKey(row, i);
      const isExpanded = expandable && expanded.has(key);
      return (
        <Fragment key={key}>
          {/* `selected` only where there IS a selection model: passing it
              publishes `aria-selected` on the row, and a table with no
              checkbox column must not claim its rows are selectable (#351). */}
          <Table.Row index={i} selected={selectable ? selection.has(key) : undefined}>
            {expandable && (
              <Table.Cell>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center rounded-md p-r6 text-fg-secondary hover:bg-surface-2 cursor-pointer duration-fast",
                    classNames?.expandToggle,
                  )}
                  aria-label={isExpanded ? "Collapse row" : "Expand row"}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpanded(key)}
                >
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    // slot:(a) `rotate-90` *is* the open state — the only
                    // visual difference between an expanded row and a
                    // collapsed one on this glyph. A route here lets a caller
                    // pin the chevron and leave the toggle telling the wrong
                    // story; the button around it is `classNames.expandToggle`.
                    className={cn("duration-fast", isExpanded && "rotate-90")}
                  />
                </button>
              </Table.Cell>
            )}
            {selectable && (
              <Table.Cell>
                <Checkbox
                  checked={selection.has(key)}
                  onChange={() => handleSelectRow(key)}
                  aria-label={rowLabel ? rowLabel(row, i) : `Select row ${key}`}
                />
              </Table.Cell>
            )}
            {columns.map((col) => (
              <Table.Cell key={col.key} style={{ textAlign: col.align }}>
                {col.render ? col.render(row, i) : cellToString((row as Record<string, unknown>)[col.key])}
              </Table.Cell>
            ))}
          </Table.Row>
          {expandable && renderExpanded && (
            <ExpandableDetailRow
              open={isExpanded}
              colSpan={totalColumns}
              density={density}
              classNames={classNames}
            >
              {() => renderExpanded(row, i)}
            </ExpandableDetailRow>
          )}
        </Fragment>
      );
    });
  }

  // Rows only exist in the data state; striping a skeleton or an empty-state
  // row would band placeholder content.
  const hasRows = !loading && data.length > 0;

  return (
    <div className={className}>
      {/* The skeleton cells are `aria-hidden`: one `role="status"` per cell was
          `rows × columns` polite live regions all saying "Loading" (#366).
          `aria-busy` states it once, on the thing that is loading. */}
      <Table
        density={density}
        striped={hasRows && striped}
        stickyHeader={stickyHeader}
        maxHeight={maxHeight}
        // Merged into, not replaced by, the caller's bag: `aria-busy` is
        // derived from `loading`, so it wins while loading and stands down
        // otherwise rather than erasing a value the caller set.
        tableProps={{ ...tableProps, "aria-busy": loading || tableProps?.["aria-busy"] }}
      >
        {renderHeader()}
        <Table.Body>
          {loading ? renderLoadingRows() : hasRows ? renderRows() : renderEmptyRow()}
        </Table.Body>
      </Table>

      {footer}

      {renderPaginationBlock()}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ExpandableDetailRow                                                 */
/* ------------------------------------------------------------------ */

/**
 * Longest transition duration declared on `el`, in milliseconds. Reads the
 * resolved value so it tracks the `--MOTION-DURATION-SHIFT` token, and returns
 * 0 under `prefers-reduced-motion` (where the CSS disables the transition) so
 * the row collapses instantly instead of waiting on a transition that never runs.
 */
function transitionDurationMs(el: HTMLElement): number {
  const value = getComputedStyle(el).transitionDuration;
  if (!value) return 0;
  return value.split(",").reduce((max, part) => {
    const t = part.trim();
    const ms = t.endsWith("ms") ? parseFloat(t) : parseFloat(t) * 1000;
    return Number.isFinite(ms) ? Math.max(max, ms) : max;
  }, 0);
}

/**
 * Full-width detail row that reveals/hides its content with an accordion-style
 * grid-template-rows transition (see `.data-table-expanded-*` in Table.css).
 *
 * To animate BOTH directions the row must outlive the `open=false` flip: it
 * stays mounted while the `1fr -> 0fr` collapse plays, then unmounts once that
 * duration elapses. We schedule the unmount off the resolved transition duration
 * rather than a `transitionend` listener — `transitionend` for
 * `grid-template-rows` is unreliable across browsers (it can fire early or not
 * at all), which would yank the row out mid-collapse and make it snap shut.
 *
 * `children` is a thunk so the consumer's `renderExpanded` is only invoked while
 * the row is actually mounted (open or animating closed) — never for collapsed rows.
 */
function ExpandableDetailRow({
  open,
  colSpan,
  density,
  classNames,
  children,
}: {
  open: boolean;
  colSpan: number;
  density: "dense" | "comfortable" | "spacious";
  classNames?: SlotClassNames<"expandToggle" | "expandedCell" | "expandedBody">;
  children: () => ReactNode;
}) {
  // `present` drives DOM mounting; `expanded` drives the 0fr/1fr grid reveal.
  // Both seed from `open` so an initially-expanded row renders open with no
  // first-paint animation.
  const [present, setPresent] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const contentRef = useRef<HTMLDivElement>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Any state change cancels a pending collapse-then-unmount.
    clearTimeout(unmountTimer.current);

    if (open) {
      setPresent(true);
    } else {
      setExpanded(false);
      const el = contentRef.current;
      const duration = el ? transitionDurationMs(el) : 0;
      if (duration <= 0) {
        setPresent(false); // reduced motion / no transition: collapse instantly
      } else {
        unmountTimer.current = setTimeout(() => setPresent(false), duration);
      }
    }
  }, [open]);

  // Once mounted for an open request, flip to expanded on the next frame so the
  // browser observes 0fr -> 1fr and animates the reveal (rather than snapping).
  useEffect(() => {
    if (present && open) {
      const id = requestAnimationFrame(() => setExpanded(true));
      return () => cancelAnimationFrame(id);
    }
  }, [present, open]);

  useEffect(() => () => clearTimeout(unmountTimer.current), []);

  if (!present) return null;

  return (
    <Table.Row
      // slot:(a) a declaration-free marker — no rule in this package styles it.
      // It exists so a consumer stylesheet can name the detail row, and varying
      // the marker itself is the one thing that would break that.
      className="data-table-expanded-row"
    >
      {/* Rung 3: a well cut into the sheet, and deeper than the zebra band at
          rung 2 so an expanded row never reads as just another band. */}
      <Table.Cell
        colSpan={colSpan}
        className={cn("data-table-expanded-cell bg-surface-3", classNames?.expandedCell)}
      >
        <div
          ref={contentRef}
          // slot:(a) the reveal itself: `display: grid` plus the
          // `grid-template-rows: 0fr -> 1fr` transition this element's
          // `data-state` drives, and whose resolved duration is read back off
          // this node to schedule the unmount. A caller class here changes
          // behaviour, not appearance. The padded box inside it is
          // `classNames.expandedBody`.
          className="data-table-expanded-content"
          data-state={expanded ? "open" : "closed"}
        >
          <div
            // slot:(a) the grid item that clips the collapse — `overflow:
            // hidden` and `min-height: 0` are what let the row reach zero
            // height at all, so a caller varying them stops it closing.
            className="data-table-expanded-inner"
          >
            <div
              className={cn(
                "data-table-expanded-body",
                `data-table-expanded-body--${density}`,
                classNames?.expandedBody,
              )}
            >
              {children()}
            </div>
          </div>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}
