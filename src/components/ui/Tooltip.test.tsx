import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
