#!/usr/bin/env node
// Computed-style A/B probe for the `@layer components` move (PLAN Phase 1).
//
// WHY THIS EXISTS, AND WHY IT IS NOT A SCREENSHOT TEST
//
// PHASE 1 HAS LANDED: `src/styles.css` carries `layer(components)` on every component
// import, and this script no longer measures a proposal. It builds the SAME source two
// ways — with and without the `layer()` — and asserts that the shipped, layered build
// still computes what the unlayered one did, everywhere the two packages touch the same
// property. The counterfactual is now the "before" side.
//
// Wrapping this package's component CSS in `@layer components` changes which declaration
// wins wherever an unlayered rule in `@batthewz/response-ui-css` and a rule here touch the
// same property: unlayered, specificity or source order decided and we won; layered, the
// layer decides and we lose regardless of specificity. Eight rows measured that. Six were
// fixed by removing the collision or, twice, with a fenced `!important`; two are pinned
// `accepted` deltas. The rows below are what keeps those fixes from silently coming undone.
//
// No existing gate can see that. `vitest` stubs CSS to `""` (`test.css: false`) and
// jsdom applies no stylesheets, so every assertion in this repo is blind to the
// cascade. `verify-focus-affordance.mjs` reads *source pairing* — "an outline reset
// implies a replacement" — so it stays green while the replacement stops painting.
//
// The failures are COMPUTED-STYLE failures, not paint failures. That distinction is
// the whole design: no baseline store, no rasterisation, no sub-pixel flake (see
// `memory/traps.md` on a screenshot run that produced a contradiction from exactly
// that). Two CSS builds differing only by `layer(components)`, one static fixture,
// `getComputedStyle`, and Playwright's own media emulation.
//
// The fixture is hand-written HTML, not React, ON PURPOSE:
//   - deterministic: no IntersectionObserver timing, no hydration, no reveal that
//     fires once and cannot be replayed
//   - it can hold environment states the dev gallery structurally cannot show —
//     `forced-colors: active`, `prefers-reduced-motion: reduce`, `scripting: none`
//   - the environment-dependent regressions have NO possible signal in the gallery,
//     because the gallery is a JS app at one media state
//
// WHAT IT STILL CANNOT SEE, AND WHICH GATE COVERS IT INSTEAD
//   - the JS module graph. This derives its stylesheet list from `src/styles.css` and
//     builds no JS, so a `.css` imported from a `.tsx` — injected UNLAYERED by the
//     bundler, where it beats `@layer components` — is invisible here and the probe goes
//     green with that component still unoverridable. `verify:no-css-imports` is the gate
//     for that; do not read a green run as covering it.
//   - what any React component actually emits. Fixtures are hand-written markup, so a
//     component that starts emitting a foundation class again passes here. The jsdom
//     tests are the gate for that half (`Timeline.test.tsx`, `Stagger.test.tsx`).
//
// WHAT IT CANNOT SEE
//   - anything that is genuinely paint (gradients, blend, sub-pixel geometry)
//   - `::-webkit-scrollbar*`, if the engine declines to report computed styles for
//     those pseudo-elements. The probe reports `unmeasurable` rather than `pass` in
//     that case. NEVER read `unmeasurable` as `safe`.
//
// USAGE
//   node scripts/probe-cascade-layer.mjs            # A/B report, exit 1 on regression
//   node scripts/probe-cascade-layer.mjs --keep     # leave the built CSS for inspection
//
// A probe whose `before` value is already the "broken" value is reported as
// `inert` — it proves the fixture does not reproduce the situation, which is a
// failure OF THE PROBE and is never evidence that the rule is safe.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(ROOT, "scripts", ".cascade-probe");
const KEEP = process.argv.includes("--keep");
const PLAYWRIGHT = join(
  process.env.HOME ?? "",
  ".bun/install/global/node_modules/playwright/index.mjs"
);

/* ------------------------------------------------------------------ */
/*  1. Derive the two CSS entries from src/styles.css                   */
/* ------------------------------------------------------------------ */

// Generated, never hand-maintained: the component import list lives in
// src/styles.css and this reads it, so the probe cannot drift from the package.
function deriveEntries() {
  const src = readFileSync(join(ROOT, "src", "styles.css"), "utf8");
  // The trailing `[^;]*` swallows the `layer(components)` Phase 1 added to every
  // component import. Without it this matches nothing and the guard below fires,
  // which is the intended failure — a silent zero here would build two identical
  // stylesheets and report every row `unchanged`.
  const imports = [...src.matchAll(/@import\s+"(\.\/[^"]+\.css)"[^;]*;/g)].map((m) => m[1]);
  const componentImports = imports.filter((p) => !p.endsWith("tokens.css"));
  if (componentImports.length < 40) {
    throw new Error(
      `expected ~45 component imports in src/styles.css, found ${componentImports.length} — the parser has drifted`
    );
  }

  // The foundation and `tokens.css` stay UNLAYERED in both builds. Phase 1 layers
  // only this package's per-component CSS; `@theme inline` must not be layered.
  // The sibling SOURCE, matching how dev/styles.css wires it, so the probe sees the
  // same unlayered foundation rules a developer does.
  const foundation = rel("../response-ui-css/src/index.css");
  if (!existsSync(foundation)) {
    throw new Error(`foundation css not found at ${foundation}`);
  }
  const head = [`@import "${foundation}";`, `@import "${rel("src/tokens.css")}";`].join("\n");

  const tail = [`@source "${rel("src")}/**/*.{ts,tsx}";`, `@source "./index.html";`].join("\n");

  const body = (layered) =>
    componentImports
      .map((p) => `@import "${rel(join("src", p.replace(/^\.\//, "")))}"${layered ? " layer(components)" : ""};`)
      .join("\n");

  return {
    count: componentImports.length,
    unlayered: `${head}\n${body(false)}\n${tail}\n`,
    layered: `${head}\n${body(true)}\n${tail}\n`,
    // The audit's claim: layering the aggregate import cannot work, because
    // src/styles.css ends in `@source`, which may not be nested inside a layer.
    // Built as a third variant so the claim is measured, not asserted.
    aggregate: `${head}\n@import "${rel("src/styles.css")}" layer(components);\n`,
  };
}

const rel = (p) => join(ROOT, p).replaceAll("\\", "/");

/* ------------------------------------------------------------------ */
/*  2. The fixture                                                     */
/* ------------------------------------------------------------------ */

// Markup mirrors what each component emits, verified against the selectors in the
// corresponding .css. Each block is annotated with the collision it reproduces.
const FIXTURE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>cascade probe</title>
<link rel="stylesheet" href="./probe.css">
</head><body>

<!-- Timeline. Markup mirrors what Timeline.Item emits AFTER Phase 1: no
     foundation .fade-* class, and data-entering from ScrollReveal for the
     entrance window. Timeline.css owns the whole animation shorthand and picks
     the direction from data-align + :nth-child, so nothing in the foundation
     competes and the row is a control that holds.
     Two alignments, because there are TWO direction rules and the probe used to
     cover one: [data-align="right"] needs no media query and no :nth-child,
     so it is the broader of the two and regressed at every viewport width.
     PUT A fade-right CLASS BACK ON EITHER ITEM AND BOTH ROWS GO RED — that is
     the fail-on-purpose for this fix, because it reproduces exactly what
     Timeline.Item emitting a foundation class again would do. -->
<div class="timeline" data-align="center">
  <div class="timeline-item" data-entering id="tl-1"></div>
  <div class="timeline-item" data-entering id="tl-2"></div>
  <div class="timeline-item" data-entering id="tl-3"></div>
  <div class="timeline-item" data-entering id="tl-4"></div>
</div>
<div class="timeline" data-align="right">
  <div class="timeline-item" data-entering id="tr-1"></div>
</div>

<!-- Stagger. Markup mirrors what Stagger.tsx emits AFTER Phase 1: the container
     resolves the step into --_stagger-step and each item carries an inline
     --stagger-delay REFERENCING it. Inline is the only declaration the
     foundation's own .stagger-item { --stagger-delay: … } cannot shadow;
     Stagger.css is deleted, so nothing here duplicates the foundation.
     #sg-1 is the regressing path (an ancestor sets the value); #sg-2 is the
     token default, which is what an invalid var() would silently destroy. -->
<div id="stagger-host" style="--stagger-delay: 999ms">
  <div style="--_stagger-step: var(--stagger-delay, var(--MOTION-STAGGER-DELAY))">
    <div class="stagger-item" id="sg-1" style="--stagger-index: 1; --stagger-delay: var(--_stagger-step)"></div>
  </div>
</div>
<div style="--_stagger-step: var(--stagger-delay, var(--MOTION-STAGGER-DELAY))">
  <div class="stagger-item" id="sg-2" style="--stagger-index: 2; --stagger-delay: var(--_stagger-step)"></div>
</div>

<!-- Radio: forced-colors replacement outline vs the component's own outline
     reset. The reset now carries not-forced-colors:, so in forced colours it
     does not apply and there is nothing to out-rank. Spell it back as plain
     focus:outline-none to redden the row. -->
<input type="radio" class="radio not-forced-colors:focus:outline-none" id="rd-1">

<!-- ScrollReveal: @media (scripting: none) { .scroll-reveal-hidden { opacity: 1 } }
     against the foundation's unlayered opacity: 0. -->
<div class="scroll-reveal-hidden" id="sr-1">h1 lives here</div>

<!-- Tabs: .tabs-list::-webkit-scrollbar vs the foundation's UNIVERSAL
     *::-webkit-scrollbar. A property intersection, NOT a class-name overlap —
     which is why a class-name-based search cannot find it. -->
<div class="tabs-list" id="tb-1" style="width:60px"><div style="width:400px">tabs</div></div>

<!-- Hero: .hero__content .stagger-item sets animation-name at (0,2,0), and
     .hero__content .scroll-reveal-hidden .stagger-item nulls it at (0,3,0).
     The foundation's own .stagger-item ships NO animation-name (it sets only
     animation-delay + fill-mode), so on its own there is nothing to collide
     with. The collision needs a foundation .fade-* class on the ITEM, which is
     what a consumer nesting their own Stagger inside Hero.Content produces —
     Hero.css:88-89 documents exactly that case. .fade-up sets the animation
     shorthand at (0,1,0) unlayered, so today Hero's (0,2,0)/(0,3,0) win on
     specificity and afterwards lose on layer.
     If these rows come back INERT, Hero is NOT a collision site and the claim
     that it is must be withdrawn — that is a result, not a fixture bug. -->
<div class="hero__content">
  <div class="stagger-item fade-up" id="hr-1" style="--stagger-index: 1"></div>
  <div class="scroll-reveal-hidden">
    <div class="stagger-item fade-up" id="hr-2" style="--stagger-index: 1"></div>
  </div>
  <!-- #hr-3 is #hr-2's nesting with the hidden class removed — the steady state
       after first intersection. The guard on #hr-2 is !important, so the pair
       is what proves it is TRANSIENT: without this row the guard could be
       permanently applied and #hr-2 would still pass, having deleted the
       consumer's entrance instead of deferring it. -->
  <div>
    <div class="stagger-item fade-up" id="hr-3" style="--stagger-index: 1"></div>
  </div>
</div>

<!-- Switch: a real unlayered focus ring, for the consumer-reset probe. -->
<button class="switch" id="sw-1">switch</button>

<!-- Controls, expected NOT to change. A control that moves means the probe or the
     understanding is wrong.

     #ct-3/#ct-4 replace an earlier #ct-1 row that measured padding-top on
     .app-shell-sidebar-link-label — an element that DECLARES NO PADDING, so it
     read 0px for a trivial reason and could not have come back red under any
     layering scheme. It was cited as evidence that the sr-only interaction is
     safe, which it never was.

     #ct-3 is the real pairing, in the only markup AppShell can render:
     sr-only is applied iff collapsed (AppShell.tsx:333) and the sidebar
     carries [data-collapsed] iff collapsed (:303), so
     .app-shell-sidebar[data-collapsed] .app-shell-sidebar-section-title at
     (0,3,0) is ALWAYS in play alongside it and has already forced the padding to
     0. It reddens if that rule is deleted as "dead code", or if the TSX coupling
     is broken. #ct-4 is the same declaration unopposed, which proves the
     fixture is wired up at all. -->
<div class="app-shell-sidebar" data-collapsed>
  <h3 class="app-shell-sidebar-section-title sr-only" id="ct-3">section</h3>
</div>
<h3 class="app-shell-sidebar-section-title" id="ct-4">section, no sr-only</h3>
<div class="masonry-grid"><div class="masonry-grid__item" id="ct-2">a</div></div>

</body></html>
`;

/* ------------------------------------------------------------------ */
/*  3. Probes                                                          */
/* ------------------------------------------------------------------ */

// `state` selects the emulated environment.
//
// `expectBefore` is the PRECONDITION, and it is what makes this probe able to fail.
// If the measured "before" is not this value, the fixture is not reproducing the
// collision and the row is reported INERT — never `unchanged`. A probe that cannot
// detect its own inertness is an instrument that always agrees with you, which is the
// thing this file exists to avoid.
//
// `expectAfter` + `accepted` declare a change the OWNER HAS DECIDED TO ACCEPT.
// Without it this probe's only pass state is `before === after`, which means a
// deliberate, signed-off behaviour change leaves a row red for ever and the phase
// gating on "probe green" can never close. Two rules keep this from becoming a
// rubber stamp:
//
//   1. An accepted row STILL FAILS if `after` is not exactly `expectAfter`. It is
//      pinned to one value, not excused from measurement. "We accepted a change
//      here" must never decay into "changes here don't count."
//   2. `accepted` is a sentence naming who decided and what they decided. A row
//      with `expectAfter` and no `accepted` reason is a config error, and the run
//      refuses to start — an unexplained exemption is how a gate stops meaning
//      anything.
const PROBES = [
  {
    id: "timeline-even-animation",
    state: "default",
    sel: "#tl-2",
    prop: "animation-name",
    expectBefore: "slide-left, fade",
    note:
      "Timeline alternating entrance direction (#342), align=center + :nth-child(even). " +
      "Timeline owns the whole shorthand keyed on data-entering, so no foundation rule " +
      "competes and this holds. Add `fade-right` to #tl-2 in the fixture to redden it.",
  },
  {
    id: "timeline-right-animation",
    state: "default",
    sel: "#tr-1",
    prop: "animation-name",
    expectBefore: "slide-left, fade",
    note:
      "The BROADER of Timeline's two direction rules: align=right needs no media query " +
      "and no :nth-child, so it regressed at every width and on every item. The probe " +
      "had no fixture for it — a row list is an allowlist.",
  },
  {
    id: "timeline-odd-animation",
    state: "default",
    sel: "#tl-1",
    prop: "animation-name",
    expectBefore: "slide-right, fade",
    note:
      "The BASE entrance direction — a card right of the rail travels rightward, away from it " +
      "(`slide-right` starts at translateX(-30%), so the name is the travel, not the edge). It used to " +
      "come from the foundation's .fade-right class; Timeline now declares it. Pinned because " +
      "the two direction overrides only set `animation-name`, so deleting the base shorthand " +
      "would leave them reading the right name with no duration and nothing would move.",
  },
  {
    id: "timeline-entrance-duration",
    state: "default",
    sel: "#tl-2",
    prop: "animation-duration",
    expectBefore: "0.3s, 0.3s",
    note:
      "CONTROL — the timing half of the shorthand Timeline took over, still read from " +
      "--MOTION-DURATION-ENTER. Two entries because the shorthand declares two animations. " +
      "Asserts that re-stating the contract tokens actually reproduces what .fade-right gave.",
  },
  {
    id: "timeline-entrance-reduced-motion",
    state: "reduced-motion",
    sel: "#tr-1",
    prop: "animation-name",
    expectBefore: "none",
    note:
      "CONTROL — the entrance rules are wrapped in `no-preference`, so under `reduce` " +
      "Timeline declares no animation at all. Timeline used to inherit this guard from " +
      "the foundation's .fade-* reduced-motion rule; owning the shorthand means owning " +
      "the guard too, and this asserts it rather than assuming it.",
  },
  {
    id: "stagger-ancestor-inherit",
    state: "default",
    sel: "#sg-1",
    prop: "animation-delay",
    expectBefore: "0.999s",
    note: "ancestor --stagger-delay (999ms) must reach animation-delay",
  },
  {
    id: "stagger-token-default",
    state: "default",
    sel: "#sg-2",
    prop: "animation-delay",
    expectBefore: "0.1s",
    note:
      "CONTROL — nobody sets --stagger-delay, so the contract token default " +
      "(--MOTION-STAGGER-DELAY, 50ms) x index 2 must survive. This is the row a fixture " +
      "error would silently pass: the whole risk of carrying the fallback inside the " +
      "var() reference is that an invalid var() invalidates the foundation's calc() and " +
      "50ms becomes 0ms with nothing to show for it.",
  },
  {
    id: "radio-forced-colors-focus-outline",
    state: "forced-colors",
    sel: "#rd-1",
    prop: "outline-width",
    focus: true,
    expectBefore: "2px",
    note: "WCAG 2.4.7 — the only affordance that survives forced colours",
  },
  {
    id: "scrollreveal-no-js-opacity",
    state: "scripting-none",
    sel: "#sr-1",
    prop: "opacity",
    expectBefore: "1",
    note: "content permanently invisible with scripting off",
  },
  {
    id: "tabs-scrollbar-height",
    state: "default",
    sel: "#tb-1",
    pseudo: "::-webkit-scrollbar",
    prop: "height",
    expectBefore: "10px",
    note:
      "CONTROL, and it used to be a regression. Tabs' 3px hairline could not win from " +
      "@layer components against the foundation's universal *::-webkit-scrollbar, and " +
      "defending it would have needed !important on a pseudo-element — which closes the " +
      "override route completely, with not even an inline style left. The rule was " +
      "DELETED instead: the foundation owns scrollbar appearance app-wide, and Tabs' real " +
      "overflow affordance is the mask gradient. Both builds now read the foundation's " +
      "0.625rem. Re-add a Tabs ::-webkit-scrollbar height rule and this row stops holding.",
  },
  {
    id: "tabs-scrollbar-thumb-color",
    state: "default",
    sel: "#tb-1",
    pseudo: "::-webkit-scrollbar-thumb",
    prop: "background-color",
    expectBefore: "oklch(0.9276 0.0058 264.53)",
    note:
      "CONTROL, same deletion as the row above — the resting `transparent` thumb is gone " +
      "and both builds read the foundation's --C-BORDER-DEFAULT. THEME-DEPENDENT VALUE: " +
      "it is pinned as a literal, so a palette retune re-pins it (and reports INERT, not " +
      "a silent pass, in the meantime).",
  },
  {
    id: "tabs-thumb-hover-inert",
    state: "default",
    sel: "#tb-1",
    pseudo: "::-webkit-scrollbar-thumb",
    prop: "background-color",
    hover: "#tb-1",
    expectBefore: "oklch(0.6446 0.0093 258.34)",
    note:
      "CONTROL — the third deleted declaration, and the one that was worst. Tabs' " +
      "`:hover` thumb colour could not win in EITHER hover state after layering: over " +
      "the track the foundation's base rule supplies the identical colour, over the thumb " +
      "its own :hover rule supplies --C-BORDER-STRONG. A rule inert in every state is the " +
      "shape that gets cited as safe. Forcing :hover on the host satisfies both " +
      "selectors, so this pins the THUMB-hover reading (--C-BORDER-STRONG). " +
      "Theme-dependent, like the row above.",
  },
  {
    id: "hero-stagger-animation-name",
    state: "default",
    sel: "#hr-1",
    prop: "animation-name",
    expectBefore: "fade",
    expectAfter: "slide-up, fade",
    accepted:
      "OWNER DECISION: this row measures a CONSUMER's explicit foundation `.fade-*` " +
      "class on a `.stagger-item` inside `.hero__content` beating Hero's own " +
      "`animation-name: fade`. Nothing this package renders can produce that markup — " +
      "`Stagger.tsx` writes a bare className=\"stagger-item\" with no merge and no " +
      "parameter, so no React API here can put a class on that element, and `Hero.tsx` " +
      "puts `.fade-*` on the ScrollReveal wrapper, never on an item. The colliding class " +
      "is therefore hand-authored, and after Phase 1 the author's own class wins — which " +
      "is exactly the override Phase 1 exists to deliver (PLAN §1). Hero's plain fade is " +
      "an aesthetic default, not a correctness guard, so it is right for an explicit " +
      "instruction to beat it. Scope of this decision is EXACTLY this row. It does NOT " +
      "cover `hero-reveal-hidden-animation-none`, which is a guard rather than an opinion " +
      "and is a must-fix. FORWARD DEPENDENCY, AND IT IS LOAD-BEARING: the premise is " +
      "\"nothing this package renders can produce that markup\". The moment Phase 3 gives " +
      "`Stagger` a `classNames.item`, this package CAN put a class on a `.stagger-item` " +
      "and the premise stops holding. Revisit this row in the same commit that ships it — " +
      "do not carry the acceptance across that change unexamined.",
    note: "Hero.css vs a foundation .fade-up on the same item — accepted, not fixed",
  },
  {
    id: "hero-reveal-hidden-animation-none",
    state: "default",
    sel: "#hr-2",
    prop: "animation-name",
    expectBefore: "none",
    note:
      "Hero nulls the entrance while the reveal is still hidden — a TIMING GUARD, not " +
      "an opinion, which is why it takes an `!important` and the row above is accepted " +
      "instead. INVARIANT TO PRESERVE: the rule keys off the ABSENCE of the reveal's " +
      "hidden class, never the presence of its entrance class, because the entrance " +
      "class is dropped on `animationend` and would cut a later item off mid-flight " +
      "while the hidden class is removed once and stays removed. A future " +
      "'simplification' that re-keys it onto the entrance class must fail here rather " +
      "than pass review. Delete the `!important` from Hero.css to redden it.",
  },
  {
    id: "hero-reveal-shown-animation-name",
    state: "default",
    sel: "#hr-3",
    prop: "animation-name",
    expectBefore: "fade",
    expectAfter: "slide-up, fade",
    accepted:
      "OWNER DECISION: the other half of the same contract as " +
      "`hero-stagger-animation-name`, and accepted for the same reason and with the same " +
      "scope. Same markup as `#hr-2` but with the reveal's hidden class removed, i.e. " +
      "the steady state after first intersection. Together the two rows state the whole " +
      "contract: THE CONSUMER PICKS THE ENTRANCE, HERO PICKS WHEN IT PLAYS. Without this " +
      "row the pair can drift into disagreeing — `hero-reveal-hidden-animation-none` " +
      "would still pass with the guard permanently applied, which would delete the " +
      "consumer's entrance entirely rather than deferring it.",
    note: "the guarded item once the reveal has fired — the consumer's class must run then",
  },
  {
    id: "switch-ring-vs-consumer-reset",
    state: "consumer-reset",
    sel: "#sw-1",
    prop: "outline-width",
    keyboardFocus: true,
    expectBefore: "2px",
    expectAfter: "0px",
    accepted:
      "OWNER DECISION: focus rings move into @layer components with everything " +
      "else. A consumer's unlayered *:focus{outline:none} is allowed to win — " +
      "writing that reset is an opt-out of focus visibility, and the package " +
      "does not fight it with a precedence carve-out. Scope of this decision is " +
      "EXACTLY this row: a CONSUMER-authored reset beating our ring. It does " +
      "NOT cover radio-forced-colors-focus-outline, which is our own " +
      "focus:outline-none utility beating our own rule and is a must-fix.",
    note: "does an unlayered consumer *:focus{outline:none} now beat our ring",
  },
  {
    id: "switch-ring-baseline",
    state: "default",
    sel: "#sw-1",
    prop: "outline-width",
    keyboardFocus: true,
    expectBefore: "2px",
    note: "CONTROL for the row above — the ring with no consumer reset present",
  },
  {
    id: "control-sronly-sectiontitle-padding",
    state: "default",
    sel: "#ct-3",
    prop: "padding-left",
    expectBefore: "0px",
    note:
      "CONTROL WITH TEETH, and the replacement for a row that had none. AppShell.css's " +
      ".app-shell-sidebar-section-title padding (0,1,0) vs Tailwind's .sr-only (0,1,0) in " +
      "@layer utilities is a genuine in-package inversion that Phase 1 flips — but it has " +
      "no reachable observable, because the [data-collapsed] rule at (0,3,0) has already " +
      "forced the padding to 0 in the only state AppShell renders (sr-only implies " +
      "[data-collapsed] — AppShell.tsx:303,333). This pins THAT. It reddens if the " +
      "[data-collapsed] rule is removed as dead code, or if the TSX coupling changes. " +
      "Deliberately not an expectAfter row: nothing user-visible moves, and pinning an " +
      "unreachable state would be a gate asserting behaviour that does not exist.",
  },
  {
    id: "control-sectiontitle-padding-unopposed",
    state: "default",
    sel: "#ct-4",
    prop: "padding-left",
    expectBefore: "12px",
    note:
      "CONTROL — the same declaration with no .sr-only present, so it is unopposed in " +
      "both builds. Proves the declaration is live and the fixture is wired up. If this " +
      "moves, the fixture or the understanding is wrong, not the layering.",
  },
];

// Rule 2 from the PROBES header, enforced rather than documented: an accepted
// delta without a stated reason is refused. Cheap to write, and it is the only
// thing standing between "the owner decided this" and "someone silenced a row".
for (const p of PROBES) {
  if (p.expectAfter !== undefined && !p.accepted) {
    console.error(
      `probe "${p.id}" declares expectAfter but no \`accepted\` reason.\n` +
        "An accepted delta must name who decided and what they decided, or the\n" +
        "exemption is indistinguishable from a silenced regression."
    );
    process.exit(2);
  }
  if (p.expectAfter !== undefined && p.expectAfter === p.expectBefore) {
    console.error(
      `probe "${p.id}" has expectAfter === expectBefore. Drop expectAfter — a row\n` +
        "that is not expected to change is an ordinary stable row, and dressing it\n" +
        "as an accepted delta hides that it is being asserted at all."
    );
    process.exit(2);
  }
}

// Every state pins `reducedMotion` explicitly. Headless Chromium reports
// `prefers-reduced-motion: reduce` BY DEFAULT — which silently nulled every
// animation in the first run of this probe and made all nine rows agree. Leaving it
// unset is not "no preference", it is the opposite of what a developer sees.
const STATES = {
  default: { reducedMotion: "no-preference" },
  "forced-colors": { reducedMotion: "no-preference", forcedColors: "active" },
  "reduced-motion": { reducedMotion: "reduce" },
  // Playwright has no `scripting` option; CDP does, and using it keeps page JS
  // alive so getComputedStyle still works. Disabling JS outright would make the
  // measurement impossible, not just the page inert.
  // `scripting: none` is NOT in CDP's emulable media feature set — passing it via
  // Emulation.setEmulatedMedia silently does nothing, which showed up here as an
  // INERT row rather than a false pass. The only honest way to make the query match
  // is to actually disable JS, and then `page.evaluate` is unavailable — so this
  // state reads computed styles over CDP (`CSS.getComputedStyleForNode`) instead,
  // which does not need page script.
  "scripting-none": { reducedMotion: "no-preference", javaScriptEnabled: false, __noJs: true },
  // An unlayered consumer reset, which is what a real app actually ships. No
  // `!important` — the point is to test the CASCADE, and `!important` would win in
  // both builds and prove nothing.
  "consumer-reset": {
    reducedMotion: "no-preference",
    __consumerCss: "*:focus,*:focus-visible{outline:none}",
  },
};

/* ------------------------------------------------------------------ */
/*  4. Build                                                           */
/* ------------------------------------------------------------------ */

function build(variant, css) {
  const dir = join(WORK, variant);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "probe.css"), css);
  writeFileSync(join(dir, "index.html"), FIXTURE);
  writeFileSync(
    join(dir, "vite.config.mjs"),
    // `base: "./"` is load-bearing: vite's default "/" emits absolute asset paths,
    // which resolve to the filesystem root under `file://`, so the stylesheet never
    // loads and every measurement silently reads an UNSTYLED page. That produced a
    // fully green first run of this probe.
    `import tailwindcss from "@tailwindcss/vite";\nexport default { root: ${JSON.stringify(dir)}, base: "./", plugins: [tailwindcss()], build: { outDir: "dist", emptyOutDir: true } };\n`
  );
  try {
    execFileSync(process.execPath, [join(ROOT, "node_modules", "vite", "bin", "vite.js"), "build", "--config", join(dir, "vite.config.mjs")], {
      cwd: dir,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (e) {
    return { ok: false, error: (e.stderr || e.stdout || e.message).toString().slice(0, 600) };
  }
  return { ok: true, dir: join(dir, "dist") };
}

/* ------------------------------------------------------------------ */
/*  5. Measure                                                         */
/* ------------------------------------------------------------------ */

// Vite emits `<link crossorigin>`, and CORS blocks a crossorigin stylesheet over
// `file://` — which is how this probe first came up green against an unstyled page.
// Serving over HTTP removes that whole family of quirks rather than working around
// one of them.
function serve(dir) {
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
  const server = createServer((req, res) => {
    const path = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!path.startsWith(dir) || !existsSync(path)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(readFileSync(path));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ url: `http://127.0.0.1:${server.address().port}/index.html`, close: () => server.close() })
    );
  });
}

/**
 * Force (or clear) `:hover` on one element, over CDP. See the call site.
 *
 * Takes the session rather than making one, because it must be the SAME session
 * for the set and the clear and must not be detached in between: detaching drops
 * the forced state immediately, so a set-detach-read sequence reads the
 * unhovered value and the row goes inert while looking like a measurement.
 * Verified by making a hover rule with a distinctive colour show up under this
 * path and not under the detaching one.
 */
async function forceHover(cdp, selector, on) {
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) throw new Error(`hover target "${selector}" not found in the fixture`);
  await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: on ? ["hover"] : [] });
}

async function measure(chromium, htmlDir) {
  const out = {};
  const site = await serve(htmlDir);
  const browser = await chromium.launch();
  for (const [stateName, cfg] of Object.entries(STATES)) {
    const used = PROBES.some((p) => p.state === stateName);
    if (!used) continue;
    const { __cdpMedia, __consumerCss, __noJs, ...ctxOpts } = cfg;
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    if (__cdpMedia) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", { features: __cdpMedia });
    }
    await page.goto(site.url);

    if (__noJs) {
      // No page script available: drive DOM/CSS over the protocol.
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
      const read = async (selector, prop) => {
        const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
        if (!nodeId) return "__NO_ELEMENT__";
        const { computedStyle } = await cdp.send("CSS.getComputedStyleForNode", { nodeId });
        const hit = computedStyle.find((e) => e.name === prop);
        return hit && hit.value !== "" ? hit.value.trim() : "__UNMEASURABLE__";
      };
      // Same stylesheet-load self-check, protocol edition.
      const token = await read("html", "--C-BORDER-FOCUS");
      if (token === "__UNMEASURABLE__" || token === "__NO_ELEMENT__") {
        throw new Error(`stylesheet did not load for state "${stateName}" (no-JS path)`);
      }
      for (const probe of PROBES.filter((p) => p.state === stateName)) {
        out[probe.id] = await read(probe.sel, probe.prop);
      }
      await ctx.close();
      continue;
    }
    // Self-check: if the stylesheet did not load, every reading below is a UA
    // default and the whole run is worthless. Fail loudly rather than green.
    const loaded = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--C-BORDER-FOCUS").trim()
    );
    if (!loaded) {
      throw new Error(
        `stylesheet did not load for state "${stateName}" (--C-BORDER-FOCUS is empty). ` +
          `Every measurement would be a UA default. Check vite \`base\` and the <link> href.`
      );
    }
    if (__consumerCss) await page.addStyleTag({ content: __consumerCss });

    // One CDP session per page, created on first use and kept alive — see
    // `forceHover`.
    let hoverCdp = null;
    const hoverSession = async () => {
      if (!hoverCdp) {
        hoverCdp = await ctx.newCDPSession(page);
        await hoverCdp.send("DOM.enable");
        await hoverCdp.send("CSS.enable");
      }
      return hoverCdp;
    };

    for (const probe of PROBES.filter((p) => p.state === stateName)) {
      if (probe.focus) await page.evaluate((s) => document.querySelector(s)?.focus(), probe.sel);
      // `hover` forces `:hover` on an element over the devtools protocol rather
      // than moving the mouse. A real pointer move was tried first and is not
      // usable: whether it lands on the scroll track, the thumb or the content
      // depends on the box's height, which the very rule under test changes — so
      // the two builds would be measured in different states. `forcePseudoState`
      // is deterministic and applies to both.
      //
      // The limit it does NOT remove, and which decides what a hovered scrollbar
      // row is pinning: forcing `:hover` on the HOST satisfies both
      // `.host:hover::-webkit-scrollbar-thumb` and `*::-webkit-scrollbar-thumb:hover`,
      // so a row using this must say in its note which of the two it means.
      if (probe.hover) await forceHover(await hoverSession(), probe.hover, true);
      if (probe.keyboardFocus) {
        // `:focus-visible` needs the engine's last-interaction heuristic to say
        // "keyboard". A bare .focus() does not satisfy it on a <button>, so press a
        // key first, THEN move focus programmatically.
        await page.keyboard.press("Tab");
        await page.evaluate((s) => document.querySelector(s)?.focus(), probe.sel);
      }
      out[probe.id] = await page.evaluate(
        ({ sel, pseudo, prop }) => {
          const el = document.querySelector(sel);
          if (!el) return "__NO_ELEMENT__";
          const cs = getComputedStyle(el, pseudo || undefined);
          const v = cs.getPropertyValue(prop);
          return v === "" ? "__UNMEASURABLE__" : v.trim();
        },
        { sel: probe.sel, pseudo: probe.pseudo ?? null, prop: probe.prop }
      );
      // Forced states are sticky, so leaving one set would silently apply it to
      // every later row measured in the same page.
      if (probe.hover) await forceHover(await hoverSession(), probe.hover, false);
    }
    await ctx.close();
  }
  await browser.close();
  site.close();
  return out;
}

/* ------------------------------------------------------------------ */
/*  6. Run                                                             */
/* ------------------------------------------------------------------ */

if (!existsSync(PLAYWRIGHT)) {
  console.error(`playwright not found at ${PLAYWRIGHT}\nInstall it, or point PLAYWRIGHT at your copy.`);
  process.exit(2);
}
const { chromium } = await import(PLAYWRIGHT);

rmSync(WORK, { recursive: true, force: true });
const entries = deriveEntries();
console.log(`derived ${entries.count} component imports from src/styles.css\n`);

// Measure the audit's compile claim rather than repeating it.
const agg = build("aggregate", entries.aggregate);
console.log("── Can Phase 1 be done with one `layer()` on the aggregate import?");
if (agg.ok) {
  console.log("   YES — @import \"styles.css\" layer(components) compiled.\n");
} else {
  const nested = /@source|cannot be nested|not allowed/i.test(agg.error);
  console.log(`   NO — build failed${nested ? " (matches the `@source` nesting claim)" : " — CAUSE NOT CONFIRMED as @source nesting"}.`);
  console.log(
    "   " +
      agg.error
        .split("\n")
        .filter((l) => l.trim() && !/^\s*at /.test(l))
        .slice(0, 6)
        .join("\n   ")
  );
  console.log("   => which is why the individual imports IN src/styles.css each carry it,");
  console.log("      and why that file is owned by one commit rather than by lanes.\n");
}

const a = build("unlayered", entries.unlayered);
const b = build("layered", entries.layered);
for (const [n, r] of [["unlayered", a], ["layered", b]]) {
  if (!r.ok) {
    console.error(`FATAL: ${n} build failed:\n${r.error}`);
    process.exit(2);
  }
}

const before = await measure(chromium, a.dir);
const after = await measure(chromium, b.dir);

let regressions = 0;
let inert = 0;
let accepted = 0;

console.log("── A/B computed style, unlayered → @layer components\n");
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("probe", 36), pad("state", 15), pad("before", 20), pad("after", 20), "verdict");
console.log("-".repeat(116));
for (const p of PROBES) {
  const x = before[p.id];
  const y = after[p.id];
  let verdict;
  if (x === "__NO_ELEMENT__" || y === "__NO_ELEMENT__") {
    verdict = "INERT — no element";
    inert++;
  } else if (x === "__UNMEASURABLE__" || y === "__UNMEASURABLE__") {
    verdict = "INERT — engine reports nothing";
    inert++;
  } else if (x !== p.expectBefore) {
    // The precondition failed: whatever this row measured, it is not the collision.
    verdict = `INERT — expected before=${p.expectBefore}`;
    inert++;
  } else if (p.expectAfter !== undefined) {
    // An owner-accepted change. Still pinned to one value — see rule 1 in the
    // PROBES header. Drifting off it is a regression like any other.
    if (y === p.expectAfter) {
      verdict = "accepted (owner decision)";
      accepted++;
    } else {
      verdict = `*** ACCEPTED-DELTA DRIFT *** expected after=${p.expectAfter}`;
      regressions++;
    }
  } else if (x === y) {
    verdict = "unchanged";
  } else {
    verdict = "*** REGRESSION ***";
    regressions++;
  }
  console.log(pad(p.id, 36), pad(p.state, 15), pad(x, 20), pad(y, 20), verdict);
  console.log(pad("", 36), `  ${p.note}`);
  if (p.accepted) console.log(pad("", 36), `  ACCEPTED: ${p.accepted}`);
}

console.log("\n── Summary");
console.log(`   regressions: ${regressions}`);
console.log(`   inert:       ${inert}  <- these measured NOTHING. Never read as safe.`);
console.log(`   accepted:    ${accepted}  <- CHANGED, and signed off. Not "safe" — decided.`);
console.log(`   verified:    ${PROBES.length - regressions - inert - accepted}`);
if (inert > 0) {
  console.log(
    "\n   An inert row is a failure OF THE PROBE. Fix the fixture before drawing any\n" +
      "   conclusion about Phase 1 from this run."
  );
}
if (!KEEP) rmSync(WORK, { recursive: true, force: true });
else console.log(`\n   builds kept at ${WORK}`);

// Inert rows fail the run too: a green probe that measured nothing is worse than a
// red one, because it will be cited.
process.exit(regressions > 0 || inert > 0 ? 1 : 0);
