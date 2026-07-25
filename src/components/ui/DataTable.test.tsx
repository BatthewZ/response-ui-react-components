import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
    render(
      <DataTable
        data={[]}
        columns={columns}
        rowKey={rowKey}
        loading
        loadingRowCount={3}
      />,
    );

    const skeletons = screen.getAllByRole("status", { name: /loading/i });
    expect(skeletons.length).toBeGreaterThan(0);
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
