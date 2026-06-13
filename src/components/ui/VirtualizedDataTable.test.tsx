import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./data-table-utils";
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
