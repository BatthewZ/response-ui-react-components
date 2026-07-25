import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Stepper } from "./Stepper";

function renderStepper(
  activeStep: number,
  extra?: { onStepClick?: (index: number) => void; orientation?: "horizontal" | "vertical" },
) {
  return render(
    <Stepper activeStep={activeStep} {...extra}>
      <Stepper.Step title="Account" description="Create your account" />
      <Stepper.Step title="Profile" description="Set up profile" />
      <Stepper.Step title="Confirm" description="Review and confirm" />
    </Stepper>,
  );
}

describe("Stepper", () => {
  it("renders an ordered list with the stepper class", () => {
    const { container } = renderStepper(1);
    const ol = container.querySelector("ol.stepper");
    expect(ol).toBeInTheDocument();
  });

  it("derives statuses from activeStep via data-status", () => {
    const { container } = renderStepper(1);
    const steps = container.querySelectorAll(".stepper-step");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveAttribute("data-status", "done");
    expect(steps[1]).toHaveAttribute("data-status", "active");
    expect(steps[2]).toHaveAttribute("data-status", "upcoming");
  });

  it("marks the active step li with aria-current=step", () => {
    const { container } = renderStepper(1);
    const steps = container.querySelectorAll(".stepper-step");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[2]).not.toHaveAttribute("aria-current");
  });

  it("renders a check icon (svg) in done steps", () => {
    const { container } = renderStepper(1);
    const done = container.querySelector('.stepper-step[data-status="done"]');
    expect(done?.querySelector("svg")).toBeInTheDocument();
    // active + upcoming show their step number, not a check svg
    const active = container.querySelector('.stepper-step[data-status="active"]');
    expect(active?.querySelector("svg")).not.toBeInTheDocument();
    expect(active?.querySelector(".stepper-indicator")?.textContent).toBe("2");
  });

  it("renders no buttons when onStepClick is not provided", () => {
    renderStepper(1);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // indicators are spans instead
    const { container } = renderStepper(1);
    expect(container.querySelectorAll("span.stepper-indicator").length).toBeGreaterThan(0);
  });

  it("renders buttons in clickable mode and fires onStepClick(index)", async () => {
    const onStepClick = vi.fn();
    renderStepper(1, { onStepClick });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);

    await userEvent.click(buttons[2]);
    expect(onStepClick).toHaveBeenCalledTimes(1);
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it("names every clickable indicator after its step, with its status", () => {
    // activeStep=2 → steps 0 and 1 are "done" (a check glyph, no text of their own).
    renderStepper(2, { onStepClick: vi.fn() });

    expect(
      screen.getByRole("button", { name: "Account, completed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Profile, completed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm, current step" }),
    ).toBeInTheDocument();
  });

  it("names upcoming indicators too", () => {
    renderStepper(0, { onStepClick: vi.fn() });

    expect(
      screen.getByRole("button", { name: "Account, current step" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("still fires onStepClick once when reached by its accessible name", async () => {
    const onStepClick = vi.fn();
    renderStepper(2, { onStepClick });

    await userEvent.click(screen.getByRole("button", { name: "Profile, completed" }));

    expect(onStepClick).toHaveBeenCalledTimes(1);
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("spreads rest props onto the li, per StepProps' li prop type", () => {
    const { container } = render(
      <Stepper activeStep={0} onStepClick={vi.fn()}>
        <Stepper.Step title="Account" data-testid="step-root" id="account-step" />
      </Stepper>,
    );
    const li = container.querySelector("li.stepper-step");
    expect(li).toHaveAttribute("data-testid", "step-root");
    expect(li).toHaveAttribute("id", "account-step");
    // The button keeps its own name — the li's props never reach it.
    expect(screen.getByRole("button", { name: "Account, current step" })).not.toBe(li);
  });

  it("reflects orientation via data-orientation", () => {
    const { container, rerender } = renderStepper(0);
    expect(container.querySelector(".stepper")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );

    rerender(
      <Stepper activeStep={0} orientation="vertical">
        <Stepper.Step title="A" />
        <Stepper.Step title="B" />
      </Stepper>,
    );
    expect(container.querySelector(".stepper")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });

  it("renders a custom icon when provided", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="Custom" icon={<span data-testid="custom-icon">★</span>} />
      </Stepper>,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    // no check svg since a custom icon overrides
    expect(container.querySelector(".stepper-indicator svg")).not.toBeInTheDocument();
  });
});
