"use client";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { useVirtualRows } from "../../hooks/use-virtual-rows";
import { cn } from "../../util/style";
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
import { Skeleton } from "./Skeleton";
import { Table, type TableProps } from "./Table";

export type VirtualizedDataTableProps<T> = {
  // Data
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T, index: number) => string | number;

  // Sorting (controlled/uncontrolled) — same contract as DataTable.
  /**
   * Controlled sort state; `null` means "sorted by nothing". When provided
   * (including as `null`), the table assumes the server (or consumer) performs
   * sorting and will NOT reorder rows itself.
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

  // Selection — select-all spans the ENTIRE dataset (see component docs).
  selectable?: boolean;
  /** Controlled selection. Omit it and the table keeps its own (uncontrolled). */
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /**
   * Accessible name for a row's selection checkbox. Without it the name is
   * `Select row ${rowKey}` — English, and reading out a raw key
   * ("Select row inv_0") to anyone using it.
   */
  rowLabel?: (row: T, index: number) => string;

  // Virtualization
  /** Fixed height of every row, in pixels. Required. Content must fit this height. */
  rowHeight: number;
  /** Height of the scrollable viewport. Defaults to 400. */
  height?: number | string;
  /** Extra rows rendered above/below the visible window. Defaults to 8. */
  overscan?: number;

  // Infinite / lazy loading (optional — the natural pairing for virtualization)
  /** Fires once when the rendered window reaches within `endReachedThreshold` rows of the end. */
  onEndReached?: () => void;
  /** Rows-from-end that trigger `onEndReached`. Defaults to 8. */
  endReachedThreshold?: number;

  // Display
  density?: "dense" | "comfortable" | "spacious";
  striped?: boolean;
  /** Pin the header while scrolling. Defaults to true (recommended for tall lists). */
  stickyHeader?: boolean;

  // Loading
  loading?: boolean;
  loadingRowCount?: number;

  // Empty state
  emptyContent?: ReactNode;

  // Overrides
  /**
   * Classes for the outermost element — the `Table` root, which is also the
   * scroll container. Merged after `table-virtual-scroll`, which is the
   * selector `VirtualizedDataTable.css` scopes its column and truncation rules
   * to, so it is appended and never replaced.
   */
  className?: string;
  /**
   * Inline styles for that same element. Applied *after* the prop-derived
   * `height`/`overflow-y`, so a caller's value wins on the same key.
   */
  style?: CSSProperties;
  /**
   * Props for the inner `<table>`, forwarded to `Table`'s own hatch. Merged
   * into the `aria-rowcount`/`aria-busy` this component derives rather than
   * replacing them — those describe the virtual window and cannot be restated
   * correctly from outside.
   */
  tableProps?: TableProps["tableProps"];
};

/* ------------------------------------------------------------------ */
/*  VirtualizedDataTable                                               */
/* ------------------------------------------------------------------ */

/** Viewport estimate used until the scroll element can be measured. */
const DEFAULT_VIEWPORT_HEIGHT = 400;

// Stable identities so the memo/state below never rebuild an empty value.
// Never mutated: every selection helper returns a new Set.
const EMPTY_SELECTION: Set<string | number> = new Set();
const EMPTY_KEYS: (string | number)[] = [];

/**
 * Data table that virtualizes (windows) its rows so large datasets — tens of
 * thousands of rows — scroll smoothly while only a small slice is mounted in
 * the DOM. Built on the same {@link Table} primitive and {@link ColumnDef}
 * contract as {@link DataTable}, sharing its sort comparator and cycle logic.
 *
 * Use this instead of {@link DataTable} when the full dataset is large and you
 * want continuous scrolling rather than pagination.
 *
 * **Fixed row height.** Every row is `rowHeight` px tall; cell content must fit
 * (truncate overflowing text). Dynamic/measured heights are a future
 * enhancement. The {@link Table} root doubles as the scroll container, so the
 * sticky header pins to it for free.
 *
 * **Sorting** mirrors `DataTable`: uncontrolled sorting reorders the whole
 * dataset; pass a controlled `sort` when the server sorts.
 *
 * **Selection** differs from `DataTable`: select-all toggles EVERY row in the
 * dataset (not a visible page), because the entire set is conceptually in view.
 *
 * **Infinite loading**: pass `onEndReached` to fetch/append more rows as the
 * user nears the bottom; accumulate results into `data` (keep `sort` controlled
 * when the server sorts).
 */
export function VirtualizedDataTable<T>({
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
  rowHeight,
  height = DEFAULT_VIEWPORT_HEIGHT,
  overscan = 8,
  onEndReached,
  endReachedThreshold = 8,
  density = "comfortable",
  striped = false,
  stickyHeader = true,
  loading = false,
  loadingRowCount = 5,
  emptyContent,
  className,
  style,
  tableProps,
}: VirtualizedDataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort mode locks on the first render — see the `sort` prop docs. The ref is
  // needed alongside the hook because `useControllableState` does not expose
  // which mode it locked, and `sortedData` below must know.
  const isControlledSortRef = useRef(sortProp !== undefined);
  const isControlledSort = isControlledSortRef.current;
  const [currentSort, setCurrentSort] = useControllableState<SortState | null>({
    value: isControlledSort ? (sortProp ?? null) : undefined,
    defaultValue: defaultSort ?? null,
    onChange: onSortChange,
  });

  function handleSort(columnKey: string) {
    setCurrentSort(cycleSort(currentSort, columnKey));
  }

  // Sort the WHOLE dataset (client/uncontrolled only). When sort is controlled,
  // assume the server already sorted.
  const sortedData = useMemo(() => {
    if (!currentSort || isControlledSort) return data;
    const comparator = sortComparator ?? defaultComparator;
    return [...data].sort((a, b) => comparator(a, b, currentSort.key, currentSort.direction));
  }, [data, currentSort, isControlledSort, sortComparator]);

  // A CSS height ("60vh") cannot be measured before mount, so estimate with the
  // documented default rather than 0 — a 0 estimate renders `overscan * 2` rows
  // server-side and on the first paint (#375). Over-estimating only mounts rows
  // the first measurement then discards; under-estimating ships a short table.
  const initialViewport = typeof height === "number" ? height : DEFAULT_VIEWPORT_HEIGHT;
  const { startIndex, endIndex, paddingTop, paddingBottom } = useVirtualRows({
    rowCount: sortedData.length,
    rowHeight,
    overscan,
    scrollRef,
    initialViewport,
  });

  // Selection is uncontrolled unless the consumer drives it, so `selectable`
  // alone gives working checkboxes instead of inert ones (#371) — the same
  // contract `DataTable`'s expansion state already had.
  const [selection, setSelection] = useControllableState<Set<string | number>>({
    value: selectedKeys,
    defaultValue: EMPTY_SELECTION,
    onChange: onSelectionChange,
  });

  // Selection spans the ENTIRE dataset (the whole set is virtually in view), so
  // this is the one list a virtualizer cannot window. Build it only when there
  // is a select-all to answer for: without `selectable` it was 100k `rowKey`
  // calls for nothing (#369).
  const allKeys = useMemo(
    () => (selectable ? sortedData.map((row, i) => rowKey(row, i)) : EMPTY_KEYS),
    [selectable, sortedData, rowKey]
  );
  const allSelected = areAllSelected(allKeys, selection);
  const someSelected = isSomeSelected(allKeys, selection);

  function handleSelectAll() {
    setSelection(toggleAllKeys(selection, allKeys));
  }

  function handleSelectRow(key: string | number) {
    setSelection(toggleKey(selection, key));
  }

  // Fire onEndReached once per dataset length while the window is near the end.
  // The guard is keyed to the length, not a boolean: a boolean is re-armed only
  // by the window leaving the threshold, so appending a page that keeps it
  // inside stalled the loader for good (#442). Never fires while `loading` — a
  // request is already in flight and the rows on screen are skeletons (#374).
  const nearBottom = endIndex >= sortedData.length - endReachedThreshold;
  const firedAtLengthRef = useRef<number | null>(null);
  useEffect(() => {
    if (!onEndReached || loading) return;
    if (nearBottom && sortedData.length > 0) {
      if (firedAtLengthRef.current === sortedData.length) return;
      firedAtLengthRef.current = sortedData.length;
      onEndReached();
    } else if (!nearBottom) {
      firedAtLengthRef.current = null;
    }
  }, [nearBottom, onEndReached, sortedData.length, loading]);

  const totalColumns = columns.length + (selectable ? 1 : 0);

  // ONE header for every state. The loading and empty branches used to render a
  // second, sort-less copy of this block (#447).
  function renderHeader() {
    return (
      <Table.Head>
        {/* Row 1 of `aria-rowcount` — the data rows continue the numbering from
            their dataset index, not from their position in the mounted window. */}
        <Table.Row aria-rowindex={1}>
          {selectable && (
            <Table.HeaderCell
              // slot:(a) the column's only width declaration — the matching
              // body cell carries none, so auto layout takes this one and every
              // data column divides the remainder. It is sized to the
              // `Checkbox` under it, a shared primitive rendered with no props
              // hatch, so its footprint is unreachable from the caller's side:
              // a narrower class here clips the control rather than narrowing
              // the column. Identical ruling to `DataTable`'s two.
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
              style={{ width: col.width, textAlign: col.align }}
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

  // Loading skeleton (no virtualization needed). The skeleton cells are
  // `aria-hidden`: one `role="status"` per cell was `rows × columns` polite
  // live regions all saying "Loading" (#448). `aria-busy` states it once.
  if (loading) {
    return (
      <Table
        density={density}
        striped={false}
        stickyHeader={stickyHeader}
        className={className}
        style={style}
        tableProps={{ ...tableProps, "aria-busy": true }}
      >
        {renderHeader()}
        <Table.Body>
          {Array.from({ length: loadingRowCount }, (_, i) => (
            <Table.Row key={i}>
              {selectable && (
                <Table.Cell>
                  <Skeleton
                    variant="rectangular"
                    // slot:(a) the placeholder is 16px because the `Checkbox` it
                    // stands in for is 16px. A skeleton earns its place by
                    // reserving the exact space the real control takes, so varying
                    // this size reintroduces the reflow the loading state exists to
                    // prevent — and the `Checkbox` under it is a shared primitive
                    // rendered with no props hatch, so its size has no route either.
                    className="size-4"
                    aria-hidden="true"
                  />
                </Table.Cell>
              )}
              {columns.map((col) => (
                <Table.Cell key={col.key}>
                  <Skeleton variant="text" aria-hidden="true" />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  }

  // Empty state.
  if (data.length === 0) {
    return (
      <Table
        density={density}
        striped={false}
        stickyHeader={stickyHeader}
        className={className}
        style={style}
        tableProps={tableProps}
      >
        {renderHeader()}
        <Table.Body>
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
        </Table.Body>
      </Table>
    );
  }

  const windowRows = sortedData.slice(startIndex, endIndex);

  return (
    <Table
      ref={scrollRef}
      density={density}
      striped={striped}
      stickyHeader={stickyHeader}
      // `table-virtual-scroll` is what `VirtualizedDataTable.css` scopes its
      // fixed-layout and truncation rules to, so the base class comes first and
      // a caller's is appended to it.
      className={cn("table-virtual-scroll", className)}
      // Caller's `style` last: `height` is prop-derived, and an override on the
      // same key should win rather than be shadowed.
      style={{ height, overflowY: "auto", ...style }}
      // Only a slice of the rows is mounted, so the DOM row count is not the
      // table's row count. `aria-rowcount` (+ the per-row `aria-rowindex`
      // below) is what tells assistive tech the size of the real table and
      // where in it the mounted window sits (#372). Header row included, and
      // set after the caller's bag because only this component can compute it.
      tableProps={{ ...tableProps, "aria-rowcount": sortedData.length + 1 }}
    >
      {renderHeader()}
      <Table.Body>
        {paddingTop > 0 && (
          <tr
            aria-hidden
            // slot:(a) an `aria-hidden` height shim. Its whole geometry is the
            // padding `use-virtual-rows` computes and writes inline below, and
            // the class exists only to zero the padding and border a data row
            // would carry — a caller class here desyncs the scroll arithmetic.
            className="table-virtual-spacer"
          >
            <td colSpan={totalColumns} style={{ height: paddingTop }} />
          </tr>
        )}
        {windowRows.map((row, i) => {
          const index = startIndex + i;
          const key = rowKey(row, index);
          return (
            <Table.Row
              key={key}
              index={index}
              aria-rowindex={index + 2}
              // `selected` only where there IS a selection model: passing it
              // publishes `aria-selected` on the row, and a table with no
              // checkbox column must not claim its rows are selectable (#351).
              selected={selectable ? selection.has(key) : undefined}
              style={{ height: rowHeight }}
            >
              {selectable && (
                <Table.Cell>
                  <Checkbox
                    checked={selection.has(key)}
                    onChange={() => handleSelectRow(key)}
                    aria-label={rowLabel ? rowLabel(row, index) : `Select row ${key}`}
                  />
                </Table.Cell>
              )}
              {columns.map((col) => (
                <Table.Cell key={col.key} style={{ textAlign: col.align }}>
                  {col.render
                    ? col.render(row, index)
                    : cellToString((row as Record<string, unknown>)[col.key])}
                </Table.Cell>
              ))}
            </Table.Row>
          );
        })}
        {paddingBottom > 0 && (
          <tr
            aria-hidden
            // slot:(a) an `aria-hidden` height shim. Its whole geometry is the
            // padding `use-virtual-rows` computes and writes inline below, and
            // the class exists only to zero the padding and border a data row
            // would carry — a caller class here desyncs the scroll arithmetic.
            className="table-virtual-spacer"
          >
            <td colSpan={totalColumns} style={{ height: paddingBottom }} />
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}
