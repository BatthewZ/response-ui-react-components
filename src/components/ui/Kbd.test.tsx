import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Kbd } from "./Kbd";

describe("Kbd", () => {
  it("renders a <kbd> element with children", () => {
    render(<Kbd>Esc</Kbd>);
    const el = screen.getByText("Esc");
    expect(el.tagName).toBe("KBD");
  });

  it("merges custom className", () => {
    render(<Kbd className="custom-class">K</Kbd>);
    const el = screen.getByText("K");
    expect(el.className).toContain("custom-class");
    expect(el.className).toContain("bg-surface-2");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Kbd ref={ref}>Ref</Kbd>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current).toBe(screen.getByText("Ref"));
  });
});

// #48/#49. Vitest runs with `css: false`, so no test here can read a stylesheet:
// these assert the class the fix carries, not the computed style it produces.
// The rendered effect was measured in Firefox instead — see the report.
describe("Kbd · the keycap is on the contract", () => {
  const classes = () => {
    render(<Kbd>Esc</Kbd>);
    return screen.getByText("Esc").className;
  };

  it("names the theme's monospace family rather than falling through to Preflight", () => {
    // `.mono-font` is the css package's unlayered `font-family: var(--DEFAULT-MONO-FONT)`.
    expect(classes()).toContain("mono-font");
  });

  it("uses a contract weight", () => {
    const cls = classes();
    expect(cls).toContain("font-semibold");
    expect(cls).not.toContain("font-medium");
  });

  it("resets the leading and pays for the cap height in padding", () => {
    const cls = classes();
    expect(cls).toContain("leading-none");
    expect(cls).toContain("p-r6");
  });
});
