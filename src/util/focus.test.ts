import { describe, expect, it } from "vitest";

import {
  focusOutlineResetButton,
  focusOutlineResetControl,
  focusRingButton,
  focusRingControl,
  focusRingControlError,
  focusRingGroup,
  focusRingWithin,
  focusRingWithinError,
} from "./focus";

const RECIPES = {
  focusRingButton,
  focusRingControl,
  focusRingControlError,
  focusRingGroup,
  focusRingWithin,
  focusRingWithinError,
};

const RESETS = { focusOutlineResetButton, focusOutlineResetControl };

/**
 * Every expectation below compares against a **literal**, never against a value
 * derived from the recipe under test. An earlier version of this file asserted
 * `offsets` equalled `offsets.map(() => "ring-offset-0")` — true for `[]`, so
 * deleting every `ring-offset-0` kept the suite green.
 *
 * `variant` encodes the partition the library keys its focus affordance on:
 * buttons on `focus-visible`, native form controls on plain `focus`. It is a
 * deliberate split, not drift — a pass that read it as drift unified everything
 * onto `focus-visible` and deleted the docs that said otherwise. Changing a
 * value here is changing that contract, which is the point of spelling each one
 * out rather than deriving it.
 */
const EXPECTED = {
  focusRingButton: { variant: "focus-visible", ring: true, border: false },
  focusRingControl: { variant: "focus", ring: true, border: true },
  focusRingControlError: { variant: "focus", ring: false, border: true },
  focusRingWithin: { variant: "focus-within", ring: true, border: true },
  focusRingWithinError: { variant: "focus-within", ring: false, border: true },
  focusRingGroup: { variant: "group-focus-visible", ring: true, border: false },
} as const;

/** The reset that belongs with each recipe, spelled out rather than derived. */
const EXPECTED_RESETS = {
  focusOutlineResetButton: { literal: "focus-visible:outline-none", pairs: "focusRingButton" },
  focusOutlineResetControl: { literal: "focus:outline-none", pairs: "focusRingControl" },
} as const;

/** Variant segments of a Tailwind class — everything before the final `:`. */
const variantsOf = (cls: string): string[] => cls.split(":").slice(0, -1);

describe("focus recipes", () => {
  it("covers every exported recipe and reset, and none is empty", () => {
    // Guards the whole file: a recipe of "" makes `toContain(recipe)` in the
    // component tests forced-true, so an empty constant must fail loudly here.
    expect(Object.keys(RECIPES).sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(Object.keys(RESETS).sort()).toEqual(Object.keys(EXPECTED_RESETS).sort());
    for (const [name, value] of Object.entries({ ...RECIPES, ...RESETS })) {
      expect([name, value.length > 0]).toEqual([name, true]);
    }
  });

  it("keys the button half on `focus-visible` and the form-control half on `focus`", () => {
    // The partition, asserted as two literal lists. A recipe moving from one
    // list to the other fails here before it can reach a component.
    const byVariant = (want: string) =>
      Object.entries(RECIPES)
        .filter(([, recipe]) => recipe.split(/\s+/).flatMap(variantsOf).includes(want))
        .map(([name]) => name)
        .sort();

    expect(byVariant("focus-visible")).toEqual(["focusRingButton"]);
    expect(byVariant("focus")).toEqual(["focusRingControl", "focusRingControlError"]);
    expect(byVariant("focus-within")).toEqual(["focusRingWithin", "focusRingWithinError"]);
    expect(byVariant("group-focus-visible")).toEqual(["focusRingGroup"]);
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

  it("leaves the outline reset out of every recipe", () => {
    // The reset is a per-component call — `Checkbox`, `Button`, `IconButton` and
    // `Collapsible.Trigger` keep the UA outline alongside the ring — so a recipe
    // that carried one would silently impose it on every consumer.
    for (const [name, recipe] of Object.entries(RECIPES)) {
      expect([name, recipe.includes("outline")]).toEqual([name, false]);
    }
  });

  it("gives each reset the exact spelling of the recipe it pairs with", () => {
    for (const [name, reset] of Object.entries(RESETS)) {
      const want = EXPECTED_RESETS[name as keyof typeof EXPECTED_RESETS];
      expect([name, reset]).toEqual([name, want.literal]);
      // The reset must answer to the same variant as its recipe, or the outline
      // goes on one interaction and the ring arrives on another.
      expect([name, variantsOf(reset)]).toEqual([
        name,
        [EXPECTED[want.pairs].variant],
      ]);
    }
  });

  it("declares a ring and a border swap per the table", () => {
    // Table-driven rather than `if (!x) continue` — a skip would silently stop
    // checking a recipe the moment someone dropped half of it.
    const actual = Object.fromEntries(
      Object.entries(RECIPES).map(([name, recipe]) => [
        name,
        {
          ring: /(?:^|\s)[\w-]*:ring-(?:border-focus|status-error)\b/.test(recipe),
          border: /(?:^|\s)[\w-]*:border-(?:border-focus|status-error)\b/.test(recipe),
        },
      ])
    );
    for (const [name, shape] of Object.entries(actual)) {
      const want = EXPECTED[name as keyof typeof EXPECTED];
      expect([name, shape]).toEqual([name, { ring: true, border: want.border }]);
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
        // Widths (`ring-2`) and the offset (`ring-offset-0`) are not colour
        // positions; each is asserted above.
        .filter((token) => !/^\d+$/.test(token) && !token.startsWith("offset-"));
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

  it("owns the outline reset spelling too", () => {
    // A hand-written `focus:outline-none` would drift from the recipe it sits
    // beside; the reset constants exist so the variant cannot disagree.
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.(?:test|examples)\.tsx$/.test(path))
      .filter(([, source]) => /(?:focus|focus-visible):outline-none/.test(source))
      .map(([path]) => path.replace("../components/", ""));

    expect(offenders).toEqual([]);
  });
});
