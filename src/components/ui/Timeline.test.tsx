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

  it("gives every item the same entrance class, fragment children included", () => {
    // jsdom ships no IntersectionObserver, and ScrollReveal now reveals
    // statically without one — with no entrance class at all. Stub one that can
    // be told the elements are visible, so the class is reachable here.
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
      expect(item).toHaveClass("fade-right");
      expect(item).not.toHaveClass("fade-left");
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
});
