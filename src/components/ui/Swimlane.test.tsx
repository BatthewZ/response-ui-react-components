import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Swimlane } from "./Swimlane";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Swimlane", () => {
  // Not a scroller: the body is `width: 100%` with no overflow by design — the
  // caller brings the scroll container (docs/components/swimlane.md).
  it("renders the section root with the swimlane class", () => {
    const { container } = render(
      <Swimlane title="Popular">
        <div>Item 1</div>
      </Swimlane>,
    );
    expect(container.querySelector(".swimlane")).toBeInTheDocument();
  });

  it("renders a header with a title", () => {
    render(
      <Swimlane title="Trending">
        <div>Content</div>
      </Swimlane>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Trending" })).toBeInTheDocument();
  });

  it("renders a subtitle when provided", () => {
    render(
      <Swimlane title="Featured" subtitle="Hand-picked for you">
        <div>Content</div>
      </Swimlane>,
    );
    expect(screen.getByText("Hand-picked for you")).toBeInTheDocument();
  });

  it("renders a 'View all' link when viewAllHref is provided", () => {
    render(
      <Swimlane title="Recent" viewAllHref="/all">
        <div>Content</div>
      </Swimlane>,
    );
    const link = screen.getByRole("link", { name: "View all" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/all");
  });

  it("does not render a 'View all' link when viewAllHref is omitted", () => {
    render(
      <Swimlane title="Recent">
        <div>Content</div>
      </Swimlane>,
    );
    expect(screen.queryByRole("link", { name: "View all" })).not.toBeInTheDocument();
  });

  it("renders children inside the body", () => {
    const { container } = render(
      <Swimlane title="Items">
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </Swimlane>,
    );
    const body = container.querySelector(".swimlane__body");
    expect(body).toBeInTheDocument();
    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });

  it("forwards className to the root container", () => {
    const { container } = render(
      <Swimlane title="Styled" className="extra-class">
        <div>Content</div>
      </Swimlane>,
    );
    const root = container.querySelector(".swimlane");
    expect(root?.className).toContain("extra-class");
  });

  // #174 — the link's text and its attributes were both unreachable.
  describe("#174 · the 'View all' link is reachable", () => {
    it("uses viewAllLabel instead of the English default", () => {
      render(
        <Swimlane title="Recent" viewAllHref="/all" viewAllLabel="Tout voir">
          <div>Content</div>
        </Swimlane>,
      );
      expect(screen.getByRole("link", { name: "Tout voir" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "View all" })).not.toBeInTheDocument();
    });

    it("forwards viewAllProps onto the anchor without losing its class", () => {
      render(
        <Swimlane
          title="Recent"
          viewAllHref="/all"
          viewAllProps={{
            "aria-label": "All recent titles",
            target: "_blank",
            rel: "noreferrer",
            className: "extra",
          }}
        >
          <div>Content</div>
        </Swimlane>,
      );
      const link = screen.getByRole("link", { name: "All recent titles" });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
      expect(link).toHaveAttribute("href", "/all");
      expect(link.className).toContain("swimlane__view-all");
      expect(link.className).toContain("extra");
    });
  });

  // #176 — a lane nested under an existing h2 used to skip an outline level.
  it("renders the title at the level titleAs names", () => {
    render(
      <Swimlane title="Nested" titleAs="h3">
        <div>Content</div>
      </Swimlane>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Nested" })).toBeInTheDocument();
  });

  // #175 — the reveal's SSR markup is opacity: 0 with no way out.
  describe("#175 · animate={false} is a real opt-out", () => {
    it("renders no scroll-reveal-hidden class", () => {
      const { container } = render(
        <Swimlane title="Always readable" animate={false}>
          <div>Content</div>
        </Swimlane>,
      );
      const root = container.querySelector(".swimlane") as HTMLElement;
      expect(root.tagName).toBe("SECTION");
      expect(root.className).not.toContain("scroll-reveal-hidden");
      expect(screen.getByRole("heading", { level: 2, name: "Always readable" })).toBeVisible();
    });

    it("still hides behind the reveal by default", () => {
      const { container } = render(
        <Swimlane title="Revealed">
          <div>Content</div>
        </Swimlane>,
      );
      expect((container.querySelector(".swimlane") as HTMLElement).className).toContain(
        "scroll-reveal-hidden",
      );
    });

    it("forwards rest props with the reveal off", () => {
      const { container } = render(
        <Swimlane title="Plain" animate={false} id="lane-2" data-analytics="row-2">
          <div>Content</div>
        </Swimlane>,
      );
      const root = container.querySelector(".swimlane") as HTMLElement;
      expect(root.id).toBe("lane-2");
      expect(root.dataset.analytics).toBe("row-2");
    });
  });

  // #171 — rest props are spread onto ScrollReveal, which has to forward them.
  it("forwards rest props onto the rendered section", () => {
    const { container } = render(
      <Swimlane title="Featured" id="lane-1" aria-label="Featured titles" data-analytics="row-1">
        <div>Content</div>
      </Swimlane>,
    );
    const root = container.querySelector(".swimlane") as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root.id).toBe("lane-1");
    expect(root.getAttribute("aria-label")).toBe("Featured titles");
    expect(root.dataset.analytics).toBe("row-1");
  });
});
