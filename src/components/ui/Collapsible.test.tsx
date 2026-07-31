import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { focusRingButton } from "../../util/focus";

import { Collapsible } from "./Collapsible";

function renderCollapsible(
  props: {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
  } = {}
) {
  return render(
    <Collapsible {...props}>
      <Collapsible.Trigger>Toggle</Collapsible.Trigger>
      <Collapsible.Content>Panel content</Collapsible.Content>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("is collapsed by default", () => {
    renderCollapsible();

    expect(screen.getByRole("button", { name: "Toggle" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByRole("region")).toHaveAttribute("data-state", "closed");
  });

  it("trigger toggles aria-expanded and data-state on Root and Content", async () => {
    const user = userEvent.setup();
    const { container } = renderCollapsible();

    const trigger = screen.getByRole("button", { name: "Toggle" });
    const root = container.querySelector(".collapsible")!;
    const content = screen.getByRole("region");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(root).toHaveAttribute("data-state", "closed");
    expect(content).toHaveAttribute("data-state", "closed");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("data-state", "open");
    expect(root).toHaveAttribute("data-state", "open");
    expect(content).toHaveAttribute("data-state", "open");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveAttribute("data-state", "closed");
  });

  it("aria-controls points to the Content id", () => {
    renderCollapsible();

    const trigger = screen.getByRole("button", { name: "Toggle" });
    const content = screen.getByRole("region");

    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.id).toBeTruthy();
  });

  it("content stays mounted when closed", () => {
    renderCollapsible();

    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("controlled mode: internal toggle does not change state without onOpenChange updating it", async () => {
    const user = userEvent.setup();
    renderCollapsible({ open: false });

    const trigger = screen.getByRole("button", { name: "Toggle" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    // Controlled and parent didn't update `open`, so it stays closed.
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("region")).toHaveAttribute("data-state", "closed");
  });

  it("controlled mode: updates when parent passes new open prop", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <Collapsible.Trigger>Toggle</Collapsible.Trigger>
          <Collapsible.Content>Panel content</Collapsible.Content>
        </Collapsible>
      );
    }

    render(<Controlled />);
    const trigger = screen.getByRole("button", { name: "Toggle" });

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("fires onOpenChange with the next state", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderCollapsible({ onOpenChange });

    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Toggle" }));
    // One emission per click — a trigger wired twice would report four.
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("disabled prevents toggle", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderCollapsible({ disabled: true, onOpenChange });

    const trigger = screen.getByRole("button", { name: "Toggle" });
    expect(trigger).toBeDisabled();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // jsdom implements no `inert` semantics and user-event's tab order ignores it,
  // so these assert the attribute that drives the behaviour, not the behaviour.
  // Same treatment as Accordion, which shares this defect under ledger #136.
  describe("collapsed content is marked inert (#136)", () => {
    function renderWithLink(defaultOpen?: boolean) {
      return render(
        <Collapsible defaultOpen={defaultOpen}>
          <Collapsible.Trigger>Details</Collapsible.Trigger>
          <Collapsible.Content>
            <a href="#anchor">Buried link</a>
          </Collapsible.Content>
        </Collapsible>
      );
    }

    const panel = () => document.querySelector(".collapsible-content");

    it("content collapsed at mount is inert", () => {
      renderWithLink();
      expect(panel()).toHaveAttribute("data-state", "closed");
      expect(panel()).toHaveAttribute("inert");
    });

    it("open content is not inert, so its links stay reachable", () => {
      renderWithLink(true);
      expect(panel()).toHaveAttribute("data-state", "open");
      expect(panel()).not.toHaveAttribute("inert");
    });

    it("inert tracks the open state across toggles", async () => {
      const user = userEvent.setup();
      renderWithLink();
      expect(panel()).toHaveAttribute("inert");

      await user.click(screen.getByRole("button", { name: "Details" }));
      expect(panel()).not.toHaveAttribute("inert");

      await user.click(screen.getByRole("button", { name: "Details" }));
      expect(panel()).toHaveAttribute("inert");
    });
  });

  describe("focus affordance (#95)", () => {
    // The trigger carries `.collapsible-trigger`, which no stylesheet styles at
    // all — `Collapsible.css` is gone, and the class survives as a marker — so
    // the ring has to arrive as a utility. verify:focus-affordance reads both
    // halves now, but this is the check that pins the token from a test.
    it("gives the trigger a ring in the house focus token", () => {
      renderCollapsible();
      const cls = screen.getByRole("button", { name: "Toggle" }).className;

      expect(cls).toContain(focusRingButton);
    });

    it("keeps the ring when the caller adds classes of their own", () => {
      render(
        <Collapsible>
          <Collapsible.Trigger className="w-full">Toggle</Collapsible.Trigger>
          <Collapsible.Content>Panel content</Collapsible.Content>
        </Collapsible>
      );
      const cls = screen.getByRole("button", { name: "Toggle" }).className;

      expect(cls).toContain("focus-visible:ring-border-focus");
      expect(cls).toContain("w-full");
    });

    it("keeps the UA outline rather than replacing it", () => {
      // The trigger is a `<button>`, so it sits on the `focus-visible:` half of
      // the split with Button and IconButton — and, like them, adds no outline
      // reset: the UA outline stays as the contrast-adaptive second indicator.
      renderCollapsible();

      expect(screen.getByRole("button", { name: "Toggle" }).className).not.toContain(
        "outline-none"
      );
    });
  });
});

describe("Collapsible · region naming", () => {
  // #144
  it("the content region is named by its trigger", () => {
    render(
      <Collapsible defaultOpen>
        <Collapsible.Trigger>Details</Collapsible.Trigger>
        <Collapsible.Content>Body</Collapsible.Content>
      </Collapsible>,
    );

    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger.id).not.toBe("");
    const region = screen.getByRole("region", { name: "Details" });
    expect(region).toHaveAttribute("aria-labelledby", trigger.id);
  });
});
