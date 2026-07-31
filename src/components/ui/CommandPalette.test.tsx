import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CommandPalette, type CommandPaletteItem } from "./CommandPalette";

// jsdom does not implement HTMLDialogElement.showModal / close, so we polyfill them.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
  // jsdom doesn't implement scrollIntoView.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
  }
});

function makeItems(overrides: Partial<CommandPaletteItem>[] = []): CommandPaletteItem[] {
  const base: CommandPaletteItem[] = [
    { id: "new-file", label: "New File", group: "File", keywords: ["create"], onSelect: vi.fn() },
    { id: "open-file", label: "Open File", group: "File", onSelect: vi.fn() },
    { id: "copy", label: "Copy", group: "Edit", onSelect: vi.fn() },
    { id: "paste", label: "Paste", group: "Edit", onSelect: vi.fn() },
  ];
  return base.map((item, i) => ({ ...item, ...overrides[i] }));
}

function renderPalette(
  props: Partial<React.ComponentProps<typeof CommandPalette>> = {}
) {
  const { open = true, onClose = vi.fn(), items = makeItems(), ...rest } = props;
  const result = render(
    <CommandPalette open={open} onClose={onClose} items={items} {...rest} />
  );
  return { onClose, items, ...result };
}

describe("CommandPalette", () => {
  it("opens as a dialog (showModal) when open is true", () => {
    renderPalette({ open: true });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders all items on an empty query", () => {
    renderPalette({ open: true });
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("typing filters the visible options", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    await user.type(screen.getByRole("combobox"), "copy");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Copy");
  });

  it("matches on keywords as well as label", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    await user.type(screen.getByRole("combobox"), "create");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("New File");
  });

  it("hides a group header when that group has no matching items", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    // All groups visible initially.
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();

    // Filtering to a File-only match should drop the Edit header.
    await user.type(screen.getByRole("combobox"), "open");
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("ArrowDown / ArrowUp move aria-activedescendant without moving DOM focus off the input", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    const input = screen.getByRole("combobox");
    const first = screen.getAllByRole("option")[0].id;
    await user.click(input);

    expect(input).toHaveAttribute("aria-activedescendant", first);

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(input);
    const afterDown = input.getAttribute("aria-activedescendant");
    expect(afterDown).not.toBe(first);

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(input);
    expect(input).toHaveAttribute("aria-activedescendant", first);
  });

  it("marks the active option with aria-selected", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter fires the active item's onSelect and calls onClose", async () => {
    const user = userEvent.setup();
    const { items, onClose } = renderPalette({ open: true });

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}"); // move to second item (Open File)
    await user.keyboard("{Enter}");

    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
    expect(items[0].onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Home and End jump to the first / last selectable option", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });
    const input = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");
    await user.click(input);

    await user.keyboard("{End}");
    expect(input).toHaveAttribute("aria-activedescendant", options[3].id);

    await user.keyboard("{Home}");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
  });

  it("shows the empty message when nothing matches", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true, emptyMessage: "Nothing here" });

    await user.type(screen.getByRole("combobox"), "zzzzz");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("shows the default empty message", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    await user.type(screen.getByRole("combobox"), "zzzzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("skips a disabled item during navigation and does not select it", async () => {
    const user = userEvent.setup();
    const items = makeItems([{}, { disabled: true }]); // Open File disabled
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} items={items} />);

    const input = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");
    const disabledOption = options[1];
    expect(disabledOption).toHaveAttribute("aria-disabled", "true");
    await user.click(input);

    // ArrowDown from index 0 should skip the disabled index 1 and land on index 2 (Copy).
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[2].id);
    expect(input).not.toHaveAttribute("aria-activedescendant", disabledOption.id);

    // Selecting never fires the disabled item.
    await user.keyboard("{Enter}");
    expect(items[1].onSelect).not.toHaveBeenCalled();
    expect(items[2].onSelect).toHaveBeenCalledTimes(1);
  });

  it("clicking a disabled option does not select it", async () => {
    const user = userEvent.setup();
    const items = makeItems([{ disabled: true }]); // New File disabled
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} items={items} />);

    await user.click(screen.getAllByRole("option")[0]);
    expect(items[0].onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on the dialog cancel event (Escape)", () => {
    const onClose = vi.fn();
    renderPalette({ open: true, onClose });

    const dialog = screen.getByRole("dialog");
    const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  describe("light dismiss", () => {
    // jsdom lays nothing out, so the panel's box has to be supplied for the
    // inside/outside test to have anything to compare a press against.
    const PANEL = { left: 100, top: 100, right: 300, bottom: 200 };

    function withPanelRect(dialog: HTMLElement) {
      dialog.getBoundingClientRect = () =>
        ({
          ...PANEL,
          width: PANEL.right - PANEL.left,
          height: PANEL.bottom - PANEL.top,
          x: PANEL.left,
          y: PANEL.top,
          toJSON() {},
        }) as DOMRect;
    }

    const OUTSIDE = { clientX: 50, clientY: 50 };
    const INSIDE = { clientX: 200, clientY: 150 };

    it("closes on a press that starts and ends on the scrim", () => {
      const onClose = vi.fn();
      renderPalette({ open: true, onClose });
      const dialog = screen.getByRole("dialog");
      withPanelRect(dialog);

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("stays open when the press is inside the panel's own box", () => {
      const onClose = vi.fn();
      renderPalette({ open: true, onClose });
      const dialog = screen.getByRole("dialog");
      withPanelRect(dialog);

      fireEvent.pointerDown(dialog, INSIDE);
      fireEvent.click(dialog, INSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("stays open when a drag that began inside is released on the scrim", () => {
      const onClose = vi.fn();
      renderPalette({ open: true, onClose });
      const dialog = screen.getByRole("dialog");
      withPanelRect(dialog);

      fireEvent.pointerDown(screen.getByRole("combobox"), INSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("still runs a caller's own onClick and onPointerDown", () => {
      const onClose = vi.fn();
      const onClick = vi.fn();
      const onPointerDown = vi.fn();
      render(
        <CommandPalette
          open
          onClose={onClose}
          items={makeItems()}
          onClick={onClick}
          onPointerDown={onPointerDown}
        />
      );
      const dialog = screen.getByRole("dialog");
      withPanelRect(dialog);

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onPointerDown).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("lets a caller opt out by preventing the click", () => {
      const onClose = vi.fn();
      render(
        <CommandPalette
          open
          onClose={onClose}
          items={makeItems()}
          onClick={(e) => e.preventDefault()}
        />
      );
      const dialog = screen.getByRole("dialog");
      withPanelRect(dialog);

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("resets activeIndex to the first match when the query changes", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });
    const input = screen.getByRole("combobox");

    await user.keyboard("{ArrowDown}{ArrowDown}"); // move active off the first item
    await user.type(input, "p"); // matches Paste

    const options = screen.getAllByRole("option");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
  });

  it("uses an injected filter when provided", async () => {
    const user = userEvent.setup();
    const filter = (item: CommandPaletteItem, query: string) =>
      query === "" || item.id === "paste";
    renderPalette({ open: true, filter });

    await user.type(screen.getByRole("combobox"), "anything");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Paste");
  });

  it("renders a forwarded ref to the dialog element", () => {
    let captured: HTMLDialogElement | null = null;
    render(
      <CommandPalette
        open
        onClose={vi.fn()}
        items={makeItems()}
        ref={(node) => {
          captured = node;
        }}
      />
    );
    expect(captured).toBeInstanceOf(HTMLDialogElement);
  });

  it("groups options under their group containers", () => {
    renderPalette({ open: true });
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(within(groups[0]).getAllByRole("option")).toHaveLength(2);
    expect(within(groups[1]).getAllByRole("option")).toHaveLength(2);
  });

  /**
   * The gap between groups was `.command-palette-group + .command-palette-group`,
   * a rule about DOM adjacency. It is computed in the root now, and these two
   * cases are what distinguish that computation from the two shortcuts that look
   * like it: `not-first:` would give the second block a margin in the ungrouped
   * case below, and `[.command-palette-group+&]:` would hard-code the BEM name
   * into a utility.
   */
  describe("gap between adjacent groups", () => {
    it("spaces a group that directly follows another", () => {
      renderPalette({ open: true });
      const groups = screen.getAllByRole("group");
      expect(groups[0].className.split(" ")).not.toContain("mt-r5");
      expect(groups[1].className.split(" ")).toContain("mt-r5");
    });

    it("does not space a group whose preceding sibling is an ungrouped row", () => {
      renderPalette({
        open: true,
        items: [
          { id: "loose", label: "Loose command", onSelect: vi.fn() },
          { id: "copy", label: "Copy", group: "Edit", onSelect: vi.fn() },
        ],
      });
      const group = screen.getByRole("group");
      expect(group.previousElementSibling?.getAttribute("role")).toBe("option");
      expect(group.className.split(" ")).not.toContain("mt-r5");
    });
  });

  // `data-active` is the only hook the stylesheet has for the virtual-focus
  // ring: DOM focus never leaves the input, so `:focus-visible` cannot match an
  // option. jsdom applies no stylesheets, so this locks the DOM contract the
  // ring hangs off — not the ring itself.
  it("marks exactly one option data-active, in step with aria-activedescendant", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    const input = screen.getByRole("combobox");
    await user.click(input);

    const activeIds = () =>
      screen
        .getAllByRole("option")
        .filter((option) => option.hasAttribute("data-active"))
        .map((option) => option.id);

    expect(activeIds()).toEqual([input.getAttribute("aria-activedescendant")]);

    await user.keyboard("{ArrowDown}");
    const second = input.getAttribute("aria-activedescendant");
    expect(activeIds()).toEqual([second]);

    await user.keyboard("{End}");
    expect(activeIds()).toEqual([input.getAttribute("aria-activedescendant")]);
  });

  // The highlight must never outrun the a11y tree: painting `data-active` on an
  // option `aria-activedescendant` refuses to name leaves a visible cursor that
  // no screen reader can follow and that Enter will not act on.
  it("paints no active highlight when every option is disabled", () => {
    const items = makeItems([
      { disabled: true },
      { disabled: true },
      { disabled: true },
      { disabled: true },
    ]);
    renderPalette({ open: true, items });

    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-activedescendant");
    expect(
      screen.getAllByRole("option").filter((option) => option.hasAttribute("data-active")),
    ).toHaveLength(0);
  });

  it("arrows in rendered order when a group's members are not contiguous", async () => {
    const user = userEvent.setup();
    const items: CommandPaletteItem[] = [
      { id: "new", label: "New document", group: "File", onSelect: vi.fn() },
      { id: "copy", label: "Copy", group: "Edit", onSelect: vi.fn() },
      { id: "save", label: "Save", group: "File", onSelect: vi.fn() },
    ];
    renderPalette({ open: true, items });

    const rendered = screen.getAllByRole("option").map((o) => o.textContent);
    expect(rendered).toEqual(["New document", "Save", "Copy"]);

    const input = screen.getByRole("combobox");
    const activeLabel = () =>
      document.getElementById(input.getAttribute("aria-activedescendant")!)?.textContent;

    input.focus();
    expect(activeLabel()).toBe("New document");
    await user.keyboard("{ArrowDown}");
    expect(activeLabel()).toBe("Save");
    await user.keyboard("{ArrowDown}");
    expect(activeLabel()).toBe("Copy");
  });

  it("keeps the highlight when the parent re-renders with fresh prop identities", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [, force] = useState(0);
      return (
        <>
          <button onClick={() => force((n) => n + 1)}>Re-render</button>
          <CommandPalette
            open
            onClose={vi.fn()}
            // Fresh identity on every render — the common consumer shape.
            items={[
              { id: "a", label: "Alpha", onSelect: vi.fn() },
              { id: "b", label: "Beta", onSelect: vi.fn() },
              { id: "c", label: "Gamma", onSelect: vi.fn() },
            ]}
            filter={(item, q) => item.label.toLowerCase().includes(q.trim().toLowerCase())}
          />
        </>
      );
    }

    render(<Harness />);
    const input = screen.getByRole("combobox");
    const activeLabel = () =>
      document.getElementById(input.getAttribute("aria-activedescendant")!)?.textContent;

    input.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(activeLabel()).toBe("Gamma");

    await user.click(screen.getByRole("button", { name: "Re-render" }));

    expect(activeLabel()).toBe("Gamma");
  });

  it("lets the caller name the search field and the listbox", () => {
    renderPalette({
      open: true,
      searchLabel: "Befehl suchen",
      listLabel: "Befehle",
    });

    expect(screen.getByRole("combobox")).toHaveAccessibleName("Befehl suchen");
    expect(screen.getByRole("listbox")).toHaveAccessibleName("Befehle");
  });

  it("names the search field by default", () => {
    renderPalette({ open: true });
    expect(screen.getByRole("combobox")).toHaveAccessibleName("Search commands");
  });

  it("announces the result count as filtering changes it", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("4 commands");

    await user.type(screen.getByRole("combobox"), "copy");
    expect(status).toHaveTextContent("1 command");

    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "zzz");
    expect(status).toHaveTextContent("0 commands");
  });

  it("lets the caller replace the announced status text", async () => {
    const user = userEvent.setup();
    renderPalette({ open: true, statusMessage: (n) => `${n} Treffer` });

    await user.type(screen.getByRole("combobox"), "copy");
    expect(screen.getByRole("status")).toHaveTextContent("1 Treffer");
  });

  it("has the listbox own its options directly or through a group", () => {
    renderPalette({ open: true });

    const listbox = screen.getByRole("listbox");
    for (const option of screen.getAllByRole("option")) {
      const owner = option.parentElement!;
      expect(owner === listbox || owner.getAttribute("role") === "group").toBe(true);
      if (owner !== listbox) expect(owner.parentElement).toBe(listbox);
    }
  });

  it("does not wrap ungrouped items in a nameless group", () => {
    renderPalette({
      open: true,
      items: [
        { id: "a", label: "Alpha", onSelect: vi.fn() },
        { id: "b", label: "Beta", onSelect: vi.fn() },
      ],
    });

    expect(screen.queryAllByRole("group")).toHaveLength(0);
    for (const option of screen.getAllByRole("option")) {
      expect(option.parentElement).toBe(screen.getByRole("listbox"));
    }
  });

  it("blocks the page scroll behind the scrim", () => {
    renderPalette({ open: true });
    // Same hook Dialog uses; response-ui-css keys `body:has(dialog[open].no-body-scroll)` off it.
    expect(screen.getByRole("dialog")).toHaveClass("no-body-scroll");
  });

  /**
   * The compound. `items` stays the only writer of the list: the root filters,
   * groups and orders it, then calls `children` once per row it has produced.
   * `CommandPalette.Item` takes no data prop at all, so a consumer can supply a
   * row's content and cannot supply a row.
   */
  describe("compound composition", () => {
    it("renders a composed row in place of the default one, keeping its identity", () => {
      renderPalette({
        open: true,
        children: ({ item }) => (
          <CommandPalette.Item>
            <span data-testid={`row-${item.id}`}>{item.label.toUpperCase()}</span>
          </CommandPalette.Item>
        ),
      });

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(4);
      expect(screen.getByTestId("row-copy")).toHaveTextContent("COPY");
      // The row keeps the library's own class, id and ARIA even though the
      // consumer wrote its contents.
      expect(options[0]).toHaveClass("command-palette-option");
      expect(options[0].id).toBeTruthy();
      expect(screen.getByRole("combobox")).toHaveAttribute(
        "aria-activedescendant",
        options[0].id
      );
      // And the group structure is still the root's.
      expect(screen.getAllByRole("group")).toHaveLength(2);
    });

    it("hands children the root's own filtered rows, in rendered order", async () => {
      const user = userEvent.setup();
      const seen: string[][] = [];
      let pass: string[] = [];
      renderPalette({
        open: true,
        children: ({ item, index }) => {
          if (index === 0) {
            pass = [];
            seen.push(pass);
          }
          pass.push(`${index}:${item.id}`);
          return <CommandPalette.Item>{item.label}</CommandPalette.Item>;
        },
      });

      expect(seen.at(-1)).toEqual([
        "0:new-file",
        "1:open-file",
        "2:copy",
        "3:paste",
      ]);

      await user.type(screen.getByRole("combobox"), "file");
      expect(seen.at(-1)).toEqual(["0:new-file", "1:open-file"]);
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });

    it("still selects and closes from a composed row", async () => {
      const user = userEvent.setup();
      const { items, onClose } = renderPalette({
        open: true,
        children: ({ item }) => (
          <CommandPalette.Item>{item.label}</CommandPalette.Item>
        ),
      });

      await user.click(screen.getByText("Copy"));
      expect(items[2].onSelect).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    /**
     * The property the whole design rests on. A row is one of the palette's own
     * or it is not a row; if `CommandPalette.Item` ever starts working outside
     * the children call, the consumer has become a second writer of the list.
     */
    it("refuses an Item rendered outside the children function", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<CommandPalette.Item>Ghost</CommandPalette.Item>)).toThrow(
        /must be returned from CommandPalette's children function/
      );
      // Including inside the palette but outside a row.
      expect(() =>
        renderPalette({
          open: true,
          emptyMessage: <CommandPalette.Item>Ghost</CommandPalette.Item>,
          items: [],
        })
      ).toThrow(/must be returned from CommandPalette's children function/);
      consoleError.mockRestore();
    });
  });

  /** One override test per slot, plus the four companions. */
  describe("classNames slots", () => {
    const slotItems: CommandPaletteItem[] = [
      {
        id: "copy",
        label: "Copy",
        group: "Edit",
        icon: <span>c</span>,
        shortcut: "⌘C",
        onSelect: vi.fn(),
      },
    ];

    function renderSlots(
      classNames: React.ComponentProps<typeof CommandPalette>["classNames"]
    ) {
      return render(
        <CommandPalette
          open
          onClose={vi.fn()}
          items={slotItems}
          classNames={classNames}
        />
      ).container;
    }

    it("lands classNames.search on the search row", () => {
      const c = renderSlots({ search: "border-b-4" });
      const el = c.querySelector(".command-palette-search")!;
      expect(el.getAttribute("class")).toContain("command-palette-search");
      expect(el.getAttribute("class")).toContain("border-b-4");
    });

    it("lands classNames.input on the query field", () => {
      renderSlots({ input: "text-sm" });
      const el = screen.getByRole("combobox");
      expect(el.getAttribute("class")).toContain("command-palette-input");
      expect(el.getAttribute("class")).toContain("text-sm");
    });

    it("lands classNames.list on the results container", () => {
      renderSlots({ list: "max-h-40" });
      const el = screen.getByRole("listbox");
      expect(el.getAttribute("class")).toContain("command-palette-list");
      expect(el.getAttribute("class")).toContain("max-h-40");
    });

    it("lands classNames.group on every group", () => {
      renderSlots({ group: "mt-r2" });
      const el = screen.getByRole("group");
      expect(el.getAttribute("class")).toContain("command-palette-group");
      expect(el.getAttribute("class")).toContain("mt-r2");
    });

    it("lands classNames.groupHeader on every group heading", () => {
      const c = renderSlots({ groupHeader: "uppercase" });
      const el = c.querySelector(".command-palette-group-header")!;
      expect(el.getAttribute("class")).toContain("command-palette-group-header");
      expect(el.getAttribute("class")).toContain("uppercase");
    });

    it("lands classNames.empty on the no-results row", () => {
      const { container } = render(
        <CommandPalette
          open
          onClose={vi.fn()}
          items={[]}
          classNames={{ empty: "py-r2" }}
        />
      );
      const el = container.querySelector(".command-palette-empty")!;
      expect(el.getAttribute("class")).toContain("command-palette-empty");
      expect(el.getAttribute("class")).toContain("py-r2");
    });

    it("lands classNames.itemIcon on the default row's glyph", () => {
      const c = renderSlots({ itemIcon: "size-r3" });
      const el = c.querySelector(".command-palette-option-icon")!;
      expect(el.getAttribute("class")).toContain("command-palette-option-icon");
      expect(el.getAttribute("class")).toContain("size-r3");
    });

    it("lands classNames.itemLabel on the default row's text", () => {
      const c = renderSlots({ itemLabel: "font-bold" });
      const el = c.querySelector(".command-palette-option-label")!;
      expect(el.getAttribute("class")).toContain("command-palette-option-label");
      expect(el.getAttribute("class")).toContain("font-bold");
    });

    it("lands classNames.itemShortcut on the default row's Kbd", () => {
      const c = renderSlots({ itemShortcut: "opacity-50" });
      const el = c.querySelector(".command-palette-option-shortcut")!;
      expect(el.getAttribute("class")).toContain("command-palette-option-shortcut");
      expect(el.getAttribute("class")).toContain("opacity-50");
    });

    /**
     * This used to assert each class attribute equalled its marker exactly, which
     * stopped being expressible once `CommandPalette.css` became utilities on the
     * elements themselves. The falsifier is unchanged: an absent slot appends
     * *nothing* — no `undefined`, no `null`, no empty token.
     */
    it("keeps every base class when no slot is passed", () => {
      const c = renderSlots(undefined);
      const listbox = screen.getByRole("listbox").getAttribute("class") ?? "";
      expect(listbox.split(" ")).toContain("command-palette-list");
      expect(listbox).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      for (const marker of [
        "command-palette-search",
        "command-palette-group",
        "command-palette-option-label",
      ]) {
        const classes = c.querySelector(`.${marker}`)?.getAttribute("class") ?? "";
        expect(classes.split(" ")).toContain(marker);
        expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      }
    });

    it("puts no slot class on the dialog", () => {
      renderSlots({
        search: "slot-search",
        input: "slot-input",
        list: "slot-list",
        group: "slot-group",
        groupHeader: "slot-group-header",
        itemIcon: "slot-item-icon",
        itemLabel: "slot-item-label",
        itemShortcut: "slot-item-shortcut",
      });
      const classes = screen.getByRole("dialog").getAttribute("class")?.split(" ") ?? [];
      expect(classes).toContain("command-palette");
      expect(classes).toContain("no-body-scroll");
      expect(classes.filter((c) => c.startsWith("slot-"))).toEqual([]);
    });

    it("rejects an unknown slot key at compile time", () => {
      render(
        <CommandPalette
          open
          onClose={vi.fn()}
          items={slotItems}
          // @ts-expect-error `item` is not a slot — CommandPalette.Item reaches
          // that element, so a slot for it would be a second writer.
          classNames={{ item: "p-4" }}
        />
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not put classNames on the DOM", () => {
      renderSlots({ list: "max-h-40" });
      const dialog = screen.getByRole("dialog");
      expect(dialog.hasAttribute("classnames")).toBe(false);
      expect(dialog.outerHTML).not.toContain("[object Object]");
    });
  });
});
