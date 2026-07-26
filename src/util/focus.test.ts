import { describe, expect, it } from "vitest";

import {
  focusRing,
  focusRingControl,
  focusRingControlError,
  focusRingGroup,
  focusRingWithin,
  focusRingWithinError,
} from "./focus";

const RECIPES = {
  focusRing,
  focusRingControl,
  focusRingControlError,
  focusRingGroup,
  focusRingWithin,
  focusRingWithinError,
};

/**
 * Every expectation below compares against a **literal**, never against a value
 * derived from the recipe under test. An earlier version of this file asserted
 * `offsets` equalled `offsets.map(() => "ring-offset-0")` — true for `[]`, so
 * deleting every `ring-offset-0` kept the suite green.
 */
const EXPECTED = {
  focusRing: { variant: "focus-visible", ring: true, reset: true, border: false },
  focusRingControl: { variant: "focus-visible", ring: true, reset: true, border: true },
  focusRingControlError: { variant: "focus-visible", ring: false, reset: false, border: true },
  focusRingWithin: { variant: "focus-within", ring: true, reset: false, border: true },
  focusRingWithinError: { variant: "focus-within", ring: false, reset: false, border: true },
  focusRingGroup: { variant: "group-focus-visible", ring: true, reset: false, border: false },
} as const;

/** Variant segments of a Tailwind class — everything before the final `:`. */
const variantsOf = (cls: string): string[] => cls.split(":").slice(0, -1);

describe("focus recipes", () => {
  it("covers every exported recipe, and none is empty", () => {
    // Guards the whole file: a recipe of "" makes `toContain(recipe)` in the
    // component tests forced-true, so an empty constant must fail loudly here.
    expect(Object.keys(RECIPES).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const [name, recipe] of Object.entries(RECIPES)) {
      expect([name, recipe.length > 0]).toEqual([name, true]);
    }
  });

  it("never keys an affordance on plain `focus`", () => {
    // Not one rule in the 43 component stylesheets uses plain `:focus`. Matched
    // per variant segment, so `group-focus:` and `peer-focus:` are caught too —
    // a `/(?:^|\s)focus:/` regex silently misses both.
    for (const [name, recipe] of Object.entries(RECIPES)) {
      const plain = recipe
        .split(/\s+/)
        .flatMap(variantsOf)
        .filter((v) => v === "focus" || v.endsWith("-focus"));
      expect([name, plain]).toEqual([name, []]);
    }
  });

  it("keys every recipe on the one variant it is declared for", () => {
    for (const [name, recipe] of Object.entries(RECIPES)) {
      const variants = [...new Set(recipe.split(/\s+/).flatMap(variantsOf))];
      expect([name, variants]).toEqual([name, [EXPECTED[name as keyof typeof EXPECTED].variant]]);
    }
  });

  it("answers the ring-offset question exactly once, with 0, wherever it paints a ring", () => {
    for (const [name, recipe] of Object.entries(RECIPES)) {
      const { ring } = EXPECTED[name as keyof typeof EXPECTED];
      expect([name, recipe.match(/ring-offset-\d+/g)]).toEqual([
        name,
        ring ? ["ring-offset-0"] : null,
      ]);
      expect([name, recipe.includes("ring-2 ring-transparent")]).toEqual([name, ring]);
    }
  });

  it("pairs an outline reset with a ring, and declares which recipes reset", () => {
    // Table-driven rather than `if (!reset) continue` — a skip would silently
    // stop checking a recipe the moment someone dropped its reset.
    const actual = Object.fromEntries(
      Object.entries(RECIPES).map(([name, recipe]) => [
        name,
        {
          reset: recipe.includes("outline-none"),
          ring: /(?:^|\s)[\w-]*:ring-(?:border-focus|status-error)\b/.test(recipe),
          border: /(?:^|\s)[\w-]*:border-(?:border-focus|status-error)\b/.test(recipe),
        },
      ])
    );
    for (const [name, shape] of Object.entries(actual)) {
      const want = EXPECTED[name as keyof typeof EXPECTED];
      expect([name, shape]).toEqual([name, { reset: want.reset, ring: true, border: want.border }]);
    }
  });

  it("names only contract colour tokens", () => {
    // An allowlist, not a literal-shaped regex: `ring-[rgb(255,0,0)]` and
    // `ring-red-500` both slipped past the previous arbitrary-value pattern.
    const ALLOWED = new Set(["transparent", "border-focus", "status-error"]);
    for (const [name, recipe] of Object.entries(RECIPES)) {
      const colours = recipe
        .split(/\s+/)
        .map((cls) => cls.split(":").at(-1) ?? "")
        .flatMap((util) => /^(?:ring|border|outline)-(.+)$/.exec(util)?.slice(1) ?? [])
        // Widths (`ring-2`), the offset (`ring-offset-0`) and the reset keyword
        // (`outline-none`) are not colour positions; each is asserted above.
        .filter(
          (token) => !/^\d+$/.test(token) && !token.startsWith("offset-") && token !== "none"
        );
      expect([name, colours.filter((c) => !ALLOWED.has(c))]).toEqual([name, []]);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Single source of truth (RC-2/RC-3)                                 */
/* ------------------------------------------------------------------ */

// Vite's raw glob rather than node:fs — `@types/node` is not a dependency and
// `tsconfig.types` is an allowlist, so `readFileSync` would not typecheck.
const sources = import.meta.glob<string>("../components/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
});

/**
 * Tokens that only ever belong to the house focus recipe. A bare
 * `border-status-error` is deliberately absent: Alert and Toast use it for a
 * resting error border that has nothing to do with focus.
 */
const HAND_WRITTEN = /(?:ring|border)-border-focus|ring-status-error/;

describe("focus recipes are the only copy", () => {
  it("is not hand-written in any component", () => {
    const offenders = Object.entries(sources)
      // `.examples.tsx` is consumer-facing demo code, where an explicit override
      // is the point; `.test.tsx` asserts against the rendered string.
      .filter(([path]) => !/\.(?:test|examples)\.tsx$/.test(path))
      .filter(([, source]) => HAND_WRITTEN.test(source))
      .map(([path]) => path.replace("../components/", ""));

    expect(offenders).toEqual([]);
  });
});
