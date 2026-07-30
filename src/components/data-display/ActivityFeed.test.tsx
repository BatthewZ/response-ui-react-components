import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { ActivityFeed } from "./ActivityFeed";

describe("ActivityFeed", () => {
  it("renders an <ol> with the activity-feed class", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item actor="Ada" />
      </ActivityFeed>,
    );
    const root = container.querySelector("ol.activity-feed");
    expect(root).toBeInTheDocument();
    expect(root?.tagName).toBe("OL");
  });

  // #28. The stylesheet's `list-style: none` is what drops list semantics in
  // Safari + VoiceOver; jsdom computes the implicit role regardless, so this
  // asserts the attribute that carries the fix, not the announcement.
  it("marks the list explicitly", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item actor="Ada" />
      </ActivityFeed>,
    );
    expect(container.querySelector("ol.activity-feed")).toHaveAttribute("role", "list");
  });

  it("lets a caller replace the role", () => {
    const { container } = render(
      <ActivityFeed role="none">
        <ActivityFeed.Item actor="Ada" />
      </ActivityFeed>,
    );
    expect(container.querySelector("ol.activity-feed")).toHaveAttribute("role", "none");
  });

  it("renders N <li> items", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item actor="One" />
        <ActivityFeed.Item actor="Two" />
        <ActivityFeed.Item actor="Three" />
      </ActivityFeed>,
    );
    expect(container.querySelectorAll("li.activity-feed-item")).toHaveLength(3);
  });

  it("carries the connector class on every item (last item differentiated via :last-child)", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item actor="First" />
        <ActivityFeed.Item actor="Last" />
      </ActivityFeed>,
    );
    const items = container.querySelectorAll(".activity-feed-item");
    expect(items).toHaveLength(2);
    // The connector is a CSS ::before on .activity-feed-item suppressed by
    // :last-child, so every item must carry the connector-bearing class and
    // the last item is the final child in the list.
    items.forEach((item) => {
      expect(item).toHaveClass("activity-feed-item");
    });
    expect(items[items.length - 1]).toBe(container.querySelector(".activity-feed-item:last-child"));
  });

  it("renders an avatar passed into the avatar slot", () => {
    render(
      <ActivityFeed>
        <ActivityFeed.Item avatar={<span data-testid="avatar">A</span>} actor="Ada" />
      </ActivityFeed>,
    );
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  it("renders the icon-dot fallback when no avatar is provided", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item icon={<span data-testid="icon">i</span>} actor="Ada" />
      </ActivityFeed>,
    );
    expect(container.querySelector(".activity-feed-dot")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("does not render the dot fallback when an avatar is provided", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item avatar={<span>A</span>} actor="Ada" />
      </ActivityFeed>,
    );
    expect(container.querySelector(".activity-feed-dot")).not.toBeInTheDocument();
  });

  it("renders actor, action, target, and timestamp slots", () => {
    render(
      <ActivityFeed>
        <ActivityFeed.Item
          actor="Ada"
          action="commented on"
          target="Pull request #42"
          timestamp="2h ago"
        />
      </ActivityFeed>,
    );
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("commented on")).toBeInTheDocument();
    expect(screen.getByText("Pull request #42")).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("renders the children body below the sentence line", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item actor="Ada">
          <p>Looks great, shipping it.</p>
        </ActivityFeed.Item>
      </ActivityFeed>,
    );
    const body = container.querySelector(".activity-feed-body");
    expect(body).toBeInTheDocument();
    expect(screen.getByText("Looks great, shipping it.")).toBeInTheDocument();
  });

  it("merges className on the root", () => {
    const { container } = render(
      <ActivityFeed className="my-feed">
        <ActivityFeed.Item actor="Ada" />
      </ActivityFeed>,
    );
    const root = container.querySelector(".activity-feed");
    expect(root?.className).toContain("activity-feed");
    expect(root?.className).toContain("my-feed");
  });

  it("merges className on an item", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item actor="Ada" className="item-extra" />
      </ActivityFeed>,
    );
    const item = container.querySelector(".activity-feed-item");
    expect(item?.className).toContain("activity-feed-item");
    expect(item?.className).toContain("item-extra");
  });

  it("forwards refs to the underlying elements", () => {
    const rootRef = createRef<HTMLOListElement>();
    const itemRef = createRef<HTMLLIElement>();
    render(
      <ActivityFeed ref={rootRef}>
        <ActivityFeed.Item ref={itemRef} actor="Ada" />
      </ActivityFeed>,
    );
    expect(rootRef.current).toBeInstanceOf(HTMLOListElement);
    expect(itemRef.current).toBeInstanceOf(HTMLLIElement);
  });

  it("passes through aria-busy on the root", () => {
    const { container } = render(
      <ActivityFeed aria-busy>
        <ActivityFeed.Item actor="Ada" />
      </ActivityFeed>,
    );
    expect(container.querySelector(".activity-feed")).toHaveAttribute("aria-busy", "true");
  });

  /* ------------------------------------------------------------------ */
  /*  highlight                                                          */
  /* ------------------------------------------------------------------ */

  // Absent rather than "false" when off, so the stylesheet tests for presence.
  // Matches `Timeline.Item`, which spends the same prop the same way.
  it("marks a championed row with data-highlight and leaves the rest alone", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item highlight icon={<span>★</span>} actor="Deploy bot" />
        <ActivityFeed.Item icon={<span>·</span>} actor="Grace" />
      </ActivityFeed>,
    );
    const rows = [...container.querySelectorAll(".activity-feed-item")] as HTMLElement[];
    expect(rows[0].dataset.highlight).toBe("true");
    expect(rows[1].hasAttribute("data-highlight")).toBe(false);
  });

  it("lets a caller override data-highlight through the rest props", () => {
    const { container } = render(
      <ActivityFeed>
        <ActivityFeed.Item highlight data-highlight="false" actor="Ada" />
      </ActivityFeed>,
    );
    const row = container.querySelector(".activity-feed-item") as HTMLElement;
    expect(row.dataset.highlight).toBe("false");
  });
});
