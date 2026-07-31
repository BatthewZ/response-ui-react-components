import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Timeline } from "./Timeline";

describe("Timeline", () => {
  it("renders a container with the timeline class", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="First" />
      </Timeline>,
    );
    expect(container.querySelector(".timeline")).toBeInTheDocument();
  });

  it("renders multiple items", () => {
    render(
      <Timeline animate={false}>
        <Timeline.Item title="Step 1" />
        <Timeline.Item title="Step 2" />
        <Timeline.Item title="Step 3" />
      </Timeline>,
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("renders item with title, description, and date", () => {
    render(
      <Timeline animate={false}>
        <Timeline.Item title="Launch" date="Jan 2024">
          We launched the product.
        </Timeline.Item>
      </Timeline>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Launch" })).toBeInTheDocument();
    expect(screen.getByText("Jan 2024")).toBeInTheDocument();
    expect(screen.getByText("We launched the product.")).toBeInTheDocument();
  });

  it("renders a custom icon inside the timeline node", () => {
    render(
      <Timeline animate={false}>
        <Timeline.Item title="Custom" icon={<span data-testid="custom-icon">★</span>} />
      </Timeline>,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders a default dot when no icon is provided", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Default dot" />
      </Timeline>,
    );
    expect(container.querySelector(".timeline-dot")).toBeInTheDocument();
  });

  it("applies timeline-item class to each item", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    expect(container.querySelector(".timeline-item")).toBeInTheDocument();
  });

  it("forwards className to the root container", () => {
    const { container } = render(
      <Timeline animate={false} className="my-custom-timeline">
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    const root = container.querySelector(".timeline");
    expect(root?.className).toContain("my-custom-timeline");
  });

  it("forwards className to an item", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Styled" className="item-extra" />
      </Timeline>,
    );
    const item = container.querySelector(".timeline-item");
    expect(item?.className).toContain("item-extra");
  });

  /* ------------------------------------------------------------------ */
  /*  #346 · a prepended event must not remount the ones already there   */
  /* ------------------------------------------------------------------ */

  it("keeps existing items mounted when an event is prepended", () => {
    const { rerender } = render(
      <Timeline animate={false}>
        <Timeline.Item key="b" title="B" />
        <Timeline.Item key="c" title="C" />
      </Timeline>,
    );

    const before = screen.getByRole("heading", { name: "B" });

    rerender(
      <Timeline animate={false}>
        <Timeline.Item key="a" title="A" />
        <Timeline.Item key="b" title="B" />
        <Timeline.Item key="c" title="C" />
      </Timeline>,
    );

    // Same DOM node — the entry was moved, not torn down and rebuilt (which is
    // what loses child state and replays the entrance animation).
    expect(screen.getByRole("heading", { name: "B" })).toBe(before);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("still numbers the items by position after a prepend", () => {
    const { container, rerender } = render(
      <Timeline animate={false}>
        <Timeline.Item key="b" title="B" />
      </Timeline>,
    );
    rerender(
      <Timeline animate={false}>
        <Timeline.Item key="a" title="A" />
        <Timeline.Item key="b" title="B" />
      </Timeline>,
    );

    const titles = [...container.querySelectorAll(".timeline-title")].map((n) => n.textContent);
    expect(titles).toEqual(["A", "B"]);
  });

  /* ------------------------------------------------------------------ */
  /*  #342 · one source for the side and the entrance direction          */
  /* ------------------------------------------------------------------ */

  it("gives every item the same entrance marker, fragment children included", () => {
    // jsdom ships no IntersectionObserver, and ScrollReveal now reveals
    // statically without one — with no entrance marker at all. Stub one that can
    // be told the elements are visible, so the marker is reachable here.
    const reveal: (() => void)[] = [];
    class StubIO {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(node: Element) {
        reveal.push(() =>
          this.cb(
            [{ isIntersecting: true, target: node } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", StubIO);

    const { container } = render(
      <Timeline>
        <Timeline.Item title="A" />
        <>
          <Timeline.Item title="B" />
          <Timeline.Item title="C" />
        </>
        <Timeline.Item title="D" />
      </Timeline>,
    );
    act(() => {
      for (const fire of reveal) fire();
    });

    const items = [...container.querySelectorAll(".timeline-item")];
    // Four items in the DOM — `Children.toArray` used to see three, which is
    // exactly how the index and the `:nth-child` layout came apart.
    expect(items).toHaveLength(4);
    for (const item of items) {
      // The claim is unchanged and is the whole of #342: EVERY ITEM SHIPS THE
      // SAME ENTRANCE MARKER, and direction is CSS-only. What changed is the
      // marker. Items used to carry the foundation's `fade-right` class and
      // `Timeline.css` re-pointed its `animation-name`; that worked only while
      // this package's CSS was unlayered, so Timeline now emits no foundation
      // class at all and owns the shorthand, keyed on `data-entering`.
      expect(item).toHaveAttribute("data-entering");
      expect(item.className).not.toMatch(/\bfade-/);
    }
    vi.unstubAllGlobals();
  });

  /* ------------------------------------------------------------------ */
  /*  #343 · the title is a node, and its level is the caller's          */
  /* ------------------------------------------------------------------ */

  it("titleAs sets the heading level and title takes a node", () => {
    render(
      <Timeline animate={false}>
        <Timeline.Item titleAs="h4" title={<span data-testid="node">Shipped</span>} />
      </Timeline>,
    );

    const heading = screen.getByRole("heading", { level: 4 });
    expect(heading).toHaveClass("timeline-title");
    expect(screen.getByTestId("node")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  /* ------------------------------------------------------------------ */
  /*  Layout axes — align · density · card                               */
  /* ------------------------------------------------------------------ */

  // `vitest.config.ts` runs with `css: false`, so nothing here can assert a
  // computed offset. What IS assertable is the contract the stylesheet keys
  // off: the root carries the three attributes, always, with these defaults.
  // If one of these names changes, every selector in `Timeline.css` silently
  // stops matching and the layout falls back to `left` with no error.
  it("emits the layout attributes with their defaults", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    const root = container.querySelector(".timeline") as HTMLElement;
    expect(root.dataset.align).toBe("center");
    expect(root.dataset.density).toBe("comfortable");
    expect(root.dataset.card).toBe("true");
  });

  it.each(["left", "center", "right"] as const)("puts align=%s on the root", (align) => {
    const { container } = render(
      <Timeline animate={false} align={align}>
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    expect((container.querySelector(".timeline") as HTMLElement).dataset.align).toBe(align);
  });

  it.each(["dense", "comfortable", "spacious"] as const)(
    "puts density=%s on the root",
    (density) => {
      const { container } = render(
        <Timeline animate={false} density={density}>
          <Timeline.Item title="Item" />
        </Timeline>,
      );
      expect((container.querySelector(".timeline") as HTMLElement).dataset.density).toBe(density);
    },
  );

  // Stringified rather than the empty-string/undefined flag idiom, because the
  // selector that strips the chrome has to match on the *false* case.
  it("emits data-card=false when the card chrome is turned off", () => {
    const { container } = render(
      <Timeline animate={false} card={false}>
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    expect((container.querySelector(".timeline") as HTMLElement).dataset.card).toBe("false");
  });

  // The three axes are orthogonal: no combination is unreachable, and none of
  // them silently overrides another.
  it("keeps the three axes independent", () => {
    const { container } = render(
      <Timeline animate={false} align="right" density="spacious" card={false}>
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    const root = container.querySelector(".timeline") as HTMLElement;
    expect(root.dataset).toMatchObject({ align: "right", density: "spacious", card: "false" });
  });

  // Attributes sit before the spread, as everywhere else in the package, so the
  // documented "rest props reach the DOM" contract still holds over them.
  it("lets a caller override a layout attribute through rest props", () => {
    const { container } = render(
      <Timeline animate={false} align="left" data-align="right">
        <Timeline.Item title="Item" />
      </Timeline>,
    );
    expect((container.querySelector(".timeline") as HTMLElement).dataset.align).toBe("right");
  });

  // #342, restated for the new axis. `align` changes the entrance DIRECTION,
  // and it does so entirely in CSS — React still ships the identical markup on
  // every item. If this ever starts varying per item, the side and the direction
  // have two sources again and can desynchronise.
  it("ships the same entrance marker whatever the alignment", () => {
    const reveal: (() => void)[] = [];
    class StubIO {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(node: Element) {
        reveal.push(() =>
          this.cb(
            [{ isIntersecting: true, target: node } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", StubIO);

    const { container } = render(
      <Timeline align="right" density="dense">
        <Timeline.Item title="A" />
        <Timeline.Item title="B" />
      </Timeline>,
    );
    act(() => {
      for (const fire of reveal) fire();
    });

    const items = [...container.querySelectorAll(".timeline-item")];
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item).toHaveAttribute("data-entering");
      expect(item.className).not.toMatch(/\bfade-/);
    }
    vi.unstubAllGlobals();
  });

  // #340 — with `animate` at its default the item renders through ScrollReveal,
  // which is the path that used to drop every prop the `<div>` type advertises.
  it("forwards rest props to an item on the default animating path", () => {
    const { container } = render(
      <Timeline>
        <Timeline.Item title="First" id="step-1" aria-label="Step one" data-analytics="s1" />
      </Timeline>,
    );
    const item = container.querySelector(".timeline-item") as HTMLElement;
    expect(item.id).toBe("step-1");
    expect(item.getAttribute("aria-label")).toBe("Step one");
    expect(item.dataset.analytics).toBe("s1");
  });

  /* ------------------------------------------------------------------ */
  /*  The icon puck                                                      */
  /* ------------------------------------------------------------------ */

  // The wrapper is what `Timeline.css` paints the opaque disc on, and the only
  // signal the root's `:has()` has that this timeline reserves puck-width room
  // rather than dot-width. A bare `icon` had neither, so the rail showed through
  // the glyph and ran past the final marker.
  it("wraps a custom icon in a marker puck instead of the bare node", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Shipped" icon={<span data-testid="glyph">★</span>} />
      </Timeline>,
    );
    const puck = container.querySelector(".timeline-node > .timeline-icon");
    expect(puck).toBeInTheDocument();
    expect(puck).toContainElement(screen.getByTestId("glyph"));
    expect(container.querySelector(".timeline-dot")).not.toBeInTheDocument();
  });

  it("renders no puck when the item falls back to the default dot", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Default" />
      </Timeline>,
    );
    expect(container.querySelector(".timeline-icon")).not.toBeInTheDocument();
    expect(container.querySelector(".timeline-node > .timeline-dot")).toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ */
  /*  highlight                                                          */
  /* ------------------------------------------------------------------ */

  // Absent rather than "false", because both the stylesheet's own selector and
  // the root's `:has()` reservation test for presence — `data-highlight="false"`
  // would match `[data-highlight]` and reserve ring room for every item.
  it("omits data-highlight entirely when an item is not championed", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Ordinary" />
      </Timeline>,
    );
    const item = container.querySelector(".timeline-item") as HTMLElement;
    expect(item.hasAttribute("data-highlight")).toBe(false);
  });

  // Both paths, deliberately: #340 is the standing lesson that a prop verified
  // only under `animate={false}` can be silently inert in production, where the
  // default sends the item through ScrollReveal.
  it.each([
    ["animate={false}", false],
    ["the default animating path", true],
  ])("marks a championed item with data-highlight on %s", (_label, animate) => {
    const { container } = render(
      <Timeline animate={animate}>
        <Timeline.Item title="Champion" highlight icon={<span>★</span>} />
        <Timeline.Item title="Ordinary" />
      </Timeline>,
    );
    const items = [...container.querySelectorAll(".timeline-item")] as HTMLElement[];
    expect(items[0].dataset.highlight).toBe("true");
    expect(items[1].hasAttribute("data-highlight")).toBe(false);
  });

  it("lets a caller override data-highlight through the rest props", () => {
    const { container } = render(
      <Timeline animate={false}>
        <Timeline.Item title="Forced" highlight data-highlight="false" />
      </Timeline>,
    );
    const item = container.querySelector(".timeline-item") as HTMLElement;
    expect(item.dataset.highlight).toBe("false");
  });

  describe("classNames slots", () => {
    /**
     * One slot-override test per slot, and each is the falsifier for its own
     * merge: delete that element's `cn()` and exactly this test must go red.
     */
    it("lands classNames.icon on the glyph wrapper, beside the base class", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" icon={<span>★</span>} classNames={{ icon: "text-chart-1" }} />
        </Timeline>,
      );
      const icon = container.querySelector(".timeline-icon");
      expect(icon?.getAttribute("class")).toContain("timeline-icon");
      expect(icon?.getAttribute("class")).toContain("text-chart-1");
    });

    it("lands classNames.card on the card, beside the base class", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" classNames={{ card: "shadow-lg" }} />
        </Timeline>,
      );
      const card = container.querySelector(".timeline-card");
      expect(card?.getAttribute("class")).toContain("timeline-card");
      expect(card?.getAttribute("class")).toContain("shadow-lg");
    });

    it("lands classNames.timestamp on the date, beside the base class", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" date="Jan" classNames={{ timestamp: "tabular-nums" }} />
        </Timeline>,
      );
      const date = container.querySelector(".timeline-date");
      expect(date?.getAttribute("class")).toContain("timeline-date");
      expect(date?.getAttribute("class")).toContain("tabular-nums");
    });

    it("lands classNames.title on the heading, beside the base class", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" classNames={{ title: "text-heading-4" }} />
        </Timeline>,
      );
      const title = container.querySelector(".timeline-title");
      expect(title?.getAttribute("class")).toContain("timeline-title");
      expect(title?.getAttribute("class")).toContain("text-heading-4");
    });

    it("lands classNames.body on the detail block, beside the base class", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" classNames={{ body: "text-body-3" }}>
            detail
          </Timeline.Item>
        </Timeline>,
      );
      const body = container.querySelector(".timeline-body");
      expect(body?.getAttribute("class")).toContain("timeline-body");
      expect(body?.getAttribute("class")).toContain("text-body-3");
    });

    it("leaves each internal on its base class alone when no slot is passed", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" date="Jan" icon={<span>★</span>}>
            detail
          </Timeline.Item>
        </Timeline>,
      );
      expect(container.querySelector(".timeline-icon")?.getAttribute("class")).toBe("timeline-icon");
      expect(container.querySelector(".timeline-card")?.getAttribute("class")).toBe("timeline-card");
      expect(container.querySelector(".timeline-date")?.getAttribute("class")).toBe("timeline-date");
      expect(container.querySelector(".timeline-title")?.getAttribute("class")).toBe(
        "timeline-title",
      );
      expect(container.querySelector(".timeline-body")?.getAttribute("class")).toBe("timeline-body");
    });

    it("does not put a slot class on the item root", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item
            title="A"
            date="Jan"
            icon={<span>★</span>}
            classNames={{
              icon: "text-chart-1",
              card: "shadow-lg",
              timestamp: "tabular-nums",
              title: "text-heading-4",
              body: "text-body-3",
            }}
          >
            detail
          </Timeline.Item>
        </Timeline>,
      );
      expect(container.querySelector(".timeline-item")?.getAttribute("class")).toBe("timeline-item");
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item
            title="A"
            // @ts-expect-error — `dot` is reserved and granted to no component;
            // the marker's route is `--timeline-highlight-*`.
            classNames={{ dot: "bg-chart-1" }}
          />
        </Timeline>,
      );
      expect(container.querySelector(".timeline-dot")?.getAttribute("class")).toBe("timeline-dot");
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(
        <Timeline animate={false}>
          <Timeline.Item title="A" classNames={{ card: "shadow-lg" }} />
        </Timeline>,
      );
      expect(container.querySelector(".timeline-item")?.hasAttribute("classnames")).toBe(false);
    });
  });
});
