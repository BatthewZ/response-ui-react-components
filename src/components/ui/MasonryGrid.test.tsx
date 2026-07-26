import { render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
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
    const grid = container.querySelector(".masonry-grid");
    expect(grid?.className).toContain("masonry-grid--sm-2");
    expect(grid?.className).toContain("masonry-grid--md-3");
    expect(grid?.className).toContain("masonry-grid--lg-4");
  });

  it("applies base column class from a number", () => {
    const { container } = render(
      <MasonryGrid columns={3} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid");
    expect(grid?.className).toContain("masonry-grid--base-3");
  });

  it("sets gap as a CSS variable", () => {
    const { container } = render(
      <MasonryGrid gap="1.5rem" animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--masonry-gap")).toBe("1.5rem");
  });

  it("does not set gap CSS variable when gap is not provided", () => {
    const { container } = render(
      <MasonryGrid animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--masonry-gap")).toBe("");
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
    const grid = container.querySelector(".masonry-grid");
    expect(grid?.className).toContain("masonry-grid--base-1");
    expect(grid?.className).toContain("masonry-grid--md-3");
    expect(grid?.className).toContain("masonry-grid--xl-1");
  });

  // #183 — the caller's `style` used to be spread last and beat the gap prop.
  it("lets the gap prop outrank a --masonry-gap sitting in style", () => {
    const { container } = render(
      <MasonryGrid gap="2rem" style={{ "--masonry-gap": "0.25rem" } as React.CSSProperties} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--masonry-gap")).toBe("2rem");
  });

  it("still honours a --masonry-gap from style when no gap prop is given", () => {
    const { container } = render(
      <MasonryGrid style={{ "--masonry-gap": "0.25rem" } as React.CSSProperties} animate={false}>
        <MasonryGrid.Item>A</MasonryGrid.Item>
      </MasonryGrid>,
    );
    const grid = container.querySelector(".masonry-grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--masonry-gap")).toBe("0.25rem");
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
