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
  /**
   * Read by `Table.Head` and `Table.HeaderCell`, which used to be reached by the
   * `.table--sticky-header .table-head` descendant selectors in `Table.css`. The
   * root already knew this; passing it down is what let those two rules become
   * ordinary utilities on the elements that carry them.
   */
  stickyHeader: boolean;
};

const TableContext = createContext<TableContextValue | null>(null);

function useTableContext() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("Table compound components must be used within <Table>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Table.css` keeps two things and says why at source; everything else this
 * component draws is here. Every BEM name survives as a declaration-free marker
 * (AGENTS.md §"Class names outlive their declarations"), and each constant is
 * one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties in the bracket spelling — `ease-shift` generates nothing.
 * `hover:` compiles to `@media (hover: hover) { &:hover }`, so the sortable
 * header's wash no longer paints on a coarse pointer; that matches the rest of
 * the package.
 */
/**
 * `relative` is the load-bearing one, and it is not decoration: the wrapper is
 * a scrollport (`overflow-x-auto` makes `overflow-y` compute to `auto` too), so
 * without it every absolutely-positioned descendant resolves against a
 * containing block OUTSIDE the scroller and escapes the clip. The library's own
 * visually-hidden text is `position: absolute` with no offsets — `Badge` puts
 * one in any status cell — so its static position is taken in the scroller's
 * unscrolled content coordinates and lands that far down (or across) the
 * DOCUMENT. `VirtualizedDataTable` makes it spectacular: measured at 375×800
 * over 10 000 rows, scrolling the scrollport to its end took
 * `document.documentElement.scrollHeight` from 1332 to 530 060. It is not
 * virtualization-specific — a plain `Table` wide enough to scroll sideways
 * pushes the page's `scrollWidth` past the viewport the same way.
 *
 * The same declaration for the same reason as `DialogBody`'s `relative`.
 * `z-index` stays `auto`, so no stacking context is created. It DOES change paint
 * order — a positioned box with `z-index: auto` moves from Appendix E step 4 to step
 * 8 — so this wrapper now paints over an earlier-in-tree positioned element that has
 * no `z-index`. Measured on a consumer `sticky` toolbar; see the 0.17.0 changelog.
 */
const wrapperClasses = "relative overflow-x-auto border border-border-default rounded-md";

const tableClasses = "w-full border-collapse bg-surface-0";

const headClasses = "bg-surface-1 border-b-2 border-border-default";

const headerCellClasses = "text-left font-semibold text-fg-primary whitespace-nowrap";

/**
 * `focus-visible:` is still reachable: `tabIndex` passes through the rest
 * spread, so a caller can put focus back on the cell itself. The component no
 * longer does.
 */
const headerCellSortableClasses =
  "cursor-pointer select-none transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:bg-surface-2 active:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

const sortIconClasses = "inline-flex ml-1 align-middle";

const rowClasses = "border-b border-border-default last:border-b-0";

/**
 * The zebra band and the selection wash, in the order they must be passed.
 *
 * `.table-row--selected` used to be declared AFTER `.table-row--striped` in
 * `Table.css` so a selected banded row took the wash at equal specificity, and
 * the file said so. Converting relocates that invariant into argument order in
 * the `cn()` below: the striped class is passed first, the selected class
 * second, and tailwind-merge keeps the last of two conflicting `bg-*`. Swapping
 * the two arguments silently loses selection on every banded row — that is what
 * `Table.test.tsx` pins.
 *
 * Rung 2 for the band: a mild recession within the rung-0 sheet, not a raised
 * panel. Against the sheet that measures 1.08–1.21:1 across the themes.
 */
const rowStripedClasses = "bg-surface-1";
const rowSelectedClasses = "bg-[color-mix(in_oklch,var(--C-ACCENT)_8%,transparent)]";

/**
 * Density. The padding and size that were `.table-cell--dense` and friends.
 *
 * Both halves of one cascade pair moved together, and this is the half that
 * would have inverted alone: `.data-table-expanded-cell { padding: 0 }` beat
 * these at equal specificity purely by being declared later in `Table.css`, and
 * `DataTable.tsx` now passes `p-0` in the cell's own `className` — after this
 * map — so tailwind-merge resolves it at the call site instead.
 *
 * `text-[length:…]`, not `text-body-2`: the stylesheet set `font-size` and left
 * `line-height` to inherit, and `text-body-2` would drag its
 * `--BodyText-2-line-height` companion in with it. That companion is ~1.85em,
 * which would grow every row — including the fixed-height rows
 * `VirtualizedDataTable` reserves space for. The size is what was written, so
 * the size is what converts.
 */
const densityClassMap: Record<Density, string> = {
  dense: "table-cell--dense px-3 py-1 text-[length:var(--BodyText-2)]",
  comfortable: "table-cell--comfortable px-4 py-2.5 text-[length:var(--BodyText-1)]",
  spacious: "table-cell--spacious p-4 text-[length:var(--BodyText-1)]",
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
    <TableContext.Provider value={{ density, striped, stickyHeader }}>
      <div
        ref={ref}
        className={cn("table-wrapper", wrapperClasses, className)}
        style={maxHeight !== undefined ? { maxHeight, ...style } : style}
        {...props}
      >
        {/* Bag first, `className` after it: the merge has to be the last writer
            or the raw bag's own `className` overwrites it. */}
        <table
          {...tableProps}
          className={cn(
            "table",
            tableClasses,
            stickyHeader && "table--sticky-header",
            tableProps?.className
          )}
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
    const { stickyHeader } = useTableContext();
    return (
      <thead
        ref={ref}
        // The pin is read from context rather than from an
        // `in-[.table--sticky-header]:` variant: that variant matches ANY
        // ancestor carrying the class, so a table nested inside a sticky one
        // would pin its head too.
        className={cn("table-head", headClasses, stickyHeader && "sticky top-0 z-1", className)}
        {...props}
      />
    );
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
      // `table-body` is a declaration-free marker: the rule it named was an
      // empty one and has been deleted, not converted.
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
          rowClasses,
          // Striped BEFORE selected: two `bg-*` in one class list resolve by
          // argument order, and a selected banded row must take the selection
          // wash. See `rowSelectedClasses`. The class is emitted only on the rows
          // that are actually banded — parity is decided from the data index, not
          // from DOM position, so a detail row or a virtualiser spacer between two
          // data rows cannot flip the bands below it (#365, #368).
          striped &&
            index !== undefined &&
            index % 2 === 1 &&
            "table-row--striped " + rowStripedClasses,
          selected && "table-row--selected " + rowSelectedClasses,
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
    const { density, stickyHeader } = useTableContext();
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
            sortIconClasses,
            hasDirection
              ? "table-header-cell__sort-icon--active text-accent"
              : "table-header-cell__sort-icon--muted text-fg-muted",
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
          headerCellClasses,
          densityClassMap[density],
          sortable && "table-header-cell--sortable " + headerCellSortableClasses,
          // Same reasoning as `Table.Head`: read from context, not from an
          // ancestor-matching variant.
          stickyHeader && "shadow-sm",
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
        className={cn("table-cell text-fg-primary", densityClassMap[density], className)}
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

/**
 * The same parts as named exports, for one caller that cannot use the compound
 * form: a **directive-neutral** module.
 *
 * This file is `"use client"`, so under RSC a bundler replaces it with a client
 * reference proxy, and React throws on any property access outside its
 * whitelist — "You cannot dot into a client module from a server component."
 * `Table.Head` from a server module is therefore a render-time crash, and a
 * content-dependent one: it fires only when the rendered document happens to
 * contain a table, so it passes every smoke test that does not. No test here
 * covers it — the repo has no RSC harness — so this comment is the record.
 *
 * Importing the name directly is the fix React documents. Deliberately NOT
 * re-exported from the barrel — `Table` stays the one public spelling, and
 * these exist so `Markdown` can stay server-renderable.
 */
export { TableBody, TableCell, TableHead, TableHeaderCell, TableRow };
