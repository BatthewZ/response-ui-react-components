import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

/**
 * Column descriptor shared by {@link DataTable} and {@link VirtualizedDataTable}.
 */
export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
}

/**
 * An ACTIVE sort. "Sorted by nothing" is `null`, never a `SortState` variant —
 * so anywhere a sort can be absent the type is `SortState | null`, which is
 * what `onSortChange` emits and what the `sort` prop accepts back.
 */
export type SortState = { key: string; direction: "asc" | "desc" };

/* ------------------------------------------------------------------ */
/*  Cell stringification                                               */
/* ------------------------------------------------------------------ */

export function cellToString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (val instanceof Date) return val.toLocaleString();
  return "";
}

/* ------------------------------------------------------------------ */
/*  Default sort comparator                                            */
/* ------------------------------------------------------------------ */

export function defaultComparator<T>(
  a: T,
  b: T,
  columnKey: string,
  direction: "asc" | "desc"
): number {
  const aVal = (a as Record<string, unknown>)[columnKey];
  const bVal = (b as Record<string, unknown>)[columnKey];

  // Nullish ALWAYS sorts last regardless of direction. Handle before the
  // asc/desc flip so the placement is direction-independent.
  const aNull = aVal == null;
  const bNull = bVal == null;
  if (aNull || bNull) {
    if (aNull && bNull) return 0;
    return aNull ? 1 : -1;
  }

  let result: number;
  if (aVal instanceof Date && bVal instanceof Date) {
    result = aVal.getTime() - bVal.getTime();
  } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
    result = Number(aVal) - Number(bVal);
  } else if (typeof aVal === "number" && typeof bVal === "number") {
    result = aVal - bVal;
  } else {
    result = cellToString(aVal).localeCompare(cellToString(bVal));
  }

  return direction === "desc" ? -result : result;
}

/* ------------------------------------------------------------------ */
/*  Sort cycle                                                         */
/* ------------------------------------------------------------------ */

/**
 * Compute the next sort state when a column header is activated. Cycles
 * `none → asc → desc → none` for the targeted column; selecting a different
 * column restarts at `asc`.
 */
export function cycleSort(current: SortState | null, columnKey: string): SortState | null {
  if (!current || current.key !== columnKey) {
    return { key: columnKey, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { key: columnKey, direction: "desc" };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Selection                                                          */
/* ------------------------------------------------------------------ */

export type RowKey = string | number;

/** Whether every key in `keys` is present in `selected` (and `keys` is non-empty). */
export function areAllSelected(keys: RowKey[], selected: Set<RowKey>): boolean {
  return keys.length > 0 && keys.every((k) => selected.has(k));
}

/** Whether at least one key in `keys` is present in `selected`. */
export function isSomeSelected(keys: RowKey[], selected: Set<RowKey>): boolean {
  return keys.some((k) => selected.has(k));
}

/**
 * Toggle a select-all over `keys`: if all are already selected they are removed,
 * otherwise they are added. Returns a new Set (input is not mutated).
 */
export function toggleAllKeys(selected: Set<RowKey>, keys: RowKey[]): Set<RowKey> {
  const next = new Set(selected);
  if (areAllSelected(keys, selected)) {
    for (const k of keys) next.delete(k);
  } else {
    for (const k of keys) next.add(k);
  }
  return next;
}

/** Toggle a single key's membership. Returns a new Set (input is not mutated). */
export function toggleKey(selected: Set<RowKey>, key: RowKey): Set<RowKey> {
  const next = new Set(selected);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}
