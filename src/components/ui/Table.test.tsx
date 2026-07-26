import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { describe, expect, it, vi } from "vitest";

import { Table } from "./Table";

type HeaderCellProps = ComponentPropsWithoutRef<typeof Table.HeaderCell>;

function renderSortableTable(headerCellProps: HeaderCellProps) {
  return render(
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell {...headerCellProps}>Name</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Cell</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>,
  );
}

describe("Table", () => {
  it("renders a <table> element", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveClass("table");
  });

  it("Table.Head renders <thead> and Table.Body renders <tbody>", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const rowgroups = screen.getAllByRole("rowgroup");
    expect(rowgroups.length).toBe(2);
    const thead = screen.getByRole("table").querySelector("thead");
    expect(thead).toBeInTheDocument();
    expect(thead).toHaveClass("table-head");

    const tbody = screen.getByRole("table").querySelector("tbody");
    expect(tbody).toBeInTheDocument();
    expect(tbody).toHaveClass("table-body");
  });

  it("Table.Row renders <tr>, Table.Cell renders <td>, Table.HeaderCell renders <th>", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(2);
    expect(rows[0]).toHaveClass("table-row");

    expect(screen.getByRole("columnheader")).toBeInTheDocument();
    expect(screen.getByRole("columnheader")).toHaveClass("table-header-cell");

    expect(screen.getByRole("cell")).toBeInTheDocument();
    expect(screen.getByRole("cell")).toHaveClass("table-cell");
  });

  it("stickyHeader prop adds 'table--sticky-header' class to <table> element", () => {
    render(
      <Table stickyHeader>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(screen.getByRole("table")).toHaveClass("table--sticky-header");
  });

  it("striped prop causes rows to get 'table-row--striped' class", () => {
    render(
      <Table striped>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Row 1</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Row 2</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    // `.some()` here would pass whether one row carried the class or every row
    // did. The banding is the assertion, so read it off in order: Table.Body
    // numbers its own children, and odd data indices are the painted band.
    const banded = screen
      .getAllByRole("row")
      .filter((row) => row.closest("tbody"))
      .map((row) => row.classList.contains("table-row--striped"));

    expect(banded).toEqual([false, true]);
  });

  it("does not band any row when striped is off", () => {
    render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Row 1</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Row 2</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(
      screen.getAllByRole("row").filter((r) => r.classList.contains("table-row--striped")),
    ).toHaveLength(0);
  });

  it("an explicit index wins over Table.Body's numbering", () => {
    render(
      <Table striped>
        <Table.Body>
          <Table.Row index={1}>
            <Table.Cell>First in the DOM, second in the data</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(screen.getAllByRole("row")[0]).toHaveClass("table-row--striped");
  });

  it("HeaderCell with sortDirection='asc' has aria-sort='ascending'", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell sortDirection="asc" onSort={vi.fn()}>
              Name
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("HeaderCell with sortDirection='desc' has aria-sort='descending'", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell sortDirection="desc" onSort={vi.fn()}>
              Name
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("HeaderCell onSort callback fires on click", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell sortDirection={false} onSort={onSort}>
              Name
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    await user.click(screen.getByRole("columnheader"));
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it("Row selected prop applies 'table-row--selected' class", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row selected>
            <Table.Cell>Selected Row</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Normal Row</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const rows = screen.getAllByRole("row");
    const bodyRows = rows.filter((row) => row.closest("tbody"));
    expect(bodyRows[0]).toHaveClass("table-row--selected");
    expect(bodyRows[1]).not.toHaveClass("table-row--selected");
  });

  it("forwards className on root wrapper", () => {
    const { container } = render(
      <Table className="custom-class">
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("table-wrapper");
    expect(wrapper).toHaveClass("custom-class");
  });

  /* ---------------------------------------------------------------- */
  /*  #349 · the inner <table> is reachable                            */
  /* ---------------------------------------------------------------- */

  describe("tableProps reach the <table>, everything else the wrapper", () => {
    function renderWith(props: ComponentPropsWithoutRef<typeof Table>) {
      return render(
        <Table {...props}>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>Header</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Cell</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>,
      );
    }

    it("names the table itself", () => {
      renderWith({ tableProps: { "aria-label": "Invoices" } });

      expect(screen.getByRole("table", { name: "Invoices" })).toBeInTheDocument();
    });

    it("merges its className with the component's own", () => {
      renderWith({ tableProps: { className: "fixed-layout" }, stickyHeader: true });

      const table = screen.getByRole("table");
      expect(table).toHaveClass("table");
      expect(table).toHaveClass("table--sticky-header");
      expect(table).toHaveClass("fixed-layout");
    });

    it("leaves the wrapper's own props on the wrapper", () => {
      const { container } = renderWith({
        className: "wrap",
        tableProps: { "aria-rowcount": 500 },
      });

      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass("table-wrapper", "wrap");
      expect(wrapper).not.toHaveAttribute("aria-rowcount");
      expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "500");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  #355 · a direction announced is a direction shown                */
  /* ---------------------------------------------------------------- */

  describe("sortDirection without onSort", () => {
    it("shows the arrow it announces", () => {
      renderSortableTable({ sortDirection: "desc" });

      const header = screen.getByRole("columnheader");
      expect(header).toHaveAttribute("aria-sort", "descending");
      expect(header.querySelectorAll(".table-header-cell__sort-icon--active")).toHaveLength(1);
    });

    it("stays non-interactive: no tabIndex, no sortable styling", () => {
      renderSortableTable({ sortDirection: "asc" });

      const header = screen.getByRole("columnheader");
      expect(header).not.toHaveAttribute("tabindex");
      expect(header).not.toHaveClass("table-header-cell--sortable");
    });

    it("announces and shows nothing when there is no direction and no onSort", () => {
      renderSortableTable({ sortDirection: false });

      const header = screen.getByRole("columnheader");
      expect(header).not.toHaveAttribute("aria-sort");
      expect(header.querySelectorAll("[class*='sort-icon']")).toHaveLength(0);
    });
  });

  describe("HeaderCell keyboard sorting", () => {
    it("Enter on a sortable header fires onSort exactly once", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      renderSortableTable({ onSort });

      screen.getByRole("columnheader").focus();
      await user.keyboard("{Enter}");

      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it("Space on a sortable header fires onSort exactly once", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      renderSortableTable({ onSort });

      screen.getByRole("columnheader").focus();
      await user.keyboard(" ");

      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it("a non-sort key does not fire onSort", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      renderSortableTable({ onSort });

      screen.getByRole("columnheader").focus();
      await user.keyboard("{ArrowDown}");

      expect(onSort).not.toHaveBeenCalled();
    });
  });

  describe("HeaderCell composes caller handlers (#350)", () => {
    it("caller onClick fires exactly once and onSort still runs", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onClick = vi.fn();
      renderSortableTable({ onSort, onClick });

      await user.click(screen.getByRole("columnheader"));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it("caller onKeyDown fires exactly once and Enter still runs onSort", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onKeyDown = vi.fn();
      renderSortableTable({ onSort, onKeyDown });

      screen.getByRole("columnheader").focus();
      await user.keyboard("{Enter}");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it("caller onClick calling preventDefault suppresses onSort", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onClick = vi.fn((e: ReactMouseEvent<HTMLTableCellElement>) => {
        e.preventDefault();
      });
      renderSortableTable({ onSort, onClick });

      await user.click(screen.getByRole("columnheader"));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSort).not.toHaveBeenCalled();
    });

    it("caller onKeyDown calling preventDefault suppresses onSort", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onKeyDown = vi.fn((e: ReactKeyboardEvent<HTMLTableCellElement>) => {
        e.preventDefault();
      });
      renderSortableTable({ onSort, onKeyDown });

      screen.getByRole("columnheader").focus();
      await user.keyboard("{Enter}");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onSort).not.toHaveBeenCalled();
    });

    it("a non-sortable header still runs the caller's handlers", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onKeyDown = vi.fn();
      renderSortableTable({ onClick, onKeyDown, tabIndex: 0 });

      const header = screen.getByRole("columnheader");
      await user.click(header);
      expect(onClick).toHaveBeenCalledTimes(1);

      header.focus();
      await user.keyboard("{Enter}");
      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });
  });
});
