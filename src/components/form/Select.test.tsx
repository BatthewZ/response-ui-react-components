import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Select } from "./Select";

describe("Select", () => {
  it("renders a select element", () => {
    render(
      <Select aria-label="Country">
        <option value="us">US</option>
      </Select>
    );
    expect(screen.getByRole("combobox", { name: "Country" })).toBeInTheDocument();
  });

  it("renders children options", () => {
    render(
      <Select aria-label="Country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
        <option value="mx">Mexico</option>
      </Select>
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("United States");
    expect(options[1]).toHaveTextContent("Canada");
    expect(options[2]).toHaveTextContent("Mexico");
  });

  it("applies base text classes", () => {
    render(
      <Select aria-label="Country">
        <option>US</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.className).toContain("text-body-2");
  });

  it("applies error styling when error is true", () => {
    render(
      <Select error aria-label="Country">
        <option>US</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.className).toContain("border-status-error");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });

  it("does not apply error styling when error is false", () => {
    render(
      <Select aria-label="Country">
        <option>US</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.className).not.toContain("border-status-error");
    expect(select).not.toHaveAttribute("aria-invalid");
  });

  it("renders as disabled", () => {
    render(
      <Select disabled aria-label="Country">
        <option>US</option>
      </Select>
    );
    expect(screen.getByRole("combobox", { name: "Country" })).toBeDisabled();
  });

  it("forwards ref to the select element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} aria-label="Country">
        <option>US</option>
      </Select>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toBe(screen.getByRole("combobox", { name: "Country" }));
  });

  it("calls onChange when selection changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select aria-label="Country" onChange={onChange}>
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </Select>
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Country" }), "ca");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target).toHaveValue("ca");
  });

  it("merges custom className with default classes", () => {
    render(
      <Select className="custom-select" aria-label="Country">
        <option>US</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.className).toContain("custom-select");
    expect(select.className).toContain("text-body-2");
  });

  it("applies custom appearance styling", () => {
    render(
      <Select aria-label="Country">
        <option>US</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select.className).toContain("appearance-none");
  });
  describe("the dropdown chevron (#77 / #89)", () => {
    it("paints the chevron from a themed element, not an SVG-as-image", () => {
      const { container } = render(
        <Select aria-label="Country">
          <option>US</option>
        </Select>
      );

      const select = screen.getByRole("combobox", { name: "Country" });
      // No data-URI background: `fill="currentColor"` cannot resolve inside one,
      // so it painted black on every theme.
      expect(select.className).not.toContain("data:image/svg+xml");
      const chevron = container.querySelector("svg");
      expect(chevron).not.toBeNull();
      expect(chevron).toHaveAttribute("aria-hidden", "true");
      expect(chevron!.getAttribute("class")).toContain("text-fg-secondary");
    });

    it("carries no ::placeholder rule, which a <select> cannot match", () => {
      render(
        <Select aria-label="Country">
          <option>US</option>
        </Select>
      );

      expect(
        screen.getByRole("combobox", { name: "Country" }).className
      ).not.toContain("placeholder:");
    });
  });

  describe("a field() spread cannot erase the invalid state (#455)", () => {
    it("keeps aria-invalid when the caller supplies the key as undefined", () => {
      render(
        <Select error aria-label="Country" {...{ "aria-invalid": undefined }}>
          <option>US</option>
        </Select>
      );

      expect(screen.getByRole("combobox", { name: "Country" })).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });
  });

  // #471
  describe("the chevron gutter is on the contract", () => {
    it("reserves the chevron's space from `--R-SIZE-*`, not Tailwind's default scale", () => {
      render(
        <Select aria-label="Country">
          <option>US</option>
        </Select>
      );

      const className = screen.getByRole("combobox", { name: "Country" }).className;
      // `r1` is the smallest rung that clears the chevron's `right-r4` inset
      // plus its 16px box at both steps of the scale.
      expect(className).toContain("pr-r1");
      // `pr-10` was a frozen 2.5rem on Tailwind's default spacing scale.
      expect(className).not.toMatch(/\bpr-\d/);
    });
  });
});

/*
 * That is a class-list assertion because `vitest` runs with `css: false` and
 * jsdom performs no layout, so nothing here can measure the rendered gutter or
 * the chevron's position. Measured in Firefox 146 against the dev gallery: with
 * `pr-10` the gap between the text box and the chevron was 4px at 1280px wide
 * and 12px at 375px — fixed at 2.5rem, and tighter on the wider viewport
 * because only the chevron's `right-r4` inset stepped up. On `pr-r1` it is 60px
 * and 8px, i.e. it moves with the scale and never collides.
 */
