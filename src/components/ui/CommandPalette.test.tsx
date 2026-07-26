import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CommandPalette, type CommandItem } from "./CommandPalette";

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

function makeItems(overrides: Partial<CommandItem>[] = []): CommandItem[] {
  const base: CommandItem[] = [
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
    const filter = (item: CommandItem, query: string) =>
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
    const items: CommandItem[] = [
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
});
