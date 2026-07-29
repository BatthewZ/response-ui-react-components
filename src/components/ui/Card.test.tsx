import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";

describe("Card", () => {
  it("renders a div with card classes", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.tagName).toBe("DIV");
    // #4 — the theme contract designates `--C-SURFACE-1` for cards; Card sat on
    // `--C-SURFACE-0`, the rung nearest the canvas, which in the default theme
    // is the canvas colour exactly.
    expect(card.className).toContain("bg-surface-1");
    expect(card.className).not.toContain("bg-surface-0");
    expect(card.className).toContain("rounded-lg");
  });

  it("draws a border, not just a shadow", () => {
    // AppShell paints its own body `--C-SURFACE-1`, and one surface step is
    // 1.02–1.07:1, so fill can never be the card's boundary. Shadow alone does
    // not carry it either: on a dark theme it is black on near-black.
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
