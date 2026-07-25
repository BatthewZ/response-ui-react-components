import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { describe, expect, it, vi } from "vitest";

import { Accordion } from "./Accordion";

function renderAccordion(props: {
  mode?: "single" | "multiple";
  defaultValue?: string | string[];
} = {}) {
  const { mode, defaultValue } = props;
  return render(
    <Accordion mode={mode} defaultValue={defaultValue}>
      <Accordion.Item value="a">
        <Accordion.Trigger>Section A</Accordion.Trigger>
        <Accordion.Content>Content A</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>Section B</Accordion.Trigger>
        <Accordion.Content>Content B</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="c">
        <Accordion.Trigger>Section C</Accordion.Trigger>
        <Accordion.Content>Content C</Accordion.Content>
      </Accordion.Item>
    </Accordion>,
  );
}

describe("Accordion", () => {
  it("renders items collapsed by default", () => {
    renderAccordion();

    const triggers = screen.getAllByRole("button");
    for (const trigger of triggers) {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }

    const regions = screen.getAllByRole("region");
    for (const region of regions) {
      expect(region).toHaveAttribute("data-state", "closed");
    }
  });

  it("clicking trigger expands the content panel", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger = screen.getByRole("button", { name: "Section A" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const contentId = trigger.getAttribute("aria-controls")!;
    expect(document.getElementById(contentId)).toHaveAttribute("data-state", "open");
  });

  it("clicking expanded trigger collapses it", async () => {
    const user = userEvent.setup();
    renderAccordion({ defaultValue: "a" });

    const trigger = screen.getByRole("button", { name: "Section A" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("mode='single': only one item expanded at a time", async () => {
    const user = userEvent.setup();
    renderAccordion({ mode: "single" });

    const triggerA = screen.getByRole("button", { name: "Section A" });
    const triggerB = screen.getByRole("button", { name: "Section B" });

    await user.click(triggerA);
    expect(triggerA).toHaveAttribute("aria-expanded", "true");
    expect(triggerB).toHaveAttribute("aria-expanded", "false");

    await user.click(triggerB);
    expect(triggerA).toHaveAttribute("aria-expanded", "false");
    expect(triggerB).toHaveAttribute("aria-expanded", "true");
  });

  it("mode='multiple': multiple items can be expanded simultaneously", async () => {
    const user = userEvent.setup();
    renderAccordion({ mode: "multiple" });

    const triggerA = screen.getByRole("button", { name: "Section A" });
    const triggerB = screen.getByRole("button", { name: "Section B" });

    await user.click(triggerA);
    await user.click(triggerB);

    expect(triggerA).toHaveAttribute("aria-expanded", "true");
    expect(triggerB).toHaveAttribute("aria-expanded", "true");
  });

  it("defaultExpanded prop opens items initially", () => {
    renderAccordion({ defaultValue: "b" });

    expect(screen.getByRole("button", { name: "Section A" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Section B" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Section C" })).toHaveAttribute("aria-expanded", "false");
  });

  it("defaultValue accepts array for multiple mode", () => {
    renderAccordion({ mode: "multiple", defaultValue: ["a", "c"] });

    expect(screen.getByRole("button", { name: "Section A" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Section B" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Section C" })).toHaveAttribute("aria-expanded", "true");
  });

  it("trigger has aria-expanded attribute matching state", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger = screen.getByRole("button", { name: "Section A" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keyboard: Enter toggles expansion", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger = screen.getByRole("button", { name: "Section A" });
    trigger.focus();

    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keyboard: Space toggles expansion", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger = screen.getByRole("button", { name: "Section A" });
    trigger.focus();

    await user.keyboard(" ");

    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("disabled item cannot be toggled", async () => {
    const user = userEvent.setup();

    render(
      <Accordion>
        <Accordion.Item value="a" disabled>
          <Accordion.Trigger>Disabled Section</Accordion.Trigger>
          <Accordion.Content>Disabled Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Disabled Section" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("forwards className and ref on root", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <Accordion className="custom-class" ref={ref}>
        <Accordion.Item value="a">
          <Accordion.Trigger>Section A</Accordion.Trigger>
          <Accordion.Content>Content A</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("accordion", "custom-class");
  });

  it("content region is linked to trigger via aria-labelledby", () => {
    renderAccordion();

    const trigger = screen.getByRole("button", { name: "Section A" });
    const triggerId = trigger.id;
    const contentId = trigger.getAttribute("aria-controls")!;
    const content = document.getElementById(contentId)!;

    expect(content).toHaveAttribute("role", "region");
    expect(content).toHaveAttribute("aria-labelledby", triggerId);
  });

  it("calls onValueChange when items are toggled", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Accordion onValueChange={onValueChange}>
        <Accordion.Item value="a">
          <Accordion.Trigger>Section A</Accordion.Trigger>
          <Accordion.Content>Content A</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "Section A" }));

    expect(onValueChange).toHaveBeenCalledWith("a");
  });

  describe("roving focus", () => {
    it("ArrowDown moves focus to the next trigger and wraps", async () => {
      const user = userEvent.setup();
      renderAccordion();

      const [a, b, c] = screen.getAllByRole("button");
      a.focus();

      await user.keyboard("{ArrowDown}");
      expect(b).toHaveFocus();

      await user.keyboard("{ArrowDown}");
      expect(c).toHaveFocus();

      await user.keyboard("{ArrowDown}");
      expect(a).toHaveFocus();
    });

    it("ArrowUp moves focus to the previous trigger and wraps", async () => {
      const user = userEvent.setup();
      renderAccordion();

      const [a, b, c] = screen.getAllByRole("button");
      a.focus();

      await user.keyboard("{ArrowUp}");
      expect(c).toHaveFocus();

      await user.keyboard("{ArrowUp}");
      expect(b).toHaveFocus();
    });

    it("Home and End jump to the first and last trigger", async () => {
      const user = userEvent.setup();
      renderAccordion();

      const [a, b, c] = screen.getAllByRole("button");
      b.focus();

      await user.keyboard("{End}");
      expect(c).toHaveFocus();

      await user.keyboard("{Home}");
      expect(a).toHaveFocus();
    });
  });

  describe("Trigger composes caller handlers (#135)", () => {
    function renderWithTriggerProps(triggerProps: {
      onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
      onKeyDown?: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
    }) {
      return render(
        <Accordion mode="multiple">
          <Accordion.Item value="a">
            <Accordion.Trigger {...triggerProps}>Section A</Accordion.Trigger>
            <Accordion.Content>Content A</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="b">
            <Accordion.Trigger>Section B</Accordion.Trigger>
            <Accordion.Content>Content B</Accordion.Content>
          </Accordion.Item>
        </Accordion>,
      );
    }

    it("caller onClick fires exactly once and the toggle still runs", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithTriggerProps({ onClick });

      const trigger = screen.getByRole("button", { name: "Section A" });
      await user.click(trigger);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("caller onClick calling preventDefault suppresses the toggle", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn((e: ReactMouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
      });
      renderWithTriggerProps({ onClick });

      const trigger = screen.getByRole("button", { name: "Section A" });
      await user.click(trigger);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("caller onKeyDown fires exactly once and roving focus still runs", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      renderWithTriggerProps({ onKeyDown });

      const triggerA = screen.getByRole("button", { name: "Section A" });
      const triggerB = screen.getByRole("button", { name: "Section B" });
      triggerA.focus();

      await user.keyboard("{ArrowDown}");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(triggerB).toHaveFocus();
    });

    it("caller onKeyDown calling preventDefault suppresses roving focus", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn((e: ReactKeyboardEvent<HTMLButtonElement>) => {
        e.preventDefault();
      });
      renderWithTriggerProps({ onKeyDown });

      const triggerA = screen.getByRole("button", { name: "Section A" });
      triggerA.focus();

      await user.keyboard("{ArrowDown}");

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(triggerA).toHaveFocus();
    });
  });
});
