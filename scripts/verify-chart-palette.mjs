#!/usr/bin/env node
// Asserts the 5-hue chart palette stays tellable apart across the default theme
// and the worked examples.
//
// WHAT "THEME" MEANS HERE. `default` is the design system's only theme; the other
// three are worked examples in `@batthewz/response-ui-css/examples/themes/`, which
// no entry imports. They are measured because they are the only concrete themes
// available to measure — they are a regression corpus, not a supported set, and
// deleting one should mean deleting its row here, not preserving it.
//
// Their `--C-CHART-*` overrides live in `src/examples/example-theme-tuning.css`,
// which `styles.css` deliberately does not import. This gate reads that file for
// the example rows ONLY. A consumer theme gets the aliases and nothing else,
// which is the same deal — see the `default` row and the header below.
//
// WHY THIS EXISTS, AND WHY IT IS NOT A UNIT TEST
//
// `--C-CHART-1..5` in `src/tokens.css` encode one requirement no type and no vitest
// run can express: five series rendered side by side must be distinguishable. Three
// of the five now alias the contract (`--C-ACCENT`, `--C-STATUS-SUCCESS`,
// `--C-STATUS-WARNING`) so a theme retune carries the chart with it — which means a
// palette change in `@batthewz/response-ui-css`, a package this one does not own, can
// silently collapse two series into one colour. Nothing else in this repo would notice:
// vitest runs with `css: false`, so no test here can read a stylesheet at all.
//
// The alias is deliberately PARTIAL, and the partition is what this gate protects:
//
//   1 → --C-ACCENT            2 → --C-STATUS-SUCCESS      3 → --C-STATUS-WARNING
//   4, 5 → literal            (no contract twin; see below)
//
// Aliasing 4 and 5 as well is the tempting unification and it is measurably wrong. The
// obvious candidate for chart-4 is `--C-STATUS-INFO`, and the DEFAULT theme sets
// `--C-STATUS-INFO` byte-identical to `--C-ACCENT` — so `--C-CHART-4: var(--C-STATUS-INFO)`
// puts chart-1 and chart-4 at distance 0.000 there. Measured, by making that exact edit
// and watching this gate go red.
//
// The same trap is why `tech` and `grimdark` keep a full literal override rather than
// inheriting the three aliases: `tech` sets `--C-ACCENT` and `--C-STATUS-SUCCESS` to the
// same neon green, so deleting its override collapses chart-1/chart-2 to 0.000. Also
// measured. A dark theme additionally needs the whole ramp lifted to ~0.65-0.78 lightness
// (docs/theme-contract.md), which the contract's ink values do not supply.
//
// Note what chart-4's literal purple actually is: `events` sets `--C-STATUS-INFO` AND
// `--C-PRIMARY` to that same value. It is a shared hue, not a duplicated token — which is
// why chart-4 is left as a literal instead of being pointed at either of them.
//
// WHAT IT MEASURES
//
// Euclidean distance in OKLab between every pair of resolved chart colours, per theme.
// OKLab is near-perceptually-uniform, so one scalar covers lightness, chroma and hue
// together — a pair that differs only in hue and a pair that differs only in lightness
// are compared on the same scale, which a hue-delta check could not do.
//
// FLOOR is a COLLAPSE guard, not a quality bar. Say so plainly: the palette as shipped
// already contains marginal pairs (blue chart-1 against purple chart-4 sits at ~0.11-0.12
// in every theme, and `tech` puts chart-1 against chart-5 at ~0.10). Those predate the
// aliasing and this gate does not fail them — raising the floor to a genuine
// categorical-encoding threshold would fail the palette on day one and be turned off.
// The floor sits just below the shipped worst case so that any NEW edit which makes two
// series meaningfully closer — and a fold-into-one in particular — fails loudly.
//
// WHAT IT DOES NOT COVER, stated so the blind spot is not silent:
// - Contrast of a series against the surface it is drawn on. Different question.
// - Colour-vision deficiency. Two colours can clear FLOOR and be indistinguishable to a
//   deuteranope; the chart palette carries no non-colour channel and that is a real open
//   gap, not something this gate closes.
// - Consumer themes. It reads the four themes this design system ships. A consumer that
//   overrides `--C-ACCENT` can still collide, which is exactly why 4 and 5 stay literal.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, "..");
const CSS_PKG = resolve(PKG, "node_modules/@batthewz/response-ui-css/src");
const CHECK = process.argv.includes("--check");

/** Just below the worst case measured here (~0.104, the `tech` example, chart-1/chart-5). */
const FLOOR = 0.09;

const EXAMPLES = `${CSS_PKG}/examples/themes`;

const THEMES = [
  { name: "default", files: [`${CSS_PKG}/tokens/colors.css`], selector: ":root" },
  { name: "events", files: [`${CSS_PKG}/tokens/colors.css`, `${EXAMPLES}/events.css`] },
  { name: "grimdark", files: [`${CSS_PKG}/tokens/colors.css`, `${EXAMPLES}/grimdark.css`] },
  { name: "tech", files: [`${CSS_PKG}/tokens/colors.css`, `${EXAMPLES}/tech.css`] },
];

/**
 * Collect `--TOKEN: value` declarations. Blocks are read in source order and later
 * wins, which mirrors the cascade for the flat, single-specificity `:root` /
 * `:root[data-theme]` rules these files are made of. `themeFilter` keeps only the
 * blocks that apply to the theme being resolved.
 */
function collectTokens(css, themeFilter) {
  const tokens = new Map();
  // Strip comments and statement at-rules (`@import url(…);`) BEFORE splitting into
  // blocks. Both sit between `}` and the next `{`, so leaving them in makes them part
  // of the captured selector — an `@import` above a rule would push the selector to
  // start with "@" and get it skipped, silently dropping every token in that file.
  // The example theme files carry no `@import` today (their fonts live in sibling
  // `-fonts.css` files), so this is defensive rather than currently load-bearing —
  // but a consumer theme handed to this parser may, and the failure is silent.
  // `@import` is stripped to end-of-line, NOT to the first `;`: a Google Fonts URL
  // contains semicolons inside the weight list (`wght@300;400;500`), so a `[^;]*`
  // match leaves `400;500…");` behind, which then lands in the next selector.
  const cleaned = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*@(?:import|charset)[^\n]*$/gim, "");
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, rawSelector, body] of cleaned.matchAll(blockRe)) {
    const selector = rawSelector.trim();
    if (!themeFilter(selector)) continue;
    for (const [, name, value] of body.matchAll(/(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(name, value.trim());
    }
  }
  return tokens;
}

/** Resolve `var(--X)` / `var(--X, fallback)` chains against a token map. */
function resolveVar(value, tokens, seen = new Set()) {
  const m = /^var\(\s*(--[A-Za-z0-9-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(value.trim());
  if (!m) return value.trim();
  const [, name, fallback] = m;
  if (seen.has(name)) throw new Error(`circular var chain at ${name}`);
  seen.add(name);
  const next = tokens.get(name) ?? fallback;
  if (next === undefined) throw new Error(`unresolved ${name}`);
  return resolveVar(next, tokens, seen);
}

/** oklch(L C H) → OKLab [L, a, b]. Only the form this design system writes. */
function parseOklch(value) {
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value.trim());
  if (!m) throw new Error(`not a plain oklch() value: ${value}`);
  const [L, C, h] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const rad = (h * Math.PI) / 180;
  return [L, C * Math.cos(rad), C * Math.sin(rad)];
}

const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

let failedSetup = false;
const skipped = [];

const ownTokens = readFileSync(`${PKG}/src/tokens.css`, "utf8");
// Opt-in tuning for the example themes. `src/tokens.css` names no theme, so
// without this the example rows would measure only the aliases — which is exactly
// what a consumer theme gets, and is reported separately below.
const exampleTuning = existsSync(`${PKG}/src/examples/example-theme-tuning.css`)
  ? readFileSync(`${PKG}/src/examples/example-theme-tuning.css`, "utf8")
  : "";

// An example theme that is not installed is SKIPPED, not a failure. The examples are
// sample code: deleting one must not break this package's publish gate, or they are
// load-bearing again — on a gate rather than on a page, but load-bearing all the same.
// `default` is the exception: it is the design system's own theme and its absence is real.
const available = THEMES.filter((t) => {
  const missing = t.files.filter((f) => !existsSync(f));
  if (!missing.length) return true;
  if (t.name === "default") {
    console.log(`FAIL — the default theme's own token file is missing: ${missing.join(", ")}`);
    failedSetup = true;
    return false;
  }
  skipped.push(t.name);
  return false;
});
let failed = failedSetup;
const lines = [];

for (const theme of available) {
  // The css package's own `:root` block plus, for a named theme, its
  // `:root[data-theme="…"]` block. `@theme inline` blocks are excluded: they define
  // Tailwind's `--color-*` mirror, not the contract tokens.
  const contractCss = theme.files.map((f) => readFileSync(f, "utf8")).join("\n");
  const contract = collectTokens(contractCss, (sel) => {
    if (sel.startsWith("@")) return false;
    if (sel === ":root") return true;
    return theme.name !== "default" && sel === `:root[data-theme="${theme.name}"]`;
  });
  // This package's domain tokens layer on top, same rule. `src/tokens.css`
  // contributes only its `:root` aliases now; the per-example overrides come from
  // the opt-in example stylesheet, mirroring the import order a demo would use.
  const own = collectTokens(`${ownTokens}\n${exampleTuning}`, (sel) => {
    if (sel.startsWith("@")) return false;
    if (sel === ":root") return true;
    return sel === `:root[data-theme="${theme.name}"]`;
  });
  const tokens = new Map([...contract, ...own]);

  const palette = [];
  for (let i = 1; i <= 5; i++) {
    const name = `--C-CHART-${i}`;
    const raw = tokens.get(name);
    if (raw === undefined) {
      lines.push(`  ${theme.name}: ${name} is not defined`);
      failed = true;
      continue;
    }
    palette.push({ name, lab: parseOklch(resolveVar(raw, tokens)) });
  }
  if (palette.length !== 5) continue;

  const pairs = [];
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      pairs.push({ a: palette[i].name, b: palette[j].name, d: distance(palette[i].lab, palette[j].lab) });
    }
  }
  pairs.sort((x, y) => x.d - y.d);
  const worst = pairs[0];
  const breaches = pairs.filter((p) => p.d < FLOOR);
  if (breaches.length) failed = true;
  lines.push(
    `  ${theme.name.padEnd(9)} closest pair ${worst.a}/${worst.b} = ${worst.d.toFixed(3)}` +
      (breaches.length
        ? `  FAIL — under the ${FLOOR} collapse floor: ` +
          breaches.map((p) => `${p.a}/${p.b}=${p.d.toFixed(3)}`).join(", ")
        : ""),
  );
}

/* ---- The consumer-theme parity check ------------------------------------------
 * Everything above measures themes that ship in this workspace. None of it proves
 * the thing the design system actually promises: that a theme WE HAVE NEVER SEEN
 * can reach the same palette quality by following the documented rule.
 *
 * So this measures one that does not exist on disk. `aurora` is a hostile synthetic
 * consumer theme — dark, and (like the `tech` example) pointing --C-ACCENT and
 * --C-STATUS-SUCCESS at one colour, which is the case that collapses two series.
 * It is defined here, inline, deliberately: writing it as a fourth example theme
 * file would make it another example, and the point is that it is NOT one.
 *
 * Two rows, and BOTH are enforced:
 *   - untuned  — must collapse. If this ever passes, the documented rule has become
 *                unnecessary and the docs telling authors to override are wrong.
 *   - tuned    — must clear FLOOR using only the documented fix (override
 *                --C-CHART-1..5, lifting the ramp to ~0.65-0.78 for a dark theme).
 *                If this fails, the instruction we give theme authors does not work.
 * ------------------------------------------------------------------------------ */
const AURORA_BASE = `:root[data-theme="aurora"]{
  --C-CANVAS: oklch(0.18 0.04 270);
  --C-ACCENT: oklch(0.82 0.19 155);
  --C-STATUS-SUCCESS: oklch(0.82 0.19 155);
  --C-STATUS-WARNING: oklch(0.85 0.16 90);
}`;
const AURORA_FIX = `:root[data-theme="aurora"]{
  --C-CHART-1: oklch(0.70 0.18 262);
  --C-CHART-2: oklch(0.78 0.20 152);
  --C-CHART-3: oklch(0.77 0.16 58);
  --C-CHART-4: oklch(0.68 0.22 293);
  --C-CHART-5: oklch(0.75 0.13 233);
}`;

function measureAurora(extra) {
  const base = collectTokens(readFileSync(`${CSS_PKG}/tokens/colors.css`, "utf8"), (s) => s === ":root");
  const own = collectTokens(`${ownTokens}\n${AURORA_BASE}\n${extra}`, (s) => {
    if (s.startsWith("@")) return false;
    return s === ":root" || s === ':root[data-theme="aurora"]';
  });
  const tokens = new Map([...base, ...own]);
  const lab = [];
  for (let i = 1; i <= 5; i++) lab.push(parseOklch(resolveVar(tokens.get(`--C-CHART-${i}`), tokens)));
  let worst = Infinity;
  for (let i = 0; i < 5; i++)
    for (let j = i + 1; j < 5; j++) worst = Math.min(worst, distance(lab[i], lab[j]));
  return worst;
}

const auroraUntuned = measureAurora("");
const auroraTuned = measureAurora(AURORA_FIX);
const auroraLines = [];
if (!(auroraUntuned < FLOOR)) {
  failed = true;
  auroraLines.push(
    `  untuned   ${auroraUntuned.toFixed(3)}  FAIL — expected a collapse below ${FLOOR}.` +
      ` The documented "you must override --C-CHART-*" rule may no longer be true.`,
  );
} else {
  auroraLines.push(`  untuned   ${auroraUntuned.toFixed(3)}  collapses, as the docs warn`);
}
if (auroraTuned < FLOOR) {
  failed = true;
  auroraLines.push(
    `  tuned     ${auroraTuned.toFixed(3)}  FAIL — under the ${FLOOR} floor. The fix this` +
      ` project tells theme authors to apply does not actually work.`,
  );
} else {
  auroraLines.push(`  tuned     ${auroraTuned.toFixed(3)}  clears the floor using only the documented fix`);
}

console.log(`Chart palette separation (OKLab distance, collapse floor ${FLOOR}):`);
for (const line of lines) console.log(line);
if (skipped.length) {
  console.log(`  (skipped, not installed: ${skipped.join(", ")} — examples are optional)`);
}

console.log("\nA consumer theme that exists nowhere on disk (synthetic, dark, accent==success),");
console.log("proving the documented rule is both necessary and sufficient:");
for (const line of auroraLines) console.log(line);

// Informational, never failing: what a theme gets from the aliases ALONE, with no
// `--C-CHART-*` override. This is the deal every consumer theme is on, so it is
// measured rather than asserted in prose. It is the evidence behind the rule in
// docs/theme-contract.md that dark themes, and themes reusing one colour across
// two contract tokens, must override the ramp.
const untuned = [];
for (const theme of available) {
  if (theme.name === "default") continue;
  const contractCss = theme.files.map((f) => readFileSync(f, "utf8")).join("\n");
  const contract = collectTokens(contractCss, (sel) => {
    if (sel.startsWith("@")) return false;
    if (sel === ":root") return true;
    return sel === `:root[data-theme="${theme.name}"]`;
  });
  const own = collectTokens(ownTokens, (sel) => !sel.startsWith("@") && sel === ":root");
  const tokens = new Map([...contract, ...own]);
  const lab = [];
  for (let i = 1; i <= 5; i++) {
    const raw = tokens.get(`--C-CHART-${i}`);
    if (raw === undefined) break;
    lab.push({ name: `--C-CHART-${i}`, lab: parseOklch(resolveVar(raw, tokens)) });
  }
  if (lab.length !== 5) continue;
  let worst = { d: Infinity };
  for (let i = 0; i < 5; i++)
    for (let j = i + 1; j < 5; j++) {
      const d = distance(lab[i].lab, lab[j].lab);
      if (d < worst.d) worst = { a: lab[i].name, b: lab[j].name, d };
    }
  untuned.push(
    `  ${theme.name.padEnd(9)} closest pair ${worst.a}/${worst.b} = ${worst.d.toFixed(3)}` +
      (worst.d < FLOOR ? "   <- would collapse; this theme MUST override the ramp" : ""),
  );
}
if (untuned.length) {
  console.log("\nSame themes with the aliases only (what a theme that ships no");
  console.log("--C-CHART-* override inherits — informational, never fails):");
  for (const line of untuned) console.log(line);
}

console.log(
  failed
    ? "\nFAIL — two chart series have collapsed toward one colour. Read this script's header\n" +
        "before 'fixing' it by lowering the floor: the aliasing of chart-1..3 is partial on purpose."
    : "\nOK — the default theme and every worked example keep five distinguishable series.",
);
if (failed && !CHECK) console.log("(reporting only — pass --check to fail the build)");

process.exit(failed && CHECK ? 1 : 0);
