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

describe("focus recipes", () => {
  it("never keys an affordance on plain `focus:`", () => {
    // Not one rule in the 43 component stylesheets uses plain `:focus`; these are
    // the Tailwind half of the same system and must not reintroduce it.
    for (const [name, recipe] of Object.entries(RECIPES)) {
      expect([name, recipe.match(/(?:^|\s)focus:/g)]).toEqual([name, null]);
    }
  });

  it("answers the ring-offset question exactly once, with 0", () => {
    for (const [name, recipe] of Object.entries(RECIPES)) {
      const offsets = recipe.match(/ring-offset-\d+/g) ?? [];
      expect([name, offsets]).toEqual([name, offsets.map(() => "ring-offset-0")]);
    }
  });

  it("pairs every outline reset with a ring in the same string", () => {
    for (const [name, recipe] of Object.entries(RECIPES)) {
      if (!recipe.includes("outline-none")) continue;
      expect([name, /(?:^|\s)[\w-]*:?ring-border-focus\b/.test(recipe)]).toEqual([name, true]);
    }
  });

  it("uses only design tokens for its colours", () => {
    for (const [name, recipe] of Object.entries(RECIPES)) {
      expect([name, recipe.match(/\[[^\]]*(?:#|\d(?:px|rem))[^\]]*\]/g)]).toEqual([name, null]);
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
