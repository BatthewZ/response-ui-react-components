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

  describe("current page is inert to activation but stays navigable (#141)", () => {
    it("clicking the current page fires nothing", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

      await user.click(screen.getByRole("button", { name: "Page 3" }));

      expect(onPageChange).toHaveBeenCalledTimes(0);
    });

    it("keyboard-activating the current page fires nothing", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

      screen.getByRole("button", { name: "Page 3" }).focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(onPageChange).toHaveBeenCalledTimes(0);
    });

    it("keyboard-activating a different page fires exactly once with that page", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

      screen.getByRole("button", { name: "Page 4" }).focus();
      await user.keyboard("{Enter}");

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("clicking a different page fires exactly once with that page", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

      await user.click(screen.getByRole("button", { name: "Page 2" }));

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("current page keeps its place in the tab order and its aria-current", async () => {
      const user = userEvent.setup();
      render(<Pagination page={2} totalPages={3} onPageChange={() => {}} />);

      const current = screen.getByRole("button", { name: "Page 2" });
      screen.getByRole("button", { name: "Page 1" }).focus();
      await user.tab();

      expect(current).toHaveFocus();
      expect(current).not.toBeDisabled();
      expect(current).toHaveAttribute("aria-current", "page");
    });
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

describe("Pagination · classNames slots", () => {
  const noop = () => {};

  /**
   * One slot-override test per slot, and each is the falsifier for its own
   * merge: delete that element's `cn()` and exactly this test must go red.
   */
  it("lands classNames.list on the <ul>, beside the base class", () => {
    const { container } = render(
      <Pagination page={2} totalPages={5} onPageChange={noop} classNames={{ list: "gap-r4" }} />,
    );
    const list = container.querySelector(".pagination__list");
    expect(list?.getAttribute("class")).toContain("pagination__list");
    expect(list?.getAttribute("class")).toContain("gap-r4");
  });

  it("lands classNames.first on the first-page control alone", () => {
    render(
      <Pagination
        page={2}
        totalPages={9}
        onPageChange={noop}
        showEdges
        classNames={{ first: "rotate-180" }}
      />,
    );
    expect(screen.getByRole("button", { name: "First page" }).className).toContain(
      "pagination__nav",
    );
    expect(screen.getByRole("button", { name: "First page" }).className).toContain("rotate-180");
    expect(screen.getByRole("button", { name: "Previous page" }).className).not.toContain(
      "rotate-180",
    );
  });

  it("lands classNames.prev on the previous-page control alone", () => {
    render(
      <Pagination
        page={2}
        totalPages={9}
        onPageChange={noop}
        showEdges
        classNames={{ prev: "rotate-180" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Previous page" }).className).toContain(
      "pagination__nav",
    );
    expect(screen.getByRole("button", { name: "Previous page" }).className).toContain("rotate-180");
    expect(screen.getByRole("button", { name: "First page" }).className).not.toContain("rotate-180");
  });

  it("lands classNames.next on the next-page control alone", () => {
    render(
      <Pagination
        page={2}
        totalPages={9}
        onPageChange={noop}
        showEdges
        classNames={{ next: "rotate-180" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Next page" }).className).toContain(
      "pagination__nav",
    );
    expect(screen.getByRole("button", { name: "Next page" }).className).toContain("rotate-180");
    expect(screen.getByRole("button", { name: "Last page" }).className).not.toContain("rotate-180");
  });

  it("lands classNames.last on the last-page control alone", () => {
    render(
      <Pagination
        page={2}
        totalPages={9}
        onPageChange={noop}
        showEdges
        classNames={{ last: "rotate-180" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Last page" }).className).toContain(
      "pagination__nav",
    );
    expect(screen.getByRole("button", { name: "Last page" }).className).toContain("rotate-180");
    expect(screen.getByRole("button", { name: "Next page" }).className).not.toContain("rotate-180");
  });

  it("lands classNames.page on every page button, beside the base class", () => {
    const { container } = render(
      <Pagination page={2} totalPages={5} onPageChange={noop} classNames={{ page: "rounded-md" }} />,
    );
    const pages = container.querySelectorAll(".pagination__page");
    expect(pages).toHaveLength(5);
    for (const button of pages) {
      expect(button.getAttribute("class")).toContain("pagination__page");
      expect(button.getAttribute("class")).toContain("rounded-md");
    }
  });

  it("lands classNames.ellipsis on every gap marker, beside the base class", () => {
    const { container } = render(
      <Pagination
        page={10}
        totalPages={20}
        onPageChange={noop}
        classNames={{ ellipsis: "opacity-50" }}
      />,
    );
    const gaps = container.querySelectorAll(".pagination__ellipsis");
    expect(gaps).toHaveLength(2);
    for (const gap of gaps) {
      expect(gap.getAttribute("class")).toContain("pagination__ellipsis");
      expect(gap.getAttribute("class")).toContain("opacity-50");
    }
  });

  it("lands classNames.info on the compact readout, beside the base class", () => {
    const { container } = render(
      <Pagination
        page={2}
        totalPages={5}
        onPageChange={noop}
        variant="compact"
        classNames={{ info: "tabular-nums" }}
      />,
    );
    const info = container.querySelector(".pagination__info");
    expect(info?.getAttribute("class")).toContain("pagination__info");
    expect(info?.getAttribute("class")).toContain("tabular-nums");
  });

  it("leaves each internal on its base class alone when no slot is passed", () => {
    const { container } = render(
      <Pagination page={10} totalPages={20} onPageChange={noop} showEdges />,
    );
    expect(container.querySelector(".pagination__list")?.getAttribute("class")).toBe(
      "pagination__list",
    );
    expect(container.querySelector(".pagination__ellipsis")?.getAttribute("class")).toBe(
      "pagination__ellipsis",
    );
    expect(screen.getByRole("button", { name: "First page" }).className).toContain(
      "pagination__nav",
    );
    expect(container.querySelector(".pagination__page")?.getAttribute("class")).toBe(
      "pagination__page",
    );
  });

  it("does not put a slot class on the root", () => {
    const { container } = render(
      <Pagination
        page={10}
        totalPages={20}
        onPageChange={noop}
        showEdges
        classNames={{
          list: "gap-r4",
          first: "rotate-180",
          prev: "rotate-180",
          next: "rotate-180",
          last: "rotate-180",
          page: "rounded-md",
          ellipsis: "opacity-50",
          info: "tabular-nums",
        }}
      />,
    );
    expect(container.firstElementChild?.getAttribute("class")).toBe("pagination");
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      <Pagination
        page={2}
        totalPages={5}
        onPageChange={noop}
        // @ts-expect-error — `nav` is banned: one class, four roles. The keys
        // are `first`/`prev`/`next`/`last`.
        classNames={{ nav: "rotate-180" }}
      />,
    );
    expect(container.querySelector(".pagination__list")?.getAttribute("class")).toBe(
      "pagination__list",
    );
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = render(
      <Pagination page={2} totalPages={5} onPageChange={noop} classNames={{ list: "gap-r4" }} />,
    );
    expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
  });
});
