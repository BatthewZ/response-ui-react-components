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
} from "react";

import { composeEventHandlers } from "../../util/merge-props";
import { cn } from "../../util/style";

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

type TableProps = {
  density?: Density;
  striped?: boolean;
  stickyHeader?: boolean;
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
    tableProps,
    className,
    children,
    ...props
  },
  ref
) {
  const { className: tableClassName, ...restTableProps } = tableProps ?? {};

  return (
    <TableContext.Provider value={{ density, striped }}>
      <div ref={ref} className={cn("table-wrapper", className)} {...props}>
        <table
          className={cn("table", stickyHeader && "table--sticky-header", tableClassName)}
          {...restTableProps}
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
  function TableRow({ selected = false, index, className, ...props }, ref) {
    const { striped } = useTableContext();
    return (
      <tr
        ref={ref}
        className={cn(
          "table-row",
          selected && "table-row--selected",
          striped && index !== undefined && index % 2 === 1 && "table-row--striped",
          className
        )}
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
} & ComponentPropsWithRef<"th">;

const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    { sortDirection, onSort, className, children, onClick, onKeyDown, ...props },
    ref
  ) {
    const { density } = useTableContext();
    const sortable = !!onSort;

    // A direction is shown whenever one is set, sortable or not: `sortDirection`
    // alone already emits `aria-sort`, and an arrow no sighted user can see is
    // state announced to AT only (#355).
    const hasDirection = sortDirection === "asc" || sortDirection === "desc";

    let sortIcon: ReactNode = null;
    if (sortable || hasDirection) {
      const Icon = sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown;
      const modifier = hasDirection ? "active" : "muted";
      sortIcon = (
        <span className={`table-header-cell__sort-icon table-header-cell__sort-icon--${modifier}`}>
          <Icon size={14} />
        </span>
      );
    }

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
        onKeyDown={composeEventHandlers(onKeyDown, (e) => {
          if (sortable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSort?.();
          }
        })}
        tabIndex={sortable ? 0 : undefined}
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
        {children}
        {sortIcon}
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
