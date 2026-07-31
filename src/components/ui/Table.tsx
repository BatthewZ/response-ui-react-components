"use client";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Children,
  cloneElement,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
} from "react";

import { composeEventHandlers } from "../../util/merge-props";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type Density = "dense" | "comfortable" | "spacious";

type TableContextValue = {
  density: Density;
  striped: boolean;
};

const TableContext = createContext<TableContextValue | null>(null);

function useTableContext() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("Table compound components must be used within <Table>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Density class helper                                               */
/* ------------------------------------------------------------------ */

const densityClassMap: Record<Density, string> = {
  dense: "table-cell--dense",
  comfortable: "table-cell--comfortable",
  spacious: "table-cell--spacious",
};

/* ------------------------------------------------------------------ */
/*  Table (root)                                                       */
/* ------------------------------------------------------------------ */

export type TableProps = {
  density?: Density;
  striped?: boolean;
  stickyHeader?: boolean;
  /**
   * Caps the wrapper's height, in px for a number. The wrapper is the header's
   * scrollport (`overflow-x: auto` makes its `overflow-y` compute to `auto`)
   * and is content-height by default, so without a bound there is nothing for
   * `stickyHeader` to pin against — the page scrolls the whole table away
   * instead. An explicit `style` still wins on the same key.
   */
  maxHeight?: number | string;
  /**
   * Props for the inner `<table>`. Every other prop lands on the wrapper
   * `<div>` (which is the scrollport, and wants them), so this is the only
   * route to the table element itself — an `aria-label`, an `aria-rowcount`,
   * a `className`. Its `className` merges with the component's own.
   */
  tableProps?: ComponentPropsWithRef<"table">;
} & ComponentPropsWithRef<"div">;

const TableRoot = forwardRef<HTMLDivElement, TableProps>(function Table(
  {
    density = "comfortable",
    striped = false,
    stickyHeader = false,
    maxHeight,
    tableProps,
    className,
    style,
    children,
    ...props
  },
  ref
) {
  return (
    <TableContext.Provider value={{ density, striped }}>
      <div
        ref={ref}
        className={cn("table-wrapper", className)}
        style={maxHeight !== undefined ? { maxHeight, ...style } : style}
        {...props}
      >
        {/* Bag first, `className` after it: the merge has to be the last writer
            or the raw bag's own `className` overwrites it. */}
        <table
          {...tableProps}
          className={cn("table", stickyHeader && "table--sticky-header", tableProps?.className)}
        >
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Table.Head                                                         */
/* ------------------------------------------------------------------ */

type TableHeadProps = ComponentPropsWithRef<"thead">;

const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  function TableHead({ className, ...props }, ref) {
    useTableContext();
    return <thead ref={ref} className={cn("table-head", className)} {...props} />;
  }
);

/* ------------------------------------------------------------------ */
/*  Table.Body                                                         */
/* ------------------------------------------------------------------ */

type TableBodyProps = ComponentPropsWithRef<"tbody">;

const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody({ className, children, ...props }, ref) {
    useTableContext();
    // Zebra parity is a property of the data, not of DOM position. Any extra
    // <tr> between two data rows — an expanded detail row, a virtualiser
    // spacer — used to flip every band below it (#365, #368). Rows built in a
    // loop pass their own `index`; these are the hand-authored ones, numbered
    // here so the simple case still needs no ceremony. A row that already
    // carries an `index` is left alone and is not counted, so a caller
    // numbering some rows cannot be silently renumbered by us.
    let dataRow = 0;
    const numbered = Children.map(children, (child) => {
      if (!isValidElement(child) || child.type !== TableRow) return child;
      const row = child as ReactElement<TableRowProps>;
      if (row.props.index !== undefined) return row;
      return cloneElement(row, { index: dataRow++ });
    });

    return (
      <tbody ref={ref} className={cn("table-body", className)} {...props}>
        {numbered}
      </tbody>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Table.Row                                                          */
/* ------------------------------------------------------------------ */

type TableRowProps = {
  /**
   * Whether this row is selected. Leave it off entirely in a table that has no
   * selection: passing it — `false` included — publishes `aria-selected` on the
   * row, which tells assistive tech the table's rows *are* selectable (#351).
   */
  selected?: boolean;
  /**
   * Position of this row **in the data**, from 0 — which band `striped` paints.
   * `Table.Body` numbers its own direct children, so pass this only when the
   * rows are generated (a `.map`, a virtualised window) and DOM order does not
   * match data order.
   */
  index?: number;
} & ComponentPropsWithRef<"tr">;

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ selected, index, className, ...props }, ref) {
    const { striped } = useTableContext();
    // #351. A `<tr>` inside a `<table>` maps to role `row`, and `aria-selected`
    // is a supported state of that role in exactly that context — checked
    // offline against `aria-query`'s role table
    // (`roles.get("row").props` lists `aria-selected`;
    // `requiredContext` is `grid | rowgroup | table | treegrid`). No role
    // change is needed and none is made: `role="grid"` would promise the
    // cell-level arrow-key navigation this component does not implement.
    //
    // Emitted only when the caller has an opinion, because `aria-selected`
    // is itself a claim that this table has a selection model — a plain
    // report table publishing `aria-selected="false"` on every row is worse
    // than publishing nothing. `data-selected` is the styling twin, and is
    // present only when true so `[data-selected]` alone is a usable selector.
    // Both sit before the rest spread, so a caller's own value still wins.
    return (
      <tr
        ref={ref}
        className={cn(
          "table-row",
          selected && "table-row--selected",
          striped && index !== undefined && index % 2 === 1 && "table-row--striped",
          className
        )}
        aria-selected={selected}
        data-selected={selected ? "true" : undefined}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Table.HeaderCell                                                   */
/* ------------------------------------------------------------------ */

type TableHeaderCellProps = {
  sortDirection?: "asc" | "desc" | false;
  onSort?: () => void;
  /**
   * Visually-hidden words read *before* the column's own text, so the sort
   * control announces as an action ("Sort by Customer") rather than as a second
   * copy of the column label. `""` drops them and leaves the button named by
   * the column alone. Ignored without `onSort`: there is no button to name.
   */
  sortLabel?: string;
  /**
   * Class overrides for the sort affordance this cell renders. `className` is
   * the `<th>` itself, so there is no `root` key.
   *
   * - `sortButton` — the real `<button>` a sortable header wraps its column in.
   * - `sortIcon` — the direction glyph, present whenever a direction is set.
   *
   * Neither element exists on a header with no `onSort` and no `sortDirection`.
   */
  classNames?: SlotClassNames<"sortButton" | "sortIcon">;
} & ComponentPropsWithRef<"th">;

const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    {
      sortDirection,
      onSort,
      sortLabel = "Sort by",
      classNames,
      className,
      children,
      onClick,
      // `onKeyDown` is deliberately not pulled out: the cell no longer runs a
      // key handler of its own, so a caller's rides straight through on the rest
      // spread with nothing to compose against.
      ...props
    },
    ref
  ) {
    const { density } = useTableContext();
    const sortId = useId();
    const sortable = !!onSort;

    // A direction is shown whenever one is set, sortable or not: `sortDirection`
    // alone already emits `aria-sort`, and an arrow no sighted user can see is
    // state announced to AT only (#355).
    const hasDirection = sortDirection === "asc" || sortDirection === "desc";

    let sortIcon: ReactNode = null;
    if (sortable || hasDirection) {
      const Icon = sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown;
      // Written out rather than interpolated: a template-built class name is
      // invisible to Tailwind's source scan and to any static reader of it.
      sortIcon = (
        <span
          className={cn(
            "table-header-cell__sort-icon",
            hasDirection
              ? "table-header-cell__sort-icon--active"
              : "table-header-cell__sort-icon--muted",
            classNames?.sortIcon,
          )}
        >
          <Icon size={14} />
        </span>
      );
    }

    // #353: the tab stop and the activation semantics belong to a real <button>.
    // A `columnheader` with `tabIndex` announces as a header you happen to be
    // able to focus, never as something you can press.
    //
    // The button carries no handler of its own — its click bubbles to the <th>,
    // where the composed `onClick` runs the caller's handler and then `onSort`,
    // which is what carries the documented composition contract through the
    // change. Enter/Space need no handler either: the button's own activation
    // turns them into that same click, so a caller's `onKeyDown` still runs
    // first and its `preventDefault()` still opts out — by suppressing the
    // activation rather than by short-circuiting a handler.
    //
    // The action word reaches the button's name through `aria-labelledby` and
    // not as plain hidden text, which separates children only where `display`
    // is not inline: a bare `<span class="sr-only">` yields "Sort byName" unless
    // a stylesheet happens to blockify it, and no test here can read one.
    //
    // The <th> then has to name ITSELF from the same column span. `aria-hidden`
    // is not enough to keep the action word out of the cell: accname excludes a
    // hidden node only while it is "not directly referenced by aria-labelledby",
    // and this one is — measured in Firefox, where the header without this
    // attribute computes as `columnheader "Sort by Customer"` and every data
    // cell in the column would announce the verb with its value.
    const named = sortLabel !== "";
    const content = sortable ? (
      <button
        type="button"
        className={cn("table-header-cell__sort-button", classNames?.sortButton)}
        aria-labelledby={named ? `${sortId}-action ${sortId}-column` : undefined}
      >
        {named && (
          <span
            id={`${sortId}-action`}
            // slot:(a) the action word, carried into the button's accessible
            // name by `aria-labelledby` and kept out of the visible cell by
            // this class alone. Dropping `sr-only` prints "Sort by" beside
            // every column heading; there is nothing else here to vary.
            className="sr-only"
            aria-hidden="true"
          >
            {sortLabel}
          </span>
        )}
        {named ? <span id={`${sortId}-column`}>{children}</span> : children}
        {sortIcon}
      </button>
    ) : (
      <>
        {children}
        {sortIcon}
      </>
    );

    return (
      <th
        ref={ref}
        className={cn(
          "table-header-cell",
          densityClassMap[density],
          sortable && "table-header-cell--sortable",
          className
        )}
        onClick={composeEventHandlers(onClick, () => onSort?.())}
        aria-labelledby={named && sortable ? `${sortId}-column` : undefined}
        aria-sort={
          sortDirection === "asc"
            ? "ascending"
            : sortDirection === "desc"
              ? "descending"
              : sortable
                ? "none"
                : undefined
        }
        {...props}
      >
        {content}
      </th>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Table.Cell                                                         */
/* ------------------------------------------------------------------ */

type TableCellProps = ComponentPropsWithRef<"td">;

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ className, ...props }, ref) {
    const { density } = useTableContext();
    return (
      <td
        ref={ref}
        className={cn("table-cell", densityClassMap[density], className)}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
});
