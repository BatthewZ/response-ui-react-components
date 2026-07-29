import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";

describe("Card", () => {
  it("renders a div with card classes", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.tagName).toBe("DIV");
    // A card is the canonical raised sheet, so rung 0 — the lightest rung in
    // every theme. It briefly sat on rung 1 because the canvas and rung 0 were
    // byte-identical in both shipped light themes, which left a rung-0 card with
    // no boundary against the page; separating the canvas from the ramp fixed
    // that at the source and this rung came back.
    expect(card.className).toContain("bg-surface-0");
    expect(card.className).not.toContain("bg-surface-1");
    expect(card.className).toContain("rounded-lg");
  });

  it("draws a border, not just a shadow", () => {
    // The canvas-to-rung-0 lift is only 1.05–1.16:1, so fill alone cannot be the
    // card's boundary even now that the two differ. Shadow alone does not carry
    // it either: on a dark theme it is black on near-black. A Card nested in a
    // Dialog shares rung 0 outright, where the border is all there is.
    render(<Card data-testid="card">Bordered</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("border-border-default");
  });

  it("renders children content", () => {
    render(<Card>Card body text</Card>);
    expect(screen.getByText("Card body text")).toBeInTheDocument();
  });

  it("applies default padding (r3) and shadow (md)", () => {
    render(<Card data-testid="card">Default</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("p-r3");
    expect(card.className).toContain("shadow-md");
  });

  it("applies custom padding", () => {
    render(<Card padding="r5" data-testid="card">Padded</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("p-r5");
  });

  it("applies custom shadow", () => {
    render(<Card shadow="lg" data-testid="card">Shadow</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("shadow-lg");
  });

  it("applies small shadow", () => {
    render(<Card shadow="sm" data-testid="card">Small shadow</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("shadow-sm");
  });

  it("forwards className prop", () => {
    render(<Card className="custom-card" data-testid="card">Styled</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("custom-card");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional div props", () => {
    render(<Card id="my-card" data-testid="card">Props</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("id", "my-card");
  });

  it("composes children correctly", () => {
    render(
      <Card data-testid="card">
        <header>Header section</header>
        <div>Body section</div>
        <footer>Footer section</footer>
      </Card>,
    );
    expect(screen.getByText("Header section")).toBeInTheDocument();
    expect(screen.getByText("Body section")).toBeInTheDocument();
    expect(screen.getByText("Footer section")).toBeInTheDocument();
  });
});
