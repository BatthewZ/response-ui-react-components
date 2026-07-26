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
  /*  #352 · stickyHeader needs a bounded scrollport                   */
  /* ---------------------------------------------------------------- */

  describe("maxHeight bounds the wrapper the sticky header pins to", () => {
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

    // jsdom performs no layout, so nothing here can observe the header
    // actually pinning. What is asserted is the DOM precondition the pin
    // needs: the bound lands on the wrapper — which `overflow-x: auto` makes
    // the header's scrollport — and not on the <table>.
    it("puts the bound on the wrapper, not the table", () => {
      const { container } = renderWith({ maxHeight: "9rem", stickyHeader: true });

      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass("table-wrapper");
      expect(wrapper).toHaveStyle({ maxHeight: "9rem" });
      expect(screen.getByRole("table")).toHaveClass("table--sticky-header");
      expect(screen.getByRole("table")).not.toHaveStyle({ maxHeight: "9rem" });
    });

    it("takes a number as pixels", () => {
      const { container } = renderWith({ maxHeight: 320 });

      expect(container.firstElementChild).toHaveStyle({ maxHeight: "320px" });
    });

    it("sets nothing when it is omitted", () => {
      const { container } = renderWith({ stickyHeader: true });

      expect(container.firstElementChild).not.toHaveStyle({ maxHeight: "9rem" });
      expect((container.firstElementChild as HTMLElement).style.maxHeight).toBe("");
    });

    it("keeps the rest of an explicit style, and lets that style win on the same key", () => {
      const { container } = renderWith({
        maxHeight: "9rem",
        style: { maxHeight: "12rem", overflowY: "scroll" },
      });

      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveStyle({ maxHeight: "12rem", overflowY: "scroll" });
    });

    it("survives a style that says nothing about height", () => {
      const { container } = renderWith({
        maxHeight: "9rem",
        style: { overflowY: "scroll" },
      });

      expect(container.firstElementChild).toHaveStyle({
        maxHeight: "9rem",
        overflowY: "scroll",
      });
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

  /* ---------------------------------------------------------------- */
  /*  #353 · the sort control is a real button                         */
  /* ---------------------------------------------------------------- */

  describe("a sortable header wraps its label in a <button>", () => {
    // jsdom computes the IMPLICIT role whatever the markup says, so
    // `getByRole("button")` would find a `<div role="button">`, a `<th
    // role="button">` and a real `<button>` alike. These assert the element
    // TYPE and the attributes that actually carry the fix.
    it("renders a real <button type='button'> inside the columnheader", () => {
      renderSortableTable({ onSort: vi.fn() });

      const header = screen.getByRole("columnheader");
      const button = header.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe("BUTTON");
      // Without this a sortable header inside a <form> submits it.
      expect(button).toHaveAttribute("type", "button");
    });

    it("moves the tab stop off the <th> and onto the button", async () => {
      const user = userEvent.setup();
      renderSortableTable({ onSort: vi.fn() });

      const header = screen.getByRole("columnheader");
      expect(header).not.toHaveAttribute("tabindex");

      await user.tab();
      expect(document.activeElement).toBe(header.querySelector("button"));
    });

    it("names the button with the action and the column", () => {
      renderSortableTable({ onSort: vi.fn() });

      expect(screen.getByRole("button", { name: "Sort by Name" })).toBeInTheDocument();
    });

    // Measured in Firefox before this attribute existed: the header computed as
    // `columnheader "Sort by Customer"`, because accname excludes a hidden node
    // only while it is "not directly referenced by aria-labelledby" — and the
    // action span is. Every data cell in the column inherits that name, so the
    // verb would be read with every value.
    it("leaves the columnheader named by the column alone, not by the action", () => {
      renderSortableTable({ onSort: vi.fn() });

      expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: "Sort by Name" })).toBeNull();
    });

    it("sortLabel replaces the default words, and '' leaves the column alone", () => {
      const { unmount } = renderSortableTable({ onSort: vi.fn(), sortLabel: "Trier par" });
      expect(screen.getByRole("button", { name: "Trier par Name" })).toBeInTheDocument();
      unmount();

      renderSortableTable({ onSort: vi.fn(), sortLabel: "" });
      expect(screen.getByRole("button", { name: "Name" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader").querySelector(".sr-only")).toBeNull();
    });

    // aria-sort is a property of the `columnheader` role. ARIA 1.2 does not
    // support it on `button`, so putting it on the control would drop it.
    it("keeps aria-sort on the <th> and never puts it on the button", () => {
      renderSortableTable({ onSort: vi.fn(), sortDirection: "asc" });

      const header = screen.getByRole("columnheader");
      expect(header).toHaveAttribute("aria-sort", "ascending");
      expect(header.querySelector("button")).not.toHaveAttribute("aria-sort");
    });

    // The direction is already spoken from aria-sort; an arrow that reached the
    // accessible name would make the button announce it a second time.
    it("keeps the arrow out of the button's accessible name", () => {
      renderSortableTable({ onSort: vi.fn(), sortDirection: "desc" });

      const icon = screen.getByRole("columnheader").querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByRole("button", { name: "Sort by Name" })).toBeInTheDocument();
    });

    it("renders no button when there is no onSort", () => {
      renderSortableTable({ sortDirection: "asc" });

      expect(screen.getByRole("columnheader").querySelector("button")).toBeNull();
    });
  });

  // The tab stop is the button now (#353), so these focus it rather than the
  // <th>. The keys are not handled by the component at all: the button's own
  // activation behaviour turns Enter/Space into the click the <th> composes.
  const sortButton = () =>
    screen.getByRole("columnheader").querySelector("button") as HTMLButtonElement;

  describe("HeaderCell keyboard sorting", () => {
    it("Enter on a sortable header fires onSort exactly once", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      renderSortableTable({ onSort });

      sortButton().focus();
      await user.keyboard("{Enter}");

      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it("Space on a sortable header fires onSort exactly once", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      renderSortableTable({ onSort });

      sortButton().focus();
      await user.keyboard(" ");

      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it("a non-sort key does not fire onSort", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      renderSortableTable({ onSort });

      sortButton().focus();
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

    it("caller onClick fires exactly once when the button itself is clicked", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onClick = vi.fn();
      renderSortableTable({ onSort, onClick });

      // The click that matters after #353: it starts on the button and reaches
      // the caller's handler by bubbling. Once, not twice, and still ordered
      // caller-then-onSort.
      await user.click(sortButton());

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledTimes(1);
      expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(
        onSort.mock.invocationCallOrder[0],
      );
    });

    it("caller onKeyDown fires exactly once and Enter still runs onSort", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onKeyDown = vi.fn();
      renderSortableTable({ onSort, onKeyDown });

      sortButton().focus();
      await user.keyboard("{Enter}");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledTimes(1);
      expect(onKeyDown.mock.invocationCallOrder[0]).toBeLessThan(
        onSort.mock.invocationCallOrder[0],
      );
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

    it("caller onKeyDown calling preventDefault suppresses onSort — Enter", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onClick = vi.fn();
      const onKeyDown = vi.fn((e: ReactKeyboardEvent<HTMLTableCellElement>) => {
        e.preventDefault();
      });
      renderSortableTable({ onSort, onClick, onKeyDown });

      sortButton().focus();
      await user.keyboard("{Enter}");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      // The opt-out now works by suppressing the button's activation, so no
      // click is synthesised either — assert that, or the mechanism could break
      // while onSort stayed silent for some other reason.
      expect(onClick).not.toHaveBeenCalled();
      expect(onSort).not.toHaveBeenCalled();
    });

    it("caller onKeyDown calling preventDefault suppresses onSort — Space", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onClick = vi.fn();
      const onKeyDown = vi.fn((e: ReactKeyboardEvent<HTMLTableCellElement>) => {
        e.preventDefault();
      });
      renderSortableTable({ onSort, onClick, onKeyDown });

      sortButton().focus();
      await user.keyboard(" ");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
      expect(onSort).not.toHaveBeenCalled();
    });

    // The half of the contract that CHANGED with #353. Keyboard activation is
    // now a real click, so a caller's onClick runs on the key path too — it
    // used to run only on the pointer path.
    it("Enter now also runs the caller's onClick, because activation is a real click", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onClick = vi.fn();
      renderSortableTable({ onSort, onClick });

      sortButton().focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledTimes(1);
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
