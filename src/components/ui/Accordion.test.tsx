import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  // jsdom implements no `inert` semantics, and user-event's tab order ignores it,
  // so these assert the attribute that drives the behaviour, not the behaviour.
  describe("collapsed content is marked inert (#136)", () => {
    function renderWithLink(defaultValue?: string) {
      return render(
        <Accordion defaultValue={defaultValue}>
          <Accordion.Item value="a">
            <Accordion.Trigger>Section A</Accordion.Trigger>
            <Accordion.Content>
              <a href="#anchor">Buried link</a>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>,
      );
    }

    function panelFor(name: string) {
      const trigger = screen.getByRole("button", { name });
      return document.getElementById(trigger.getAttribute("aria-controls")!)!;
    }

    it("panel collapsed at mount is inert", () => {
      renderWithLink();

      const panel = panelFor("Section A");
      expect(panel).toHaveAttribute("data-state", "closed");
      expect(panel).toHaveAttribute("inert");
    });

    it("panel open at mount is not inert and its link is focusable", () => {
      renderWithLink("a");

      const panel = panelFor("Section A");
      expect(panel).toHaveAttribute("data-state", "open");
      expect(panel).not.toHaveAttribute("inert");

      const link = screen.getByRole("link", { name: "Buried link" });
      link.focus();
      expect(link).toHaveFocus();
    });

    it("inert tracks the open state across toggles", async () => {
      const user = userEvent.setup();
      renderWithLink();

      const trigger = screen.getByRole("button", { name: "Section A" });
      expect(panelFor("Section A")).toHaveAttribute("inert");

      await user.click(trigger);
      expect(panelFor("Section A")).not.toHaveAttribute("inert");

      await user.click(trigger);
      expect(panelFor("Section A")).toHaveAttribute("inert");
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

/**
 * The controlled/uncontrolled mode must lock on the first render. A parent that
 * writes `value={v ?? undefined}` — the shape a nullable selection produces —
 * otherwise flips the accordion uncontrolled mid-life, and it starts answering
 * clicks from internal state the parent cannot see.
 */
describe("mode lock", () => {
  let onValueChange = vi.fn();

  beforeEach(() => {
    onValueChange = vi.fn();
  });

  function ControlledAccordion({ value }: { value: string | string[] | undefined }) {
    return (
      <Accordion mode="multiple" value={value} onValueChange={onValueChange}>
        <Accordion.Item value="a">
          <Accordion.Trigger>Section A</Accordion.Trigger>
          <Accordion.Content>Content A</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>Section B</Accordion.Trigger>
          <Accordion.Content>Content B</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    );
  }

  it("a controlled accordion never adopts internal state when `value` goes undefined", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledAccordion value={["a"]} />);

    rerender(<ControlledAccordion value={undefined} />);
    await user.click(screen.getByRole("button", { name: "Section B" }));

    // The parent still owns the value: B reports its emitted change and nothing else.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(["b"]);
    expect(screen.getByRole("button", { name: "Section B" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("a controlled accordion keeps honouring the parent after the undefined blip", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledAccordion value={["a"]} />);

    rerender(<ControlledAccordion value={undefined} />);
    await user.click(screen.getByRole("button", { name: "Section B" }));
    rerender(<ControlledAccordion value={["a", "b"]} />);

    expect(screen.getByRole("button", { name: "Section A" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Section B" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("an uncontrolled accordion is not turned controlled by a later `value`", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledAccordion value={undefined} />);

    await user.click(screen.getByRole("button", { name: "Section A" }));
    rerender(<ControlledAccordion value={[]} />);
    await user.click(screen.getByRole("button", { name: "Section B" }));

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
    expect(screen.getByRole("button", { name: "Section B" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  /**
   * Measurement for the `isEqual` question: the accordion's value is an array, so
   * `Object.is` can never report two of them equal — but every reachable setter
   * call is a toggle, which provably changes the set. Repeated presses against a
   * frozen controlled parent emit once each, and none of them is a re-emit of an
   * equal value.
   */
  it("repeated presses against a frozen controlled parent emit once per press, never twice", async () => {
    const user = userEvent.setup();
    render(<ControlledAccordion value={["a"]} />);

    const b = screen.getByRole("button", { name: "Section B" });
    await user.click(b);
    await user.click(b);
    await user.click(b);

    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(onValueChange).toHaveBeenNthCalledWith(1, ["a", "b"]);
    expect(onValueChange).toHaveBeenNthCalledWith(2, ["a", "b"]);
    expect(onValueChange).toHaveBeenNthCalledWith(3, ["a", "b"]);
  });
});

describe("Accordion · headings, mode and id safety", () => {
  // #137
  it("wraps each trigger in a heading at the requested level", () => {
    render(
      <Accordion headingLevel={2}>
        <Accordion.Item value="a">
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Content>Body</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>Second</Accordion.Trigger>
          <Accordion.Content>Body</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "First" })).toContainElement(
      screen.getByRole("button", { name: "First" }),
    );
  });

  it("defaults to level 3", () => {
    render(
      <Accordion>
        <Accordion.Item value="a">
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Content>Body</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "First" })).toBeInTheDocument();
  });

  // #142
  it("mode=single opens only the first of a multi-value defaultValue", () => {
    render(
      <Accordion mode="single" defaultValue={["a", "b"]}>
        <Accordion.Item value="a">
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Content>Body A</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>Second</Accordion.Trigger>
          <Accordion.Content>Body B</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  // #143
  it("a value containing a space still wires aria-controls / aria-labelledby", () => {
    render(
      <Accordion defaultValue="billing details">
        <Accordion.Item value="billing details">
          <Accordion.Trigger>Billing</Accordion.Trigger>
          <Accordion.Content>Body</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Billing" });
    const controls = trigger.getAttribute("aria-controls")!;
    expect(controls).not.toMatch(/\s/);
    const content = document.getElementById(controls);
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute("aria-labelledby", trigger.id);
    expect(trigger.id).not.toMatch(/\s/);
  });
});
