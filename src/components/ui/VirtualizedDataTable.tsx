"use client";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { useVirtualRows } from "../../hooks/use-virtual-rows";
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
import { Table } from "./Table";

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
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;

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
};

/* ------------------------------------------------------------------ */
/*  VirtualizedDataTable                                               */
/* ------------------------------------------------------------------ */

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
  rowHeight,
  height = 400,
  overscan = 8,
  onEndReached,
  endReachedThreshold = 8,
  density = "comfortable",
  striped = false,
  stickyHeader = true,
  loading = false,
  loadingRowCount = 5,
  emptyContent,
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

  const initialViewport = typeof height === "number" ? height : 0;
  const { startIndex, endIndex, paddingTop, paddingBottom } = useVirtualRows({
    rowCount: sortedData.length,
    rowHeight,
    overscan,
    scrollRef,
    initialViewport,
  });

  // Selection spans the ENTIRE dataset (the whole set is virtually in view).
  const allKeys = useMemo(
    () => sortedData.map((row, i) => rowKey(row, i)),
    [sortedData, rowKey]
  );
  const allSelected = selectedKeys != null && areAllSelected(allKeys, selectedKeys);
  const someSelected = selectedKeys != null && isSomeSelected(allKeys, selectedKeys);

  function handleSelectAll() {
    if (!onSelectionChange || !selectedKeys) return;
    onSelectionChange(toggleAllKeys(selectedKeys, allKeys));
  }

  function handleSelectRow(key: string | number) {
    if (!onSelectionChange || !selectedKeys) return;
    onSelectionChange(toggleKey(selectedKeys, key));
  }

  // Fire onEndReached once when the rendered window nears the end; reset when it
  // moves away (so appended data can re-arm it).
  const nearBottom = endIndex >= sortedData.length - endReachedThreshold;
  const firedRef = useRef(false);
  useEffect(() => {
    if (!onEndReached) return;
    if (nearBottom && sortedData.length > 0 && !firedRef.current) {
      firedRef.current = true;
      onEndReached();
    } else if (!nearBottom) {
      firedRef.current = false;
    }
  }, [nearBottom, onEndReached, sortedData.length]);

  const totalColumns = columns.length + (selectable ? 1 : 0);

  // ONE header for every state. The loading and empty branches used to render a
  // second, sort-less copy of this block (#447).
  function renderHeader() {
    return (
      <Table.Head>
        <Table.Row>
          {selectable && (
            <Table.HeaderCell className="w-10">
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
            >
              {col.header}
            </Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Head>
    );
  }

  // Loading skeleton (no virtualization needed).
  if (loading) {
    return (
      <Table density={density} striped={false} stickyHeader={stickyHeader}>
        {renderHeader()}
        <Table.Body>
          {Array.from({ length: loadingRowCount }, (_, i) => (
            <Table.Row key={i}>
              {selectable && (
                <Table.Cell>
                  <Skeleton variant="rectangular" width={16} height={16} />
                </Table.Cell>
              )}
              {columns.map((col) => (
                <Table.Cell key={col.key}>
                  <Skeleton variant="text" />
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
      <Table density={density} striped={false} stickyHeader={stickyHeader}>
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
      className="table-virtual-scroll"
      style={{ height, overflowY: "auto" }}
    >
      {renderHeader()}
      <Table.Body>
        {paddingTop > 0 && (
          <tr aria-hidden className="table-virtual-spacer">
            <td colSpan={totalColumns} style={{ height: paddingTop }} />
          </tr>
        )}
        {windowRows.map((row, i) => {
          const index = startIndex + i;
          const key = rowKey(row, index);
          return (
            <Table.Row key={key} selected={selectedKeys?.has(key)} style={{ height: rowHeight }}>
              {selectable && (
                <Table.Cell>
                  <Checkbox
                    checked={selectedKeys?.has(key) ?? false}
                    onChange={() => handleSelectRow(key)}
                    aria-label={`Select row ${key}`}
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
          <tr aria-hidden className="table-virtual-spacer">
            <td colSpan={totalColumns} style={{ height: paddingBottom }} />
          </tr>
        )}
      </Table.Body>
    </Table>
  );
}
