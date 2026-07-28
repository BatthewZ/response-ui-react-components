#!/usr/bin/env node
// Asserts the example themes stay EXAMPLES.
//
// WHY THIS EXISTS
//
// `events`, `grimdark` and `tech` are worked demonstrations of the theme contract.
// The design system defines exactly one theme name, `default`, which is `:root`.
// Everything else — the examples included — is a consumer theme, and the whole
// claim of the theming feature is that a consumer's theme is not a second-class
// citizen next to the ones that happen to ship.
//
// That claim decays silently. Before this gate existed, the example names had
// reached: a `:root[data-theme="grimdark"]` block in this package's own shipped
// stylesheet, the runtime default of `useTheme`, a `satisfies Record<Theme, …>`
// obligation on ThemeSwitcher's labels, and an exported type literally called
// `Theme` whose members were the three examples plus `default`. Each was locally
// reasonable. Together they meant a consumer theme got a worse chart palette and
// a wrong TypeScript type, which is the opposite of the advertised feature.
//
// THE RULE
//
// The names may appear in exactly two places: `src/examples/` (sample code, which
// is what it is for) and test files (which assert their absence, and which need to
// name a thing to assert it is gone). Anywhere else in shipped source is a failure.
//
// WHAT IT DOES NOT COVER, stated so the blind spot is not silent:
// - Prose. Comments and Markdown may discuss the examples — several component CSS
//   files cite contrast measured against them, which is legitimate evidence. This
//   gate reads CSS selectors and TS/TSX string literals, not commentary.
// - The css package's own internals, beyond checking that its public entries do
//   not import the examples. It is a separate repo; the equivalent rule is stated
//   in its AGENTS.md.
// - Whether a consumer theme is actually GOOD. Nothing here measures that;
//   `verify-chart-palette.mjs` measures the one part that is measurable.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, sep } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, "..");
const CSS_PKG = resolve(PKG, "node_modules/@batthewz/response-ui-css");
const CHECK = process.argv.includes("--check");

/** The example theme names. `default` is excluded — it IS the design system's theme. */
const EXAMPLE_NAMES = ["events", "grimdark", "tech"];

/** Sample code is allowed to name them; that is what it is for. */
const ALLOWED_DIR = join(PKG, "src", "examples") + sep;

/**
 * `[` then optional whitespace: CSS allows `[ data-theme="x" ]` and browsers honour
 * it, so anchoring on `[data-theme` alone lets the whole rule through.
 */
const THEME_ATTR = /\[\s*data-theme\s*[~|^$*]?=\s*["']?([A-Za-z0-9_-]+)/g;

const failures = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const isTest = (f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f);
// Trailing separator, so a sibling like `src/examples-domain/` or `src/examples.css`
// is NOT treated as sample code — a bare string prefix would exempt both.
const inExamples = (f) => f.startsWith(ALLOWED_DIR);
const rel = (f) => relative(PKG, f);

const files = walk(join(PKG, "src"));

/* ---- 1. No theme name may appear in a CSS selector in shipped styles ---- */
// A `[data-theme="grimdark"]` block in this package's CSS is the strongest form of
// the problem: it hands three example themes styling that no consumer theme gets.
for (const file of files.filter((f) => f.endsWith(".css") && !inExamples(f))) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, name] of css.matchAll(THEME_ATTR)) {
    failures.push(
      `${rel(file)}: shipped CSS targets [data-theme="${name}"]. ` +
        `Move it to src/examples/example-theme-tuning.css (opt-in) — a consumer theme cannot benefit from a rule keyed to a theme name.`,
    );
  }
}

/* ---- 2. No theme name as a string literal in shipped TS/TSX ---- */
// Comments are exempt (see header); this looks only at quoted literals.
for (const file of files.filter((f) => /\.[cm]?[jt]sx?$/.test(f) && !inExamples(f) && !isTest(f))) {
  const src = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const name of EXAMPLE_NAMES) {
    // Quoted literal, OR a bare object key / enum member (`{ grimdark: … }`) — the
    // latter is exactly the `Record<Theme, …>` shape this gate exists to prevent,
    // and it carries no adjacent quote.
    const re = new RegExp(`["'\`]${name}["'\`]|(?:^|[{,;(\\s])${name}\\s*[:=]`, "m");
    if (re.test(src)) {
      failures.push(
        `${rel(file)}: names the example theme "${name}" in code. ` +
          `The library must not know example theme names — import EXAMPLE_THEMES from src/examples/ if this is a demo.`,
      );
    }
  }
}

/* ---- 3. The foundation package's public entries must not import examples ---- */
// If the main entry pulls the examples in, every consumer pays for three palettes
// and nine font families, and the examples are load-bearing by definition.
// Resolved TRANSITIVELY: an entry that imports tokens/index.css which imports an
// example is just as broken as one that imports it directly, and only walking the
// entry's own @import lines would miss it.
function reachableFrom(file, seen = new Set()) {
  const hits = [];
  if (seen.has(file) || !existsSync(file)) return hits;
  seen.add(file);
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, spec] of css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) {
    if (spec.startsWith("http") || spec === "tailwindcss") continue;
    const target = resolve(dirname(file), spec);
    if (/(^|\/)examples?\//.test(spec) || EXAMPLE_NAMES.some((n) => spec.includes(n))) {
      hits.push({ from: file, spec });
      continue;
    }
    hits.push(...reachableFrom(target, seen));
  }
  // A theme-keyed selector anywhere in the reachable graph is the same failure.
  for (const [, name] of css.matchAll(/\[data-theme\s*[~|^$*]?=\s*["']?([A-Za-z0-9_-]+)/g)) {
    hits.push({ from: file, spec: `[data-theme="${name}"] rule` });
  }
  return hits;
}

if (existsSync(CSS_PKG)) {
  for (const entry of ["src/index.css", "src/index-no-fonts.css"]) {
    for (const hit of reachableFrom(join(CSS_PKG, entry))) {
      failures.push(
        `@batthewz/response-ui-css/${entry} reaches "${hit.spec}" (via ${relative(CSS_PKG, hit.from)}). ` +
          `The public entry must not load example themes, directly or transitively.`,
      );
    }
  }
} else {
  console.log("note: @batthewz/response-ui-css not installed — skipped the entry-import check.");
}

/* ---- 4. No theme-keyed rule in ANY built stylesheet ---- */
// Not just `dist/styles.css`: that file is an @import aggregator with no selectors
// in it, so checking it alone can never fail. The rules live in dist/components/**.
// `dist/examples/` is excluded for the same reason `src/examples/` is.
const distDir = join(PKG, "dist");
if (existsSync(distDir)) {
  const distExamples = join(distDir, "examples") + sep;
  for (const file of walk(distDir).filter((f) => f.endsWith(".css") && !f.startsWith(distExamples))) {
    const built = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, name] of built.matchAll(THEME_ATTR)) {
      failures.push(`${rel(file)}: built CSS targets [data-theme="${name}"].`);
    }
  }
} else {
  console.log("note: dist/ not built — skipped the built-output check.");
}

/* ---- 5. Every shipped stylesheet must actually parse ---- */
// A public CSS entry point that fails the bundler's parser is invisible to
// everything else here: vitest runs with `css: false`, tsc never sees CSS, and a
// grep-based gate happily reads a file the browser would reject. This caught a
// nested `/* … /* … */ … */` in an exported stylesheet — CSS comments do not nest,
// so the header terminated early and leaked prose into the sheet as live rules,
// silently dropping a whole theme block. Cheap check, invisible failure mode.
let parse = null;
try {
  ({ transform: parse } = await import("lightningcss"));
} catch {
  console.log("note: lightningcss unavailable — skipped the CSS parse check.");
}
if (parse) {
  const sheets = walk(join(PKG, "src")).filter((f) => f.endsWith(".css"));
  for (const file of sheets) {
    // Nested block comments: legal-looking, silently destructive.
    const text = readFileSync(file, "utf8");
    let i = 0, open = false;
    while (i < text.length - 1) {
      if (text.startsWith("/*", i)) {
        if (open) {
          failures.push(
            `${rel(file)}:${text.slice(0, i).split("\n").length}: nested "/*" inside a comment. ` +
              `CSS comments do not nest — the block ends at the first "*/", leaking the rest as live CSS.`,
          );
          break;
        }
        open = true;
        i += 2;
        continue;
      }
      if (open && text.startsWith("*/", i)) {
        open = false;
        i += 2;
        continue;
      }
      i += 1;
    }
    try {
      parse({ filename: file, code: Buffer.from(text) });
    } catch (err) {
      failures.push(`${rel(file)}: does not parse as CSS — ${err.message}`);
    }
  }
}

if (failures.length) {
  console.log("Example themes have become load-bearing:\n");
  for (const f of failures) console.log(`  ${f}`);
  console.log(
    "\nFAIL — read this script's header. The fix is almost never to add an allowance:\n" +
      "it is to express the rule in terms of a token or a prop the consumer also controls.",
  );
} else {
  console.log(
    "OK — no example theme name reaches shipped CSS selectors or library code.\n" +
      "The examples remain deletable.",
  );
}
if (failures.length && !CHECK) console.log("(reporting only — pass --check to fail the build)");

process.exit(failures.length && CHECK ? 1 : 0);
