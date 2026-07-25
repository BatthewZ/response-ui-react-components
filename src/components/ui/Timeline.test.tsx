import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
