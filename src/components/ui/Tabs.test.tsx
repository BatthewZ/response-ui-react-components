import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Tabs } from "./Tabs";

// Defaults to reduced motion for every test — the panel exit animation is opt-in
// per test via `motion.reduced = false`.
const motion = vi.hoisted(() => ({ reduced: true }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = true;
});

// jsdom has no `AnimationEvent` constructor, so `fireEvent.animationEnd` dispatches
// something React never sees; React also picks exactly one of these two names via
// vendor-prefix detection. Dispatching both fires the handler exactly once anywhere.
function fireAnimationEnd(el: Element) {
  for (const name of ["animationend", "webkitAnimationEnd"]) {
    fireEvent(el, new Event(name, { bubbles: true }));
  }
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function renderTabs(props: { defaultValue?: string; variant?: "underline" | "pill" | "enclosed" } = {}) {
  const { defaultValue = "one", variant } = props;
  return render(
    <Tabs defaultValue={defaultValue} variant={variant}>
      <Tabs.List>
        <Tabs.Tab value="one">Tab One</Tabs.Tab>
        <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        <Tabs.Tab value="three">Tab Three</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
      <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      <Tabs.Panel value="three">Panel Three Content</Tabs.Panel>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("renders tab list with role='tablist' and tab panels", () => {
    renderTabs();

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("first tab is selected by default", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel One Content")).toBeInTheDocument();
  });

  it("defaultValue prop sets initial active tab", () => {
    renderTabs({ defaultValue: "two" });

    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
    expect(screen.queryByText("Panel One Content")).not.toBeInTheDocument();
  });

  it("clicking a tab activates it and shows its panel", async () => {
    const user = userEvent.setup();
    renderTabs();

    expect(screen.getByText("Panel One Content")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
    expect(screen.queryByText("Panel One Content")).not.toBeInTheDocument();
  });

  it("active tab has aria-selected='true', others 'false'", async () => {
    const user = userEvent.setup();
    renderTabs();

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveAttribute("aria-selected", "false");

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveAttribute("aria-selected", "false");
  });

  it("tab panel has role='tabpanel' linked via aria-labelledby", () => {
    renderTabs();

    const panel = screen.getByRole("tabpanel");
    const tab = screen.getByRole("tab", { name: "Tab One" });

    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });

  it("keyboard: ArrowRight moves to next tab", async () => {
    const user = userEvent.setup();
    renderTabs();

    const tabOne = screen.getByRole("tab", { name: "Tab One" });
    tabOne.focus();

    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
  });

  it("keyboard: ArrowLeft moves to previous tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "two" });

    const tabTwo = screen.getByRole("tab", { name: "Tab Two" });
    tabTwo.focus();

    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel One Content")).toBeInTheDocument();
  });

  it("keyboard: ArrowRight wraps from last to first tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "three" });

    const tabThree = screen.getByRole("tab", { name: "Tab Three" });
    tabThree.focus();

    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
  });

  it("keyboard: ArrowLeft wraps from first to last tab", async () => {
    const user = userEvent.setup();
    renderTabs();

    const tabOne = screen.getByRole("tab", { name: "Tab One" });
    tabOne.focus();

    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveAttribute("aria-selected", "true");
  });

  it("variant prop applies correct styling class", () => {
    const { rerender } = render(
      <Tabs defaultValue="one" variant="pill">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One</Tabs.Panel>
      </Tabs>,
    );

    expect(screen.getByRole("tablist")).toHaveClass("tabs-list--pill");

    rerender(
      <Tabs defaultValue="one" variant="enclosed">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One</Tabs.Panel>
      </Tabs>,
    );

    expect(screen.getByRole("tablist")).toHaveClass("tabs-list--enclosed");
  });

  it("inactive tabs have tabIndex=-1 and active tab has tabIndex=0", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveAttribute("tabindex", "-1");
  });

  it("tab has aria-controls pointing to its panel id", () => {
    renderTabs();

    const tab = screen.getByRole("tab", { name: "Tab One" });
    const panel = screen.getByRole("tabpanel");

    expect(tab).toHaveAttribute("aria-controls", panel.id);
  });

  it("disabled tab cannot be activated", async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two" disabled>Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel One Content")).toBeInTheDocument();
    expect(screen.queryByText("Panel Two Content")).not.toBeInTheDocument();
  });

  it("calls onValueChange when tab is clicked", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one" onValueChange={onValueChange}>
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two</Tabs.Panel>
      </Tabs>,
    );

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("two");
  });

  it("keyboard: Home moves to first tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "three" });

    const tabThree = screen.getByRole("tab", { name: "Tab Three" });
    tabThree.focus();

    await user.keyboard("{Home}");

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
  });

  it("keyboard: End moves to last tab", async () => {
    const user = userEvent.setup();
    renderTabs();

    const tabOne = screen.getByRole("tab", { name: "Tab One" });
    tabOne.focus();

    await user.keyboard("{End}");

    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab Three" })).toHaveAttribute("aria-selected", "true");
  });

  /* -- #423: Tab must compose the caller's handlers, not be replaced by them -- */

  it("#423: a caller's onClick on Tabs.Tab runs and still selects the tab", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two" onClick={onClick}>Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
  });

  it("#423: a caller's onClick on Tabs.Tab runs and still selects when activated with Enter", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two" onClick={onClick}>Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    screen.getByRole("tab", { name: "Tab Two" }).focus();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
  });

  it("#423: a caller's onKeyDown on Tabs.Tab runs and still leaves arrow-key roving working", async () => {
    const onKeyDown = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one" onKeyDown={onKeyDown}>Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    screen.getByRole("tab", { name: "Tab One" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
  });

  it("#423: a caller's onKeyDown may opt out of roving with preventDefault", async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one" onKeyDown={(e) => e.preventDefault()}>Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    screen.getByRole("tab", { name: "Tab One" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute("aria-selected", "true");
  });

  /* -- #424: Panel must compose the caller's onAnimationEnd, not be replaced by it -- */

  it("#424: a caller's onAnimationEnd on Tabs.Panel runs and still completes the exit", async () => {
    motion.reduced = false;
    const onAnimationEnd = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one" onAnimationEnd={onAnimationEnd}>Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    const exitingPanel = screen.getByText("Panel One Content");

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));
    expect(exitingPanel).toHaveClass("fade-out");
    expect(screen.queryByText("Panel Two Content")).not.toBeInTheDocument();

    fireAnimationEnd(exitingPanel);

    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
    expect(screen.queryByText("Panel One Content")).not.toBeInTheDocument();
  });

  it("#424: preventDefault on the uncancelable animationend does not strand the exiting panel", async () => {
    motion.reduced = false;
    const onAnimationEnd = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one" onAnimationEnd={onAnimationEnd}>Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>,
    );

    const exitingPanel = screen.getByText("Panel One Content");

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));
    fireAnimationEnd(exitingPanel);

    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
  });
});

/**
 * The controlled/uncontrolled mode must lock on the first render. A parent that
 * writes `value={v ?? undefined}` otherwise flips the tabs uncontrolled mid-life
 * and they start answering clicks from internal state the parent cannot see.
 */
describe("mode lock", () => {
  let onValueChange = vi.fn();

  beforeEach(() => {
    onValueChange = vi.fn();
  });

  function ControlledTabs({ value }: { value: string | undefined }) {
    return (
      <Tabs defaultValue="one" value={value} onValueChange={onValueChange}>
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One Content</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two Content</Tabs.Panel>
      </Tabs>
    );
  }

  it("controlled tabs never adopt internal state when `value` goes undefined", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledTabs value="one" />);

    rerender(<ControlledTabs value={undefined} />);
    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith("two");
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByText("Panel One Content")).toBeInTheDocument();
  });

  it("controlled tabs keep honouring the parent after the undefined blip", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledTabs value="one" />);

    rerender(<ControlledTabs value={undefined} />);
    await user.click(screen.getByRole("tab", { name: "Tab Two" }));
    rerender(<ControlledTabs value="two" />);

    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("uncontrolled tabs are not turned controlled by a later `value`", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledTabs value={undefined} />);

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));
    rerender(<ControlledTabs value="one" />);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
  });

  // Behaviour change from the migration: `useControllableState` gates the change
  // channel on the value actually differing, so re-selecting the tab that is
  // already active is a no-op instead of an echo the parent has to filter.
  it("re-selecting the active tab does not re-emit", async () => {
    const user = userEvent.setup();
    render(<ControlledTabs value={undefined} />);

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));
    await user.click(screen.getByRole("tab", { name: "Tab Two" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith("two");
  });

  it("the exit-animation bookkeeping still tracks a controlled value change", async () => {
    motion.reduced = false;
    const { rerender } = render(<ControlledTabs value="one" />);

    rerender(<ControlledTabs value="two" />);

    const exiting = screen.getByText("Panel One Content");
    expect(exiting).toHaveClass("fade-out");
    fireAnimationEnd(exiting);
    expect(screen.getByText("Panel Two Content")).toBeInTheDocument();
    expect(screen.queryByText("Panel One Content")).not.toBeInTheDocument();
  });
});
