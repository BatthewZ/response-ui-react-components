import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Checkbox } from "./Checkbox";
import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Input } from "./Input";
import { Select } from "./Select";
import { Textarea } from "./Textarea";

/**
 * The whole of #23 in one assertion: an IDREF is only meaningful if it resolves.
 * Returns the element `aria-describedby` names, `null` when the attribute is
 * absent, and throws when it names an element that is not in the document —
 * which is exactly the dangling reference the attribute is not allowed to be.
 */
function describedElement(control: HTMLElement): HTMLElement | null {
  const id = control.getAttribute("aria-describedby");
  if (id === null) return null;
  const target = document.getElementById(id);
  if (target === null) throw new Error(`aria-describedby="${id}" resolves to no element`);
  return target;
}

describe("Field aria-describedby wiring", () => {
  it("links Input to FieldError via aria-describedby when error is present", () => {
    render(
      <Field>
        <Input error placeholder="Email" />
        <FieldError>Email is required</FieldError>
      </Field>
    );

    const input = screen.getByPlaceholderText("Email");
    const error = screen.getByRole("alert");

    expect(error).toHaveAttribute("id");
    expect(input).toHaveAttribute("aria-describedby", error.getAttribute("id"));
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not set aria-describedby when error is false", () => {
    render(
      <Field>
        <Input placeholder="Email" />
        <FieldError>Email is required</FieldError>
      </Field>
    );

    const input = screen.getByPlaceholderText("Email");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("links Textarea to FieldError via aria-describedby when error is present", () => {
    render(
      <Field>
        <Textarea error placeholder="Bio" />
        <FieldError>Bio is required</FieldError>
      </Field>
    );

    const textarea = screen.getByPlaceholderText("Bio");
    const error = screen.getByRole("alert");

    expect(error).toHaveAttribute("id");
    expect(textarea).toHaveAttribute("aria-describedby", error.getAttribute("id"));
  });

  it("links Select to FieldError via aria-describedby when error is present", () => {
    render(
      <Field>
        <Select error aria-label="Country">
          <option>US</option>
        </Select>
        <FieldError>Country is required</FieldError>
      </Field>
    );

    const select = screen.getByRole("combobox", { name: "Country" });
    const error = screen.getByRole("alert");

    expect(error).toHaveAttribute("id");
    expect(select).toHaveAttribute("aria-describedby", error.getAttribute("id"));
  });

  it("FieldError renders without id when outside Field context", () => {
    render(<FieldError>Some error</FieldError>);

    const error = screen.getByRole("alert");
    expect(error).not.toHaveAttribute("id");
  });

  it("Input works without Field context (no aria-describedby)", () => {
    render(<Input error placeholder="Standalone" />);

    const input = screen.getByPlaceholderText("Standalone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("respects explicit id prop on FieldError", () => {
    render(
      <Field>
        <Input error placeholder="Name" />
        <FieldError id="custom-error-id">Name is required</FieldError>
      </Field>
    );

    const error = screen.getByRole("alert");
    expect(error).toHaveAttribute("id", "custom-error-id");
  });
});

describe("aria-describedby never dangles (#23, #440)", () => {
  it("resolves to the rendered message when the Field owns the error", () => {
    render(
      <Field error="Accept the terms to continue.">
        <Checkbox aria-label="Terms" />
        <FieldError />
      </Field>
    );

    const box = screen.getByRole("checkbox", { name: "Terms" });
    expect(describedElement(box)).toBe(screen.getByRole("alert"));
  });

  it("omits it when the control is invalid but no message is rendered (#23)", () => {
    // The FieldError is mounted, the Field has no error, so it renders `null` —
    // and the id it *would* have taken belongs to no element.
    render(
      <Field>
        <Checkbox error aria-label="Terms" />
        <FieldError />
      </Field>
    );

    const box = screen.getByRole("checkbox", { name: "Terms" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(describedElement(box)).toBeNull();
  });

  it("omits it when the Field has an error but no FieldError is in the tree (#23)", () => {
    render(
      <Field error="Accept the terms to continue.">
        <Input placeholder="Email" />
        <Checkbox aria-label="Terms" />
      </Field>
    );

    expect(describedElement(screen.getByPlaceholderText("Email"))).toBeNull();
    expect(describedElement(screen.getByRole("checkbox", { name: "Terms" }))).toBeNull();
  });

  it("follows a caller's explicit id on FieldError (#440)", () => {
    render(
      <Field error="Accept the terms to continue.">
        <Checkbox aria-label="Terms" />
        <FieldError id="terms-error" />
      </Field>
    );

    const box = screen.getByRole("checkbox", { name: "Terms" });
    expect(box).toHaveAttribute("aria-describedby", "terms-error");
    expect(describedElement(box)).toBe(screen.getByRole("alert"));
  });

  it("drops it again when the message unmounts", () => {
    const { rerender } = render(
      <Field error="Accept the terms to continue.">
        <Checkbox aria-label="Terms" />
        <FieldError />
      </Field>
    );
    expect(describedElement(screen.getByRole("checkbox", { name: "Terms" }))).not.toBeNull();

    rerender(
      <Field>
        <Checkbox error aria-label="Terms" />
        <FieldError />
      </Field>
    );
    expect(describedElement(screen.getByRole("checkbox", { name: "Terms" }))).toBeNull();
  });

  it("keeps every wired control's reference resolvable at once", () => {
    render(
      <Field error="Fill this in.">
        <Input error placeholder="Email" />
        <Textarea error placeholder="Bio" />
        <Select error aria-label="Country">
          <option>US</option>
        </Select>
        <Checkbox aria-label="Terms" />
        <FieldError id="shared-error" />
      </Field>
    );

    const alert = screen.getByRole("alert");
    for (const control of [
      screen.getByPlaceholderText("Email"),
      screen.getByPlaceholderText("Bio"),
      screen.getByRole("combobox", { name: "Country" }),
      screen.getByRole("checkbox", { name: "Terms" }),
    ]) {
      expect(describedElement(control)).toBe(alert);
    }
  });
});
