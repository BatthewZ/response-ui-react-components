import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { focusOutlineResetControl, focusRingControl } from "../../util/focus";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Radio } from "./Radio";

describe("Radio", () => {
  it("renders a radio input", () => {
    render(<Radio aria-label="Option A" />);
    expect(screen.getByRole("radio", { name: "Option A" })).toBeInTheDocument();
  });

  it("always renders with type radio", () => {
    render(<Radio aria-label="Option A" />);
    expect(screen.getByRole("radio", { name: "Option A" })).toHaveAttribute("type", "radio");
  });

  it("renders as checked when checked prop is true", () => {
    render(<Radio checked aria-label="Option A" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Option A" })).toBeChecked();
  });

  it("renders as unchecked when checked prop is false", () => {
    render(<Radio checked={false} aria-label="Option A" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Option A" })).not.toBeChecked();
  });

  it("calls onChange when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Radio aria-label="Option A" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Option A" }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("renders as disabled", () => {
    render(<Radio disabled aria-label="Option A" />);
    expect(screen.getByRole("radio", { name: "Option A" })).toBeDisabled();
  });

  it("does not fire onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Radio disabled aria-label="Option A" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Option A" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("associates with a label via id", () => {
    render(
      <div>
        <label htmlFor="opt-a">Option A Label</label>
        <Radio id="opt-a" />
      </div>
    );
    expect(screen.getByRole("radio", { name: "Option A Label" })).toBeInTheDocument();
  });

  it("forwards ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio ref={ref} aria-label="Option A" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole("radio", { name: "Option A" }));
  });

  it("merges custom className with default classes", () => {
    render(<Radio className="custom-radio" aria-label="Option A" />);
    const radio = screen.getByRole("radio", { name: "Option A" });
    expect(radio.className).toContain("custom-radio");
    expect(radio.className).toContain("size-4");
  });

  it("applies size-4 class for radio sizing", () => {
    render(<Radio aria-label="Option A" />);
    const radio = screen.getByRole("radio", { name: "Option A" });
    expect(radio.className).toContain("size-4");
  });

  it("supports name attribute for radio groups", () => {
    render(
      <div>
        <Radio name="color" value="red" aria-label="Red" />
        <Radio name="color" value="blue" aria-label="Blue" />
      </div>
    );
    expect(screen.getByRole("radio", { name: "Red" })).toHaveAttribute("name", "color");
    expect(screen.getByRole("radio", { name: "Blue" })).toHaveAttribute("name", "color");
  });
});

describe("Field wiring (#75)", () => {
  it("describes every option in an invalid Field with the rendered message", () => {
    render(
      <Field error="Choose a delivery speed.">
        <div role="radiogroup" aria-label="Delivery speed">
          <Radio name="speed" value="standard" aria-label="Standard" />
          <Radio name="speed" value="express" aria-label="Express" />
        </div>
        <FieldError />
      </Field>
    );

    const errorId = screen.getByRole("alert").getAttribute("id");
    expect(errorId).toBeTruthy();
    for (const name of ["Standard", "Express"]) {
      const option = screen.getByRole("radio", { name });
      expect(option).toHaveAttribute("aria-describedby", errorId);
      expect(document.getElementById(errorId!)).toBe(screen.getByRole("alert"));
    }
  });

  it("never emits aria-invalid, because ARIA 1.2 does not allow it on `radio`", () => {
    // Deliberate asymmetry with Checkbox, asserted rather than assumed. ARIA 1.2
    // lists `aria-invalid` under `radiogroup` and not under `radio`; `checkbox`
    // does support it, which is why Checkbox carries both halves and this one
    // carries the description only. The invalid state belongs on the group
    // container the caller owns — see docs/components/radio.md.
    render(
      <Field error="Choose a delivery speed.">
        <Radio name="speed" value="standard" aria-label="Standard" />
        <FieldError />
      </Field>
    );

    const option = screen.getByRole("radio", { name: "Standard" });
    expect(option).not.toHaveAttribute("aria-invalid");
    expect(option).toHaveAttribute("aria-describedby");
  });

  it("stays untouched outside a Field", () => {
    render(<Radio name="speed" value="standard" aria-label="Standard" />);

    const option = screen.getByRole("radio", { name: "Standard" });
    expect(option).not.toHaveAttribute("aria-describedby");
    expect(option).not.toHaveAttribute("aria-invalid");
  });

  it("keeps a caller's own aria-describedby when there is no Field", () => {
    render(
      <>
        <Radio name="speed" value="standard" aria-label="Standard" aria-describedby="hint" />
        <p id="hint">Arrives in 3–5 days.</p>
      </>
    );

    expect(screen.getByRole("radio", { name: "Standard" })).toHaveAttribute(
      "aria-describedby",
      "hint"
    );
  });
});

describe("focus affordance (#73)", () => {
  // The verify:focus-affordance gate grew a .tsx reader, but this stays: it is the
  // check that the reset and its replacement arrive together, from one recipe.
  it("pairs its outline reset with a visible replacement ring", () => {
    render(<Radio aria-label="Choice" value="a" name="g" />);
    const cls = screen.getByRole("radio").className;

    expect(cls).toContain(focusRingControl);
    expect(cls).toContain(focusOutlineResetControl);
    // Spelled out as well as referenced: the reset and the ring have to answer
    // to the same variant, and `focus:` is the form-control half of the split.
    expect(cls).toContain("focus:outline-none");
    expect(cls).toContain("focus:ring-border-focus");
  });
});
