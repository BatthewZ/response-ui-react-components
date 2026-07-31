import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { type ColumnDef,DataTable, type SortState } from "./DataTable";

type Item = { id: number; name: string; age: number };

const columns: ColumnDef<Item>[] = [
  { key: "name", header: "Name" },
  { key: "age", header: "Age" },
];

const data: Item[] = [
  { id: 1, name: "Alice", age: 30 },
  { id: 2, name: "Bob", age: 25 },
];

const rowKey = (row: Item) => row.id;

describe("DataTable", () => {
  it("renders column headers from column definitions", () => {
    render(<DataTable data={data} columns={columns} rowKey={rowKey} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(<DataTable data={data} columns={columns} rowKey={rowKey} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("uses custom render function on column", () => {
    const customColumns: ColumnDef<Item>[] = [
      {
        key: "name",
        header: "Name",
        render: (row) => <strong>{row.name.toUpperCase()}</strong>,
      },
      { key: "age", header: "Age" },
    ];

    render(<DataTable data={data} columns={customColumns} rowKey={rowKey} />);

    expect(screen.getByText("ALICE")).toBeInTheDocument();
    expect(screen.getByText("BOB")).toBeInTheDocument();
  });

  it("clicking sortable header calls onSortChange", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    const sortableColumns: ColumnDef<Item>[] = [
      { key: "name", header: "Name", sortable: true },
      { key: "age", header: "Age" },
    ];

    render(
      <DataTable
        data={data}
        columns={sortableColumns}
        rowKey={rowKey}
        onSortChange={onSortChange}
      />,
    );

    await user.click(screen.getByText("Name"));
    expect(onSortChange).toHaveBeenCalledTimes(1);
  });

  it("renders checkboxes when selectable=true", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: /select all rows/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /select row 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /select row 2/i }),
    ).toBeInTheDocument();
  });

  it("select all checkbox selects all rows", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: /select all rows/i }),
    );
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2]));
  });

  it("individual row checkbox calls onSelectionChange", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: /select row 1/i }),
    );
    // A row checkbox nested in a clickable row is the classic double-fire site.
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
  });

  /* ---------------------------------------------------------------- */
  /*  #359 · selectable on its own is a working feature                */
  /* ---------------------------------------------------------------- */

  it("selectable alone gives working checkboxes", async () => {
    const user = userEvent.setup();
    render(<DataTable data={data} columns={columns} rowKey={rowKey} selectable />);

    const row1 = screen.getByRole("checkbox", { name: /select row 1/i });
    expect(row1).not.toBeChecked();

    await user.click(row1);
    expect(row1).toBeChecked();

    await user.click(row1);
    expect(row1).not.toBeChecked();
  });

  /* ---------------------------------------------------------------- */
  /*  #482 · ColumnDef.sortLabel reaches Table.HeaderCell               */
  /* ---------------------------------------------------------------- */

  it("ColumnDef.sortLabel names the sort button, and '' leaves the column alone", () => {
    const { unmount } = render(
      <DataTable
        data={data}
        columns={[{ key: "name", header: "Name", sortable: true, sortLabel: "Trier par" }]}
        rowKey={rowKey}
      />,
    );
    expect(screen.getByRole("button", { name: "Trier par Name" })).toBeInTheDocument();
    unmount();

    render(
      <DataTable
        data={data}
        columns={[{ key: "name", header: "Name", sortable: true, sortLabel: "" }]}
        rowKey={rowKey}
      />,
    );
    expect(screen.getByRole("button", { name: "Name" })).toBeInTheDocument();
  });

  it("a column with no sortLabel keeps the English default", () => {
    render(
      <DataTable
        data={data}
        columns={[{ key: "name", header: "Name", sortable: true }]}
        rowKey={rowKey}
      />,
    );
    expect(screen.getByRole("button", { name: "Sort by Name" })).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  #351 · selection reaches assistive tech on the row itself         */
  /* ---------------------------------------------------------------- */

  it("publishes aria-selected on selectable rows and nothing on unselectable ones", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DataTable data={data} columns={columns} rowKey={rowKey} selectable />,
    );

    const bodyRow = () =>
      screen.getAllByRole("row").filter((r) => r.closest("tbody"))[0];

    expect(bodyRow()).toHaveAttribute("aria-selected", "false");
    expect(bodyRow()).not.toHaveAttribute("data-selected");

    await user.click(screen.getByRole("checkbox", { name: /select row 1/i }));
    expect(bodyRow()).toHaveAttribute("aria-selected", "true");
    expect(bodyRow()).toHaveAttribute("data-selected", "true");

    rerender(<DataTable data={data} columns={columns} rowKey={rowKey} />);
    expect(bodyRow()).not.toHaveAttribute("aria-selected");
  });

  it("select-all works uncontrolled and reports through onSelectionChange", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        selectable
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /select all rows/i }));

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2]));
    expect(screen.getByRole("checkbox", { name: /select row 2/i })).toBeChecked();
  });

  // #362: the default name interpolates the raw row key into an English
  // sentence, and there was no way to say anything else.
  it("rowLabel names a row's checkbox", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        selectable
        rowLabel={(row) => `Sélectionner ${row.name}`}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Alice" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /select row 1/i }),
    ).not.toBeInTheDocument();
  });

  it("a controlled selectedKeys still wins over the internal state", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const row1 = screen.getByRole("checkbox", { name: /select row 1/i });
    await user.click(row1);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(row1).not.toBeChecked(); // the consumer did not feed the new set back
  });

  it("renders Pagination when page and totalPages are provided", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        page={1}
        totalPages={5}
        onPageChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toBeInTheDocument();
  });

  it("shows skeleton rows when loading=true", () => {
    const { container } = render(
      <DataTable
        data={[]}
        columns={columns}
        rowKey={rowKey}
        loading
        loadingRowCount={3}
      />,
    );

    expect(container.querySelectorAll(".skeleton").length).toBe(
      3 * columns.length,
    );
  });

  // #366: one Skeleton per cell is one polite live region per cell — 3 rows x 2
  // columns announced "Loading" six times over. The state belongs on the table.
  it("loading skeletons are hidden from AT and the table is aria-busy", () => {
    const { container } = render(
      <DataTable
        data={[]}
        columns={columns}
        rowKey={rowKey}
        loading
        loadingRowCount={3}
      />,
    );

    expect(screen.queryAllByRole("status")).toHaveLength(0);
    for (const skeleton of container.querySelectorAll(".skeleton")) {
      expect(skeleton).toHaveAttribute("aria-hidden", "true");
    }
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("drops aria-busy once loading is over", () => {
    render(<DataTable data={data} columns={columns} rowKey={rowKey} />);

    expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
  });

  it("shows 'No data' EmptyState when data is empty", () => {
    render(<DataTable data={[]} columns={columns} rowKey={rowKey} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it("shows custom emptyContent when provided", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        rowKey={rowKey}
        emptyContent={<div>Nothing to see here</div>}
      />,
    );

    expect(screen.getByText("Nothing to see here")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Row-order assertions                                            */
  /* ---------------------------------------------------------------- */

  // The body is the second rowgroup (first is the <thead>). Reads the text of
  // the first cell of each body row, in DOM order.
  function bodyFirstCells(): string[] {
    const rowgroups = screen.getAllByRole("rowgroup");
    const body = rowgroups[rowgroups.length - 1];
    const rows = within(body).getAllByRole("row");
    return rows.map((r) => within(r).getAllByRole("cell")[0].textContent ?? "");
  }

  const sortableColumns: ColumnDef<Item>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "age", header: "Age" },
  ];

  it("clicking a sortable string header reorders rows (asc, desc, none)", async () => {
    const user = userEvent.setup();
    const unsorted: Item[] = [
      { id: 1, name: "Charlie", age: 1 },
      { id: 2, name: "Alice", age: 2 },
      { id: 3, name: "Bob", age: 3 },
    ];

    render(<DataTable data={unsorted} columns={sortableColumns} rowKey={rowKey} />);

    // Initial: source order.
    expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);

    await user.click(screen.getByText("Name")); // asc
    expect(bodyFirstCells()).toEqual(["Alice", "Bob", "Charlie"]);

    await user.click(screen.getByText("Name")); // desc
    expect(bodyFirstCells()).toEqual(["Charlie", "Bob", "Alice"]);

    await user.click(screen.getByText("Name")); // none -> source order
    expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("sorts a Date column chronologically via the default comparator", async () => {
    const user = userEvent.setup();
    type Dated = { id: number; when: Date };
    const dated: Dated[] = [
      { id: 1, when: new Date("2022-01-01") },
      { id: 2, when: new Date("2020-01-01") },
      { id: 3, when: new Date("2021-01-01") },
    ];
    const cols: ColumnDef<Dated>[] = [
      { key: "when", header: "When", sortable: true, render: (r) => String(r.id) },
    ];

    render(<DataTable data={dated} columns={cols} rowKey={(r) => r.id} />);

    await user.click(screen.getByText("When")); // asc -> 2020, 2021, 2022
    expect(bodyFirstCells()).toEqual(["2", "3", "1"]);

    await user.click(screen.getByText("When")); // desc
    expect(bodyFirstCells()).toEqual(["1", "3", "2"]);
  });

  it("places nullish values last in both asc and desc", async () => {
    const user = userEvent.setup();
    type Nullable = { id: number; name: string | null };
    const rows: Nullable[] = [
      { id: 1, name: "Beta" },
      { id: 2, name: null },
      { id: 3, name: "Alpha" },
    ];
    const cols: ColumnDef<Nullable>[] = [
      { key: "name", header: "Name", sortable: true, render: (r) => String(r.id) },
    ];

    render(<DataTable data={rows} columns={cols} rowKey={(r) => r.id} />);

    await user.click(screen.getByText("Name")); // asc: Alpha(3), Beta(1), null(2)
    expect(bodyFirstCells()).toEqual(["3", "1", "2"]);

    await user.click(screen.getByText("Name")); // desc: Beta(1), Alpha(3), null(2) last
    expect(bodyFirstCells()).toEqual(["1", "3", "2"]);
  });

  it("renders pre-sorted with defaultSort and still cycles on header click", async () => {
    const user = userEvent.setup();
    const unsorted: Item[] = [
      { id: 1, name: "Charlie", age: 1 },
      { id: 2, name: "Alice", age: 2 },
      { id: 3, name: "Bob", age: 3 },
    ];
    const defaultSort: SortState = { key: "name", direction: "asc" };

    render(
      <DataTable
        data={unsorted}
        columns={sortableColumns}
        rowKey={rowKey}
        defaultSort={defaultSort}
      />,
    );

    // Pre-sorted ascending on mount.
    expect(bodyFirstCells()).toEqual(["Alice", "Bob", "Charlie"]);

    // Header click advances asc -> desc.
    await user.click(screen.getByText("Name"));
    expect(bodyFirstCells()).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("client paginates with pageSize: renders one slice and navigates pages", async () => {
    const user = userEvent.setup();
    const five: Item[] = [
      { id: 1, name: "A", age: 1 },
      { id: 2, name: "B", age: 2 },
      { id: 3, name: "C", age: 3 },
      { id: 4, name: "D", age: 4 },
      { id: 5, name: "E", age: 5 },
    ];

    render(<DataTable data={five} columns={columns} rowKey={rowKey} pageSize={2} />);

    // 2 rows on page 1.
    expect(bodyFirstCells()).toEqual(["A", "B"]);

    // 5 rows / 2 per page => 3 pages.
    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^page 3$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^page 4$/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^page 2$/i }));
    expect(bodyFirstCells()).toEqual(["C", "D"]);
  });

  it("sorts the whole dataset BEFORE slicing to a page", async () => {
    const user = userEvent.setup();
    // "Aaa" sits at the tail of `data` but sorts to the front; it must land on page 1.
    const rows: Item[] = [
      { id: 1, name: "Zoe", age: 1 },
      { id: 2, name: "Yan", age: 2 },
      { id: 3, name: "Xena", age: 3 },
      { id: 4, name: "Wade", age: 4 },
      { id: 5, name: "Aaa", age: 5 },
    ];

    render(<DataTable data={rows} columns={sortableColumns} rowKey={rowKey} pageSize={2} />);

    await user.click(screen.getByText("Name")); // asc
    // Whole set sorted: Aaa, Wade, Xena, Yan, Zoe. Page 1 slice = Aaa, Wade.
    expect(bodyFirstCells()).toEqual(["Aaa", "Wade"]);
  });

  it("controlled page + pageSize renders the given slice and does not self-advance", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const five: Item[] = [
      { id: 1, name: "A", age: 1 },
      { id: 2, name: "B", age: 2 },
      { id: 3, name: "C", age: 3 },
      { id: 4, name: "D", age: 4 },
      { id: 5, name: "E", age: 5 },
    ];

    render(
      <DataTable
        data={five}
        columns={columns}
        rowKey={rowKey}
        pageSize={2}
        page={2}
        onPageChange={onPageChange}
      />,
    );

    // Controlled page 2 slice.
    expect(bodyFirstCells()).toEqual(["C", "D"]);

    await user.click(screen.getByRole("button", { name: /^page 3$/i }));
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    // Page did not self-advance (still showing controlled page 2).
    expect(bodyFirstCells()).toEqual(["C", "D"]);
  });

  it("resets uncontrolled page to 1 when sorting changes", async () => {
    const user = userEvent.setup();
    const five: Item[] = [
      { id: 1, name: "A", age: 1 },
      { id: 2, name: "B", age: 2 },
      { id: 3, name: "C", age: 3 },
      { id: 4, name: "D", age: 4 },
      { id: 5, name: "E", age: 5 },
    ];

    render(<DataTable data={five} columns={sortableColumns} rowKey={rowKey} pageSize={2} />);

    await user.click(screen.getByRole("button", { name: /^page 3$/i }));
    expect(bodyFirstCells()).toEqual(["E"]);

    // Sorting resets to page 1.
    await user.click(screen.getByText("Name")); // asc
    expect(bodyFirstCells()).toEqual(["A", "B"]);
  });

  it("does NOT reorder client-side when sort is controlled", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const unsorted: Item[] = [
      { id: 1, name: "Charlie", age: 1 },
      { id: 2, name: "Alice", age: 2 },
      { id: 3, name: "Bob", age: 3 },
    ];

    render(
      <DataTable
        data={unsorted}
        columns={sortableColumns}
        rowKey={rowKey}
        sort={{ key: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );

    // Controlled: server owns sorting; rows stay in source order.
    expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);

    await user.click(screen.getByText("Name"));
    // Still source order; only the callback fired.
    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  /* ---------------------------------------------------------------- */
  /*  Controlled sort round trip (#357)                                */
  /* ---------------------------------------------------------------- */

  describe("controlled sort round trip", () => {
    const unsorted: Item[] = [
      { id: 1, name: "Charlie", age: 1 },
      { id: 2, name: "Alice", age: 2 },
      { id: 3, name: "Bob", age: 3 },
    ];

    let onSortChange = vi.fn();
    beforeEach(() => {
      onSortChange = vi.fn();
    });

    /**
     * `defaultSort` is deliberately a DIFFERENT direction than the controlled
     * `sort`: if the table ever drops to uncontrolled it reorders from that
     * stale seed, which is visible in the row order.
     */
    function Harness({ wrap }: { wrap: (s: SortState | null) => SortState | null | undefined }) {
      const [sort, setSort] = useState<SortState | null>({ key: "name", direction: "asc" });
      return (
        <DataTable
          data={unsorted}
          columns={sortableColumns}
          rowKey={rowKey}
          defaultSort={{ key: "name", direction: "desc" }}
          sort={wrap(sort)}
          onSortChange={(next) => {
            onSortChange(next);
            setSort(next);
          }}
        />
      );
    }

    /** Full none→asc→desc→none cycle, feeding every emitted value straight back. */
    async function assertRoundTrip(wrap: (s: SortState | null) => SortState | null | undefined) {
      const user = userEvent.setup();
      render(<Harness wrap={wrap} />);

      // Controlled: the server owns ordering, so rows stay in source order.
      expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);

      await user.click(screen.getByText("Name")); // asc -> desc
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(onSortChange).toHaveBeenNthCalledWith(1, { key: "name", direction: "desc" });
      expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);

      await user.click(screen.getByText("Name")); // desc -> null (clear)
      expect(onSortChange).toHaveBeenCalledTimes(2);
      expect(onSortChange).toHaveBeenNthCalledWith(2, null);
      // Still controlled: a controlled table never reorders rows itself, so a
      // reorder here means it fell back to the stale `defaultSort` seed.
      expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);

      await user.click(screen.getByText("Name")); // null -> asc, cycle continues
      expect(onSortChange).toHaveBeenCalledTimes(3);
      expect(onSortChange).toHaveBeenNthCalledWith(3, { key: "name", direction: "asc" });
      expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);
    }

    it("accepts the emitted null straight back as `sort` and stays controlled", async () => {
      await assertRoundTrip((s) => s);
    });

    it("stays controlled when a legacy `sort={sort ?? undefined}` clears", async () => {
      await assertRoundTrip((s) => s ?? undefined);
    });

    // Mirror direction: a table that mounted UNCONTROLLED (the equally common
    // `useState<SortState | null>(null)` + `sort={sort ?? undefined}`) must keep
    // sorting client-side once the prop starts arriving, instead of silently
    // rendering an unsorted body under a header that claims a sort direction.
    it("stays uncontrolled when the prop only arrives after the first click", async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();

      function LateProp() {
        const [sort, setSort] = useState<SortState | null>(null);
        return (
          <DataTable
            data={unsorted}
            columns={sortableColumns}
            rowKey={rowKey}
            sort={sort ?? undefined}
            onSortChange={(next) => {
              onSortChange(next);
              setSort(next);
            }}
          />
        );
      }

      render(<LateProp />);
      expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);

      await user.click(screen.getByText("Name")); // asc
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(bodyFirstCells()).toEqual(["Alice", "Bob", "Charlie"]);

      await user.click(screen.getByText("Name")); // desc
      expect(onSortChange).toHaveBeenCalledTimes(2);
      expect(bodyFirstCells()).toEqual(["Charlie", "Bob", "Alice"]);

      await user.click(screen.getByText("Name")); // cleared
      expect(onSortChange).toHaveBeenCalledTimes(3);
      expect(onSortChange).toHaveBeenNthCalledWith(3, null);
      expect(bodyFirstCells()).toEqual(["Charlie", "Alice", "Bob"]);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  One header, three states (#363, #364)                            */
  /* ---------------------------------------------------------------- */

  describe("header parity across the loading, empty and data states", () => {
    const mixedColumns: ColumnDef<Item>[] = [
      { key: "name", header: "Name", sortable: true, width: 120 },
      { key: "age", header: "Age", align: "right" },
    ];

    /**
     * Every header attribute the three render paths could drift on. The
     * duplication is the defect, so this compares WHOLE headers rather than
     * naming today's divergences — a future edit to one copy reddens it too.
     */
    function headerShape(container: HTMLElement) {
      return [...container.querySelectorAll("thead th")].map((th) => ({
        text: th.textContent,
        className: th.className,
        tabIndex: th.getAttribute("tabindex"),
        ariaSort: th.getAttribute("aria-sort"),
        textAlign: (th as HTMLElement).style.textAlign,
        width: (th as HTMLElement).style.width,
        sortIcons: th.querySelectorAll("[class*='sort-icon']").length,
        checkboxes: th.querySelectorAll("input[type='checkbox']").length,
      }));
    }

    function renderIn(extra: { data: Item[]; loading?: boolean }) {
      return render(
        <DataTable
          data={extra.data}
          loading={extra.loading}
          columns={mixedColumns}
          rowKey={rowKey}
          defaultSort={{ key: "name", direction: "asc" }}
          selectable
          selectedKeys={new Set()}
          onSelectionChange={vi.fn()}
          renderExpanded={(row) => <div>Detail for {row.name}</div>}
        />,
      ).container;
    }

    it("renders an identical header in all three states", () => {
      const withRows = headerShape(renderIn({ data }));
      // Sanity: the reference header is the rich one, not an empty shell.
      expect(withRows).toHaveLength(4);
      expect(withRows[2]).toMatchObject({ ariaSort: "ascending", sortIcons: 1 });

      expect(headerShape(renderIn({ data, loading: true }))).toEqual(withRows);
      expect(headerShape(renderIn({ data: [] }))).toEqual(withRows);
    });

    it("spans the empty-state cell across exactly the columns the header renders", () => {
      const container = renderIn({ data: [] });
      const headerCount = container.querySelectorAll("thead th").length;
      const emptyCell = container.querySelector("tbody td");
      expect(emptyCell).toHaveAttribute("colspan", String(headerCount));
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Footer and pager survive every state (#358)                      */
  /* ---------------------------------------------------------------- */

  describe("footer and pagination in the loading and empty states", () => {
    function renderWithPager(extra: { data: Item[]; loading?: boolean }) {
      return render(
        <DataTable
          data={extra.data}
          loading={extra.loading}
          columns={columns}
          rowKey={rowKey}
          page={3}
          totalPages={5}
          onPageChange={vi.fn()}
          footer={<button type="button">Load more</button>}
        />,
      ).container;
    }

    function counts(container: HTMLElement) {
      return {
        pagers: container.querySelectorAll("nav[aria-label='Pagination']").length,
        footers: [...container.querySelectorAll("button")].filter(
          (b) => b.textContent === "Load more",
        ).length,
      };
    }

    it("keeps both when the current page comes back empty", () => {
      expect(counts(renderWithPager({ data: [] }))).toEqual({ pagers: 1, footers: 1 });
    });

    it("keeps both while loading", () => {
      expect(counts(renderWithPager({ data, loading: true }))).toEqual({
        pagers: 1,
        footers: 1,
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Paging mode locks on the first render                            */
  /* ---------------------------------------------------------------- */

  it("stays page-controlled when the parent momentarily passes undefined", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const five: Item[] = [
      { id: 1, name: "A", age: 1 },
      { id: 2, name: "B", age: 2 },
      { id: 3, name: "C", age: 3 },
      { id: 4, name: "D", age: 4 },
      { id: 5, name: "E", age: 5 },
    ];

    // The server owns the page and this parent deliberately ignores the
    // requested one, so any slice movement can only come from internal state.
    function Harness() {
      const [page, setPage] = useState<number | undefined>(2);
      return (
        <>
          <button type="button" onClick={() => setPage(undefined)}>
            clear
          </button>
          <DataTable
            data={five}
            columns={columns}
            rowKey={rowKey}
            pageSize={2}
            page={page}
            onPageChange={onPageChange}
          />
        </>
      );
    }

    render(<Harness />);
    expect(bodyFirstCells()).toEqual(["C", "D"]);

    await user.click(screen.getByRole("button", { name: "clear" }));
    expect(bodyFirstCells()).toEqual(["A", "B"]);

    await user.click(screen.getByRole("button", { name: /^page 3$/i }));
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    // Still controlled: the parent ignored the request, so the slice must not move.
    expect(bodyFirstCells()).toEqual(["A", "B"]);
  });

  it("keeps the pager when an uncontrolled table is handed a late page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    // The ordinary async-fetch parent: `page` is undefined on mount and arrives
    // once the first response lands. Locking the paging MODE is intended — the
    // late `page` value is ignored — but the pager itself is not a mode concern.
    function Harness() {
      const [page, setPage] = useState<number | undefined>(undefined);
      return (
        <>
          <button type="button" onClick={() => setPage(1)}>
            arrive
          </button>
          <DataTable
            data={data}
            columns={columns}
            rowKey={rowKey}
            page={page}
            totalPages={5}
            onPageChange={onPageChange}
          />
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "arrive" }));

    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toBeInTheDocument();

    // …and it is a working pager, not just present.
    await user.click(screen.getByRole("button", { name: /^page 3$/i }));
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("renders the footer slot", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        footer={<button type="button">Load more</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
  });

  describe("expandable rows", () => {
    it("adds a leading expander toggle when renderExpanded is provided", () => {
      render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          renderExpanded={(row) => <div>Detail for {row.name}</div>}
        />,
      );
      expect(screen.getAllByRole("button", { name: "Expand row" })).toHaveLength(2);
    });

    it("reveals and hides the detail row on toggle (uncontrolled)", async () => {
      const user = userEvent.setup();
      render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          renderExpanded={(row) => <div>Detail for {row.name}</div>}
        />,
      );

      expect(screen.queryByText("Detail for Alice")).not.toBeInTheDocument();
      const [firstToggle] = screen.getAllByRole("button", { name: "Expand row" });
      await user.click(firstToggle);
      expect(screen.getByText("Detail for Alice")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Collapse row" }));
      expect(screen.queryByText("Detail for Alice")).not.toBeInTheDocument();
    });

    it("spans the detail cell across every column (expander + selection + data)", async () => {
      const user = userEvent.setup();
      render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          selectable
          selectedKeys={new Set()}
          onSelectionChange={() => {}}
          renderExpanded={(row) => <div>Detail for {row.name}</div>}
        />,
      );
      await user.click(screen.getAllByRole("button", { name: "Expand row" })[0]);
      const detailCell = screen.getByText("Detail for Alice").closest("td");
      // 2 data columns + selection + expander = 4
      expect(detailCell).toHaveAttribute("colspan", "4");
    });

    it("supports controlled expansion via expandedKeys", () => {
      const onExpandedChange = vi.fn();
      render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          expandedKeys={new Set([1])}
          onExpandedChange={onExpandedChange}
          renderExpanded={(row) => <div>Detail for {row.name}</div>}
        />,
      );
      // Row 1 starts expanded because it's in the controlled set.
      expect(screen.getByText("Detail for Alice")).toBeInTheDocument();
      expect(screen.queryByText("Detail for Bob")).not.toBeInTheDocument();
    });

    it("does not render an expander column when renderExpanded is omitted", () => {
      render(<DataTable data={data} columns={columns} rowKey={rowKey} />);
      expect(screen.queryByRole("button", { name: "Expand row" })).not.toBeInTheDocument();
    });
  });
});

/**
 * Zebra parity used to be `:nth-child(even)` in the stylesheet, so an open
 * detail row — a real `<tr>` sitting between two data rows — flipped the band
 * on every row below it. Parity now comes from the data index, which no DOM
 * insertion can move.
 */
describe("#365 · an expanded detail row does not invert the zebra below it", () => {
  const four: Item[] = [
    { id: 1, name: "Alice", age: 30 },
    { id: 2, name: "Bob", age: 25 },
    { id: 3, name: "Carol", age: 41 },
    { id: 4, name: "Dan", age: 38 },
  ];

  /** Banding of the data rows only, in order. Detail rows are not data. */
  function bands(container: HTMLElement) {
    return Array.from(container.querySelectorAll("tbody tr.table-row"))
      .filter((row) => !row.classList.contains("data-table-expanded-row"))
      .map((row) => row.classList.contains("table-row--striped"));
  }

  it("bands alternate rows before and after a row is expanded", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DataTable
        data={four}
        columns={columns}
        rowKey={rowKey}
        striped
        renderExpanded={(row) => <div>Detail for {row.name}</div>}
      />,
    );

    expect(bands(container)).toEqual([false, true, false, true]);

    await user.click(screen.getAllByRole("button", { name: "Expand row" })[0]);

    expect(screen.getByText(/Detail for Alice/)).toBeInTheDocument();
    expect(bands(container)).toEqual([false, true, false, true]);
  });
});

/**
 * `rowKey`, `column.render` and `renderExpanded` used to receive the index
 * within the current page slice, so page 2 restarted at 0 and an index-based
 * key collided across pages. They now receive the position in the sorted
 * dataset — except in server mode, where this component is handed one page and
 * never told the page size, so no offset is derivable.
 */
describe("#360 · the index argument counts the dataset", () => {
  const ten: Item[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
    age: 20 + i,
  }));

  const numbered: ColumnDef<Item>[] = [
    { key: "name", header: "Name" },
    { key: "num", header: "#", render: (_row, i) => `row-${i}` },
  ];

  it("continues numbering onto page 2 when this component paginates", async () => {
    const user = userEvent.setup();
    render(
      <DataTable data={ten} columns={numbered} rowKey={rowKey} pageSize={4} />,
    );

    expect(screen.getByText("row-0")).toBeInTheDocument();
    expect(screen.getByText("row-3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("row-4")).toBeInTheDocument();
    expect(screen.getByText("row-7")).toBeInTheDocument();
    expect(screen.queryByText("row-0")).not.toBeInTheDocument();
  });

  it("passes the dataset index to rowKey, so keys do not collide across pages", async () => {
    const user = userEvent.setup();
    const seen: number[] = [];
    render(
      <DataTable
        data={ten}
        columns={columns}
        rowKey={(_row, i) => {
          seen.push(i);
          return i;
        }}
        pageSize={4}
      />,
    );
    seen.length = 0;

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(Math.min(...seen)).toBe(4);
    expect(seen).not.toContain(0);
  });

  it("restarts per page in server mode, where no offset is knowable", async () => {
    const user = userEvent.setup();
    function Server() {
      const [page, setPage] = useState(1);
      const slice = ten.slice((page - 1) * 4, page * 4);
      return (
        <DataTable
          data={slice}
          columns={numbered}
          rowKey={rowKey}
          page={page}
          totalPages={3}
          onPageChange={setPage}
        />
      );
    }
    render(<Server />);

    expect(screen.getByText("row-0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("row-0")).toBeInTheDocument();
  });
});

/**
 * `stickyHeader` pins `<thead>` against the wrapper `<div>` Table renders —
 * `overflow-x: auto` there makes the wrapper's `overflow-y` compute to `auto`,
 * so it, not the viewport, is the header's scrollport. Content-height, it never
 * scrolls, and the header never moves. `maxHeight` is the bound; DataTable had
 * no prop of any kind that reached the wrapper.
 */
describe("#361 · maxHeight reaches the scrollport the header pins to", () => {
  // jsdom performs no layout, so no test here can observe the header pinning.
  // These assert the DOM precondition only: the bound lands on the element
  // that is the scrollport.
  it("puts the bound on the wrapper alongside the sticky class", () => {
    const { container } = render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        stickyHeader
        maxHeight="20rem"
      />,
    );

    const wrapper = container.querySelector(".table-wrapper");
    expect(wrapper).toHaveStyle({ maxHeight: "20rem" });
    expect(screen.getByRole("table")).toHaveClass("table--sticky-header");
  });

  it("takes a number as pixels", () => {
    const { container } = render(
      <DataTable data={data} columns={columns} rowKey={rowKey} maxHeight={320} />,
    );

    expect(container.querySelector(".table-wrapper")).toHaveStyle({
      maxHeight: "320px",
    });
  });

  it("sets nothing when it is omitted", () => {
    const { container } = render(
      <DataTable data={data} columns={columns} rowKey={rowKey} stickyHeader />,
    );

    const wrapper = container.querySelector(".table-wrapper") as HTMLElement;
    expect(wrapper.style.maxHeight).toBe("");
  });
});

/**
 * `defaultSort` seeds an uncontrolled sort; `page` had no twin, so opening on
 * page 3 meant taking full control of `page` + `onPageChange` and
 * re-implementing the paging this component already does.
 */
describe("#463 · defaultPage seeds the uncontrolled page", () => {
  const five: Item[] = [
    { id: 1, name: "A", age: 1 },
    { id: 2, name: "B", age: 2 },
    { id: 3, name: "C", age: 3 },
    { id: 4, name: "D", age: 4 },
    { id: 5, name: "E", age: 5 },
  ];

  function firstCells(): string[] {
    const rowgroups = screen.getAllByRole("rowgroup");
    const body = rowgroups[rowgroups.length - 1];
    return within(body)
      .getAllByRole("row")
      .map((r) => within(r).getAllByRole("cell")[0].textContent ?? "");
  }

  it("mounts on the seeded page and then keeps managing itself", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        data={five}
        columns={columns}
        rowKey={rowKey}
        pageSize={2}
        defaultPage={3}
      />,
    );

    expect(firstCells()).toEqual(["E"]);

    await user.click(screen.getByRole("button", { name: /^page 1$/i }));
    expect(firstCells()).toEqual(["A", "B"]);
  });

  it("still reports through onPageChange without being controlled", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        data={five}
        columns={columns}
        rowKey={rowKey}
        pageSize={2}
        defaultPage={2}
        onPageChange={onPageChange}
      />,
    );

    expect(firstCells()).toEqual(["C", "D"]);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(firstCells()).toEqual(["E"]);
  });

  it("is ignored when page is controlled, exactly as defaultSort is", () => {
    render(
      <DataTable
        data={five}
        columns={columns}
        rowKey={rowKey}
        pageSize={2}
        page={1}
        defaultPage={3}
        onPageChange={vi.fn()}
      />,
    );

    expect(firstCells()).toEqual(["A", "B"]);
  });

  it("seeds a server-paged table too, where this component slices nothing", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        rowKey={rowKey}
        totalPages={5}
        defaultPage={4}
        onPageChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /^page 4$/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  /* ---------------------------------------------------------------- */
  /*  className + classNames                                           */
  /* ---------------------------------------------------------------- */

  describe("className and classNames", () => {
    const expanded = { renderExpanded: (row: Item) => <p>Detail for {row.name}</p> };

    /** Expand the first row so the detail-row internals exist. */
    async function renderExpanded(props: Partial<ComponentProps<typeof DataTable<Item>>> = {}) {
      const user = userEvent.setup();
      const result = render(
        <DataTable data={data} columns={columns} rowKey={rowKey} {...expanded} {...props} />,
      );
      await user.click(screen.getAllByRole("button", { name: "Expand row" })[0]);
      return result;
    }

    // Exact string, not `toContain`: arrival and the collapse of the caller's
    // own conflicting utilities are one assertion.
    it("lands className on the outermost element, collapsing conflicting utilities", () => {
      const { container } = render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          className="sentinel-root p-r3 p-r5"
        />,
      );
      expect(container.firstElementChild!.getAttribute("class")).toBe("sentinel-root p-r5");
    });

    it("lands classNames.expandToggle on the toggle, beside its base classes", async () => {
      await renderExpanded({ classNames: { expandToggle: "sentinel-slot" } });
      const toggle = screen.getAllByRole("button", { name: "Collapse row" })[0];
      expect(toggle.getAttribute("class")).toContain("inline-flex");
      expect(toggle.getAttribute("class")).toContain("sentinel-slot");
    });

    it("lands classNames.expandedCell on the detail cell, beside its base classes", async () => {
      const { container } = await renderExpanded({
        classNames: { expandedCell: "sentinel-slot" },
      });
      const cell = container.querySelector(".data-table-expanded-cell");
      expect(cell!.getAttribute("class")).toContain("data-table-expanded-cell");
      expect(cell!.getAttribute("class")).toContain("sentinel-slot");
    });

    it("lands classNames.expandedBody on the detail body, beside its base classes", async () => {
      const { container } = await renderExpanded({
        classNames: { expandedBody: "sentinel-slot" },
      });
      const body = container.querySelector(".data-table-expanded-body");
      expect(body!.getAttribute("class")).toContain("data-table-expanded-body--comfortable");
      expect(body!.getAttribute("class")).toContain("sentinel-slot");
    });

    it("leaves every base class alone when no slot is passed", async () => {
      const { container } = await renderExpanded();
      // `toBe`, not `toContain`: a merge that drops the library class when the
      // slot is `undefined` passes `toContain` and fails here.
      expect(container.querySelector(".data-table-expanded-cell")!.getAttribute("class")).toBe(
        "table-cell table-cell--comfortable data-table-expanded-cell bg-surface-2",
      );
      expect(container.querySelector(".data-table-expanded-body")!.getAttribute("class")).toBe(
        "data-table-expanded-body data-table-expanded-body--comfortable",
      );
    });

    it("does not put a slot class on the root", async () => {
      const { container } = await renderExpanded({
        className: "sentinel-root",
        classNames: { expandedBody: "sentinel-slot" },
      });
      expect(container.firstElementChild!.getAttribute("class")).toBe("sentinel-root");
    });

    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          // @ts-expect-error — `expandedRow` is not a slot; only untyped JS gets here.
          classNames={{ expandedRow: "sentinel-slot" }}
        />,
      );
      expect(container.querySelector(".sentinel-slot")).toBeNull();
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          classNames={{ expandToggle: "sentinel-slot" }}
        />,
      );
      expect(container.querySelector("[classnames]")).toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  tableProps / paginationProps hatches                             */
  /* ---------------------------------------------------------------- */

  describe("props hatches", () => {
    it("merges tableProps into the aria-busy it derives from loading", () => {
      const { container } = render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          loading
          tableProps={{ "aria-label": "Invoices", className: "sentinel-slot" }}
        />,
      );
      const table = container.querySelector("table")!;
      expect(table).toHaveAttribute("aria-label", "Invoices");
      expect(table).toHaveAttribute("aria-busy", "true");
      expect(table.getAttribute("class")).toBe("table sentinel-slot");
    });

    it("does not erase a caller's aria-busy when it is not loading", () => {
      const { container } = render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          tableProps={{ "aria-busy": true }}
        />,
      );
      expect(container.querySelector("table")).toHaveAttribute("aria-busy", "true");
    });

    it("reaches Pagination through paginationProps", () => {
      render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          pageSize={1}
          paginationProps={{ className: "sentinel-slot", variant: "compact" }}
        />,
      );
      const nav = screen.getByRole("navigation", { name: "Pagination" });
      expect(nav.getAttribute("class")).toContain("pagination");
      expect(nav.getAttribute("class")).toContain("sentinel-slot");
    });

    it("cannot use paginationProps to rewrite the page wiring", () => {
      render(
        <DataTable
          data={data}
          columns={columns}
          rowKey={rowKey}
          pageSize={1}
          // @ts-expect-error — `page` is Omitted from the hatch; DataTable owns it.
          paginationProps={{ page: 99 }}
        />,
      );
      expect(screen.getByRole("button", { name: /^page 1$/i })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });
});
