import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useWizard, Wizard, type WizardStep } from "./Wizard";

function StatefulField({ label }: { label: string }) {
  const [value, setValue] = useState("");
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => setValue(e.target.value)} />
    </label>
  );
}

const STEPS: WizardStep[] = [
  { title: "Account", description: "Your details", content: <p>Step one body</p> },
  { title: "Plan", description: "Pick a tier", content: <p>Step two body</p> },
  { title: "Confirm", description: "Review", content: <p>Step three body</p> },
];

describe("useWizard", () => {
  it("advances, retreats, and reports boundaries", () => {
    const { result } = renderHook(() => useWizard({ count: 3 }));
    expect(result.current.activeStep).toBe(0);
    expect(result.current.isFirst).toBe(true);

    act(() => result.current.next());
    expect(result.current.activeStep).toBe(1);
    expect(result.current.isFirst).toBe(false);
    expect(result.current.isLast).toBe(false);

    act(() => result.current.back());
    expect(result.current.activeStep).toBe(0);
  });

  it("enters the terminal complete state and fires onComplete past the last step", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWizard({ count: 2, defaultStep: 1, onComplete }),
    );
    expect(result.current.isLast).toBe(true);
    expect(result.current.isComplete).toBe(false);

    act(() => result.current.next());
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Advances to `count` — the terminal "all done" index.
    expect(result.current.activeStep).toBe(2);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isLast).toBe(false);

    // Already complete: next() is a no-op and does not re-fire onComplete.
    act(() => result.current.next());
    expect(result.current.activeStep).toBe(2);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // back() returns from the completed state to the last step.
    act(() => result.current.back());
    expect(result.current.activeStep).toBe(1);
    expect(result.current.isComplete).toBe(false);
  });

  it("clamps goTo within range", () => {
    const { result } = renderHook(() => useWizard({ count: 3 }));
    act(() => result.current.goTo(9));
    expect(result.current.activeStep).toBe(2);
    act(() => result.current.goTo(-4));
    expect(result.current.activeStep).toBe(0);
  });
});

describe("Wizard", () => {
  it("renders the active step's content and advances on Next", async () => {
    const user = userEvent.setup();
    render(<Wizard steps={STEPS} />);

    expect(screen.getByText("Step one body")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step two body")).toBeInTheDocument();
  });

  it("disables Back on the first step", () => {
    render(<Wizard steps={STEPS} />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("completes the flow on Finish: all steps done, content kept, button disabled", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(
      <Wizard steps={STEPS} defaultStep={2} onComplete={onComplete} />,
    );

    const finish = screen.getByRole("button", { name: "Finish" });
    await user.click(finish);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Every step — including the formerly active last one — now renders as done.
    const steps = container.querySelectorAll(".stepper-step");
    steps.forEach((step) =>
      expect(step).toHaveAttribute("data-status", "done"),
    );
    // The last step's panel stays visible, and the primary button is disabled.
    expect(screen.getByText("Step three body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
  });

  it("does not emit onStepChange when goTo lands on the current step", () => {
    const onStepChange = vi.fn();
    const { result } = renderHook(() =>
      useWizard({ count: 3, defaultStep: 0, onStepChange }),
    );

    act(() => {
      result.current.goTo(0);
    });
    expect(onStepChange).toHaveBeenCalledTimes(0);

    act(() => {
      result.current.goTo(1);
    });
    expect(onStepChange).toHaveBeenCalledTimes(1);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it("does not emit onStepChange when goTo clamps back onto the current step", () => {
    const onStepChange = vi.fn();
    const { result } = renderHook(() =>
      useWizard({ count: 3, defaultStep: 2, onStepChange }),
    );

    // Clamps to 2, which is where it already is.
    act(() => {
      result.current.goTo(99);
    });
    expect(onStepChange).toHaveBeenCalledTimes(0);
  });

  it("remounts step content so state cannot bleed between adjacent steps", async () => {
    const user = userEvent.setup();
    // Both steps root at the same component type, so without a key on the
    // content wrapper React reconciles them as one element and step two
    // inherits step one's state.
    const sharedRootSteps: WizardStep[] = [
      { title: "Account", content: <StatefulField label="Email" /> },
      { title: "Plan", content: <StatefulField label="Coupon" /> },
    ];
    render(<Wizard steps={sharedRootSteps} />);

    await user.type(screen.getByLabelText("Email"), "typed-into-step-one");
    expect(screen.getByLabelText("Email")).toHaveValue("typed-into-step-one");

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByLabelText("Coupon")).toHaveValue("");
  });

  it("lets a completed step be clicked to navigate back", async () => {
    const user = userEvent.setup();
    const { container } = render(<Wizard steps={STEPS} defaultStep={2} />);
    // Earlier ("done") step indicators render as buttons when navigation is on;
    // they carry a check glyph rather than a number, so target by position.
    const firstIndicator = container.querySelector(
      "button.stepper-indicator",
    ) as HTMLButtonElement;
    await user.click(firstIndicator);
    expect(screen.getByText("Step one body")).toBeInTheDocument();
  });
});

describe("Wizard · completion, semantics and dead tab stops", () => {
  // #303
  it("a controlled parent that refuses the advance is never told it completed", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    // `step` is pinned: every advance is requested and refused.
    render(<Wizard steps={STEPS} step={STEPS.length - 1} onComplete={onComplete} />);

    const finish = screen.getByRole("button", { name: "Finish" });
    await user.click(finish);
    await user.click(finish);
    await user.click(finish);

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("fires onComplete exactly once when the flow does complete", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Wizard steps={STEPS} defaultStep={STEPS.length - 1} onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // #304
  it("forwards aria-* / data-* to the root", () => {
    const { container } = render(
      <Wizard steps={STEPS} aria-label="Signup flow" data-testid="flow" />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-label", "Signup flow");
    expect(root).toHaveAttribute("data-testid", "flow");
  });

  // #305
  it("names the step panel and moves focus to it when the step changes", async () => {
    const user = userEvent.setup();
    render(<Wizard steps={STEPS} />);

    const panel = screen.getByRole("group", { name: "Account" });
    expect(panel).toHaveAttribute("id");
    expect(panel).not.toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("group", { name: "Plan" })).toHaveFocus();
  });

  // #306
  it("leaves no dead tab stop on a step the handler ignores", () => {
    render(<Wizard steps={STEPS} defaultStep={1} />);
    const markers = screen.getAllByRole("button", { name: /completed|current step|Plan|Review/ });
    // Only step 0 is behind the cursor, so it is the only marker button.
    expect(markers.filter((b) => b.classList.contains("stepper-indicator"))).toHaveLength(1);
  });

  // #307
  it("the last marker cannot un-complete a finished flow", async () => {
    const user = userEvent.setup();
    render(<Wizard steps={STEPS} defaultStep={STEPS.length - 1} />);
    await user.click(screen.getByRole("button", { name: "Finish" }));

    const last = STEPS[STEPS.length - 1];
    expect(
      screen.queryByRole("button", { name: `${last.title}, completed` }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
  });
});

describe("Wizard · classNames slots", () => {
  /**
   * One slot-override test per slot, and each is the falsifier for its own
   * merge: delete that element's `cn()` and exactly this test must go red.
   */
  it("lands classNames.body on the step panel, beside the base class", () => {
    const { container } = render(<Wizard steps={STEPS} classNames={{ body: "min-h-40" }} />);
    const body = container.querySelector(".wizard__content");
    expect(body?.getAttribute("class")).toContain("wizard__content");
    expect(body?.getAttribute("class")).toContain("min-h-40");
  });

  it("lands classNames.footer on the button row, beside the base class", () => {
    const { container } = render(<Wizard steps={STEPS} classNames={{ footer: "justify-start" }} />);
    const footer = container.querySelector(".wizard__footer");
    expect(footer?.getAttribute("class")).toContain("wizard__footer");
    expect(footer?.getAttribute("class")).toContain("justify-start");
  });

  it("leaves each internal on its base class alone when no slot is passed", () => {
    const { container } = render(<Wizard steps={STEPS} />);
    expect(container.querySelector(".wizard__content")?.getAttribute("class")).toBe(
      "wizard__content",
    );
    expect(container.querySelector(".wizard__footer")?.getAttribute("class")).toBe("wizard__footer");
  });

  it("does not put a slot class on the root", () => {
    const { container } = render(
      <Wizard steps={STEPS} classNames={{ body: "min-h-40", footer: "justify-start" }} />,
    );
    expect(container.firstElementChild?.getAttribute("class")).toBe("wizard");
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      <Wizard
        steps={STEPS}
        // @ts-expect-error — the header is a `Stepper` with its own surface, not
        // a slot on `Wizard`.
        classNames={{ stepper: "gap-r4" }}
      />,
    );
    expect(container.querySelector(".wizard__content")?.getAttribute("class")).toBe(
      "wizard__content",
    );
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = render(<Wizard steps={STEPS} classNames={{ body: "min-h-40" }} />);
    expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
  });
});
