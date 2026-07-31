import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState, EmptyStateActions, EmptyStateDescription, EmptyStateIcon, EmptyStateTitle } from "./EmptyState";

describe("EmptyState", () => {
  it("renders root with children", () => {
    render(
      <EmptyState>
        <EmptyStateTitle>No results</EmptyStateTitle>
      </EmptyState>,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("applies data-size for sm", () => {
    const { container } = render(
      <EmptyState size="sm">
        <EmptyStateTitle>Small</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.querySelector(".empty-state")).toHaveAttribute(
      "data-size",
      "sm",
    );
  });

  it("applies data-size for md", () => {
    const { container } = render(
      <EmptyState size="md">
        <EmptyStateTitle>Medium</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.querySelector(".empty-state")).toHaveAttribute(
      "data-size",
      "md",
    );
  });

  it("applies data-size for lg", () => {
    const { container } = render(
      <EmptyState size="lg">
        <EmptyStateTitle>Large</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.querySelector(".empty-state")).toHaveAttribute(
      "data-size",
      "lg",
    );
  });

  it("defaults to size md", () => {
    const { container } = render(
      <EmptyState>
        <EmptyStateTitle>Default</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.querySelector(".empty-state")).toHaveAttribute(
      "data-size",
      "md",
    );
  });

  /**
   * The size axis is a class map keyed off the `size` prop, not a `[data-size]`
   * selector: `data-size` is a marker nothing reads back. These three are the
   * falsifiers for that — each part has to carry its own step's utilities.
   */
  it.each([
    ["sm", "p-r5", "gap-r6", "text-h5", "text-body-1"],
    ["md", "p-r3", "gap-r5", "text-h4", "text-h5"],
    ["lg", "p-r2", "gap-r4", "text-h3", "text-h4"],
  ] as const)("sizes root, icon and title for %s", (size, pad, gap, iconType, titleType) => {
    const { container } = render(
      <EmptyState size={size}>
        <EmptyStateIcon>
          <svg />
        </EmptyStateIcon>
        <EmptyStateTitle>Titled</EmptyStateTitle>
      </EmptyState>,
    );
    const root = container.querySelector(".empty-state")?.getAttribute("class")?.split(" ") ?? [];
    expect(root).toContain(pad);
    expect(root).toContain(gap);
    expect(
      container.querySelector(".empty-state__icon")?.getAttribute("class")?.split(" "),
    ).toContain(iconType);
    expect(
      container.querySelector(".empty-state__title")?.getAttribute("class")?.split(" "),
    ).toContain(titleType);
  });

  /**
   * The reason the size comes from context rather than an `in-[[data-size=…]]:`
   * variant: that variant matches ANY ancestor, so a nested empty state would
   * silently take the outer one's step.
   */
  it("keeps a nested empty state on its own size", () => {
    const { container } = render(
      <EmptyState size="lg">
        <EmptyState size="sm">
          <EmptyStateTitle>Inner</EmptyStateTitle>
        </EmptyState>
      </EmptyState>,
    );
    const inner = container.querySelectorAll(".empty-state")[1];
    expect(inner.getAttribute("class")?.split(" ")).toContain("p-r5");
    expect(inner.getAttribute("class")?.split(" ")).not.toContain("p-r2");
  });

  /**
   * The glyph sizing stays in `EmptyState.css` because it styles an element the
   * CALLER renders: as `[&_svg]:size-[1em]` it would emit at 0,1,1 in
   * `@layer utilities`, after the child's own `size-*` at 0,1,0, and the wrapper
   * would start beating the caller. This is the falsifier for that ruling.
   */
  it("does not put the glyph sizing on the icon slot's class list", () => {
    const { container } = render(
      <EmptyState>
        <EmptyStateIcon>
          <svg />
        </EmptyStateIcon>
      </EmptyState>,
    );
    const classes = container.querySelector(".empty-state__icon")?.getAttribute("class") ?? "";
    expect(classes).not.toContain("[&_svg]");
    expect(classes).not.toContain("*:size-");
  });

  it("EmptyState.Icon has aria-hidden true", () => {
    const { container } = render(
      <EmptyState>
        <EmptyStateIcon>
          <svg data-testid="icon" />
        </EmptyStateIcon>
      </EmptyState>,
    );
    const iconWrapper = container.querySelector("[aria-hidden='true']");
    expect(iconWrapper).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("EmptyState.Title renders text in a paragraph", () => {
    render(
      <EmptyState>
        <EmptyStateTitle>Nothing here</EmptyStateTitle>
      </EmptyState>,
    );
    const title = screen.getByText("Nothing here");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("P");
  });

  // An empty state that replaces a page's main content has to reach the heading
  // outline; `role="heading" aria-level` was the only route before `as`.
  it("EmptyState.Title renders the element given by `as`", () => {
    render(
      <EmptyState>
        <EmptyStateTitle as="h2">Nothing here</EmptyStateTitle>
      </EmptyState>,
    );
    const title = screen.getByRole("heading", { name: "Nothing here", level: 2 });
    expect(title.tagName).toBe("H2");
    expect(title).toHaveClass("empty-state__title");
  });

  it("EmptyState.Description renders text in a paragraph", () => {
    render(
      <EmptyState>
        <EmptyStateDescription>Try adjusting filters</EmptyStateDescription>
      </EmptyState>,
    );
    const description = screen.getByText("Try adjusting filters");
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("P");
  });

  it("EmptyState.Actions renders button children", () => {
    render(
      <EmptyState>
        <EmptyStateActions>
          <button>Retry</button>
          <button>Go back</button>
        </EmptyStateActions>
      </EmptyState>,
    );
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByText("Go back")).toBeInTheDocument();
  });

  it("throws when EmptyState.Title is used outside root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<EmptyStateTitle>Orphan</EmptyStateTitle>)).toThrow();
    spy.mockRestore();
  });

  it("forwards className on root", () => {
    const { container } = render(
      <EmptyState className="custom-class">
        <EmptyStateTitle>Styled</EmptyStateTitle>
      </EmptyState>,
    );
    expect(container.querySelector(".empty-state")).toHaveClass("custom-class");
  });
});
