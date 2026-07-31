import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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

  // `Grid.css` is deleted, so the three declarations it carried are now three
  // utilities on the root. `rui-grid` stays as a declaration-free marker.
  it("carries display, alignment and column count as utilities", () => {
    render(<Grid data-testid="grid">Content</Grid>);
    const el = screen.getByTestId("grid");
    // `classList`, not `toContain` — `rui-grid` contains the substring "grid",
    // so a substring check here would pass without `display: grid`.
    expect(el.classList.contains("grid")).toBe(true);
    expect(el.classList.contains("items-stretch")).toBe(true);
    expect(el.classList.contains("grid-cols-1")).toBe(true);
    expect(el.classList.contains("rui-grid")).toBe(true);
  });

  it("defaults to a single column and the r4 gap", () => {
    render(<Grid data-testid="grid">Content</Grid>);
    const el = screen.getByTestId("grid");
    expect(el.className).toContain("grid-cols-1");
    expect(el.className).toContain("gap-r4");
  });

  // Pinned as an exact string, not a substring: this is the before/after
  // artefact for Phase 2. It used to read
  // `rui-grid gap-r4 rui-grid--base-3`.
  it("maps a numeric columns prop to a base class", () => {
    render(
      <Grid columns={3} data-testid="grid">
        Content
      </Grid>,
    );
    expect(screen.getByTestId("grid").className).toBe(
      "rui-grid grid items-stretch gap-r4 grid-cols-3",
    );
  });

  it("maps per-breakpoint columns to one class each", () => {
    render(
      <Grid columns={{ base: 1, md: 3, xl: 4 }} data-testid="grid">
        Content
      </Grid>,
    );
    const { className } = screen.getByTestId("grid");
    expect(className).toContain("grid-cols-1");
    expect(className).toContain("md:grid-cols-3");
    expect(className).toContain("xl:grid-cols-4");
    expect(className).not.toContain("sm:grid-cols");
    expect(className).not.toContain("lg:grid-cols");
  });

  // `Grid.css` read `repeat(var(--rui-grid-columns, 1), minmax(0, 1fr))` on
  // every `.rui-grid`, so a `columns` object with no `base` key still got a
  // one-column track. With no `grid-cols-*` there is no track definition at all
  // and the implicit column is sized `auto` — measured in Chromium at 375px, a
  // long unbreakable word gave a 1836px track against the old 375px one, so the
  // grid overflowed the viewport instead of wrapping.
  it("emits a base column class even when the object omits `base`", () => {
    render(
      <Grid columns={{ md: 3 }} data-testid="grid">
        Content
      </Grid>,
    );
    const el = screen.getByTestId("grid");
    expect(el.classList.contains("grid-cols-1")).toBe(true);
    expect(el.classList.contains("md:grid-cols-3")).toBe(true);
  });

  // 6 is the top of the scale `Grid.css` shipped a rule for, and the union was
  // drawn from that file rather than invented.
  it("covers every count from 1 to 6 at every breakpoint", () => {
    render(
      <Grid columns={{ base: 6, sm: 5, md: 4, lg: 3, xl: 2 }} data-testid="grid">
        Content
      </Grid>,
    );
    const { className } = screen.getByTestId("grid");
    expect(className).toContain("grid-cols-6");
    expect(className).toContain("sm:grid-cols-5");
    expect(className).toContain("md:grid-cols-4");
    expect(className).toContain("lg:grid-cols-3");
    expect(className).toContain("xl:grid-cols-2");
  });

  /**
   * The Phase 2 falsifier. `columns` was `number`, so `columns={7}` emitted
   * `rui-grid--base-7` — a class no rule defined — and the grid silently fell
   * back to one column via `var(--rui-grid-columns, 1)`. Both assertions are
   * checked by `bun run typecheck` and fail in opposite directions: widening
   * `columns` back to `number` flips the second, and narrowing the union below
   * the scale `Grid.css` shipped flips the first.
   */
  it("bounds `columns` to the counts the scale defines", () => {
    type Columns = NonNullable<ComponentProps<typeof Grid>["columns"]>;
    const sixIsInRange: 6 extends Columns ? true : false = true;
    const sevenIsARejectedCount: 7 extends Columns ? false : true = true;

    expect(sixIsInRange).toBe(true);
    expect(sevenIsARejectedCount).toBe(true);
  });

  /**
   * The other half of the falsifier above: a count outside the union can still
   * arrive from untyped JS, where no compile error is available. `Grid.css` read
   * `var(--rui-grid-columns, 1)`, so `columns={7}` fell back to one column;
   * emitting nothing leaves no track definition at all and the grid overflows —
   * strictly worse than what Phase 2 replaced.
   *
   * The `@ts-expect-error` is the assertion, not a suppression: the point is
   * that TypeScript rejects `7` while JS reaches the code path, and the
   * directive itself fails if that error ever stops occurring. Do not
   * "clean it up".
   */
  it("falls back to the base column class for a count outside the union", () => {
    render(
      // @ts-expect-error — 7 is out of the union on purpose; only untyped JS gets here.
      <Grid columns={7} data-testid="grid">
        Content
      </Grid>,
    );
    expect(screen.getByTestId("grid").classList.contains("grid-cols-1")).toBe(true);
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

  // The column count is now an ordinary utility, so `cn()` dedupes it against a
  // caller's — per breakpoint, which is the part that is new. A bare
  // `grid-cols-*` replaces the base step and leaves the responsive steps alone.
  it("lets a caller's column utility replace the step it names", () => {
    render(
      <Grid columns={{ base: 1, md: 3 }} className="grid-cols-2" data-testid="grid">
        Content
      </Grid>,
    );
    const { className } = screen.getByTestId("grid");
    expect(className).toContain("grid-cols-2");
    expect(className).not.toContain("grid-cols-1");
    expect(className).toContain("md:grid-cols-3");
  });
});
