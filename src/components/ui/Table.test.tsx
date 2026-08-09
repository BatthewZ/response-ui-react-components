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

  /**
   * THE ONE INVARIANT THIS CONVERSION RELOCATED. `.table-row--selected` used to
   * be declared AFTER `.table-row--striped` in `Table.css`, at equal specificity,
   * so a selected banded row took the selection wash — and the stylesheet said so
   * in a comment. Both washes are utilities now, so the invariant is ARGUMENT
   * ORDER in `Table.Row`'s `cn()`: tailwind-merge keeps the last of two
   * conflicting `bg-*`. Swap the two arguments and selection is lost, silently, on
   * every banded row. This is the test that reddens.
   */
  it("keeps the selection wash on a row that is also banded", () => {
    render(
      <Table striped>
        <Table.Body>
          <Table.Row index={1} selected>
            <Table.Cell>Banded and selected</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const row = screen.getAllByRole("row")[0];
    // Both markers survive — a consumer stylesheet targets either.
    expect(row).toHaveClass("table-row--striped");
    expect(row).toHaveClass("table-row--selected");
    // …and exactly one background utility is left, the selection wash.
    expect(
      [...row.classList].filter((c) => c.startsWith("bg-")),
    ).toEqual(["bg-[color-mix(in_oklch,var(--C-ACCENT)_8%,transparent)]"]);
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

  /* ------------------------------------------------------------------ */
  /*  #351 · selection reaches assistive tech, and only when asked       */
  /* ------------------------------------------------------------------ */

  it("Row carries aria-selected and data-selected once `selected` is passed", () => {
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
          <Table.Row selected={false}>
            <Table.Cell>Selectable but unselected</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const bodyRows = screen
      .getAllByRole("row")
      .filter((row) => row.closest("tbody"));
    expect(bodyRows[0]).toHaveAttribute("aria-selected", "true");
    expect(bodyRows[0]).toHaveAttribute("data-selected", "true");
    expect(bodyRows[1]).toHaveAttribute("aria-selected", "false");
    expect(bodyRows[1]).not.toHaveAttribute("data-selected");
  });

  it("a row in a table with no selection says nothing about being selected", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Plain</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const bodyRow = screen
      .getAllByRole("row")
      .filter((row) => row.closest("tbody"))[0];
    expect(bodyRow).not.toHaveAttribute("aria-selected");
    expect(bodyRow).not.toHaveAttribute("data-selected");
  });

  it("a caller's own aria-selected still wins", () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Header</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row selected aria-selected={false}>
            <Table.Cell>Caller decides</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const bodyRow = screen
      .getAllByRole("row")
      .filter((row) => row.closest("tbody"))[0];
    expect(bodyRow).toHaveAttribute("aria-selected", "false");
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

  /* ---------------------------------------------------------------- */
  /*  classNames on Table.HeaderCell                                   */
  /* ---------------------------------------------------------------- */

  describe("HeaderCell classNames", () => {
    function renderCell(props: Partial<HeaderCellProps> = {}) {
      return render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell onSort={vi.fn()} sortDirection="asc" {...props}>
                Customer
              </Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body />
        </Table>,
      );
    }

    it("lands classNames.sortButton on the sort button, beside the base class", () => {
      renderCell({ classNames: { sortButton: "sentinel-slot" } });
      const button = screen.getByRole("button");
      expect(button.getAttribute("class")).toContain("table-header-cell__sort-button");
      expect(button.getAttribute("class")).toContain("sentinel-slot");
    });

    it("lands classNames.sortIcon on the direction glyph, beside its base classes", () => {
      const { container } = renderCell({ classNames: { sortIcon: "sentinel-slot" } });
      const icon = container.querySelector(".table-header-cell__sort-icon");
      expect(icon!.getAttribute("class")).toContain("table-header-cell__sort-icon--active");
      expect(icon!.getAttribute("class")).toContain("sentinel-slot");
    });

    /**
     * The button's attribute really is its marker alone: its rule is a RESET and
     * stayed in `Table.css` (a reset has to lose to a caller's class, which is
     * what `@layer components` buys it). The icon's did not, so its equality is
     * now a membership check plus the junk-token guard the equality was standing
     * in for — a merge that drops the library class when the slot is `undefined`
     * passes `toContain`, and fails the guard.
     */
    it("leaves both base classes alone when no slot is passed", () => {
      const { container } = renderCell();
      expect(screen.getByRole("button").getAttribute("class")).toBe(
        "table-header-cell__sort-button",
      );
      const icon =
        container.querySelector(".table-header-cell__sort-icon")!.getAttribute("class") ?? "";
      expect(icon.split(" ")).toEqual(
        expect.arrayContaining([
          "table-header-cell__sort-icon",
          "table-header-cell__sort-icon--active",
        ]),
      );
      expect(icon).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
    });

    it("does not put the slot classes on the cell itself", () => {
      renderCell({ classNames: { sortButton: "sentinel-a", sortIcon: "sentinel-b" } });
      const cell = screen.getByRole("columnheader");
      expect(cell.className).not.toContain("sentinel-a");
      expect(cell.className).not.toContain("sentinel-b");
    });

    it("rejects an unknown slot key at compile time", () => {
      renderCell({
        // @ts-expect-error — `sortGlyph` is not a slot; only untyped JS gets here.
        classNames: { sortGlyph: "sentinel-slot" },
      });
      expect(screen.getByRole("button").getAttribute("class")).toBe(
        "table-header-cell__sort-button",
      );
    });

    it("does not leak classNames onto the DOM", () => {
      renderCell({ classNames: { sortButton: "sentinel-slot" } });
      expect(screen.getByRole("columnheader").hasAttribute("classnames")).toBe(false);
    });

    it("names the sort-icon modifier statically in both directions", () => {
      const { container, rerender } = renderCell();
      expect(
        container.querySelector(".table-header-cell__sort-icon--active"),
      ).not.toBeNull();

      rerender(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell onSort={vi.fn()}>Customer</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body />
        </Table>,
      );
      expect(container.querySelector(".table-header-cell__sort-icon--muted")).not.toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  tableProps hatch                                                 */
  /* ---------------------------------------------------------------- */

  describe("tableProps", () => {
    it("merges its className after the component's own base classes", () => {
      const { container } = render(
        <Table stickyHeader tableProps={{ className: "sentinel-slot" }}>
          <Table.Body />
        </Table>,
      );
      const table = container.querySelector("table")!;
      const classes = (table.getAttribute("class") ?? "").split(" ");
      expect(classes).toEqual(
        expect.arrayContaining(["table", "table--sticky-header", "sentinel-slot"]),
      );
      // The bag's class is LAST, which is the whole point of the hatch: whatever
      // it carries out-ranks the component's own on the same tailwind-merge group.
      expect(classes[classes.length - 1]).toBe("sentinel-slot");
    });

    it("leaves the base classes alone with no bag", () => {
      const { container } = render(
        <Table>
          <Table.Body />
        </Table>,
      );
      const classes = container.querySelector("table")!.getAttribute("class") ?? "";
      expect(classes.split(" ")).toContain("table");
      expect(classes.split(" ")).not.toContain("table--sticky-header");
      expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
    });

    it("still forwards the rest of the bag", () => {
      const { container } = render(
        <Table tableProps={{ className: "sentinel-slot", "aria-label": "Invoices" }}>
          <Table.Body />
        </Table>,
      );
      expect(container.querySelector("table")).toHaveAttribute("aria-label", "Invoices");
    });
  });

  describe("chrome", () => {
    function renderChrome(props: ComponentPropsWithoutRef<typeof Table> = {}) {
      return render(
        <Table {...props}>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>H</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>a</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>b</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>,
      );
    }

    const wrapperOf = (c: HTMLElement) => c.querySelector(".table-wrapper")!;
    const headOf = (c: HTMLElement) => c.querySelector("thead")!;
    const bodyRowsOf = (c: HTMLElement) => [...c.querySelectorAll("tbody tr")];

    it("defaults to boxed, which draws the frame", () => {
      const { container } = renderChrome();
      expect(wrapperOf(container)).toHaveClass(
        "border",
        "border-[color:var(--TABLE-FRAME-COLOR)]",
        "rounded-[var(--TABLE-FRAME-RADIUS)]",
      );
    });

    it.each(["rules", "plain"] as const)("%s removes the outer frame entirely", (chrome) => {
      const { container } = renderChrome({ chrome });
      const classes = [...wrapperOf(container).classList];
      expect(classes).not.toContain("border");
      expect(classes).not.toContain("border-[color:var(--TABLE-FRAME-COLOR)]");
      expect(classes).not.toContain("rounded-[var(--TABLE-FRAME-RADIUS)]");
    });

    // The wrapper is a scrollport. `relative` is what keeps an absolutely
    // positioned descendant — every `sr-only` span this library renders — inside
    // the scroll clip instead of stranding it down the document, and
    // `overflow-x-auto` is the scrolling itself. Neither is decoration, so no
    // value of a decorative prop may drop them. `verify:scrollport-containing-block`
    // gates the source; this gates the rendered output.
    it.each(["boxed", "rules", "plain"] as const)(
      "%s keeps the scrollport and its containing block",
      (chrome) => {
        const { container } = renderChrome({ chrome });
        expect(wrapperOf(container)).toHaveClass("relative", "overflow-x-auto");
      },
    );

    // `boxed` and `rules` rule rows with the SAME ink, deliberately. The weight of
    // a row rule is a theme decision now (`--TABLE-RULE-COLOR`), not a value of
    // this prop — measured, a per-value softening was 1.05–1.10:1 on the default
    // theme, i.e. very nearly `plain` already. What `rules` drops is the frame and
    // the header band; what `plain` drops on top of that is the rules themselves.
    it("boxed and rules both rule every row; plain draws none", () => {
      for (const chrome of ["boxed", "rules"] as const) {
        const view = renderChrome({ chrome });
        expect(bodyRowsOf(view.container)[0]).toHaveClass(
          "border-b",
          "border-[color:var(--TABLE-RULE-COLOR)]",
        );
        view.unmount();
      }
      const plain = renderChrome({ chrome: "plain" });
      expect([...bodyRowsOf(plain.container)[0].classList]).not.toContain("border-b");
    });

    it("drops the header band under the lighter chromes", () => {
      const boxed = renderChrome({ chrome: "boxed" });
      expect(headOf(boxed.container)).toHaveClass(
        "bg-[color:var(--TABLE-HEAD-FILL)]",
        "border-b-2",
      );
      boxed.unmount();

      const rules = renderChrome({ chrome: "rules" });
      const ruledHead = rules.container.querySelector("thead")!;
      expect(ruledHead).toHaveClass("border-b", "border-[color:var(--TABLE-RULE-COLOR)]");
      expect([...ruledHead.classList]).not.toContain("bg-[color:var(--TABLE-HEAD-FILL)]");
      expect([...ruledHead.classList]).not.toContain("border-b-2");
      rules.unmount();

      const plain = renderChrome({ chrome: "plain" });
      const plainClasses = [...plain.container.querySelector("thead")!.classList];
      expect(plainClasses).not.toContain("bg-[color:var(--TABLE-HEAD-FILL)]");
      expect(plainClasses).not.toContain("border-b");
    });

    // A pinned head needs the band back for TWO reasons, and jsdom can see
    // neither directly — hence the comments.
    //
    // 1. Opacity: `position: sticky` is out of flow over rows that keep
    //    painting, so an unfilled head shows data sliding through the labels.
    // 2. Separation: `border-collapse` makes the head's rule part of the TABLE,
    //    not the row group, so it does NOT travel with the pinned head —
    //    measured gone in both Chromium and Firefox while scrolled. `boxed`
    //    loses its rule the same way and never noticed, because its fill
    //    survives. So the fill is the only separation a pinned head has.
    //
    // `bg-surface-1` and not `bg-surface-0`: the table's own fill would leave a
    // pinned head measuring 1.00:1 against the rows it floats over.
    it.each(["rules", "plain"] as const)(
      "%s gives a pinned header the band back, opaque and separated",
      (chrome) => {
        const head = headOf(renderChrome({ chrome, stickyHeader: true }).container);
        expect(head).toHaveClass("sticky", "bg-[color:var(--TABLE-HEAD-FILL)]");
        expect([...head.classList]).not.toContain("bg-surface-0");
      },
    );

    it.each(["rules", "plain"] as const)(
      "does not fill an UNPINNED %s header, or the band would never go away",
      (chrome) => {
        const classes = [...headOf(renderChrome({ chrome }).container).classList];
        expect(classes).not.toContain("sticky");
        expect(classes).not.toContain("bg-[color:var(--TABLE-HEAD-FILL)]");
        expect(classes).not.toContain("bg-surface-0");
      },
    );

    it("leaves selection intact under plain, where no row rule remains", () => {
      const { container } = render(
        <Table chrome="plain">
          <Table.Body>
            <Table.Row selected>
              <Table.Cell>a</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>,
      );
      const row = container.querySelector("tbody tr")!;
      // The marker rule keys off this class, and the wash rides the bg utility.
      expect(row).toHaveClass("table-row--selected");
      expect(row).toHaveClass("bg-[color-mix(in_oklch,var(--C-ACCENT)_8%,transparent)]");
      expect(row).toHaveAttribute("aria-selected", "true");
    });

    it("leaves banding intact under plain", () => {
      const { container } = renderChrome({ chrome: "plain", striped: true });
      const rows = bodyRowsOf(container);
      expect(rows[0]).not.toHaveClass("table-row--striped");
      expect(rows[1]).toHaveClass("table-row--striped");
      // The band's own rung is deliberately NOT pinned here: the docs and two
      // source comments say rung 2 while the code says rung 1, and that
      // disagreement predates `chrome`. What this test owns is that a chrome
      // which removes the row RULES does not also remove the BAND.
      expect([...rows[1].classList].filter((c) => c.startsWith("bg-"))).toHaveLength(1);
    });

    it("loses to a caller's own frame, because className merges last", () => {
      const { container } = renderChrome({ chrome: "boxed", className: "rounded-none" });
      const classes = [...wrapperOf(container).classList];
      expect(classes).toContain("rounded-none");
      expect(classes).not.toContain("rounded-[var(--TABLE-FRAME-RADIUS)]");
    });
  });
});
