import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

// NOTE for this whole block: jsdom applies no stylesheet (`css: false`), so it
// cannot tell a `.stepper-status` span from a visible one. Every assertion below
// is the DOM precondition — the text that reaches the accessibility tree — and
// that the word is visually hidden is a CSS claim verified in a browser instead.
describe("Stepper · completed status without a button (#474)", () => {
  const step = (container: HTMLElement, status: string) =>
    container.querySelector<HTMLElement>(`.stepper-step[data-status="${status}"]`);

  it("gives a completed step a status word in place of the numeral it lost", () => {
    const { container } = renderStepper(1);

    const indicator = step(container, "done")?.querySelector(".stepper-indicator");
    // The check glyph is aria-hidden and there is no numeral, so without this a
    // done step and an upcoming one differ only by the digit being absent.
    expect(indicator?.textContent).toBe("completed");
  });

  it("says nothing extra on the current step, which aria-current already carries", () => {
    const { container } = renderStepper(1);

    const active = step(container, "active");
    expect(active).toHaveAttribute("aria-current", "step");
    // A hidden word beside aria-current announces the state twice (traps §J).
    expect(active?.querySelector(".stepper-indicator")?.textContent).toBe("2");
    expect(active?.textContent).not.toContain("current step");
  });

  it("leaves an upcoming step reading its numeral alone", () => {
    const { container } = renderStepper(1);

    expect(step(container, "upcoming")?.querySelector(".stepper-indicator")?.textContent).toBe(
      "3",
    );
  });

  it("still writes the word when a custom icon replaces the check", () => {
    const { container } = render(
      <Stepper activeStep={1}>
        <Stepper.Step title="Order placed" icon={<span aria-hidden="true">★</span>} />
        <Stepper.Step title="In transit" />
      </Stepper>,
    );

    expect(
      container.querySelector('.stepper-step[data-status="done"] .stepper-indicator')
        ?.textContent,
    ).toBe("★completed");
  });
});

describe("Stepper · statusLabels (#475)", () => {
  it("translates the word the default path writes", () => {
    const { container } = render(
      <Stepper activeStep={1} statusLabels={{ done: "abgeschlossen" }}>
        <Stepper.Step title="Konto" />
        <Stepper.Step title="Tarif" />
      </Stepper>,
    );

    expect(
      container.querySelector('.stepper-step[data-status="done"] .stepper-indicator')
        ?.textContent,
    ).toBe("abgeschlossen");
  });

  it("translates the same word in the clickable indicator's name", () => {
    render(
      <Stepper
        activeStep={1}
        onStepClick={vi.fn()}
        statusLabels={{ done: "abgeschlossen", active: "aktueller Schritt" }}
      >
        <Stepper.Step title="Konto" />
        <Stepper.Step title="Tarif" />
      </Stepper>,
    );

    expect(
      screen.getByRole("button", { name: "Konto, abgeschlossen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tarif, aktueller Schritt" }),
    ).toBeInTheDocument();
  });

  it("'' drops the word from both paths, leaving the bare title", () => {
    const { container, rerender } = render(
      <Stepper activeStep={1} statusLabels={{ done: "" }}>
        <Stepper.Step title="Account" />
        <Stepper.Step title="Plan" />
      </Stepper>,
    );
    expect(
      container.querySelector('.stepper-step[data-status="done"] .stepper-indicator')
        ?.textContent,
    ).toBe("");

    rerender(
      <Stepper activeStep={1} onStepClick={vi.fn()} statusLabels={{ done: "" }}>
        <Stepper.Step title="Account" />
        <Stepper.Step title="Plan" />
      </Stepper>,
    );
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });

  it("merges over the defaults rather than replacing them", () => {
    render(
      <Stepper activeStep={1} onStepClick={vi.fn()} statusLabels={{ done: "fertig" }}>
        <Stepper.Step title="Account" />
        <Stepper.Step title="Plan" />
      </Stepper>,
    );

    expect(screen.getByRole("button", { name: "Account, fertig" })).toBeInTheDocument();
    // `active` was not overridden, so its default survives.
    expect(
      screen.getByRole("button", { name: "Plan, current step" }),
    ).toBeInTheDocument();
  });

  it("writes an upcoming word only when one is supplied", () => {
    const { container } = render(
      <Stepper activeStep={0} statusLabels={{ upcoming: "not started" }}>
        <Stepper.Step title="Account" />
        <Stepper.Step title="Plan" />
      </Stepper>,
    );

    expect(
      container.querySelector('.stepper-step[data-status="upcoming"] .stepper-indicator')
        ?.textContent,
    ).toBe("2not started");
  });
});

describe("Stepper · isStepClickable", () => {
  // #140
  it("only the steps the handler acts on become buttons", () => {
    const onStepClick = vi.fn();
    render(
      <Stepper activeStep={1} onStepClick={onStepClick} isStepClickable={(i) => i < 1}>
        <Stepper.Step title="One" />
        <Stepper.Step title="Two" />
        <Stepper.Step title="Three" />
      </Stepper>,
    );

    const indicators = document.querySelectorAll(".stepper-indicator");
    expect(indicators).toHaveLength(3);
    expect(Array.from(indicators).filter((el) => el.tagName === "BUTTON")).toHaveLength(1);
  });

  it("defaults to every step clickable", () => {
    render(
      <Stepper activeStep={1} onStepClick={vi.fn()}>
        <Stepper.Step title="One" />
        <Stepper.Step title="Two" />
      </Stepper>,
    );
    expect(document.querySelectorAll("button.stepper-indicator")).toHaveLength(2);
  });
});

describe("Stepper · classNames slots", () => {
  /**
   * One slot-override test per slot, and each is the falsifier for its own
   * merge: delete that element's `cn()` and exactly this test must go red.
   */
  it("lands classNames.indicator on the marker in both its forms", () => {
    // Step 0 is clickable (a <button>), step 1 is not (a <span>) — one key
    // has to cover both or the class vanishes when a flow becomes navigable.
    const { container } = render(
      <Stepper activeStep={1} onStepClick={vi.fn()} isStepClickable={(i) => i === 0}>
        <Stepper.Step title="One" classNames={{ indicator: "ring-2" }} />
        <Stepper.Step title="Two" classNames={{ indicator: "ring-2" }} />
      </Stepper>,
    );
    const markers = container.querySelectorAll(".stepper-indicator");
    expect(markers).toHaveLength(2);
    expect(markers[0].tagName).toBe("BUTTON");
    expect(markers[1].tagName).toBe("SPAN");
    for (const marker of markers) {
      expect(marker.getAttribute("class")).toContain("stepper-indicator");
      expect(marker.getAttribute("class")).toContain("ring-2");
    }
  });

  it("lands classNames.itemBody on the text block, beside the base class", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" classNames={{ itemBody: "gap-r6" }} />
      </Stepper>,
    );
    const body = container.querySelector(".stepper-content");
    expect(body?.getAttribute("class")).toContain("stepper-content");
    expect(body?.getAttribute("class")).toContain("gap-r6");
  });

  it("lands classNames.title on the step title, beside the base class", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" classNames={{ title: "font-bold" }} />
      </Stepper>,
    );
    const title = container.querySelector(".stepper-title");
    expect(title?.getAttribute("class")).toContain("stepper-title");
    expect(title?.getAttribute("class")).toContain("font-bold");
  });

  it("lands classNames.description on the step description, beside the base class", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" description="Detail" classNames={{ description: "italic" }} />
      </Stepper>,
    );
    const description = container.querySelector(".stepper-description");
    expect(description?.getAttribute("class")).toContain("stepper-description");
    expect(description?.getAttribute("class")).toContain("italic");
  });

  it("lands classNames.connector on the joining rule, beside the base class", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" classNames={{ connector: "opacity-50" }} />
      </Stepper>,
    );
    const connector = container.querySelector(".stepper-connector");
    expect(connector?.getAttribute("class")).toContain("stepper-connector");
    expect(connector?.getAttribute("class")).toContain("opacity-50");
  });

  /**
   * This used to assert each class attribute equalled its marker exactly, which
   * stopped being expressible once the marker, the text block and the step's own
   * box moved out of `Stepper.css` and into utilities. The falsifiers are
   * unchanged and are what the equality was ever standing in for: an absent slot
   * appends NOTHING — no `undefined`, no empty token — and each element keeps its
   * own marker.
   *
   * `.stepper-connector` is the one still enumerable in full, because its
   * geometry could not move: it is `calc()` over `--_stepper-gap` and friends,
   * whose only read sites are inside that `calc()`. The four utilities it does
   * carry are the fill transition and nothing else — spell them out, so a later
   * conversion that moves a position declaration onto the class list has to come
   * through here rather than landing in `@layer utilities` unnoticed.
   */
  it("leaves each internal on its base classes alone when no slot is passed", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" description="Detail" />
      </Stepper>,
    );
    for (const marker of [
      "stepper-indicator",
      "stepper-glyph",
      "stepper-content",
      "stepper-title",
      "stepper-description",
      "stepper-connector",
    ]) {
      const classes = container.querySelector(`.${marker}`)?.getAttribute("class") ?? "";
      expect(classes.split(" ")).toContain(marker);
      expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
    }
    expect(
      container.querySelector(".stepper-connector")?.getAttribute("class")?.split(" "),
    ).toEqual([
      "stepper-connector",
      "transition-[background-color]",
      "duration-[var(--MOTION-DURATION-SHIFT)]",
      "ease-[var(--MOTION-EASE-SHIFT)]",
      "motion-reduce:transition-none",
    ]);
  });

  it("does not put a slot class on the step root", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step
          title="One"
          description="Detail"
          classNames={{
            indicator: "ring-2",
            itemBody: "gap-r6",
            title: "font-bold",
            description: "italic",
            connector: "opacity-50",
          }}
        />
      </Stepper>,
    );
    const step = (container.querySelector(".stepper-step")?.getAttribute("class") ?? "").split(" ");
    expect(step).toContain("stepper-step");
    for (const slotClass of ["ring-2", "gap-r6", "font-bold", "italic", "opacity-50"]) {
      expect(step).not.toContain(slotClass);
    }
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      <Stepper activeStep={1}>
        <Stepper.Step
          title="One"
          // @ts-expect-error — the hidden status word is (a); `sr-only`-style
          // clipping is the mechanism and takes no override.
          classNames={{ status: "not-sr-only" }}
        />
      </Stepper>,
    );
    // `sr-only` is the mechanism, and the reason `status` is not a slot: it is
    // Tailwind's utility now rather than a hand-rolled clip in `Stepper.css`,
    // but it is still the only thing keeping the word off the screen.
    const classes = container.querySelector(".stepper-status")?.getAttribute("class") ?? "";
    expect(classes.split(" ")).toEqual(expect.arrayContaining(["stepper-status", "sr-only"]));
    expect(classes).not.toContain("not-sr-only");
  });

  it("lands classNames.glyph on the box the pulse scales", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" classNames={{ glyph: "animate-none" }} />
      </Stepper>,
    );
    const tokens = (container.querySelector(".stepper-glyph")?.getAttribute("class") ?? "").split(
      " ",
    );
    expect(tokens).toContain("stepper-glyph");
    // Last in the `cn()`, so tailwind-merge drops the base `animate-[…]` rather
    // than emitting both and leaving the winner to source order: a caller
    // cancelling the pulse has to actually cancel it.
    expect(tokens.filter((t) => t.startsWith("animate-"))).toEqual(["animate-none"]);
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <Stepper.Step title="One" classNames={{ title: "font-bold" }} />
      </Stepper>,
    );
    expect(container.querySelector(".stepper-step")?.hasAttribute("classnames")).toBe(false);
  });
});

/**
 * The status change is the thing being animated, so these assert the two
 * mechanisms that make it visible — a transition every marker carries, and a
 * glyph React replaces so the entrance animation can run a second time. Class
 * strings are the only observable here (jsdom computes no animations), so each
 * test pairs the string with the DOM behaviour it depends on.
 */
describe("Stepper · status motion", () => {
  it("transitions the marker's status recipe in both its forms, not just the clickable one", () => {
    const { container } = render(
      <Stepper activeStep={1} onStepClick={vi.fn()} isStepClickable={(i) => i === 0}>
        <Stepper.Step title="One" />
        <Stepper.Step title="Two" />
      </Stepper>,
    );
    const markers = container.querySelectorAll(".stepper-indicator");
    expect(markers[0].tagName).toBe("BUTTON");
    expect(markers[1].tagName).toBe("SPAN");
    for (const marker of markers) {
      const tokens = (marker.getAttribute("class") ?? "").split(" ");
      // Every property the three status recipes move, minus `border-width` — see
      // `Stepper.tsx` for the 1px snap that kept it off the list.
      expect(tokens).toContain("transition-[color,background-color,border-color]");
      expect(tokens).toContain("duration-[var(--MOTION-DURATION-SHIFT)]");
      expect(tokens).toContain("motion-reduce:transition-none");
    }
  });

  it("wraps the numeral and the check in a glyph box carrying the pulse", () => {
    const { container } = renderStepper(1);
    const done = container.querySelector('.stepper-step[data-status="done"] .stepper-glyph');
    const active = container.querySelector('.stepper-step[data-status="active"] .stepper-glyph');
    // A bare text node has no box to scale, so the numeral needs the wrapper as
    // much as the icon does.
    expect(active?.textContent).toBe("2");
    expect(done?.querySelector("svg")).toBeInTheDocument();
    for (const glyph of [done, active]) {
      const tokens = (glyph?.getAttribute("class") ?? "").split(" ");
      expect(tokens).toContain(
        "animate-[stepper-glyph-pulse_var(--MOTION-DURATION-ENTER)_var(--MOTION-EASE-ENTER)]",
      );
      expect(tokens).toContain("motion-reduce:animate-none");
    }
  });

  it("replaces the glyph node when a step changes status, and only then", () => {
    const tree = (activeStep: number) => (
      <Stepper activeStep={activeStep}>
        <Stepper.Step title="One" />
        <Stepper.Step title="Two" />
        <Stepper.Step title="Three" />
      </Stepper>
    );
    const { container, rerender } = render(tree(0));
    const glyphs = () => [...container.querySelectorAll(".stepper-glyph")];
    const [firstBefore, , thirdBefore] = glyphs();

    rerender(tree(1));

    const [firstAfter, , thirdAfter] = glyphs();
    // Step one went active -> done. A CSS animation restarts on a NEW element,
    // never by having the same `animation-name` re-applied to the one already
    // carrying it, so this identity change IS the second pulse.
    expect(firstAfter).not.toBe(firstBefore);
    expect(firstBefore?.isConnected).toBe(false);
    // Step three did not move, so nothing about it may re-animate.
    expect(thirdAfter).toBe(thirdBefore);
  });

  it("keeps focus on a clickable marker across the status change it caused", async () => {
    const user = userEvent.setup();
    function Flow() {
      const [step, setStep] = useState(0);
      return (
        <Stepper activeStep={step} onStepClick={setStep}>
          <Stepper.Step title="One" />
          <Stepper.Step title="Two" />
        </Stepper>
      );
    }
    const { container } = render(<Flow />);
    const [first] = screen.getAllByRole("button");

    await user.click(screen.getByRole("button", { name: /Two/ }));

    // The key that re-fires the pulse is on the glyph, not on the marker: keying
    // the <button> would rebuild the element under the user's own focus.
    expect(container.querySelectorAll(".stepper-step")[0]).toHaveAttribute("data-status", "done");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Two/ }));
    expect(first.isConnected).toBe(true);
  });
});
