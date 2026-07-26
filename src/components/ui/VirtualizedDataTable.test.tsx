import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach,describe, expect, it, vi } from "vitest";

import type { ColumnDef, SortState } from "./data-table-utils";
import { VirtualizedDataTable } from "./VirtualizedDataTable";

type Item = { id: number; name: string; value: number };

const columns: ColumnDef<Item>[] = [
  { key: "name", header: "Name" },
  { key: "value", header: "Value" },
];

const sortableColumns: ColumnDef<Item>[] = [
  { key: "name", header: "Name" },
  { key: "value", header: "Value", sortable: true },
];

const rowKey = (row: Item) => row.id;

function makeData(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, name: `Row ${i}`, value: i }));
}

/** Stub clientHeight on the scroll container (jsdom has no layout). */
function stubScrollerHeight(container: HTMLElement, clientHeight: number) {
  const el = container.querySelector(".table-virtual-scroll") as HTMLElement;
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
  return el;
}

describe("VirtualizedDataTable", () => {
  it("renders headers", () => {
    render(
      <VirtualizedDataTable data={makeData(10000)} columns={columns} rowKey={rowKey} rowHeight={40} />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
  });

  it("mounts only a window of rows, not the whole dataset", () => {
    const { container } = render(
      <VirtualizedDataTable data={makeData(10000)} columns={columns} rowKey={rowKey} rowHeight={40} />
    );

    const dataRows = container.querySelectorAll("tbody tr.table-row");
    expect(dataRows.length).toBeGreaterThan(0);
    expect(dataRows.length).toBeLessThan(50); // window + overscan, NOT 10000

    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.queryByText("Row 9999")).not.toBeInTheDocument();
  });

  it("renders a spacer row to preserve scroll height", () => {
    const { container } = render(
      <VirtualizedDataTable data={makeData(10000)} columns={columns} rowKey={rowKey} rowHeight={40} />
    );
    const spacers = container.querySelectorAll(".table-virtual-spacer[aria-hidden]");
    expect(spacers.length).toBeGreaterThan(0);
  });

  it("renders a different window after scrolling", () => {
    const { container } = render(
      <VirtualizedDataTable data={makeData(10000)} columns={columns} rowKey={rowKey} rowHeight={40} />
    );

    const scroller = stubScrollerHeight(container, 400);
    act(() => {
      scroller.scrollTop = 4000; // 100 rows down
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByText("Row 100")).toBeInTheDocument();
    expect(screen.queryByText("Row 0")).not.toBeInTheDocument();
  });

  it("sorts the whole dataset when uncontrolled", async () => {
    const user = userEvent.setup();
    const data: Item[] = [
      { id: 1, name: "B", value: 3 },
      { id: 2, name: "A", value: 1 },
      { id: 3, name: "C", value: 2 },
    ];
    const { container } = render(
      <VirtualizedDataTable data={data} columns={sortableColumns} rowKey={rowKey} rowHeight={40} />
    );

    await user.click(screen.getByText("Value"));

    const firstRow = container.querySelector("tbody tr.table-row");
    expect(firstRow?.textContent).toContain("A"); // value 1 sorts first asc
  });

  it("does not reorder when sort is controlled", () => {
    const data: Item[] = [
      { id: 1, name: "B", value: 3 },
      { id: 2, name: "A", value: 1 },
    ];
    const { container } = render(
      <VirtualizedDataTable
        data={data}
        columns={sortableColumns}
        rowKey={rowKey}
        rowHeight={40}
        sort={{ key: "value", direction: "asc" }}
        onSortChange={vi.fn()}
      />
    );
    // Controlled => server-sorted => order preserved as given.
    const firstRow = container.querySelector("tbody tr.table-row");
    expect(firstRow?.textContent).toContain("B");
  });

  /* ---------------------------------------------------------------- */
  /*  Controlled sort round trip (#357)                                */
  /* ---------------------------------------------------------------- */

  describe("controlled sort round trip", () => {
    const unsorted: Item[] = [
      { id: 1, name: "B", value: 3 },
      { id: 2, name: "A", value: 1 },
      { id: 3, name: "C", value: 2 },
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
      const [sort, setSort] = useState<SortState | null>({ key: "value", direction: "asc" });
      return (
        <VirtualizedDataTable
          data={unsorted}
          columns={sortableColumns}
          rowKey={rowKey}
          rowHeight={40}
          defaultSort={{ key: "value", direction: "desc" }}
          sort={wrap(sort)}
          onSortChange={(next) => {
            onSortChange(next);
            setSort(next);
          }}
        />
      );
    }

    async function assertRoundTrip(wrap: (s: SortState | null) => SortState | null | undefined) {
      const user = userEvent.setup();
      const { container } = render(<Harness wrap={wrap} />);
      const names = () =>
        [...container.querySelectorAll("tbody tr.table-row")].map(
          (r) => r.querySelector("td")?.textContent ?? "",
        );

      expect(names()).toEqual(["B", "A", "C"]);

      await user.click(screen.getByText("Value")); // asc -> desc
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(onSortChange).toHaveBeenNthCalledWith(1, { key: "value", direction: "desc" });
      expect(names()).toEqual(["B", "A", "C"]);

      await user.click(screen.getByText("Value")); // desc -> null (clear)
      expect(onSortChange).toHaveBeenCalledTimes(2);
      expect(onSortChange).toHaveBeenNthCalledWith(2, null);
      // Still controlled: a controlled table never reorders rows itself.
      expect(names()).toEqual(["B", "A", "C"]);

      await user.click(screen.getByText("Value")); // null -> asc, cycle continues
      expect(onSortChange).toHaveBeenCalledTimes(3);
      expect(onSortChange).toHaveBeenNthCalledWith(3, { key: "value", direction: "asc" });
      expect(names()).toEqual(["B", "A", "C"]);
    }

    it("accepts the emitted null straight back as `sort` and stays controlled", async () => {
      await assertRoundTrip((s) => s);
    });

    it("stays controlled when a legacy `sort={sort ?? undefined}` clears", async () => {
      await assertRoundTrip((s) => s ?? undefined);
    });

    // Mirror direction: mounted UNCONTROLLED, so it must keep sorting
    // client-side once the prop starts arriving.
    it("stays uncontrolled when the prop only arrives after the first click", async () => {
      const user = userEvent.setup();

      function LateProp() {
        const [sort, setSort] = useState<SortState | null>(null);
        return (
          <VirtualizedDataTable
            data={unsorted}
            columns={sortableColumns}
            rowKey={rowKey}
            rowHeight={40}
            sort={sort ?? undefined}
            onSortChange={(next) => {
              onSortChange(next);
              setSort(next);
            }}
          />
        );
      }

      const { container } = render(<LateProp />);
      const names = () =>
        [...container.querySelectorAll("tbody tr.table-row")].map(
          (r) => r.querySelector("td")?.textContent ?? "",
        );

      expect(names()).toEqual(["B", "A", "C"]);

      await user.click(screen.getByText("Value")); // asc by value: A(1), C(2), B(3)
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(names()).toEqual(["A", "C", "B"]);

      await user.click(screen.getByText("Value")); // desc
      expect(onSortChange).toHaveBeenCalledTimes(2);
      expect(names()).toEqual(["B", "C", "A"]);

      await user.click(screen.getByText("Value")); // cleared
      expect(onSortChange).toHaveBeenCalledTimes(3);
      expect(onSortChange).toHaveBeenNthCalledWith(3, null);
      expect(names()).toEqual(["B", "A", "C"]);
    });
  });

  it("select-all selects every row in the dataset, not just the window", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <VirtualizedDataTable
        data={makeData(100)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByLabelText("Select all rows"));

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0].size).toBe(100);
  });

  it("toggles a single row's selection", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <VirtualizedDataTable
        data={makeData(10)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByLabelText("Select row 0"));

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0].has(0)).toBe(true);
  });

  it("fires onEndReached when the window nears the end", () => {
    const onEndReached = vi.fn();
    const { container } = render(
      <VirtualizedDataTable
        data={makeData(20)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        onEndReached={onEndReached}
      />
    );
    // 20 small rows: the initial window already reaches the end.
    // The source guards with a `firedRef` so this fires exactly once per arrival.
    expect(onEndReached).toHaveBeenCalledTimes(1);
    // …and the precondition is itself observable rather than assumed: the
    // window ends on row 15 of 20 — inside the default 8-row threshold.
    const rendered = container.querySelectorAll("tbody tr:not(.table-virtual-spacer)");
    expect(rendered).toHaveLength(16);
    expect(rendered[rendered.length - 1]).toHaveTextContent("Row 15");
  });

  /* ---------------------------------------------------------------- */
  /*  onEndReached re-arming (#442) and the loading branch (#374)       */
  /* ---------------------------------------------------------------- */

  it("fires again after the consumer appends a page (#442)", () => {
    const onEndReached = vi.fn();
    const props = { columns, rowKey, rowHeight: 40, onEndReached };
    const { rerender } = render(<VirtualizedDataTable data={makeData(20)} {...props} />);

    expect(onEndReached).toHaveBeenCalledTimes(1);

    // The consumer appends 4 rows. The window (16 rows) is still inside the
    // 8-row threshold of the new end, so nothing re-arms a boolean guard —
    // this is the append size that used to stall the loader for good.
    rerender(<VirtualizedDataTable data={makeData(24)} {...props} />);

    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it("does not fire twice for the same dataset (#442 does not re-break #374)", () => {
    const onEndReached = vi.fn();
    const data = makeData(20);
    const props = { data, columns, rowKey, rowHeight: 40, onEndReached };
    const { rerender } = render(<VirtualizedDataTable {...props} />);

    rerender(<VirtualizedDataTable {...props} striped />);
    rerender(<VirtualizedDataTable {...props} striped density="dense" />);

    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it("does not fire onEndReached while loading (#374)", () => {
    const onEndReached = vi.fn();
    render(
      <VirtualizedDataTable
        data={makeData(10)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        loading
        onEndReached={onEndReached}
      />
    );

    expect(onEndReached).not.toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /*  Selection (#369, #371)                                           */
  /* ---------------------------------------------------------------- */

  it("does not key the whole dataset when selection is off (#369)", () => {
    const keySpy = vi.fn((row: Item) => row.id);
    render(
      <VirtualizedDataTable
        data={makeData(1000)}
        columns={columns}
        rowKey={keySpy}
        rowHeight={40}
      />
    );

    // Only the mounted window needs a key. The select-all list — the one list a
    // virtualizer cannot window — must not be built when there is no select-all.
    expect(keySpy.mock.calls.length).toBeLessThan(100);
  });

  it("still keys the whole dataset when selection is on (#369 is not a capability cut)", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <VirtualizedDataTable
        data={makeData(100)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(screen.getByLabelText("Select all rows"));

    expect(onSelectionChange.mock.calls[0][0].size).toBe(100);
  });

  it("selectable alone gives working checkboxes (#371)", async () => {
    const user = userEvent.setup();
    render(
      <VirtualizedDataTable
        data={makeData(5)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        selectable
      />
    );

    const box = screen.getByLabelText("Select row 0") as HTMLInputElement;
    expect(box.checked).toBe(false);

    await user.click(box);
    expect(box.checked).toBe(true);

    await user.click(screen.getByLabelText("Select all rows"));
    expect(
      screen.getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked)
    ).toHaveLength(6); // 5 rows + the header box
  });

  // #373: the default name reads the raw row key aloud, in English, with no
  // way to override it.
  it("rowLabel names a row's checkbox", () => {
    render(
      <VirtualizedDataTable
        data={makeData(3)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        selectable
        rowLabel={(row) => `Sélectionner ${row.name}`}
      />
    );

    expect(screen.getByRole("checkbox", { name: "Sélectionner Row 0" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Select row 0")).not.toBeInTheDocument();
  });

  it("a controlled selection still wins over the internal one", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <VirtualizedDataTable
        data={makeData(5)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        selectable
        selectedKeys={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    const box = screen.getByLabelText("Select row 0") as HTMLInputElement;
    await user.click(box);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(box.checked).toBe(false); // the consumer did not feed the new set back
  });

  /* ---------------------------------------------------------------- */
  /*  Row counts for a windowed table (#372)                           */
  /* ---------------------------------------------------------------- */

  it("reports the dataset's row count and each row's place in it (#372)", () => {
    const { container } = render(
      <VirtualizedDataTable
        data={makeData(1000)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
      />
    );

    // 1000 data rows + the header row.
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "1001");
    expect(container.querySelector("thead tr")).toHaveAttribute("aria-rowindex", "1");

    const scroller = stubScrollerHeight(container, 400);
    act(() => {
      scroller.scrollTop = 40 * 100;
      scroller.dispatchEvent(new Event("scroll"));
    });

    // The mounted slice is nowhere near the top, and says so.
    const first = container.querySelector("tbody tr.table-row");
    expect(first).toHaveTextContent("Row 92"); // 100 - overscan
    expect(first).toHaveAttribute("aria-rowindex", "94"); // +1 header, +1 one-based
  });

  it("renders the empty state", () => {
    render(<VirtualizedDataTable data={[]} columns={columns} rowKey={rowKey} rowHeight={40} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders headers in the loading state", () => {
    render(
      <VirtualizedDataTable
        data={makeData(100)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        loading
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByText("Row 0")).not.toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  One header, three states (#447)                                  */
  /* ---------------------------------------------------------------- */

  describe("header parity across the loading, empty and data states", () => {
    const mixedColumns: ColumnDef<Item>[] = [
      { key: "name", header: "Name", sortable: true, width: 120 },
      { key: "value", header: "Value", align: "right" },
    ];

    /**
     * Every header attribute the render paths could drift on. The duplication
     * is the defect, so this compares WHOLE headers rather than naming today's
     * divergences — a future edit to one copy reddens it too.
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
        <VirtualizedDataTable
          data={extra.data}
          loading={extra.loading}
          columns={mixedColumns}
          rowKey={rowKey}
          rowHeight={40}
          defaultSort={{ key: "name", direction: "asc" }}
          selectable
          selectedKeys={new Set()}
          onSelectionChange={vi.fn()}
        />
      ).container;
    }

    it("renders an identical header in all three states", () => {
      const withRows = headerShape(renderIn({ data: makeData(10) }));
      // Sanity: the reference header is the rich one, not an empty shell.
      expect(withRows).toHaveLength(3);
      expect(withRows[1]).toMatchObject({ ariaSort: "ascending", sortIcons: 1 });

      expect(headerShape(renderIn({ data: makeData(10), loading: true }))).toEqual(withRows);
      expect(headerShape(renderIn({ data: [] }))).toEqual(withRows);
    });
  });
});

/**
 * The zebra used to be `:nth-child(even)` over the rendered window, and the
 * window carries a spacer `<tr>` whose presence depends on scroll position — so
 * the whole pattern inverted on every row scrolled. Parity now comes from the
 * dataset index, so a row's band is a property of the row, not of where the
 * viewport happens to be.
 */
describe("#368 · the zebra follows the dataset, not the scroll window", () => {
  /** Map of "Row N" → is it banded, for whatever is currently rendered. */
  function bandsByRow(container: HTMLElement) {
    const out: Record<string, boolean> = {};
    for (const row of container.querySelectorAll("tbody tr.table-row")) {
      const label = row.querySelector("td")?.textContent;
      if (label) out[label] = row.classList.contains("table-row--striped");
    }
    return out;
  }

  it("a row keeps its band after the window scrolls past it", () => {
    const { container } = render(
      <VirtualizedDataTable
        data={makeData(1000)}
        columns={columns}
        rowKey={rowKey}
        rowHeight={40}
        striped
      />,
    );
    const scroller = stubScrollerHeight(container, 400);

    const atTop = bandsByRow(container);
    expect(atTop["Row 0"]).toBe(false);
    expect(atTop["Row 1"]).toBe(true);

    act(() => {
      scroller.scrollTop = 40 * 5;
      scroller.dispatchEvent(new Event("scroll"));
    });

    const scrolled = bandsByRow(container);
    // Every row still rendered must report the band it had before the scroll.
    for (const [label, banded] of Object.entries(scrolled)) {
      if (label in atTop) expect(banded).toBe(atTop[label]);
    }
    // And the parity is still the dataset's, not the window's.
    for (const [label, banded] of Object.entries(scrolled)) {
      const n = Number(label.replace("Row ", ""));
      if (Number.isFinite(n)) expect(banded).toBe(n % 2 === 1);
    }
  });
});
