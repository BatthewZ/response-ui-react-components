import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProgressBar } from "./ProgressBar";

// Defaults to full motion — the reduced-motion path is opt-in per test via
// `motion.reduced = true`.
const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock("../../hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
});

function getFill(): HTMLElement {
  const fill = screen.getByRole("progressbar").firstElementChild;
  if (!(fill instanceof HTMLElement)) throw new Error("ProgressBar rendered no fill");
  return fill;
}

describe("ProgressBar", () => {
  it("renders with role='progressbar'", () => {
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("value prop sets aria-valuenow", () => {
    render(<ProgressBar value={42} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
  });

  it("max prop sets aria-valuemax", () => {
    render(<ProgressBar value={20} max={200} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "200");
  });

  it("defaults aria-valuemax to 100", () => {
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
  });

  it("visual bar width reflects percentage", () => {
    render(<ProgressBar value={75} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("75%");
  });

  it("clamps visual width to 100%", () => {
    render(<ProgressBar value={150} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("visual width is 0% when value is 0", () => {
    render(<ProgressBar value={0} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("forwards className prop", () => {
    render(<ProgressBar value={50} className="custom-class" aria-label="Upload" />);
    expect(screen.getByRole("progressbar").className).toContain("custom-class");
  });

  it("ProgressBar.Label renders its content", () => {
    const { container } = render(<ProgressBar.Label>Upload progress</ProgressBar.Label>);
    expect(container).toHaveTextContent("Upload progress");
  });

  it("ProgressBar.Value renders its content", () => {
    const { container } = render(<ProgressBar.Value>75%</ProgressBar.Value>);
    expect(container).toHaveTextContent("75%");
  });

  it("animates the fill by default", () => {
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(getFill().className).not.toContain("progress-bar__fill--no-animate");
  });

  it("animate={false} opts the fill out of the width transition", () => {
    render(<ProgressBar value={50} animate={false} aria-label="Upload" />);
    expect(getFill().className).toContain("progress-bar__fill--no-animate");
  });

  it("reduced motion opts the fill out even with animate left at its default", () => {
    motion.reduced = true;
    render(<ProgressBar value={50} aria-label="Upload" />);
    expect(getFill().className).toContain("progress-bar__fill--no-animate");
  });

  // The root Omits `children` and does not destructure it, but JSX element children
  // are emitted after the spread in the object the JSX runtime builds, so the fill
  // always wins. Measured, not assumed — the omission needs no runtime guard.
  it("a spread `children` cannot displace the fill", () => {
    const bag = { children: "HIJACKED", id: "bar" };

    render(<ProgressBar value={50} aria-label="Upload" {...bag} />);
    const root = screen.getByRole("progressbar");

    expect(root).toHaveAttribute("id", "bar");
    expect(root).toHaveTextContent("");
    expect(getFill()).toHaveClass("progress-bar__fill");
  });
});

// #205 — `color` swapped one background and emitted nothing else, so two bars at
// the same value with `success` and `error` announced identically. The word rides
// `aria-valuetext` rather than a hidden child because `role="progressbar"` makes
// its children presentational (the same reason Avatar labels its dot).
describe("ProgressBar · status has a text channel", () => {
  it("announces the status alongside the percentage", () => {
    render(<ProgressBar value={96} color="error" aria-label="Quota" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "96%, Error");
  });

  it("says nothing extra for the neutral accent colour", () => {
    render(<ProgressBar value={96} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuetext");
  });

  it("reports the percentage of the range, not the raw value", () => {
    render(<ProgressBar value={50} max={200} color="warning" aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "25%, Warning");
  });

  it("statusLabel replaces the default word, and '' removes it", () => {
    const { rerender } = render(
      <ProgressBar value={96} color="error" statusLabel="Dépassement" aria-label="Quota" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "96%, Dépassement",
    );

    rerender(<ProgressBar value={96} color="error" statusLabel="" aria-label="Over quota" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuetext");
  });

  it("falls back to the status alone when max describes no range", () => {
    render(<ProgressBar value={5} max={0} color="warning" aria-label="Sync" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Warning");
  });

  it("a caller's own aria-valuetext wins", () => {
    render(
      <ProgressBar value={96} color="error" aria-valuetext="Over quota" aria-label="Quota" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Over quota");
  });

  it("keeps the word out of the DOM, where role=progressbar would hide it", () => {
    render(<ProgressBar value={96} color="error" aria-label="Quota" />);
    expect(screen.getByRole("progressbar")).toHaveTextContent("");
  });
});

describe("ProgressBar · range integrity", () => {
  // #202
  it("announces the clamped value, not the raw one", () => {
    render(<ProgressBar value={150} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar.firstElementChild).toHaveStyle({ width: "100%" });
  });

  it("announces 0 for a value below the floor", () => {
    render(<ProgressBar value={-20} max={100} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  // #204
  it("renders an empty bar for a NaN value, never a full one", () => {
    render(<ProgressBar value={Number.NaN} max={100} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.firstElementChild).toHaveStyle({ width: "0%" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  // #209
  it("exposes no range at all when max describes none", () => {
    render(<ProgressBar value={5} max={0} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuemin");
    expect(bar).not.toHaveAttribute("aria-valuemax");
  });
});

// #203 — `ProgressBar.Label` implies a wiring it cannot perform: the root omits
// `children`, so the label is its sibling and no context can join them. The type
// asks the caller for the association instead, the way `Meter` asks for a name.
describe("ProgressBar · the bar has to be named", () => {
  type RootProps = ComponentProps<typeof ProgressBar>;

  // Compile-time assertions, enforced by `tsc --noEmit`: each `true` is only
  // assignable if the conditional resolves the way its name says.
  const namelessRejected: { value: number } extends RootProps ? false : true = true;
  const ariaLabelAccepted: { value: number; "aria-label": string } extends RootProps
    ? true
    : false = true;
  const ariaLabelledbyAccepted: { value: number; "aria-labelledby": string } extends RootProps
    ? true
    : false = true;
  const ariaHiddenAccepted: { value: number; "aria-hidden": true } extends RootProps
    ? true
    : false = true;

  it("accepts each documented route to a name, and nothing else", () => {
    expect([
      namelessRejected,
      ariaLabelAccepted,
      ariaLabelledbyAccepted,
      ariaHiddenAccepted,
    ]).toEqual([true, true, true, true]);
  });

  it("takes its name from a ProgressBar.Label the caller points it at", () => {
    render(
      <>
        <ProgressBar.Label id="upload-label">Uploading design-system.zip</ProgressBar.Label>
        <ProgressBar value={64} aria-labelledby="upload-label" />
      </>,
    );

    expect(
      screen.getByRole("progressbar", { name: "Uploading design-system.zip" }),
    ).toBeInTheDocument();
  });

  it("still composes the status word with a name that came from a Label", () => {
    render(
      <>
        <ProgressBar.Label id="quota-label">Storage used</ProgressBar.Label>
        <ProgressBar value={96} color="error" aria-labelledby="quota-label" />
      </>,
    );

    const bar = screen.getByRole("progressbar", { name: "Storage used" });
    expect(bar).toHaveAttribute("aria-valuetext", "96%, Error");
  });

  it("a purely decorative bar opts out of the name instead of going unnamed", () => {
    render(<ProgressBar value={64} aria-hidden />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

describe("ProgressBar · classNames slots", () => {
  /**
   * The slot-override test, and the falsifier for its merge: delete the fill's
   * `cn()` and exactly this test must go red.
   */
  it("lands classNames.fill on the fill, beside the base, colour and variant classes", () => {
    const { container } = render(
      <ProgressBar
        value={40}
        color="success"
        variant="striped"
        aria-label="Upload"
        classNames={{ fill: "rounded-none" }}
      />,
    );
    const fill = container.querySelector(".progress-bar__fill");
    expect(fill?.getAttribute("class")).toContain("progress-bar__fill");
    expect(fill?.getAttribute("class")).toContain("progress-bar__fill--success");
    expect(fill?.getAttribute("class")).toContain("progress-bar__fill--striped");
    expect(fill?.getAttribute("class")).toContain("rounded-none");
  });

  /**
   * These used to assert the class attribute equalled its markers exactly, which
   * stopped being expressible once the fill's geometry and motion moved out of
   * `ProgressBar.css` and into utilities. The falsifiers are unchanged and are
   * what the equality was ever standing in for: an absent slot appends NOTHING —
   * no `undefined`, no empty token — and a slot lands on its own element and no
   * other. The *paint* is still asserted exactly, in the describe below.
   */
  it("leaves the fill on its base classes alone when no slot is passed", () => {
    const { container } = render(<ProgressBar value={40} aria-label="Upload" />);
    const classes = container.querySelector(".progress-bar__fill")?.getAttribute("class") ?? "";
    expect(classes.split(" ")).toEqual(
      expect.arrayContaining(["progress-bar__fill", "progress-bar__fill--accent", "bg-accent"]),
    );
    expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
  });

  it("does not put the slot class on the root", () => {
    const { container } = render(
      <ProgressBar value={40} aria-label="Upload" classNames={{ fill: "rounded-none" }} />,
    );
    const root = (container.firstElementChild?.getAttribute("class") ?? "").split(" ");
    expect(root).toEqual(expect.arrayContaining(["progress-bar", "progress-bar--md"]));
    expect(root).not.toContain("rounded-none");
  });

  /**
   * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
   * compile error. It fails if TypeScript ever stops rejecting the key.
   */
  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      <ProgressBar
        value={40}
        aria-label="Upload"
        // @ts-expect-error — the outer groove is `className`, not a slot.
        classNames={{ track: "bg-surface-2" }}
      />,
    );
    const classes = container.querySelector(".progress-bar__fill")?.getAttribute("class") ?? "";
    expect(classes.split(" ")).toContain("progress-bar__fill");
    expect(classes).not.toContain("bg-surface-2");
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = render(
      <ProgressBar value={40} aria-label="Upload" classNames={{ fill: "rounded-none" }} />,
    );
    expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
  });
});

/**
 * `color` used to swap a `--progress-bar-fill` pair declared on the fill itself,
 * which a consumer's `:root` can never outrank — a declaration on the element
 * beats an inherited one whatever the cascade layer. The pair is deleted and the
 * paint is a utility that *reads* `--C-ACCENT`/`--C-STATUS-*` instead.
 *
 * WHAT THESE ASSERT, AND WHAT THEY CANNOT. `vitest` stubs CSS to `""` and jsdom
 * applies no stylesheets, so an exact class string is a test of this component's
 * INPUT to the cascade and never of the computed colour. The computed half was
 * measured once out-of-tree with a real Tailwind build and `getComputedStyle`
 * (the `scripts/probe-cascade-layer.mjs` pattern): `bg-accent` compiles to
 * `background-color: var(--C-ACCENT)` and `bg-status-success` to
 * `var(--C-STATUS-SUCCESS)`, so a `:root` theme reaches the bar. These tests pin
 * that the component keeps emitting the classes that measurement was taken on.
 *
 * Fill class before → after, `variant="default"` (`renderToStaticMarkup`, not
 * retyped): `…--accent` → `…--accent bg-accent`, `…--success` →
 * `…--success bg-status-success`, and likewise `warning`/`error`.
 *
 * THE ASSERTION IS NOW ON THE PAINT, NOT ON THE WHOLE ATTRIBUTE, and that is a
 * strengthening rather than a relaxation. `ProgressBar.css` was reduced to its
 * `@keyframes` block, so the fill also carries its height, radius, transition and
 * reduced-motion utilities — none of which the measurement above was about.
 * `paintTokens()` filters to the `bg-*` group and the expectations below are
 * still exact ARRAYS, so "exactly one background-colour utility" is asserted
 * literally instead of being implied by a string nobody could read.
 */
describe("ProgressBar · colour is a utility, not a shadowing token", () => {
  /** Every class on the fill, as tokens. */
  const fillTokens = () => (getFill().getAttribute("class") ?? "").split(" ");
  /** The fill's paint — the `bg-*` group and nothing else. */
  const paintTokens = () => fillTokens().filter((c) => c.startsWith("bg-"));

  const solid: Array<[NonNullable<ComponentProps<typeof ProgressBar>["color"]>, string, string]> = [
    ["accent", "progress-bar__fill--accent", "bg-accent"],
    ["success", "progress-bar__fill--success", "bg-status-success"],
    ["warning", "progress-bar__fill--warning", "bg-status-warning"],
    ["error", "progress-bar__fill--error", "bg-status-error"],
  ];

  it.each(solid)(
    "color=%s paints with exactly one background-colour utility",
    (color, marker, paint) => {
      render(<ProgressBar value={40} color={color} aria-label="Upload" />);
      expect(fillTokens()).toEqual(expect.arrayContaining(["progress-bar__fill", marker]));
      expect(paintTokens()).toEqual([paint]);
    },
  );

  /**
   * The ramp is `background-image`, a different tailwind-merge group from the
   * colour's `background-color`, so both survive and the image paints over the
   * colour exactly as the two CSS rules did. Each end is written out per colour
   * because the end stop is a `color-mix` of the start and CSS cannot read the
   * element's own resolved `background-color`.
   */
  const gradient: Array<
    [NonNullable<ComponentProps<typeof ProgressBar>["color"]>, string, string]
  > = [
    ["accent", "bg-accent", "bg-[linear-gradient(90deg,var(--C-ACCENT),var(--C-ACCENT-HOVER))]"],
    [
      "success",
      "bg-status-success",
      "bg-[linear-gradient(90deg,var(--C-STATUS-SUCCESS),color-mix(in_oklch,var(--C-STATUS-SUCCESS)_75%,var(--C-CANVAS)))]",
    ],
    [
      "warning",
      "bg-status-warning",
      "bg-[linear-gradient(90deg,var(--C-STATUS-WARNING),color-mix(in_oklch,var(--C-STATUS-WARNING)_75%,var(--C-CANVAS)))]",
    ],
    [
      "error",
      "bg-status-error",
      "bg-[linear-gradient(90deg,var(--C-STATUS-ERROR),color-mix(in_oklch,var(--C-STATUS-ERROR)_75%,var(--C-CANVAS)))]",
    ],
  ];

  it.each(gradient)(
    "variant=gradient color=%s ramps from the colour to its mix",
    (color, paint, ramp) => {
      render(<ProgressBar value={40} color={color} variant="gradient" aria-label="Upload" />);
      expect(fillTokens()).toContain("progress-bar__fill--gradient");
      expect(paintTokens()).toEqual([paint, ramp]);
    },
  );

  /**
   * `striped` carries a texture of its own — a `repeating-linear-gradient(45deg`
   * and the `bg-[length:…]` its keyframes scroll — which used to live in
   * `ProgressBar.css`. What it must NOT carry is the `90deg` ramp, which belongs
   * to `variant="gradient"` alone.
   */
  it("only the gradient variant carries a ramp", () => {
    render(<ProgressBar value={40} color="success" variant="striped" aria-label="Upload" />);
    expect(fillTokens()).toContain("progress-bar__fill--striped");
    expect(paintTokens()).toEqual([
      "bg-status-success",
      "bg-[repeating-linear-gradient(45deg,transparent,transparent_0.5rem,color-mix(in_oklch,var(--C-TEXT-ON-ACCENT)_15%,transparent)_0.5rem,color-mix(in_oklch,var(--C-TEXT-ON-ACCENT)_15%,transparent)_1rem)]",
      "bg-[length:200%_100%]",
    ]);
    expect(paintTokens().filter((c) => c.includes("linear-gradient(90deg"))).toEqual([]);
  });

  /**
   * §12: the modifiers are declaration-free markers now, and a consumer
   * stylesheet, devtools and the Astro/Rails consumers of `response-ui-css` all
   * still target them. `cn()` must not eat them alongside the utility it dedupes.
   */
  it("a caller's classNames.fill beats the colour utility, and the markers survive", () => {
    render(
      <ProgressBar
        value={40}
        color="success"
        aria-label="Upload"
        classNames={{ fill: "bg-status-info" }}
      />,
    );
    expect(fillTokens()).toEqual(
      expect.arrayContaining(["progress-bar__fill", "progress-bar__fill--success"]),
    );
    expect(paintTokens()).toEqual(["bg-status-info"]);
  });

  it("a caller's classNames.fill beats the gradient ramp too", () => {
    render(
      <ProgressBar
        value={40}
        color="success"
        variant="gradient"
        aria-label="Upload"
        classNames={{ fill: "bg-none" }}
      />,
    );
    const cls = getFill().getAttribute("class") ?? "";
    expect(cls).toContain("bg-none");
    expect(cls).not.toContain("linear-gradient");
    expect(cls).toContain("progress-bar__fill--gradient");
  });

  /**
   * NOT ASSERTED HERE, AND THE ATTEMPT IS WORTH RECORDING. The other half of the
   * footgun is a CSS declaration — re-adding `--progress-bar-fill` to
   * `ProgressBar.css` restores an un-themeable route while every assertion above
   * stays green. The obvious guard is `AppShell.test.tsx`'s raw-source read, and
   * it is INERT for a stylesheet: vitest's default `css: false` stubs the module
   * to `""`, so `import.meta.glob("./ProgressBar.css", { query: "?raw" })`, a
   * static `?raw` import and a `*.css` glob all yield the empty string and the
   * assertion passes against a file that still declares it. `node:fs` is not
   * available either — `tsconfig.types` is an allowlist without `@types/node`,
   * and `import.meta.url` is an http URL under jsdom. The instruments that CAN
   * see it are `bun run probe:cascade-layer` and the comment in the stylesheet
   * saying not to.
   */
});
