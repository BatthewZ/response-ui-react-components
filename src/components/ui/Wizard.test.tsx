import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useWizard, Wizard, type WizardStep } from "./Wizard";

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
