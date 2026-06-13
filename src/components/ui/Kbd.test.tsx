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
