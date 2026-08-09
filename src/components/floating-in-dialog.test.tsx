/**
 * Every floating panel in this library, opened from a trigger that sits inside a
 * native `<dialog>`.
 *
 * WHAT THIS FILE CAN AND CANNOT SEE
 *
 * The user-visible defect is that the panel is invisible and unclickable, and
 * jsdom can observe neither half: it implements no top layer, no `::backdrop`,
 * no `inert`, and `showModal` at all (the polyfill below only sets the `open`
 * attribute). So this file asserts the *mechanism* — the panel is a DOM
 * descendant of the dialog — which is the one thing that decides both halves in
 * a real browser, and the thing a regression would break first. The painting and
 * hit-testing half is measured in Chromium by `scripts/probe-floating-in-dialog.mjs`.
 *
 * Every component that reaches `FloatingPortal` is listed here by name rather
 * than sampled, because a portal default is the kind of defect that hides in the
 * member nobody enumerated.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Combobox } from "./form/Combobox";
import { ColorPicker } from "./form/ColorPicker";
import { DatePicker } from "./form/DatePicker";
import { DateRangePicker } from "./form/DateRangePicker";
import { MultiSelect } from "./form/MultiSelect";
import { CommandPalette } from "./ui/CommandPalette";
import { ContextMenu } from "./ui/ContextMenu";
import { Dialog } from "./ui/Dialog";
import { Drawer } from "./ui/Drawer";
import { DropdownMenu } from "./ui/DropdownMenu";
import { HoverCard } from "./ui/HoverCard";
import { Popover } from "./ui/Popover";
import { Tooltip } from "./ui/Tooltip";

// jsdom implements neither `showModal` nor `close`. The polyfill is the minimum
// that makes the component's own open/close bookkeeping run — it does NOT model
// the top layer or inertness, which is why the header above says what it says.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

/**
 * Lends jsdom a `showPopover`/`hidePopover` pair for the length of one test.
 *
 * Spies rather than a polyfill, because there is nothing here to polyfill: jsdom
 * has no top layer, so the only honest question is whether the library asks the
 * platform for one at the right moments. What the platform then does with the
 * request is measured in Chromium by `scripts/probe-floating-in-dialog.mjs`.
 *
 * **Per test, never globally, and that is not tidiness.** jsdom applies the UA's
 * `[popover]:not(:popover-open) { display: none }` while implementing neither
 * method — so a panel that asks to be promoted here is hidden and never shown,
 * and disappears from every accessible-name query in the file. Installing these
 * in a `beforeEach` turned 21 unrelated tests red. Their real absence is also the
 * shipped feature detect, so leaving jsdom as it is keeps every other test on the
 * fallback path, which is exactly the path they were written against.
 */
function lendPopoverSupport() {
  const showPopover = vi.fn();
  const hidePopover = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "showPopover", {
    value: showPopover,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(HTMLElement.prototype, "hidePopover", {
    value: hidePopover,
    configurable: true,
    writable: true,
  });
  return { showPopover, hidePopover };
}

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;
  delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;
});

function required<T>(value: T | null | undefined, what: string): T {
  if (value == null) throw new Error(`${what} was not in the document`);
  return value;
}

function bySelector(selector: string) {
  return required(document.querySelector<HTMLElement>(selector), selector);
}

/**
 * A floating component, the trigger a user presses, and the panel that press is
 * supposed to produce. `open` returns the panel element itself rather than a
 * portal wrapper, so a fix that only relocated floating-ui's portal node while
 * leaving the panel elsewhere could not pass.
 */
interface FloatingCase {
  name: string;
  markup: ReactNode;
  open: (user: UserEvent) => Promise<HTMLElement>;
}

const CASES: FloatingCase[] = [
  {
    name: "Popover",
    markup: (
      <Popover>
        <Popover.Trigger>Theme</Popover.Trigger>
        <Popover.Content>Panel body</Popover.Content>
      </Popover>
    ),
    async open(user) {
      await user.click(screen.getByRole("button", { name: "Theme" }));
      return bySelector(".popover-content");
    },
  },
  {
    name: "Tooltip",
    markup: (
      <Tooltip content="Bubble text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    ),
    async open(user) {
      await user.hover(screen.getByRole("button", { name: "Hover me" }));
      await screen.findByRole("tooltip");
      return bySelector(".tooltip");
    },
  },
  {
    name: "HoverCard",
    markup: (
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content aria-label="Profile card">Card body</HoverCard.Content>
      </HoverCard>
    ),
    async open(user) {
      await user.hover(screen.getByText("@octocat"));
      return await screen.findByRole("dialog", { name: "Profile card" });
    },
  },
  {
    name: "DropdownMenu",
    markup: (
      <DropdownMenu>
        <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item index={0}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    ),
    async open(user) {
      await user.click(screen.getByRole("button", { name: "Actions" }));
      await screen.findByRole("menu");
      return bySelector(".menu-content");
    },
  },
  {
    name: "ContextMenu",
    markup: (
      <ContextMenu>
        <ContextMenu.Trigger>Right-click area</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item index={0}>Edit</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    ),
    async open() {
      fireEvent.contextMenu(screen.getByText("Right-click area"));
      await screen.findByRole("menu");
      return bySelector(".menu-content");
    },
  },
  {
    name: "Combobox",
    markup: (
      <Combobox>
        <Combobox.Input aria-label="Fruit" />
        <Combobox.Content>
          <Combobox.Item index={0} value="apple">
            Apple
          </Combobox.Item>
        </Combobox.Content>
      </Combobox>
    ),
    async open(user) {
      // A click alone does not open it — the input opens on typing or ArrowDown.
      await user.click(screen.getByRole("combobox", { name: "Fruit" }));
      await user.keyboard("{ArrowDown}");
      await screen.findByRole("listbox");
      return bySelector(".combobox-content");
    },
  },
  {
    name: "MultiSelect",
    markup: <MultiSelect aria-label="Fruits" options={[{ value: "apple", label: "Apple" }]} />,
    async open(user) {
      await user.click(screen.getByRole("combobox", { name: "Fruits" }));
      await screen.findByRole("listbox");
      return bySelector(".multiselect-content");
    },
  },
  {
    name: "ColorPicker",
    markup: <ColorPicker defaultValue="#3366cc" />,
    async open(user) {
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      await screen.findByRole("dialog", { name: "Color picker" });
      return bySelector(".colorpicker-panel");
    },
  },
  {
    name: "DatePicker",
    markup: <DatePicker aria-label="Date" />,
    async open(user) {
      await user.click(screen.getByRole("button", { name: "Open calendar" }));
      return await screen.findByRole("dialog", { name: "Choose date" });
    },
  },
  {
    name: "DateRangePicker",
    markup: <DateRangePicker />,
    async open(user) {
      await user.click(screen.getByRole("button", { name: "Open calendar" }));
      return await screen.findByRole("dialog", { name: "Choose date range" });
    },
  },
];

function theDialog() {
  return bySelector("dialog");
}

describe("floating panels inside a modal <dialog>", () => {
  describe.each(CASES)("$name", ({ markup, open }) => {
    it("portals its panel into the Dialog rather than <body>", async () => {
      const user = userEvent.setup();
      render(
        <Dialog open onClose={() => {}}>
          {markup}
        </Dialog>,
      );

      const panel = await open(user);

      expect(theDialog().contains(panel)).toBe(true);
    });

    it("portals its panel into the Drawer rather than <body>", async () => {
      const user = userEvent.setup();
      render(
        <Drawer open onClose={() => {}}>
          {markup}
        </Drawer>,
      );

      const panel = await open(user);

      expect(theDialog().contains(panel)).toBe(true);
    });

    it("still portals to <body> when no dialog is an ancestor", async () => {
      const user = userEvent.setup();
      render(<>{markup}</>);

      const panel = await open(user);

      expect(panel.closest("dialog")).toBeNull();
      expect(document.body.contains(panel)).toBe(true);
    });
  });
});

describe("floating panels inside a <dialog> — ordering and overrides", () => {
  it("reaches a Drawer that was closed when the trigger first mounted", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open drawer</button>
          <Drawer open={open} onClose={() => setOpen(false)}>
            <Popover>
              <Popover.Trigger>Theme</Popover.Trigger>
              <Popover.Content>Panel body</Popover.Content>
            </Popover>
          </Drawer>
        </>
      );
    }

    render(<Harness />);
    // The Popover trigger mounts inside a *closed* drawer, so a portal root
    // resolved once at mount and cached must not be resolved against `[open]`.
    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    await user.click(screen.getByRole("button", { name: "Theme" }));

    expect(theDialog().contains(bySelector(".popover-content"))).toBe(true);
  });

  it("reaches the Dialog for a panel that is already open on its first render", async () => {
    // The trigger's ref callback and the panel's portal both run in the first
    // commit, so the portal root has to be known before floating-ui creates its
    // node — it never moves one afterwards.
    render(
      <Dialog open onClose={() => {}}>
        <Popover defaultOpen>
          <Popover.Trigger>Theme</Popover.Trigger>
          <Popover.Content>Panel body</Popover.Content>
        </Popover>
      </Dialog>,
    );

    expect(theDialog().contains(await screen.findByText("Panel body"))).toBe(true);
  });

  it("lands in the nearest dialog when dialogs are nested", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onClose={() => {}} aria-label="outer">
        <Drawer open onClose={() => {}} aria-label="inner">
          <Popover>
            <Popover.Trigger>Theme</Popover.Trigger>
            <Popover.Content>Panel body</Popover.Content>
          </Popover>
        </Drawer>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    const inner = bySelector("dialog[aria-label='inner']");
    expect(inner.contains(bySelector(".popover-content"))).toBe(true);
  });

  it("lets Tooltip's container prop out-rank the dialog it is inside", async () => {
    const user = userEvent.setup();
    const elsewhere = document.createElement("div");
    document.body.append(elsewhere);

    render(
      <Dialog open onClose={() => {}}>
        <Tooltip content="Bubble text" delay={0} container={elsewhere}>
          <button>Hover me</button>
        </Tooltip>
      </Dialog>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    await screen.findByRole("tooltip");

    expect(elsewhere.contains(bySelector(".tooltip"))).toBe(true);
    elsewhere.remove();
  });

  it("reaches a CommandPalette, which is a <dialog> this library never names to the hook", async () => {
    // The claim that CommandPalette is covered rests entirely on it being a
    // native `<dialog>` opened with `showModal()`, which `closest("dialog")`
    // finds without anyone wiring it. Asserted rather than assumed, because a
    // promise in the docs that nothing exercises is how they go stale.
    const user = userEvent.setup();
    render(
      <CommandPalette
        open
        onClose={() => {}}
        items={[{ id: "new", label: "New File", onSelect: () => {} }]}
      >
        {({ item }) => (
          <Tooltip content="Bubble text" delay={0}>
            <button>{item.label}</button>
          </Tooltip>
        )}
      </CommandPalette>,
    );

    await user.hover(screen.getByRole("button", { name: "New File" }));
    await screen.findByRole("tooltip");

    expect(theDialog().contains(bySelector(".tooltip"))).toBe(true);
  });

  it("still renders a panel when the trigger's ref never resolves to an element", async () => {
    // A child that drops the `ref` it is handed — the trap `tooltip.md` already
    // documents — so floating-ui is never given a reference element and
    // `domReference` stays null for the component's whole life. A portal root
    // that waits for it would wait forever and render *nothing*, while the
    // trigger still advertises `aria-expanded="true"`. Degrading to `<body>` is
    // the pre-existing behaviour and the right floor.
    function RefDroppingButton({ ref: _ref, ...props }: React.ComponentProps<"button">) {
      return <button {...props} />;
    }

    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger asChild>
          <RefDroppingButton>Theme</RefDroppingButton>
        </Popover.Trigger>
        <Popover.Content>Panel body</Popover.Content>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    expect(await screen.findByText("Panel body")).toBeInTheDocument();
  });

  it("puts the panel inside a <form> that WRAPS the dialog, and outside one nested in it", async () => {
    // Two arrangements with opposite answers, because the panel is appended to
    // the `<dialog>` itself: a form *inside* the dialog is the panel's sibling,
    // a form *around* the dialog is its ancestor. The second is a real change —
    // such a field now reaches `FormData` where before it could not.
    const user = userEvent.setup();
    render(
      <form>
        <Dialog open onClose={() => {}}>
          <form aria-label="inner">
            <Popover>
              <Popover.Trigger>Theme</Popover.Trigger>
              <Popover.Content>
                <input name="panelField" defaultValue="panel" />
              </Popover.Content>
            </Popover>
          </form>
        </Dialog>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    const panel = bySelector(".popover-content");
    const outer = required(
      document.querySelector<HTMLFormElement>("form:not([aria-label])"),
      "the wrapping form",
    );
    const inner = required(
      document.querySelector<HTMLFormElement>("form[aria-label='inner']"),
      "the nested form",
    );

    expect(inner.contains(panel)).toBe(false);
    expect(outer.contains(panel)).toBe(true);
    expect([...new FormData(outer).keys()]).toContain("panelField");
    expect([...new FormData(inner).keys()]).not.toContain("panelField");
  });

  it("promotes the panel into the top layer, and positions it against the viewport", async () => {
    // jsdom implements no top layer, so what is asserted here is the MECHANISM —
    // the attribute, the reset marker and the positioning strategy that must move
    // with it. That a promoted panel actually escapes the dialog's clip is
    // measured in Chromium by `scripts/probe-floating-in-dialog.mjs`; this test
    // exists because the mechanism is what a regression breaks first, and because
    // the strategy and the promotion being out of step is a bug that LOOKS
    // correct in jsdom and puts every panel out by the dialog's origin in a
    // browser.
    const { showPopover } = lendPopoverSupport();
    const user = userEvent.setup();
    render(
      <Dialog open onClose={() => {}}>
        <Popover>
          <Popover.Trigger>Theme</Popover.Trigger>
          <Popover.Content>Panel body</Popover.Content>
        </Popover>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    const panel = bySelector(".popover-content");
    expect(panel.getAttribute("popover")).toBe("manual");
    expect(panel).toHaveClass("floating-top-layer");
    expect(showPopover).toHaveBeenCalled();
    // A top-layer element resolves against the viewport, so anything but
    // `fixed` puts it out by the dialog's origin.
    expect(panel.style.position).toBe("fixed");
  });

  it("leaves a panel with no dialog ancestor entirely alone", async () => {
    const { showPopover } = lendPopoverSupport();
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>Theme</Popover.Trigger>
        <Popover.Content>Panel body</Popover.Content>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    const panel = bySelector(".popover-content");
    expect(panel.hasAttribute("popover")).toBe(false);
    expect(panel).not.toHaveClass("floating-top-layer");
    expect(showPopover).not.toHaveBeenCalled();
    expect(panel.style.position).toBe("absolute");
  });

  it("takes the panel back out of the top layer when it closes", async () => {
    // An element left showing in the top layer outlives the React tree that owns
    // it, and one left carrying `popover` without being shown is hidden outright
    // by the UA's `[popover]:not(:popover-open) { display: none }`.
    const { hidePopover } = lendPopoverSupport();
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open onClose={() => {}}>
          <button onClick={() => setOpen(false)}>Close the panel</button>
          <Popover open={open} onOpenChange={setOpen}>
            <Popover.Trigger>Theme</Popover.Trigger>
            <Popover.Content>Panel body</Popover.Content>
          </Popover>
        </Dialog>
      );
    }

    render(<Harness />);
    const panel = bySelector(".popover-content");
    expect(panel.getAttribute("popover")).toBe("manual");

    await user.click(screen.getByRole("button", { name: "Close the panel" }));

    // `waitFor`, because the panel outlives the close by its fade: it is still
    // in the DOM — and still in the top layer — until `useTransitionStyles`
    // unmounts it, which is exactly the window in which forgetting to hide it
    // would leave a stranded top-layer element behind.
    await waitFor(() => expect(hidePopover).toHaveBeenCalled());
    expect(panel.hasAttribute("popover")).toBe(false);
    expect(panel).not.toHaveClass("floating-top-layer");
  });

  it("keeps the previous behaviour whole on an engine with no popover support", async () => {
    // `popover` is Baseline 2024. The fallback owes the user what shipped before
    // — a plain descendant of the dialog — and NOT half of the new behaviour:
    // `strategy: "fixed"` on its own escapes a Dialog's clip but not a Drawer's,
    // because Drawer slides in on a transform and a transformed ancestor becomes
    // the containing block for fixed descendants. So the strategy has to fall
    // back with the promotion, not independently of it.
    // Nothing installed: jsdom's own lack of `showPopover` IS the older engine.
    expect(HTMLElement.prototype.showPopover).toBeUndefined();

    const user = userEvent.setup();
    render(
      <Dialog open onClose={() => {}}>
        <Popover>
          <Popover.Trigger>Theme</Popover.Trigger>
          <Popover.Content>Panel body</Popover.Content>
        </Popover>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    const panel = bySelector(".popover-content");
    expect(theDialog().contains(panel)).toBe(true);
    expect(panel.hasAttribute("popover")).toBe(false);
    expect(panel.style.position).toBe("absolute");
  });

  it("does not leave the attribute behind when the engine refuses to promote", async () => {
    // `[popover]:not(:popover-open) { display: none }` is a UA rule, so an
    // element that carries the attribute and was never shown renders NOTHING.
    // A refused promotion has to take the attribute back off with it or the
    // failure mode is an invisible panel rather than an unpromoted one.
    const { showPopover } = lendPopoverSupport();
    showPopover.mockImplementation(() => {
      throw new DOMException("not supported here", "InvalidStateError");
    });

    const user = userEvent.setup();
    render(
      <Dialog open onClose={() => {}}>
        <Popover>
          <Popover.Trigger>Theme</Popover.Trigger>
          <Popover.Content>Panel body</Popover.Content>
        </Popover>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Theme" }));

    const panel = bySelector(".popover-content");
    expect(panel.hasAttribute("popover")).toBe(false);
    expect(panel).not.toHaveClass("floating-top-layer");
    expect(panel).toHaveTextContent("Panel body");
  });

  it("renders the bubble when Tooltip's container prop is explicitly null", async () => {
    // `FloatingPortal` reads `root === null` as "wait for a root that does not
    // exist yet" and creates no node at all, so `null` must not be forwarded.
    const user = userEvent.setup();
    render(
      <Tooltip content="Bubble text" delay={0} container={null}>
        <button>Hover me</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Bubble text");
  });
});
