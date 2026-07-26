import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "./IconButton";

const SearchIcon = () => (
  <svg data-testid="search-icon" aria-hidden="true">
    <circle cx="10" cy="10" r="8" />
  </svg>
);

describe("IconButton", () => {
  it("renders a button element", () => {
    render(<IconButton aria-label="Search"><SearchIcon /></IconButton>);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("renders the icon child", () => {
    render(<IconButton aria-label="Search"><SearchIcon /></IconButton>);
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  it("has the aria-label attribute", () => {
    render(<IconButton aria-label="Close menu"><SearchIcon /></IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Close menu");
  });

  it("applies base classes", () => {
    render(<IconButton aria-label="Action"><SearchIcon /></IconButton>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("inline-flex");
    expect(button.className).toContain("items-center");
    expect(button.className).toContain("justify-center");
  });

  it("merges custom className", () => {
    render(<IconButton aria-label="Action" className="my-class"><SearchIcon /></IconButton>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("my-class");
    expect(button.className).toContain("inline-flex");
  });

  it("renders as disabled", () => {
    render(<IconButton aria-label="Disabled" disabled><SearchIcon /></IconButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton aria-label="Click me" onClick={onClick}><SearchIcon /></IconButton>);

    await user.click(screen.getByRole("button", { name: "Click me" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire click when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="No click" disabled onClick={onClick}>
        <SearchIcon />
      </IconButton>
    );

    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards ref to the button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} aria-label="Ref test"><SearchIcon /></IconButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.tagName).toBe("BUTTON");
  });

  it("supports type attribute", () => {
    render(<IconButton aria-label="Submit" type="submit"><SearchIcon /></IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("does not submit an enclosing form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <IconButton aria-label="Close">x</IconButton>
      </form>
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onSubmit).toHaveBeenCalledTimes(0);
  });

  // #42 — the accessible name was a required `aria-label: string`, which `""`
  // satisfies, and `aria-labelledby` could not stand in for it.
  describe("accessible name", () => {
    // Checked by `tsc --noEmit`, which gates the package: each constant fails to
    // compile if the relation flips, in either direction. No suppression involved.
    it("requires one of the two ARIA name sources, and accepts either", () => {
      type Props = ComponentProps<typeof IconButton>;
      const labelIsEnough: { "aria-label": string } extends Props ? true : false = true;
      const labelledbyIsEnough: { "aria-labelledby": string } extends Props ? true : false = true;
      const neitherIsNot: { type: "button" } extends Props ? false : true = true;

      expect([labelIsEnough, labelledbyIsEnough, neitherIsNot]).toEqual([true, true, true]);
    });

    it("accepts aria-labelledby on its own", () => {
      render(
        <>
          <h2 id="filters-heading">Filters</h2>
          <IconButton aria-labelledby="filters-heading">
            <SearchIcon />
          </IconButton>
        </>,
      );
      expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    });

    it("warns when neither name source can produce one", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<IconButton aria-label="  "><SearchIcon /></IconButton>);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toContain("no accessible name");
      warn.mockRestore();
    });

    it("stays quiet when either source is usable", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<IconButton aria-label="Search"><SearchIcon /></IconButton>);
      render(<IconButton aria-labelledby="somewhere-else"><SearchIcon /></IconButton>);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  // #43 — WCAG 2.3.3. `css: false` here, so this asserts the guard utility, not a
  // measured transform; the neutralisation was checked in Firefox — see the report.
  it("neutralises the press animation under prefers-reduced-motion", () => {
    render(<IconButton aria-label="Action"><SearchIcon /></IconButton>);
    expect(screen.getByRole("button").className).toContain("motion-reduce:active:scale-100");
  });

  describe("focus affordance", () => {
    it("rings on `focus-visible` only, and keeps the UA outline beside it", () => {
      render(<IconButton aria-label="Search"><SearchIcon /></IconButton>);
      const cls = screen.getByRole("button", { name: "Search" }).className;

      expect(cls).toContain("focus-visible:ring-border-focus");
      expect(cls).not.toContain("outline-none");
    });
  });
});
