import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StatCard } from "./StatCard";

// Defaults to reduced motion — the count-up is opt-in per test via
// `motion.reduced = false`, which also requires `stubMotionEnvironment()`.
const motion = vi.hoisted(() => ({ reduced: true }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = true;
  vi.unstubAllGlobals();
});

/**
 * While the count-up is mid-run the element holds two nodes (#6): the ticking
 * figure, `aria-hidden`, and an `sr-only` twin carrying the real value. Once it
 * settles there is one text node again, so both helpers fall back to the root.
 */
function visibleText(el: HTMLElement): string {
  return (el.querySelector('[aria-hidden="true"]') ?? el).textContent ?? "";
}
function accessibleText(el: HTMLElement): string {
  return (el.querySelector(".sr-only") ?? el).textContent ?? "";
}

/**
 * The count-up runs off IntersectionObserver + requestAnimationFrame, neither of
 * which jsdom drives. Stub both so the sequence is stepped by hand:
 * `scrollIntoView()` reports the observed node visible, `runFrame(at)` runs
 * whatever the component queued with a timestamp we choose.
 */
function stubMotionEnvironment() {
  const frames: FrameRequestCallback[] = [];
  const observed: Element[] = [];
  const disconnected = vi.fn();
  let reportVisible: (() => void) | null = null;

  class StubIntersectionObserver {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(node: Element) {
      observed.push(node);
      reportVisible = () =>
        this.callback(
          [{ isIntersecting: true, target: node } as unknown as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
    }
    unobserve() {}
    disconnect() {
      disconnected();
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));

  return {
    observed,
    disconnected,
    frames,
    scrollIntoView() {
      act(() => reportVisible?.());
    },
    runFrame(at: number) {
      const queued = frames.splice(0);
      act(() => {
        for (const frame of queued) frame(at);
      });
    },
  };
}

describe("StatCard", () => {
  describe("Root", () => {
    it("renders a div with stat-card class", () => {
      render(<StatCard data-testid="card">Content</StatCard>);
      const el = screen.getByTestId("card");
      expect(el.tagName).toBe("DIV");
      expect(el.className).toContain("stat-card");
    });

    it("merges custom className", () => {
      render(<StatCard data-testid="card" className="custom">Content</StatCard>);
      const el = screen.getByTestId("card");
      expect(el.className).toContain("stat-card");
      expect(el.className).toContain("custom");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<StatCard ref={ref}>Content</StatCard>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Label", () => {
    it("renders a span with stat-card__label class", () => {
      render(<StatCard.Label>Total Users</StatCard.Label>);
      const el = screen.getByText("Total Users");
      expect(el.tagName).toBe("SPAN");
      expect(el.className).toContain("stat-card__label");
    });

    it("merges custom className", () => {
      render(<StatCard.Label className="extra">Label</StatCard.Label>);
      const el = screen.getByText("Label");
      expect(el.className).toContain("stat-card__label");
      expect(el.className).toContain("extra");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLSpanElement>();
      render(<StatCard.Label ref={ref}>Label</StatCard.Label>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe("Value", () => {
    it("renders children when animateValue is false", () => {
      render(<StatCard.Value>1,234</StatCard.Value>);
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("renders a span with stat-card__value class", () => {
      render(<StatCard.Value>99</StatCard.Value>);
      const el = screen.getByText("99");
      expect(el.tagName).toBe("SPAN");
      expect(el.className).toContain("stat-card__value");
    });

    it("shows final formatted value when animateValue is true and reduced motion", () => {
      render(<StatCard.Value animateValue from={0} to={500} />);
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("uses custom format function", () => {
      const format = (v: number) => `$${v}`;
      render(<StatCard.Value animateValue from={0} to={100} format={format} />);
      expect(screen.getByText("$100")).toBeInTheDocument();
    });

    it("merges custom className", () => {
      render(<StatCard.Value className="big-value">42</StatCard.Value>);
      const el = screen.getByText("42");
      expect(el.className).toContain("stat-card__value");
      expect(el.className).toContain("big-value");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLSpanElement>();
      render(<StatCard.Value ref={ref}>0</StatCard.Value>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });

    it("observes nothing and requests no frames under reduced motion", () => {
      const env = stubMotionEnvironment();

      render(<StatCard.Value animateValue from={0} to={500} data-testid="value" />);

      expect(screen.getByTestId("value").textContent).toBe("500");
      expect(env.observed).toHaveLength(0);
      expect(env.frames).toHaveLength(0);
    });

    it("counts up from `from` to `to` across frames once scrolled into view", () => {
      motion.reduced = false;
      const env = stubMotionEnvironment();
      const startedAt = performance.now();

      render(
        <StatCard.Value animateValue from={0} to={500} duration={1000} data-testid="value" />
      );
      const el = screen.getByTestId("value");

      // Observed, but nothing moves until the element is actually seen. The
      // figure shown is the `from` placeholder; the announced one is not (#6).
      expect(visibleText(el)).toBe("0");
      expect(accessibleText(el)).toBe("500");
      expect(env.observed).toHaveLength(1);
      expect(env.frames).toHaveLength(0);

      env.scrollIntoView();

      // One intersection is enough: it stops observing and starts the run.
      expect(env.disconnected).toHaveBeenCalledTimes(1);
      expect(env.frames).toHaveLength(1);

      // Mid-run. The component reads its own start timestamp, so the bounds are
      // what can be pinned down here, not the exact figure.
      env.runFrame(startedAt + 500);
      const midway = Number(visibleText(el));
      expect(midway).toBeGreaterThan(0);
      expect(midway).toBeLessThan(500);
      expect(env.frames).toHaveLength(1);

      // Past the end: lands exactly on `to` and stops asking for frames.
      env.runFrame(startedAt + 10_000);
      expect(el.textContent).toBe("500");
      expect(env.frames).toHaveLength(0);
      // Settled: one text node again, so nothing is announced twice.
      expect(el.querySelectorAll("span")).toHaveLength(0);
    });

    it("formats every animated tick with the custom format function", () => {
      motion.reduced = false;
      const env = stubMotionEnvironment();
      const startedAt = performance.now();

      render(
        <StatCard.Value
          animateValue
          from={0}
          to={100}
          duration={1000}
          format={(v) => `$${v}`}
          data-testid="value"
        />
      );
      const el = screen.getByTestId("value");
      expect(visibleText(el)).toBe("$0");
      expect(accessibleText(el)).toBe("$100");

      env.scrollIntoView();
      env.runFrame(startedAt + 500);
      expect(visibleText(el)).toMatch(/^\$\d+$/);

      env.runFrame(startedAt + 10_000);
      expect(el.textContent).toBe("$100");
    });

    it("honours the duration prop, and falls back to a sub-second default", () => {
      motion.reduced = false;
      const slow = stubMotionEnvironment();
      const startedAt = performance.now();

      const long = render(
        <StatCard.Value animateValue from={0} to={500} duration={100_000} data-testid="slow" />
      );
      slow.scrollIntoView();
      slow.runFrame(startedAt + 1000);
      // 1s into a 100s run — nowhere near done, and still asking for frames.
      expect(Number(visibleText(screen.getByTestId("slow")))).toBeLessThan(500);
      expect(slow.frames).toHaveLength(1);
      long.unmount();

      // No duration: the CSS custom property is absent in jsdom, so the 400ms
      // fallback applies and the same 1s frame finishes the run.
      const fast = stubMotionEnvironment();
      render(<StatCard.Value animateValue from={0} to={500} data-testid="fast" />);
      fast.scrollIntoView();
      fast.runFrame(performance.now() + 1000);
      expect(screen.getByTestId("fast").textContent).toBe("500");
      expect(fast.frames).toHaveLength(0);
    });

    /* -------------------------------------------------------------- */
    /*  #5 · a changed target re-animates                              */
    /* -------------------------------------------------------------- */

    it("counts on to a new `to` instead of freezing on the first one", () => {
      motion.reduced = false;
      const env = stubMotionEnvironment();
      const startedAt = performance.now();

      const view = render(
        <StatCard.Value animateValue from={0} to={500} duration={1000} data-testid="value" />
      );
      const el = screen.getByTestId("value");

      env.scrollIntoView();
      env.runFrame(startedAt + 10_000);
      expect(el.textContent).toBe("500");

      // The figure updates — a re-fetch, a live stat.
      view.rerender(
        <StatCard.Value animateValue from={0} to={900} duration={1000} data-testid="value" />
      );
      const secondRunAt = performance.now();
      env.scrollIntoView();

      // A run is queued, and it starts from the figure on screen, not from `from`.
      expect(env.frames).toHaveLength(1);
      env.runFrame(secondRunAt + 400);
      const midway = Number(visibleText(el));
      expect(midway).toBeGreaterThan(500);
      expect(midway).toBeLessThan(900);

      env.runFrame(secondRunAt + 10_000);
      expect(el.textContent).toBe("900");
    });

    it("does not re-run for a target it already reached", () => {
      motion.reduced = false;
      const env = stubMotionEnvironment();
      const startedAt = performance.now();

      const view = render(
        <StatCard.Value animateValue from={0} to={500} duration={1000} data-testid="value" />
      );
      env.scrollIntoView();
      env.runFrame(startedAt + 10_000);
      expect(screen.getByTestId("value").textContent).toBe("500");

      // Same target, unrelated re-render, element scrolled back into view.
      view.rerender(
        <StatCard.Value
          animateValue
          from={0}
          to={500}
          duration={1000}
          className="x"
          data-testid="value"
        />
      );
      env.scrollIntoView();

      expect(env.frames).toHaveLength(0);
      expect(screen.getByTestId("value").textContent).toBe("500");
    });
  });

  describe("Trend", () => {
    it("renders an up trend with + sign and percentage", () => {
      render(<StatCard.Trend value={12} direction="up" data-testid="trend" />);
      const el = screen.getByTestId("trend");
      expect(el.textContent).toContain("+");
      expect(el.textContent).toContain("12%");
    });

    it("renders a down trend with - sign and percentage", () => {
      render(<StatCard.Trend value={5} direction="down" data-testid="trend" />);
      const el = screen.getByTestId("trend");
      expect(el.textContent).toContain("-");
      expect(el.textContent).toContain("5%");
    });

    it("renders a neutral trend without a sign", () => {
      render(<StatCard.Trend value={0} direction="neutral" data-testid="trend" />);
      const el = screen.getByTestId("trend");
      expect(el.textContent).not.toContain("+");
      expect(el.textContent).not.toContain("-");
      expect(el.textContent).toContain("0%");
    });

    // Direction (which way the number moved) and sentiment (whether that is good
    // news) are separate class axes: `up`/`down`/`flat` vs
    // `positive`/`negative`/`neutral`. Asserted together so neither can drift
    // into the other's vocabulary unnoticed.
    it.each([
      ["up", "stat-card__trend--up", "stat-card__trend--positive"],
      ["down", "stat-card__trend--down", "stat-card__trend--negative"],
      ["neutral", "stat-card__trend--flat", "stat-card__trend--neutral"],
    ] as const)("direction %s emits its own class and the implied sentiment", (
      direction,
      directionClass,
      sentimentClass
    ) => {
      render(<StatCard.Trend value={10} direction={direction} data-testid="trend" />);
      const el = screen.getByTestId("trend");
      expect(el).toHaveClass(directionClass);
      expect(el).toHaveClass(sentimentClass);
    });

    /* ---------------------------------------------------------------- */
    /*  sentiment — colour decoupled from direction                      */
    /* ---------------------------------------------------------------- */

    it("sentiment overrides the direction-implied colour without touching the arrow", () => {
      // Churn falling is a *good* drop: down arrow, minus sign, green.
      render(
        <StatCard.Trend value={2.4} direction="down" sentiment="positive" data-testid="trend" />
      );
      const el = screen.getByTestId("trend");

      expect(el).toHaveClass("stat-card__trend--down");
      expect(el).toHaveClass("stat-card__trend--positive");
      expect(el).not.toHaveClass("stat-card__trend--negative");
      // The arrow still reports the direction, and the sign still reads off it.
      expect(el.querySelector("svg")).toBeInTheDocument();
      expect(el.textContent).toContain("-2.4%");
    });

    it("a rising metric can be bad news", () => {
      render(<StatCard.Trend value={8} direction="up" sentiment="negative" data-testid="trend" />);
      const el = screen.getByTestId("trend");

      expect(el).toHaveClass("stat-card__trend--up");
      expect(el).toHaveClass("stat-card__trend--negative");
      expect(el).not.toHaveClass("stat-card__trend--positive");
      expect(el.textContent).toContain("+8%");
    });

    it("sentiment can mute a movement that is neither good nor bad", () => {
      render(<StatCard.Trend value={3} direction="up" sentiment="neutral" data-testid="trend" />);
      const el = screen.getByTestId("trend");

      expect(el).toHaveClass("stat-card__trend--up");
      expect(el).toHaveClass("stat-card__trend--neutral");
      expect(el).not.toHaveClass("stat-card__trend--positive");
    });

    it("renders a trend arrow for up/down but not neutral", () => {
      const { container: upContainer } = render(
        <StatCard.Trend value={5} direction="up" />
      );
      expect(upContainer.querySelector("svg")).toBeInTheDocument();

      const { container: neutralContainer } = render(
        <StatCard.Trend value={0} direction="neutral" />
      );
      expect(neutralContainer.querySelectorAll("svg")).toHaveLength(0);
    });

    it("uses absolute value for display", () => {
      render(<StatCard.Trend value={-8} direction="down" data-testid="trend" />);
      expect(screen.getByTestId("trend").textContent).toContain("8%");
    });

    // Trend Omits `children` and does not destructure it, but JSX element children
    // are emitted after the spread in the object the JSX runtime builds, so the arrow
    // and the formatted value always win. Measured, not assumed — the omission needs
    // no runtime guard.
    it("a spread `children` cannot displace the arrow or the value", () => {
      const bag = { children: "HIJACKED", "data-testid": "trend" };

      render(<StatCard.Trend value={12} direction="up" {...bag} />);
      const el = screen.getByTestId("trend");

      expect(el.textContent).toBe("+12%");
      expect(el.querySelector("svg")).toBeInTheDocument();
    });

    it("uses default formatting when no format prop is provided", () => {
      render(<StatCard.Trend value={7} direction="up" data-testid="trend" />);
      expect(screen.getByTestId("trend").textContent).toContain("+7%");
    });

    it("renders custom format text when format prop is provided", () => {
      render(
        <StatCard.Trend
          value={42}
          direction="up"
          format={(v) => `${v} pts`}
          data-testid="trend"
        />
      );
      const el = screen.getByTestId("trend");
      expect(el.textContent).toContain("42 pts");
      expect(el.textContent).not.toContain("%");
    });

    it("merges custom className", () => {
      render(<StatCard.Trend value={1} direction="up" className="extra" data-testid="trend" />);
      const el = screen.getByTestId("trend");
      expect(el.className).toContain("stat-card__trend");
      expect(el.className).toContain("extra");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLSpanElement>();
      render(<StatCard.Trend ref={ref} value={1} direction="up" />);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });

    /**
     * The slot-override test for `classNames.trendIcon` (docs/project-docs/slot-convention.md §5). It
     * is the falsifier as well as the feature: delete the `cn()` merge in
     * `TrendArrow` and this must go red. A slot that still passes with the merge
     * removed is a prop that lands in the type and nowhere else.
     */
    it("lands classNames.trendIcon on the arrow, beside the base class", () => {
      const { container } = render(
        <StatCard.Trend value={1} direction="up" classNames={{ trendIcon: "size-r3" }} />
      );
      const arrow = container.querySelector("svg");
      expect(arrow?.getAttribute("class")).toContain("stat-card__trend-icon");
      expect(arrow?.getAttribute("class")).toContain("size-r3");
    });

    /**
     * This used to assert the class attribute equalled the marker exactly, which
     * stopped being expressible once `StatCard.css` was deleted and the arrow
     * carried its own size and transition. The falsifiers are unchanged and are
     * what the equality was ever standing in for: an absent slot appends NOTHING
     * — no `undefined`, no empty token.
     */
    it("leaves the arrow on its base classes alone when no slot is passed", () => {
      const { container } = render(<StatCard.Trend value={1} direction="up" />);
      const classes = container.querySelector("svg")?.getAttribute("class") ?? "";
      expect(classes.split(" ")).toContain("stat-card__trend-icon");
      expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      // `up` does not flip the glyph; `down` does, and that pair is what replaced
      // the `.stat-card__trend--down .stat-card__trend-icon` rule.
      expect(classes.split(" ")).not.toContain("rotate-180");
    });

    it("rotates the arrow for a falling figure and only for one", () => {
      const down = render(<StatCard.Trend value={1} direction="down" />);
      expect(down.container.querySelector("svg")?.className.baseVal.split(" ")).toContain(
        "rotate-180"
      );
    });

    it("does not put the slot class on the badge itself", () => {
      render(
        <StatCard.Trend
          value={1}
          direction="up"
          classNames={{ trendIcon: "size-r3" }}
          data-testid="trend"
        />
      );
      expect(screen.getByTestId("trend").className).not.toContain("size-r3");
    });

    /**
     * The reason for a per-component inline slot union rather than a
     * `Record<string, string>` helper (docs/project-docs/slot-convention.md §1): an unknown key is a
     * *type* error, not a silent no-op. The `@ts-expect-error` is the assertion — it
     * fails if TypeScript ever stops rejecting the key. Do not "clean it up".
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        // @ts-expect-error — `trendGlyph` is not a slot; only untyped JS gets here.
        <StatCard.Trend value={1} direction="up" classNames={{ trendGlyph: "size-r3" }} />
      );
      const classes = container.querySelector("svg")?.getAttribute("class") ?? "";
      expect(classes.split(" ")).toContain("stat-card__trend-icon");
      expect(classes).not.toContain("size-r3");
    });

    it("does not leak classNames onto the DOM", () => {
      render(
        <StatCard.Trend
          value={1}
          direction="up"
          classNames={{ trendIcon: "size-r3" }}
          data-testid="trend"
        />
      );
      expect(screen.getByTestId("trend").hasAttribute("classnames")).toBe(false);
    });
  });

  describe("Sparkline", () => {
    it("renders an svg with role img", () => {
      render(<StatCard.Sparkline values={[1, 2, 3]} />);
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    it("wraps the sparkline in a stat-card__sparkline container", () => {
      const { container } = render(<StatCard.Sparkline values={[1, 2, 3]} />);
      const wrapper = container.querySelector(".stat-card__sparkline");
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.querySelector("svg")).toBeInTheDocument();
    });

    it("applies the up tint class when direction is up", () => {
      render(<StatCard.Sparkline values={[1, 2, 3]} direction="up" />);
      expect(screen.getByRole("img").getAttribute("class")).toContain("text-trend-up");
    });

    it("applies the down tint class when direction is down", () => {
      render(<StatCard.Sparkline values={[3, 2, 1]} direction="down" />);
      expect(screen.getByRole("img").getAttribute("class")).toContain("text-trend-down");
    });

    it("applies the neutral tint class when direction is neutral", () => {
      render(<StatCard.Sparkline values={[1, 1, 1]} direction="neutral" />);
      expect(screen.getByRole("img").getAttribute("class")).toContain("text-fg-muted");
    });

    it("leaves color to inherit when direction is omitted", () => {
      render(<StatCard.Sparkline values={[1, 2, 3]} />);
      const cls = screen.getByRole("img").getAttribute("class") ?? "";
      expect(cls).not.toContain("text-trend-up");
      expect(cls).not.toContain("text-trend-down");
      expect(cls).not.toContain("text-fg-muted");
    });

    it("sentiment drives the tint, so a good drop is not painted red", () => {
      render(<StatCard.Sparkline values={[3, 2, 1]} direction="down" sentiment="positive" />);
      const cls = screen.getByRole("img").getAttribute("class") ?? "";
      expect(cls).toContain("text-trend-up");
      expect(cls).not.toContain("text-trend-down");
    });

    it("sentiment alone tints without a direction", () => {
      render(<StatCard.Sparkline values={[1, 2, 3]} sentiment="negative" />);
      expect(screen.getByRole("img").getAttribute("class")).toContain("text-trend-down");
    });

    it("forwards ref to the svg element", () => {
      const ref = createRef<SVGSVGElement>();
      render(<StatCard.Sparkline ref={ref} values={[1, 2, 3]} />);
      expect(ref.current).toBeInstanceOf(SVGSVGElement);
    });

    it("merges custom className onto the sparkline", () => {
      render(<StatCard.Sparkline values={[1, 2, 3]} className="extra-spark" />);
      expect(screen.getByRole("img").getAttribute("class")).toContain("extra-spark");
    });

    /**
     * The mirror of the test above, and the pin on this component's triage-(a)
     * ruling: `className` addresses the chart, not the wrapper, because this
     * component's props ARE `Sparkline`'s and its `ref` is the `<svg>`. Moving it
     * to the wrapper under the §4b house rule is a breaking API change and an
     * owner call — see docs/project-docs/slot-convention.md "The wrapper case". If that call is
     * taken, this test is the one that must be rewritten rather than deleted.
     *
     * IT HAS BEEN REWRITTEN, AND THE RULING IS UNCHANGED. The equality stopped
     * being expressible when `StatCard.css` was deleted: the wrapper now carries
     * the `block mt-auto` that `.stat-card__sparkline` used to declare. What the
     * equality was pinning is the negative — `className` does NOT reach this
     * element — and that is asserted directly below, alongside the marker and the
     * pin it carries. The `.sparkline` rule that reached across into `Sparkline`'s
     * own `<svg>` is gone too: `block w-full` is handed to the chart through the
     * `className` this component already forwards.
     */
    it("leaves the pinning wrapper on its own classes, and className on the chart", () => {
      const { container } = render(
        <StatCard.Sparkline values={[1, 2, 3]} className="extra-spark" />
      );
      const wrapper = container.querySelector(".stat-card__sparkline")?.getAttribute("class") ?? "";
      expect(wrapper.split(" ")).toEqual(
        expect.arrayContaining(["stat-card__sparkline", "mt-auto"]),
      );
      expect(wrapper.split(" ")).not.toContain("extra-spark");
      const chart = screen.getByRole("img").getAttribute("class") ?? "";
      expect(chart.split(" ")).toEqual(expect.arrayContaining(["w-full", "extra-spark"]));
    });
  });

  describe("Icon", () => {
    it("renders a div with stat-card__icon class", () => {
      render(<StatCard.Icon data-testid="icon">Icon</StatCard.Icon>);
      const el = screen.getByTestId("icon");
      expect(el.tagName).toBe("DIV");
      expect(el.className).toContain("stat-card__icon");
    });

    it("merges custom className", () => {
      render(<StatCard.Icon className="custom-icon" data-testid="icon">I</StatCard.Icon>);
      const el = screen.getByTestId("icon");
      expect(el.className).toContain("stat-card__icon");
      expect(el.className).toContain("custom-icon");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<StatCard.Icon ref={ref}>I</StatCard.Icon>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Compound usage", () => {
    it("renders a full stat card composition", () => {
      render(
        <StatCard data-testid="stat">
          <StatCard.Icon>$</StatCard.Icon>
          <StatCard.Label>Revenue</StatCard.Label>
          <StatCard.Value>$50,000</StatCard.Value>
          <StatCard.Trend value={15} direction="up" data-testid="trend" />
        </StatCard>
      );

      expect(screen.getByTestId("stat")).toBeInTheDocument();
      expect(screen.getByText("Revenue")).toBeInTheDocument();
      expect(screen.getByText("$50,000")).toBeInTheDocument();
      expect(screen.getByTestId("trend").textContent).toContain("+15%");
    });
  });

  describe("environments without IntersectionObserver", () => {
    it("renders the final value instead of throwing", () => {
      motion.reduced = false;
      vi.stubGlobal("IntersectionObserver", undefined);

      expect(() =>
        render(
          <StatCard>
            <StatCard.Value animateValue from={0} to={500} />
          </StatCard>
        )
      ).not.toThrow();

      expect(screen.getByText("500")).toBeInTheDocument();
    });
  });
});
