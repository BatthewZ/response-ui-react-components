import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { Breadcrumbs } from "./Breadcrumbs";
import {
  RouterAdapterProvider,
  type RouterLinkComponent,
} from "../router/router-adapter";

// Minimal stand-in for the adapter's own default Link, so the pathname test
// below only varies the pathname.
const DefaultAdapterLink = forwardRef<HTMLAnchorElement, { to: string; children?: ReactNode }>(
  function TestLink({ to, children, ...rest }, ref) {
    return (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    );
  },
) as RouterLinkComponent;

// Breadcrumbs.Item uses useLink() from the router adapter, defaulting to a
// plain <a>, so no router wrapping is required for these tests.
const renderWithRouter = render;

describe("Breadcrumbs", () => {
  it("renders nav with aria-label and ol", () => {
    renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item>Home</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(nav.querySelector("ol")).toBeInTheDocument();
  });

  it("renders separators between items", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/products">Products</Breadcrumbs.Item>
        <Breadcrumbs.Item current>Widget</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const separators = container.querySelectorAll("[aria-hidden='true']");
    expect(separators.length).toBeGreaterThanOrEqual(2);
    const separatorTexts = Array.from(separators).map(
      (el) => el.textContent,
    );
    expect(separatorTexts).toContain("/");
  });

  it("renders custom separator", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs separator="›">
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item current>Page</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const separators = container.querySelectorAll("[aria-hidden='true']");
    const texts = Array.from(separators).map((el) => el.textContent);
    expect(texts).toContain("›");
  });

  it("item with href renders a link", () => {
    renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/home">Home</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/home");
  });

  it("item with current renders span with aria-current page", () => {
    renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item current>Current Page</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const current = screen.getByText("Current Page");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).toBe("SPAN");
  });

  it("item without href or current renders plain span", () => {
    renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item>Plain</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const plain = screen.getByText("Plain");
    expect(plain.tagName).toBe("SPAN");
    expect(plain).not.toHaveAttribute("aria-current");
  });

  it("collapses items when maxItems is exceeded", () => {
    renderWithRouter(
      <Breadcrumbs maxItems={3}>
        <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/c">C</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/d">D</Breadcrumbs.Item>
        <Breadcrumbs.Item current>E</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(
      screen.getByRole("button", { name: "Show more breadcrumbs" }),
    ).toBeInTheDocument();
  });

  it("ellipsis button has correct aria-label", () => {
    renderWithRouter(
      <Breadcrumbs maxItems={2}>
        <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
        <Breadcrumbs.Item current>C</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const ellipsis = screen.getByRole("button", {
      name: "Show more breadcrumbs",
    });
    expect(ellipsis).toHaveAttribute("aria-label", "Show more breadcrumbs");
  });

  it("clicking ellipsis expands all items", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Breadcrumbs maxItems={2}>
        <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/c">C</Breadcrumbs.Item>
        <Breadcrumbs.Item current>D</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const ellipsis = screen.getByRole("button", {
      name: "Show more breadcrumbs",
    });
    await user.click(ellipsis);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show more breadcrumbs" }),
    ).not.toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  #139 · expansion is remembered against the trail, not forever    */
  /* ---------------------------------------------------------------- */

  describe("expansion resets when the trail changes", () => {
    function Trail({ crumbs }: { crumbs: string[] }) {
      return (
        <Breadcrumbs maxItems={2}>
          {crumbs.map((c) => (
            <Breadcrumbs.Item key={c} href={`/${c}`}>
              {c}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      );
    }

    it("a re-keyed trail on the same instance starts collapsed again", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithRouter(<Trail crumbs={["A", "B", "C", "D"]} />);

      await user.click(screen.getByRole("button", { name: "Show more breadcrumbs" }));
      expect(screen.getByText("B")).toBeInTheDocument();

      // Same instance, same crumb count, different crumbs — a navigation.
      rerender(<Trail crumbs={["W", "X", "Y", "Z"]} />);

      expect(
        screen.getByRole("button", { name: "Show more breadcrumbs" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("X")).not.toBeInTheDocument();
    });

    // The crumbs a router-driven trail renders are often positional, so
    // `Children.toArray` hands them the same `.0`/`.1` keys on every route and
    // the keys alone cannot see the navigation. The pathname can.
    it("a pathname change resets an identically-keyed trail", async () => {
      const user = userEvent.setup();
      let path = "/a/b/c/d";
      const Adapter = ({ children }: { children: React.ReactNode }) => (
        <RouterAdapterProvider value={{ Link: DefaultAdapterLink, usePathname: () => path }}>
          {children}
        </RouterAdapterProvider>
      );
      const Positional = () => (
        <Breadcrumbs maxItems={2}>
          <Breadcrumbs.Item href="/1">One</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/2">Two</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/3">Three</Breadcrumbs.Item>
          <Breadcrumbs.Item current>Four</Breadcrumbs.Item>
        </Breadcrumbs>
      );

      const { rerender } = render(
        <Adapter>
          <Positional />
        </Adapter>,
      );
      await user.click(screen.getByRole("button", { name: "Show more breadcrumbs" }));
      expect(screen.getByText("Two")).toBeInTheDocument();

      path = "/x/y/z/w";
      rerender(
        <Adapter>
          <Positional />
        </Adapter>,
      );

      expect(
        screen.getByRole("button", { name: "Show more breadcrumbs" }),
      ).toBeInTheDocument();
    });

    it("an unrelated re-render of the same trail stays expanded", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithRouter(<Trail crumbs={["A", "B", "C", "D"]} />);

      await user.click(screen.getByRole("button", { name: "Show more breadcrumbs" }));
      rerender(<Trail crumbs={["A", "B", "C", "D"]} />);

      expect(screen.getByText("B")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Show more breadcrumbs" }),
      ).not.toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  #146 · a caller-rendered Divider replaces the auto one         */
  /* ---------------------------------------------------------------- */

  describe("Breadcrumbs.Divider rendered by the caller", () => {
    it("replaces the auto separator for that gap instead of tripling it", () => {
      const { container } = renderWithRouter(
        <Breadcrumbs>
          <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
          <Breadcrumbs.Divider>&rsaquo;</Breadcrumbs.Divider>
          <Breadcrumbs.Item current>B</Breadcrumbs.Item>
        </Breadcrumbs>,
      );

      const separators = container.querySelectorAll(".breadcrumbs__separator");
      expect(separators).toHaveLength(1);
      expect(separators[0]).toHaveTextContent("›");
    });

    it("is not counted as a crumb by the collapse arithmetic", () => {
      renderWithRouter(
        <Breadcrumbs maxItems={3}>
          <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
          <Breadcrumbs.Divider>&rsaquo;</Breadcrumbs.Divider>
          <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
          <Breadcrumbs.Item current>C</Breadcrumbs.Item>
        </Breadcrumbs>,
      );

      // Three crumbs against maxItems={3} — nothing to collapse. Counting the
      // caller's separator as a fourth child used to fold the trail.
      expect(
        screen.queryByRole("button", { name: "Show more breadcrumbs" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  #138 · head and tail must not overlap                            */
  /* ---------------------------------------------------------------- */

  describe("collapse with overlapping head/tail counts", () => {
    it("renders each crumb exactly once", () => {
      renderWithRouter(
        <Breadcrumbs maxItems={2} itemsBeforeCollapse={2} itemsAfterCollapse={2}>
          <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
          <Breadcrumbs.Item current>C</Breadcrumbs.Item>
        </Breadcrumbs>,
      );

      // B sat in both the head slice and the tail slice: rendered twice, under
      // one React key.
      expect(screen.getAllByText("B")).toHaveLength(1);
      expect(screen.getAllByText("A")).toHaveLength(1);
      expect(screen.getAllByText("C")).toHaveLength(1);
    });

    it("does not offer an ellipsis that hides nothing", () => {
      renderWithRouter(
        <Breadcrumbs maxItems={2} itemsBeforeCollapse={2} itemsAfterCollapse={2}>
          <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
          <Breadcrumbs.Item current>C</Breadcrumbs.Item>
        </Breadcrumbs>,
      );

      expect(
        screen.queryByRole("button", { name: "Show more breadcrumbs" }),
      ).not.toBeInTheDocument();
    });

    it("still collapses when the counts leave something to hide", () => {
      renderWithRouter(
        <Breadcrumbs maxItems={3} itemsBeforeCollapse={2} itemsAfterCollapse={2}>
          <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/c">C</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/d">D</Breadcrumbs.Item>
          <Breadcrumbs.Item current>E</Breadcrumbs.Item>
        </Breadcrumbs>,
      );

      expect(
        screen.getByRole("button", { name: "Show more breadcrumbs" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("C")).not.toBeInTheDocument();
      for (const label of ["A", "B", "D", "E"]) {
        expect(screen.getAllByText(label)).toHaveLength(1);
      }
    });
  });

  // #145. jsdom computes the implicit role whatever the CSS does, so this
  // asserts the attribute that carries the fix; the Safari + VoiceOver
  // behaviour it exists for is not observable in this environment.
  it("marks the list explicitly, which rest props cannot reach", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs role="none">
        <Breadcrumbs.Item current>Only</Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    expect(container.querySelector("ol")).toHaveAttribute("role", "list");
  });

  it("throws when Item is used outside root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderWithRouter(<Breadcrumbs.Item>Orphan</Breadcrumbs.Item>),
    ).toThrow();
    spy.mockRestore();
  });
});

describe("Breadcrumbs · classNames slots", () => {
  /**
   * One slot-override test per slot, and each is the falsifier for its own
   * merge: delete that element's `cn()` and exactly this test must go red.
   */
  it("lands classNames.list on the <ol>, beside the base class", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs classNames={{ list: "gap-r4" }}>
        <Breadcrumbs.Item current>A</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const list = container.querySelector(".breadcrumbs__list");
    expect(list?.getAttribute("class")).toContain("breadcrumbs__list");
    expect(list?.getAttribute("class")).toContain("gap-r4");
  });

  it("lands classNames.ellipsis on the expand control, beside the base class", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs maxItems={2} classNames={{ ellipsis: "underline" }}>
        <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/b">B</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/c">C</Breadcrumbs.Item>
        <Breadcrumbs.Item current>D</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const ellipsis = container.querySelector(".breadcrumbs__ellipsis");
    expect(ellipsis?.getAttribute("class")).toContain("breadcrumbs__ellipsis");
    expect(ellipsis?.getAttribute("class")).toContain("underline");
  });

  it("lands classNames.current on the current crumb, beside the base class", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item current classNames={{ current: "font-bold" }}>
          A
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const current = container.querySelector(".breadcrumbs__current");
    expect(current?.getAttribute("class")).toContain("breadcrumbs__current");
    expect(current?.getAttribute("class")).toContain("font-bold");
  });

  it("lands classNames.link on a linked crumb, beside the base class", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/a" classNames={{ link: "no-underline" }}>
          A
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const link = container.querySelector(".breadcrumbs__link");
    expect(link?.getAttribute("class")).toContain("breadcrumbs__link");
    expect(link?.getAttribute("class")).toContain("no-underline");
  });

  it("lands classNames.text on a plain crumb, beside the base class", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs>
        <Breadcrumbs.Item classNames={{ text: "italic" }}>A</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const text = container.querySelector(".breadcrumbs__text");
    expect(text?.getAttribute("class")).toContain("breadcrumbs__text");
    expect(text?.getAttribute("class")).toContain("italic");
  });

  it("leaves each internal on its base class alone when no slot is passed", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs maxItems={2}>
        <Breadcrumbs.Item href="/a">A</Breadcrumbs.Item>
        <Breadcrumbs.Item>B</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/c">C</Breadcrumbs.Item>
        <Breadcrumbs.Item current>D</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(container.querySelector(".breadcrumbs__list")?.getAttribute("class")).toBe(
      "breadcrumbs__list",
    );
    expect(container.querySelector(".breadcrumbs__ellipsis")?.getAttribute("class")).toBe(
      "breadcrumbs__ellipsis",
    );
    expect(container.querySelector(".breadcrumbs__link")?.getAttribute("class")).toBe(
      "breadcrumbs__link",
    );
    expect(container.querySelector(".breadcrumbs__current")?.getAttribute("class")).toBe(
      "breadcrumbs__current",
    );
  });

  it("does not put a slot class on either root", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs classNames={{ list: "gap-r4", ellipsis: "underline" }}>
        <Breadcrumbs.Item current classNames={{ current: "font-bold" }}>
          A
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(container.firstElementChild?.getAttribute("class")).toBe("breadcrumbs");
    expect(container.querySelector(".breadcrumbs__item")?.getAttribute("class")).toBe(
      "breadcrumbs__item",
    );
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs
        // @ts-expect-error — the rule between crumbs is `Breadcrumbs.Divider`,
        // the subcomponent, so there is no `divider` slot.
        classNames={{ divider: "opacity-50" }}
      >
        <Breadcrumbs.Item current>A</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(container.querySelector(".breadcrumbs__list")?.getAttribute("class")).toBe(
      "breadcrumbs__list",
    );
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = renderWithRouter(
      <Breadcrumbs classNames={{ list: "gap-r4" }}>
        <Breadcrumbs.Item current classNames={{ current: "font-bold" }}>
          A
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
    expect(container.querySelector(".breadcrumbs__item")?.hasAttribute("classnames")).toBe(false);
  });
});
