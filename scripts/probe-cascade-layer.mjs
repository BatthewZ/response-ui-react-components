#!/usr/bin/env node
// Computed-style A/B probe for the `@layer components` move (PLAN Phase 1).
//
// WHY THIS EXISTS, AND WHY IT IS NOT A SCREENSHOT TEST
//
// Wrapping this package's component CSS in `@layer components` changes which
// declaration wins wherever an unlayered rule in `@batthewz/response-ui-css` and a
// rule here touch the same property. Today specificity or source order decides and we
// win; afterwards the layer decides and we lose — regardless of specificity.
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
//   - three of the four known regressions have NO possible signal in the gallery,
//     because the gallery is a JS app at one media state
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
  const imports = [...src.matchAll(/@import\s+"(\.\/[^"]+\.css)"\s*;/g)].map((m) => m[1]);
  const componentImports = imports.filter((p) => !p.endsWith("tokens.css"));
  if (componentImports.length < 40) {
    throw new Error(
      `expected ~46 component imports in src/styles.css, found ${componentImports.length} — the parser has drifted`
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

<!-- Timeline: .timeline[data-align=center] .timeline-item:nth-child(even).fade-right
     overrides animation-name against .fade-right, which response-ui-css defines
     UNLAYERED. -->
<div class="timeline" data-align="center">
  <div class="timeline-item fade-right" id="tl-1"></div>
  <div class="timeline-item fade-right" id="tl-2"></div>
  <div class="timeline-item fade-right" id="tl-3"></div>
  <div class="timeline-item fade-right" id="tl-4"></div>
</div>

<!-- Stagger: this package sets --stagger-delay: inherit so an ANCESTOR value
     reaches animation-delay. The foundation re-declares the var on the same
     element. Equal specificity -> source order today. -->
<div id="stagger-host" style="--stagger-delay: 999ms">
  <div class="stagger-item" id="sg-1" style="--stagger-index: 1"></div>
</div>

<!-- Radio: forced-colors replacement outline vs Tailwind's focus:outline-none. -->
<input type="radio" class="radio focus:outline-none" id="rd-1">

<!-- ScrollReveal: @media (scripting: none) { .scroll-reveal-hidden { opacity: 1 } }
     against the foundation's unlayered opacity: 0. -->
<div class="scroll-reveal-hidden" id="sr-1">h1 lives here</div>

<!-- Tabs: .tabs-list::-webkit-scrollbar vs the foundation's UNIVERSAL
     *::-webkit-scrollbar. A property intersection, NOT a class-name overlap —
     which is why a class-name-based search cannot find it. -->
<div class="tabs-list" id="tb-1" style="width:60px"><div style="width:400px">tabs</div></div>

<!-- Switch: a real unlayered focus ring, for the consumer-reset probe. -->
<button class="switch" id="sw-1">switch</button>

<!-- Controls, expected NOT to change. A control that moves means the probe or the
     understanding is wrong. -->
<span class="app-shell-sidebar-link-label sr-only" id="ct-1">label</span>
<div class="masonry-grid"><div class="masonry-grid__item" id="ct-2">a</div></div>

</body></html>
`;

/* ------------------------------------------------------------------ */
/*  3. Probes                                                          */
/* ------------------------------------------------------------------ */

// `expect`: "stable" = this must not change; "regression" = a known/claimed change
// we are measuring. `state` selects the emulated environment.
// `expectBefore` is the PRECONDITION, and it is what makes this probe able to fail.
// If the measured "before" is not this value, the fixture is not reproducing the
// collision and the row is reported INERT — never `unchanged`. A probe that cannot
// detect its own inertness is an instrument that always agrees with you, which is the
// thing this file exists to avoid.
const PROBES = [
  {
    id: "timeline-even-animation",
    state: "default",
    sel: "#tl-2",
    prop: "animation-name",
    expectBefore: "slide-left, fade",
    note: "Timeline alternating entrance direction (#342)",
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
    expectBefore: "3px",
    note: "vs the foundation's universal *::-webkit-scrollbar (0.625rem)",
  },
  {
    id: "tabs-scrollbar-thumb-color",
    state: "default",
    sel: "#tb-1",
    pseudo: "::-webkit-scrollbar-thumb",
    prop: "background-color",
    expectBefore: "rgba(0, 0, 0, 0)",
    note: "thumb should be transparent until hover",
  },
  {
    id: "switch-ring-vs-consumer-reset",
    state: "consumer-reset",
    sel: "#sw-1",
    prop: "outline-width",
    keyboardFocus: true,
    expectBefore: "2px",
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
    id: "control-sronly-padding",
    state: "default",
    sel: "#ct-1",
    prop: "padding-top",
    expectBefore: "0px",
    note: "CONTROL — claimed safe",
  },
];

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

    for (const probe of PROBES.filter((p) => p.state === stateName)) {
      if (probe.focus) await page.evaluate((s) => document.querySelector(s)?.focus(), probe.sel);
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
  console.log("   => Phase 1 must layer the 46 individual imports IN src/styles.css,");
  console.log("      which is the file PLAN §5 rule 10 forbids lanes from touching.\n");
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
  } else if (x === y) {
    verdict = "unchanged";
  } else {
    verdict = "*** REGRESSION ***";
    regressions++;
  }
  console.log(pad(p.id, 36), pad(p.state, 15), pad(x, 20), pad(y, 20), verdict);
  console.log(pad("", 36), `  ${p.note}`);
}

console.log("\n── Summary");
console.log(`   regressions: ${regressions}`);
console.log(`   inert:       ${inert}  <- these measured NOTHING. Never read as safe.`);
console.log(`   verified:    ${PROBES.length - regressions - inert}`);
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
