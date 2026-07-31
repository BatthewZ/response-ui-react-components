import { render, screen } from "@testing-library/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { MasonryGrid } from "./MasonryGrid";

describe("MasonryGrid", () => {
  it("renders a grid container with masonry-grid class", () => {
    const { container } = render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    expect(container.querySelector(".masonry-grid")).toBeInTheDocument();
  });

  it("renders children as items", () => {
    render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item>Item 1</MasonryGrid.Item>
        <MasonryGrid.Item>Item 2</MasonryGrid.Item>
        <MasonryGrid.Item>Item 3</MasonryGrid.Item>
      </MasonryGrid>,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("applies responsive column classes from a breakpoints object", () => {
    const { container } = render(
      <MasonryGrid columns={{ sm: 2, md: 3, lg: 4 }} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.classList.contains("sm:columns-2")).toBe(true);
    expect(grid.classList.contains("md:columns-3")).toBe(true);
    expect(grid.classList.contains("lg:columns-4")).toBe(true);
    // A `columns` object with no `base` key still gets one. `MasonryGrid.css`
    // read `columns: var(--masonry-columns, 1)` unconditionally, so the grid was
    // a one-column multi-column container below `40rem`; emitting nothing here
    // leaves `column-count: auto` and no multi-column context at all. Measured
    // in Chromium at 375px: `column-count` read `1` before, `auto` without this.
    expect(grid.classList.contains("columns-1")).toBe(true);
  });

  it("applies base column class from a number", () => {
    const { container } = render(
      <MasonryGrid columns={3} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid");
    expect(grid?.className).toBe("masonry-grid gap-r4 columns-3");
  });

  // One `gap` prop, two properties on two elements: multi-column has no row-gap,
  // so the root carries `gap-*` (column-gap) and each item carries `mb-*`.
  it("puts the gap utility on the root and the block gap on every item", () => {
    const { container } = render(
      <MasonryGrid gap="r6" animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
        <MasonryGrid.Item>B</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.className).toContain("gap-r6");
    for (const item of container.querySelectorAll(".masonry-grid__item")) {
      expect(item.className).toContain("mb-r6");
      expect(item.className).toContain("last:mb-0");
    }
  });

  it("defaults to r4 on both the root and the items", () => {
    const { container } = render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    expect((container.querySelector(".masonry-grid") as HTMLElement).className).toContain("gap-r4");
    expect((container.querySelector(".masonry-grid__item") as HTMLElement).className).toContain(
      "mb-r4",
    );
  });

  // The gap is a class, not an inline custom property. This is what makes it
  // overridable — and it is why #183 (a caller's `style` beating the gap prop)
  // is now structurally impossible rather than merely fixed.
  it("writes no inline custom property for the gap", () => {
    const { container } = render(
      <MasonryGrid gap="r6" animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--masonry-gap")).toBe("");
    expect(grid.getAttribute("style")).toBeNull();
  });

  it("lets a caller's gap utility override the prop on the root", () => {
    const { container } = render(
      <MasonryGrid gap="r6" className="gap-r1" animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.className).toContain("gap-r1");
    expect(grid.className).not.toContain("gap-r6");
  });

  it("lets a caller's margin utility override the block gap on an item", () => {
    const { container } = render(
      <MasonryGrid gap="r6" animate={false}>
        <MasonryGrid.Item className="mb-r1">A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const item = container.querySelector(".masonry-grid__item") as HTMLElement;
    expect(item.className).toContain("mb-r1");
    expect(item.className).not.toContain("mb-r6");
  });

  it("applies masonry-grid__item class to items", () => {
    const { container } = render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    expect(container.querySelector(".masonry-grid__item")).toBeInTheDocument();
  });

  it("forwards className to the root container", () => {
    const { container } = render(
      <MasonryGrid className="custom-grid" animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid");
    expect(grid?.className).toContain("custom-grid");
  });

  it("forwards className to an item", () => {
    const { container } = render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item className="item-extra">A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const item = container.querySelector(".masonry-grid__item");
    expect(item?.className).toContain("item-extra");
  });

  // #178 — with `animate` at its default the item renders through ScrollReveal,
  // which is the path that used to drop every prop but className/ref/children.
  it("forwards rest props to an item on the default animating path", () => {
    const { container } = render(
      <MasonryGrid>
        <MasonryGrid.Item id="card-1" aria-label="First card" data-analytics="tile-1">
          A
        </MasonryGrid.Item>
      </MasonryGrid>,
    );
    const item = container.querySelector(".masonry-grid__item") as HTMLElement;
    expect(item.id).toBe("card-1");
    expect(item.getAttribute("aria-label")).toBe("First card");
    expect(item.dataset.analytics).toBe("tile-1");
  });

  // #181 — `1` was skipped outright, so a breakpoint could widen the grid but
  // never narrow it back to a single column.
  it("emits a column class for a count of 1", () => {
    const { container } = render(
      <MasonryGrid columns={{ base: 1, md: 3, xl: 1 }} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    // `classList`, not `toContain` — `xl:columns-1` contains the substring
    // `columns-1`, so a substring check would pass with the base step missing.
    expect(grid.classList.contains("columns-1")).toBe(true);
    expect(grid.classList.contains("md:columns-3")).toBe(true);
    expect(grid.classList.contains("xl:columns-1")).toBe(true);
  });

  // `MasonryGrid.css` is deleted; `break-inside: avoid` — its last declaration —
  // is now a utility on the item, and `masonry-grid__item` stays as a marker.
  it("carries break-inside on the item as a utility", () => {
    const { container } = render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const item = container.querySelector(".masonry-grid__item") as HTMLElement;
    expect(item.classList.contains("break-inside-avoid")).toBe(true);
    expect(item.classList.contains("masonry-grid__item")).toBe(true);
  });

  it("keeps break-inside on the animating path too", () => {
    const { container } = render(
      <MasonryGrid>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const item = container.querySelector(".masonry-grid__item") as HTMLElement;
    expect(item.classList.contains("break-inside-avoid")).toBe(true);
  });

  /**
   * #180's fix, restated against the utilities that replaced the CSS. Both
   * assertions are checked by `bun run typecheck` and fail in opposite
   * directions: widening `columns` back to `number` flips the second, and
   * narrowing below the scale `MasonryGrid.css` shipped flips the first.
   */
  it("bounds `columns` to the counts the scale defines", () => {
    type Columns = NonNullable<ComponentProps<typeof MasonryGrid>["columns"]>;
    const fourIsInRange: 4 extends Columns ? true : false = true;
    const fiveIsARejectedCount: 5 extends Columns ? false : true = true;

    expect(fourIsInRange).toBe(true);
    expect(fiveIsARejectedCount).toBe(true);
  });

  /**
   * The other half of the falsifier above: a count outside the union can still
   * arrive from untyped JS, where no compile error is available.
   * `MasonryGrid.css` read `columns: var(--masonry-columns, 1)`, so `columns={9}`
   * was a one-column multi-column container; emitting nothing leaves
   * `column-count: auto` and no multi-column context at all.
   *
   * The `@ts-expect-error` is the assertion, not a suppression: the point is
   * that TypeScript rejects `9` while JS reaches the code path, and the
   * directive itself fails if that error ever stops occurring. Do not
   * "clean it up".
   */
  it("falls back to the base column class for a count outside the union", () => {
    const { container } = render(
      // @ts-expect-error — 9 is out of the union on purpose; only untyped JS gets here.
      <MasonryGrid columns={9} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    // `classList`, not `toContain` — `xl:columns-1` contains the substring.
    expect(grid.classList.contains("columns-1")).toBe(true);
  });

  // The column count is an ordinary utility now, so `cn()` dedupes it against a
  // caller's — per breakpoint. A bare `columns-*` replaces the base step and
  // leaves the responsive steps alone; it also reaches counts above 4, which is
  // what replaces writing `--masonry-columns` through `style`.
  it("lets a caller's column utility replace the step it names", () => {
    const { container } = render(
      <MasonryGrid columns={{ base: 1, md: 3 }} className="columns-6" animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.classList.contains("columns-6")).toBe(true);
    expect(grid.classList.contains("columns-1")).toBe(false);
    expect(grid.classList.contains("md:columns-3")).toBe(true);
  });

  // #183's replacement: the caller's `style` is passed through untouched, and it
  // no longer competes with the gap for the same channel.
  it("passes a caller's style through without touching it", () => {
    const { container } = render(
      <MasonryGrid gap="r6" style={{ outline: "1px solid red" }} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.style.outline).toBe("1px solid red");
    expect(grid.className).toContain("gap-r6");
  });

  // #179 — the context Provider was keyed by position, defeating the caller's key.
  it("keeps item identity across an insertion at the front", () => {
    const mounts = vi.fn();

    function Tracked({ label }: { label: string }) {
      const seen = useRef(false);
      useEffect(() => {
        if (!seen.current) {
          seen.current = true;
          mounts(label);
        }
      }, [label]);
      return <MasonryGrid.Item>{label}</MasonryGrid.Item>;
    }

    function Grid({ labels }: { labels: string[] }) {
      return (
        <MasonryGrid animate={false}>
          {labels.map((label) => (
            <Tracked key={label} label={label} />
          ))}
        </MasonryGrid>
      );
    }

    const { rerender } = render(<Grid labels={["b", "c"]} />);
    expect(mounts.mock.calls.flat()).toEqual(["b", "c"]);

    mounts.mockClear();
    rerender(<Grid labels={["a", "b", "c"]} />);

    // Only the new item mounts; b and c keep their instances.
    expect(mounts.mock.calls.flat()).toEqual(["a"]);
  });
});
