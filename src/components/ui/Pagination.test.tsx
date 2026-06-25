import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders nav with aria-label Pagination", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toBeInTheDocument();
    expect(nav.querySelector("ul")).toBeInTheDocument();
  });

  it("current page has aria-current page", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);
    const currentButton = screen.getByRole("button", { name: "Page 3" });
    expect(currentButton).toHaveAttribute("aria-current", "page");
  });

  it("previous and next are disabled at boundaries", () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={5} onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next page" }),
    ).not.toBeDisabled();

    rerender(
      <Pagination page={5} totalPages={5} onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).not.toBeDisabled();
  });

  it("first and last are disabled at boundaries", () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={5} showEdges onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "First page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Last page" }),
    ).not.toBeDisabled();

    rerender(
      <Pagination page={5} totalPages={5} showEdges onPageChange={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Last page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "First page" }),
    ).not.toBeDisabled();
  });

  it("calls onPageChange with correct page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination page={3} totalPages={5} showEdges onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(4);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole("button", { name: "First page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("full variant shows page number buttons", () => {
    render(
      <Pagination
        page={1}
        totalPages={3}
        variant="full"
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument();
  });

  it("compact variant shows Page X of Y", () => {
    render(
      <Pagination
        page={2}
        totalPages={10}
        variant="compact"
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/Page/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("showEdges false hides first and last buttons", () => {
    render(
      <Pagination
        page={3}
        totalPages={5}
        showEdges={false}
        onPageChange={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "First page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Last page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next page" }),
    ).toBeInTheDocument();
  });

  it("full variant hides edge buttons by default (numbers cover boundaries)", () => {
    render(<Pagination page={3} totalPages={12} onPageChange={() => {}} />);
    expect(
      screen.queryByRole("button", { name: "First page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Last page" }),
    ).not.toBeInTheDocument();
    // Boundaries still reachable as numbers.
    expect(screen.getByRole("button", { name: "Page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 12" })).toBeInTheDocument();
  });

  it("compact variant shows edge buttons by default (no numbers to reach boundaries)", () => {
    render(
      <Pagination
        page={3}
        totalPages={12}
        variant="compact"
        onPageChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "First page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Last page" }),
    ).toBeInTheDocument();
  });

  it("single page disables all navigation buttons", () => {
    render(<Pagination page={1} totalPages={1} showEdges onPageChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "First page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("shows ellipsis for large page counts", () => {
    const { container } = render(
      <Pagination page={5} totalPages={20} onPageChange={() => {}} />,
    );
    const ellipses = container.querySelectorAll("span");
    const hasEllipsis = Array.from(ellipses).some(
      (el) => el.textContent === "\u2026" || el.textContent === "...",
    );
    expect(hasEllipsis).toBe(true);
  });

  const slotCount = (container: HTMLElement) =>
    container.querySelectorAll(".pagination__page").length +
    container.querySelectorAll(".pagination__ellipsis").length;

  it("renders a constant slot count across every page (no layout shift)", () => {
    const counts = new Set<number>();
    for (let page = 1; page <= 12; page++) {
      const { container, unmount } = render(
        <Pagination page={page} totalPages={12} onPageChange={() => {}} />,
      );
      counts.add(slotCount(container));
      unmount();
    }
    // Constant slot count = constant width.
    expect(counts.size).toBe(1);
    expect([...counts][0]).toBe(7); // siblingCount(1) * 2 + 5
  });

  it("always renders the current page button while paging", () => {
    for (let page = 1; page <= 12; page++) {
      const { unmount } = render(
        <Pagination page={page} totalPages={12} onPageChange={() => {}} />,
      );
      const current = screen.getByRole("button", { name: `Page ${page}` });
      expect(current).toHaveAttribute("aria-current", "page");
      unmount();
    }
  });

  it("slot count scales with siblingCount and stays constant", () => {
    const counts = new Set<number>();
    for (let page = 1; page <= 20; page++) {
      const { container, unmount } = render(
        <Pagination
          page={page}
          totalPages={20}
          siblingCount={2}
          onPageChange={() => {}}
        />,
      );
      counts.add(slotCount(container));
      unmount();
    }
    expect(counts.size).toBe(1);
    expect([...counts][0]).toBe(9); // siblingCount(2) * 2 + 5
  });

  it("collapses to compact below the configured breakpoint", () => {
    const original = window.matchMedia;
    // jsdom lacks matchMedia; stub a match.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    try {
      render(
        <Pagination
          page={2}
          totalPages={12}
          compactBelow="40rem"
          onPageChange={() => {}}
        />,
      );
      // Compact: "Page X of Y", no page-number buttons.
      expect(screen.getByText(/Page/)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Page 5" }),
      ).not.toBeInTheDocument();
      // Edges appear (compact default).
      expect(
        screen.getByRole("button", { name: "First page" }),
      ).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});
