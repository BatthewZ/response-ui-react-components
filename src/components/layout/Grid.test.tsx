import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Grid } from "./Grid";

describe("Grid", () => {
  it("renders children in a grid layout", () => {
    render(
      <Grid data-testid="grid">
        <span>A</span>
        <span>B</span>
      </Grid>,
    );
    const el = screen.getByTestId("grid");
    expect(el.className).toContain("rui-grid");
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("defaults to a single column and the r4 gap", () => {
    render(<Grid data-testid="grid">Content</Grid>);
    const el = screen.getByTestId("grid");
    expect(el.className).toContain("rui-grid--base-1");
    expect(el.className).toContain("gap-r4");
  });

  it("maps a numeric columns prop to a base class", () => {
    render(
      <Grid columns={3} data-testid="grid">
        Content
      </Grid>,
    );
    expect(screen.getByTestId("grid").className).toContain("rui-grid--base-3");
  });

  it("maps per-breakpoint columns to one class each", () => {
    render(
      <Grid columns={{ base: 1, md: 3, xl: 4 }} data-testid="grid">
        Content
      </Grid>,
    );
    const { className } = screen.getByTestId("grid");
    expect(className).toContain("rui-grid--base-1");
    expect(className).toContain("rui-grid--md-3");
    expect(className).toContain("rui-grid--xl-4");
    expect(className).not.toContain("rui-grid--sm");
    expect(className).not.toContain("rui-grid--lg");
  });

  it("supports a custom gap", () => {
    render(
      <Grid gap="r2" data-testid="grid">
        Content
      </Grid>,
    );
    expect(screen.getByTestId("grid").className).toContain("gap-r2");
  });

  it("renders a custom element via `as`", () => {
    render(
      <Grid as="ul" data-testid="grid">
        <li>item</li>
      </Grid>,
    );
    expect(screen.getByTestId("grid").tagName).toBe("UL");
  });

  it("merges a custom className", () => {
    render(
      <Grid className="custom-class" data-testid="grid">
        Styled
      </Grid>,
    );
    const el = screen.getByTestId("grid");
    expect(el.className).toContain("custom-class");
    expect(el.className).toContain("rui-grid");
  });
});
