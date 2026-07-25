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
    expect(onEndReached).toHaveBeenCalled();
    expect(container).toBeTruthy();
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
});
