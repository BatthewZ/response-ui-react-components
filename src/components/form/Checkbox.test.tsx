import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./Checkbox";
import { Field } from "./Field";
import { FieldError } from "./FieldError";

describe("Checkbox", () => {
  it("renders a checkbox input", () => {
    render(<Checkbox aria-label="Agree" />);
    expect(screen.getByRole("checkbox", { name: "Agree" })).toBeInTheDocument();
  });

  it("always renders with type checkbox", () => {
    render(<Checkbox aria-label="Agree" />);
    expect(screen.getByRole("checkbox", { name: "Agree" })).toHaveAttribute("type", "checkbox");
  });

  it("renders as checked when checked prop is true", () => {
    render(<Checkbox checked aria-label="Agree" onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Agree" })).toBeChecked();
  });

  it("renders as unchecked when checked prop is false", () => {
    render(<Checkbox checked={false} aria-label="Agree" onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Agree" })).not.toBeChecked();
  });

  it("calls onChange when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Agree" onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Agree" }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("renders as disabled", () => {
    render(<Checkbox disabled aria-label="Agree" />);
    expect(screen.getByRole("checkbox", { name: "Agree" })).toBeDisabled();
  });

  it("does not fire onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox disabled aria-label="Agree" onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Agree" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("associates with a label via id", () => {
    render(
      <div>
        <label htmlFor="terms">I agree to terms</label>
        <Checkbox id="terms" />
      </div>
    );
    expect(screen.getByRole("checkbox", { name: "I agree to terms" })).toBeInTheDocument();
  });

  it("forwards ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} aria-label="Agree" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole("checkbox", { name: "Agree" }));
  });

  it("merges custom className with default classes", () => {
    render(<Checkbox className="custom-checkbox" aria-label="Agree" />);
    const checkbox = screen.getByRole("checkbox", { name: "Agree" });
    expect(checkbox.className).toContain("custom-checkbox");
    expect(checkbox.className).toContain("size-4");
  });

  it("ships no resting border or radius (#26)", () => {
    // Measured in Firefox 146 and Chrome 144: with no `appearance-none`, a
    // native checkbox renders byte-for-byte identically with and without an
    // author `border` / `border-radius`, checked and unchecked alike. Only an
    // `appearance:none` control rendered differently. No test in this package
    // can read a stylesheet, so the honest assertion is that the dead utilities
    // are gone; the browser measurement is what says they were dead.
    render(<Checkbox aria-label="Agree" />);
    const cls = screen.getByRole("checkbox", { name: "Agree" }).className;

    expect(cls).not.toContain("rounded-");
    expect(cls).not.toContain("border-border-strong");
    // The two a native checkbox does honour stay.
    expect(cls).toContain("size-4");
    expect(cls).toContain("accent-accent");
  });

  describe("Field wiring (#76)", () => {
    it("takes aria-invalid and aria-describedby from an invalid Field", () => {
      render(
        <Field error="Accept the terms to continue.">
          <Checkbox aria-label="Terms" />
          <FieldError />
        </Field>
      );

      const box = screen.getByRole("checkbox", { name: "Terms" });
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(box).toHaveAttribute(
        "aria-describedby",
        screen.getByRole("alert").getAttribute("id")
      );
    });

    it("marks itself invalid from an `error` prop with no Field around it", () => {
      render(<Checkbox error aria-label="Terms" />);

      const box = screen.getByRole("checkbox", { name: "Terms" });
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(box).not.toHaveAttribute("aria-describedby");
    });

    it("stays untouched outside a Field", () => {
      render(<Checkbox aria-label="Terms" />);

      const box = screen.getByRole("checkbox", { name: "Terms" });
      expect(box).not.toHaveAttribute("aria-invalid");
      expect(box).not.toHaveAttribute("aria-describedby");
    });

    it("survives a `field()`-shaped spread carrying aria-invalid: undefined", () => {
      const field = { name: "terms", "aria-invalid": undefined };
      render(
        <Field error="Accept the terms to continue.">
          <Checkbox aria-label="Terms" {...field} />
          <FieldError />
        </Field>
      );

      expect(screen.getByRole("checkbox", { name: "Terms" })).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });

    it("lets a caller's aria-invalid through when it has no opinion of its own", () => {
      // The mirror direction, and the same contract Input, Textarea and Switch
      // ship: the component wins where it computed a state, the caller wins
      // where it did not. Reordering the spread to fix one breaks the other.
      render(<Checkbox aria-label="Terms" aria-invalid="true" />);

      expect(screen.getByRole("checkbox", { name: "Terms" })).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });

    it("defers to `error={false}` inside an invalid Field", () => {
      render(
        <Field error="Accept the terms to continue.">
          <Checkbox error={false} aria-label="Terms" aria-describedby="hint" />
          <FieldError />
        </Field>
      );

      const box = screen.getByRole("checkbox", { name: "Terms" });
      expect(box).not.toHaveAttribute("aria-invalid");
      expect(box).toHaveAttribute("aria-describedby", "hint");
    });
  });

  describe("focus affordance", () => {
    it("rings on plain `focus`, so a mouse click shows the ring too", () => {
      render(<Checkbox aria-label="Agree" />);
      const cls = screen.getByRole("checkbox", { name: "Agree" }).className;

      expect(cls).toContain("focus:ring-border-focus");
      expect(cls).not.toContain("focus-visible:");
    });

    it("keeps the UA outline rather than replacing it", () => {
      // The browser's outline is contrast-adaptive and survives forced-colours
      // mode, which the box-shadow ring does not; Checkbox has never reset it.
      render(<Checkbox aria-label="Agree" />);

      expect(screen.getByRole("checkbox", { name: "Agree" }).className).not.toContain(
        "outline-none"
      );
    });
  });
});
