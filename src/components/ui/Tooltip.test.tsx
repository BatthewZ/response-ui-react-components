import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import tooltipCss from "./Tooltip.css?raw";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders trigger children", () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
  });

  it("does not show tooltip content initially", () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on hover", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Tooltip text");
  });

  it("hides tooltip on unhover", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    await user.unhover(screen.getByRole("button", { name: "Hover me" }));
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("shows tooltip on focus", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Hover me" })).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("hides tooltip on Escape", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("tooltip element has role='tooltip'", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
  });

  it("trigger has aria-describedby when tooltip is open", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Hover me" });
    expect(trigger).not.toHaveAttribute("aria-describedby");

    await user.hover(trigger);
    const tooltip = await screen.findByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("keeps the child's own aria-describedby and composes its handlers", async () => {
    const user = userEvent.setup();
    const childFocus = vi.fn();

    render(
      <>
        <span id="hint">Saves to your drafts</span>
        <Tooltip content="Tooltip text" delay={0}>
          <button aria-describedby="hint" onFocus={childFocus}>
            Save
          </button>
        </Tooltip>
      </>
    );

    const trigger = screen.getByRole("button", { name: "Save" });

    // The child's own description must survive being wrapped.
    expect(trigger.getAttribute("aria-describedby")).toContain("hint");

    await user.tab();
    expect(trigger).toHaveFocus();
    // The child's own handler must still run — floating-ui's focus handler
    // used to replace it outright.
    expect(childFocus).toHaveBeenCalledTimes(1);

    // Once open, the tooltip is described IN ADDITION TO the child's own hint.
    const tip = await screen.findByRole("tooltip");
    await waitFor(() => {
      const described = trigger.getAttribute("aria-describedby") ?? "";
      expect(described).toContain("hint");
      expect(described.split(/\s+/)).toContain(tip.id);
    });
  });

  it("leaves the bubble reachable by pointer (WCAG 1.4.13 Hoverable)", () => {
    // jsdom applies no stylesheet and synthesises no pointer path, so the rule
    // itself is the only thing that can be asserted here: `pointer-events: none`
    // makes the bubble unhoverable no matter what the hover logic does.
    expect(tooltipCss).not.toMatch(/pointer-events:\s*none/);
  });

  it("portals into a caller-supplied container", async () => {
    const user = userEvent.setup();
    const host = document.createElement("div");
    host.id = "tooltip-host";
    document.body.appendChild(host);

    render(
      <Tooltip content="Tip" delay={0} container={host}>
        <button>Help</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Help" }));
    const tip = await screen.findByRole("tooltip");

    // Defaulting to <body> paints the bubble under a native <dialog>'s top layer.
    expect(host.contains(tip)).toBe(true);

    host.remove();
  });
});

/**
 * The bubble is the one element `Tooltip` constructs, so it is what `className`
 * addresses — the house rule, not a slot. Before this prop existed the bubble's
 * `padding`, `max-width`, `word-wrap` and `z-index` had no override path at any
 * level, and passing a class was a compile error rather than a silent drop.
 */
describe("className", () => {
  async function openTooltip(props: Record<string, unknown> = {}) {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip text" delay={0} {...props}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    return screen.findByRole("tooltip");
  }

  it("merges onto the bubble, beside the base class", async () => {
    const tip = await openTooltip({ className: "max-w-r1" });

    expect(tip.getAttribute("class")).toContain("tooltip");
    expect(tip.getAttribute("class")).toContain("max-w-r1");
  });

  it("leaves the bubble on its base class alone when nothing is passed", async () => {
    const tip = await openTooltip();

    expect(tip.getAttribute("class")).toBe("tooltip");
  });

  it("never reaches the cloned trigger", async () => {
    await openTooltip({ className: "max-w-r1" });

    expect(screen.getByRole("button", { name: "Hover me" }).className).not.toContain(
      "max-w-r1",
    );
  });
});

/**
 * The arrow, and its one slot. The arrow element exists at all only because
 * `useFloating`'s `arrowRef` option was live, exported and documented while no
 * component in the package rendered anything for it to position.
 */
describe("arrow", () => {
  async function openTooltip(props: Record<string, unknown> = {}) {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip text" delay={0} {...props}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    return screen.findByRole("tooltip");
  }

  it("renders no arrow unless asked for one", async () => {
    const tip = await openTooltip();

    expect(tip.querySelector(".tooltip-arrow")).toBeNull();
  });

  /**
   * The falsifier for the middleware wiring: `left` is present only because
   * `Tooltip` hands `arrowRef` to `useFloating`, which is what adds floating-ui's
   * `arrow` middleware and fills `middlewareData.arrow`. Drop the `arrowRef` from
   * that call and the element still renders — pinned, but never centred — so this
   * assertion is the one that reddens.
   */
  it("renders the arrow and positions it from the middleware", async () => {
    const tip = await openTooltip({ arrow: true });

    const arrow = tip.querySelector<HTMLElement>(".tooltip-arrow");
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    // Default placement is `top`, so the arrow sits on the bubble's bottom edge.
    expect(arrow).toHaveAttribute("data-side", "bottom");
    expect(arrow?.style.bottom).toBe("0px");
    expect(arrow?.style.translate).toBe("0 50%");
    expect(arrow?.style.left).not.toBe("");
  });

  it("pins the arrow to the edge facing the trigger, not to the placement", async () => {
    const tip = await openTooltip({ arrow: true, placement: "left" });

    const arrow = tip.querySelector<HTMLElement>(".tooltip-arrow");
    expect(arrow).toHaveAttribute("data-side", "right");
    expect(arrow?.style.right).toBe("0px");
    expect(arrow?.style.translate).toBe("50% 0");
  });

  it("lands classNames.arrow on the arrow, beside the base class", async () => {
    const tip = await openTooltip({ arrow: true, classNames: { arrow: "size-r3" } });

    const arrow = tip.querySelector(".tooltip-arrow");
    expect(arrow?.getAttribute("class")).toContain("tooltip-arrow");
    expect(arrow?.getAttribute("class")).toContain("size-r3");
  });

  it("leaves the arrow on its base class alone when no slot is passed", async () => {
    const tip = await openTooltip({ arrow: true });

    expect(tip.querySelector(".tooltip-arrow")?.getAttribute("class")).toBe(
      "tooltip-arrow",
    );
  });

  it("does not put the slot class on the bubble itself", async () => {
    const tip = await openTooltip({ arrow: true, classNames: { arrow: "size-r3" } });

    expect(tip.className).not.toContain("size-r3");
  });

  /**
   * The reason for a per-component inline slot union rather than a
   * `Record<string, string>` helper: an unknown key is a *type* error, not a
   * silent no-op. The `@ts-expect-error` is the assertion — it fails if
   * TypeScript ever stops rejecting the key. Do not "clean it up".
   */
  it("rejects an unknown slot key at compile time", async () => {
    const user = userEvent.setup();
    render(
      // @ts-expect-error — `pointer` is not a slot; only untyped JS gets here.
      <Tooltip content="Tooltip text" delay={0} arrow classNames={{ pointer: "size-r3" }}>
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole("button", { name: "Hover me" }));

    const tip = await screen.findByRole("tooltip");
    expect(tip.querySelector(".tooltip-arrow")?.getAttribute("class")).toBe(
      "tooltip-arrow",
    );
  });

  it("keeps the arrow out of the bubble's accessible description", async () => {
    const tip = await openTooltip({ arrow: true });

    // The arrow is `aria-hidden`, so the description is the content and nothing else.
    expect(tip).toHaveTextContent("Tooltip text");
    expect(tip.textContent).toBe("Tooltip text");
  });
  /**
   * #128. `useTransitionStyles` writes `transition-duration` inline, so the value
   * is observable here even though no test in this package can read a stylesheet.
   * That inline write is also *why* the tempo has to come from a token: no CSS
   * rule and no `duration-*` utility can outrank it, so `--MOTION-DURATION-*` is
   * the only channel a theme has. What is NOT observable: whether the fade
   * actually paints — jsdom performs no layout and computes no animation.
   */
  describe("fade timing", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      document.documentElement.style.removeProperty("--MOTION-DURATION-ENTER");
    });

    it("#128: takes its open duration from --MOTION-DURATION-ENTER", async () => {
      document.documentElement.style.setProperty("--MOTION-DURATION-ENTER", "380ms");
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>,
      );

      await user.hover(screen.getByRole("button", { name: "Hover me" }));
      const tip = await screen.findByRole("tooltip");

      await waitFor(() => expect(tip.style.transitionDuration).toBe("380ms"));
    });

    it("#128: falls back to 150ms when no token layer is present", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>,
      );

      await user.hover(screen.getByRole("button", { name: "Hover me" }));
      const tip = await screen.findByRole("tooltip");

      await waitFor(() => expect(tip.style.transitionDuration).toBe("150ms"));
    });
  });
});
