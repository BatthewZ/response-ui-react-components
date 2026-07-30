#!/usr/bin/env node
// Verifies the per-component docs in docs/components/ against the source they describe.
//
// Complements the other two guards rather than overlapping them:
//   verify-docs.mjs        — every public export is named in README.md and AGENTS.md
//   verify-directives.mjs  — RSC "use client" placement and barrel/secret leaks
//   this script            — the spoke docs: links, token tables, titles
//
// The checks, and the drift each one catches:
//
//   1. Titles      — a spoke's `# H1` must be a real public export. Catches reverse
//                    drift, where a doc outlives the component it documents. (This is
//                    how a doc for a nonexistent `Icon` component would be caught.)
//   2. Links       — every relative link resolves to a real file, and every `#anchor`
//                    to a real heading. Catches rot as spokes are added and renamed.
//   3. Tokens      — the `## Theme tokens` table is the library's headline claim
//                    ("override this variable, the component re-tints"), and it is the
//                    one section that can be wrong without anything looking broken.
//                    Every contract variable named must be reachable from that
//                    component's source, by either path the system supports:
//                      a) CSS reads it directly            — `var(--C-ACCENT)` in Tabs.css
//                      b) a Tailwind utility resolves to it — `bg-primary`
//                         → `--color-primary` → `--C-PRIMARY`, per response-ui-css
//                    Utilities are checked in both directions: present in the .tsx, and
//                    paired with the right variable in their own table row.
//
// One addition to the source a component is read as (RC-2, commit aafb9f8): the focus
// ring became a set of named constants in `src/util/focus.ts`, so the utilities that
// spell it are no longer written in any component file. `siblingImports` follows only
// `./`, by design, so the recipe was unreachable and every doc that named
// `focus-visible:ring-border-focus` failed. `focusRecipe` below re-attaches it — see the
// comment there for why that is not a general loosening.
//
// Exits 1 on any error. Warnings (a component named in prose that now has a spoke to
// link to) report but do not fail.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DOCS = join(ROOT, "docs");
const SPOKES = join(DOCS, "components");
const CSS_PKG = join(ROOT, "node_modules", "@batthewz", "response-ui-css", "src");

const errors = [];
const warnings = [];

/* ------------------------------------------------------------------ */
/*  Source index                                                       */
/* ------------------------------------------------------------------ */

function walk(dir, test, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, test, out);
    else if (test(entry)) out.push(full);
  }
  return out;
}

/**
 * Same-directory (`./`) modules a file imports, resolved to real paths. Grid factors its
 * gap utilities into `./shared`, menus into `./menu-internals`, calendars into
 * `./CalendarBase` — so a token/utility a component genuinely uses can live one hop away.
 * We follow only `./` (not `../`): sibling helpers are part of the component; util/lucide
 * are not, and pulling them in would only loosen the check.
 */
function siblingImports(file, text) {
  const dir = dirname(file);
  let tsx = "";
  let css = "";
  for (const m of text.matchAll(/["'](\.\/[^"']+)["']/g)) {
    for (const ext of ["", ".ts", ".tsx", ".css"]) {
      const p = join(dir, m[1] + ext);
      if (existsSync(p) && statSync(p).isFile()) {
        const t = readFileSync(p, "utf8");
        if (p.endsWith(".css")) css += "\n" + t;
        else tsx += "\n" + t;
        break;
      }
    }
  }
  return { tsx, css };
}

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/**
 * The focus ring is the one piece of class vocabulary that lives outside the component
 * tree: `src/util/focus.ts` holds it as named constants so the eight hand-rolled copies
 * could go. `siblingImports` will not reach `../../util/focus`, and must not start
 * following `../` — that would pull in every util and lucide too, which is the loosening
 * its docblock refuses. So the recipe is re-attached by name instead, and only to
 * components that actually import it, directly or through a sibling that does (Carousel
 * and DatePicker reach it via `./IconButton` and `./Input`). A component that does not
 * import it still cannot claim `focus-visible:ring-border-focus` in its table.
 *
 * Comments are stripped first: the recipe's docblock argues its case in prose full of
 * backticked utilities (`duration-fast`, `ring-offset-0`), and a doc must not be able to
 * satisfy this check against a sentence.
 *
 * This says a component *can* spell the recipe, not that it paints a ring on the right
 * element — that invariant belongs to verify-focus-affordance.mjs, which resolves the
 * same constants per JSX element.
 */
const focusRecipePath = join(SRC, "util", "focus.ts");
const focusRecipe = existsSync(focusRecipePath)
  ? stripComments(readFileSync(focusRecipePath, "utf8"))
  : "";

/**
 * The gap scale is the second piece of class vocabulary shared across directories.
 * `layout/shared.ts` maps the `Gap` union to `gap-r*` and `mb-*` so one scale is defined
 * once; `Grid`/`Row`/`Stack` reach it as `./shared` and `siblingImports` already sees it,
 * but `MasonryGrid` lives in `ui/` and imports `../layout/shared`, which that function
 * refuses to follow. Re-attached by name for the same reason the focus recipe is, and with
 * the same gate: a component that does not import it still cannot claim `gap-r4`.
 *
 * Comments stripped for the same reason — the maps carry a docblock explaining why a
 * second, margin-shaped map exists, and a doc must not satisfy this check against prose.
 */
const gapScalePath = join(SRC, "components", "layout", "shared.ts");
const gapScale = existsSync(gapScalePath)
  ? stripComments(readFileSync(gapScalePath, "utf8"))
  : "";

/** Component name -> its source text (own + same-dir siblings), for the utility/token search. */
const components = new Map();
for (const file of walk(SRC, (f) => f.endsWith(".tsx") && !/\.(test|examples)\./.test(f))) {
  const name = basename(file, ".tsx");
  const own = readFileSync(file, "utf8");
  const cssPath = file.replace(/\.tsx$/, ".css");
  const ownCss = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
  const extra = siblingImports(file, own);
  const tsx = own + extra.tsx;
  components.set(name, {
    tsx:
      tsx +
      (tsx.includes("util/focus") ? focusRecipe : "") +
      (tsx.includes("layout/shared") ? gapScale : ""),
    css: ownCss + extra.css,
  });
}

/** Public value exports, for the title check. */
const publicExports = new Set();
for (const barrel of walk(SRC, (f) => f === "index.ts")) {
  const text = readFileSync(barrel, "utf8");
  for (const m of text.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*["'][^"']+["']/g)) {
    for (const spec of m[1].split(",")) {
      const t = spec.trim();
      if (t && !t.startsWith("type ")) publicExports.add(t.split(/\s+as\s+/).pop().trim());
    }
  }
  for (const m of text.matchAll(/export\s*\*\s*from/g)) void m; // barrels re-export; covered above
}

/* ------------------------------------------------------------------ */
/*  Token map: --<namespace>-<name> -> --CONTRACT                       */
/* ------------------------------------------------------------------ */

const tokenMap = new Map();
const definedTokens = new Set();
for (const dir of [CSS_PKG, SRC]) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir, (f) => f.endsWith(".css"))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/(--[a-zA-Z0-9-]+):\s*var\((--[A-Za-z0-9-]+)\)/g)) {
      tokenMap.set(m[1], m[2]);
    }
    for (const m of text.matchAll(/(--[a-zA-Z0-9-]+):\s*[^;]/g)) definedTokens.add(m[1]);
  }
}

if (!tokenMap.size) {
  console.error("verify-component-docs: no token map — is @batthewz/response-ui-css installed?");
  process.exit(1);
}

// Tailwind utility prefix -> the token namespaces it can resolve through, in order.
const PREFIX_NAMESPACES = [
  [["bg", "ring", "border", "outline", "fill", "stroke", "divide", "accent", "caret"], ["color"]],
  [["text"], ["color", "text"]],
  [["rounded"], ["radius"]],
  [["duration"], ["transition-duration"]],
  [["shadow"], ["shadow", "color"]],
  [["font"], ["font-weight"]],
  [["p", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr", "gap"], ["spacing"]],
];

const bareUtility = (util) => util.split(":").pop().split("/")[0].replace(/^-/, "");

/**
 * Whether an item is a Tailwind utility at all, as opposed to prose, a CSS class, or a
 * media query that happens to be backticked in the same cell. Prefix-based rather than
 * resolution-based on purpose: an invented `bg-nonexistent` must still be recognised as
 * a utility so it can fail, instead of being waved through as prose.
 */
function isUtility(item) {
  if (item.startsWith("--") || item.startsWith(".") || /\s/.test(item)) return false;
  const bare = bareUtility(item);
  return PREFIX_NAMESPACES.some(([prefixes]) => prefixes.some((p) => bare.startsWith(p + "-")));
}

/** `hover:bg-primary-hover` -> `--C-PRIMARY-HOVER`, or null if it maps to no token. */
function resolveUtility(util) {
  const bare = bareUtility(util);

  // Arbitrary value: `gap-[var(--BUTTON-GAP-MD)]` names its token outright.
  const arbitrary = bare.match(/\[var\((--[A-Za-z0-9-]+)\)\]$/);
  if (arbitrary) return definedTokens.has(arbitrary[1]) ? arbitrary[1] : null;

  for (const [prefixes, namespaces] of PREFIX_NAMESPACES) {
    for (const prefix of prefixes) {
      if (!bare.startsWith(prefix + "-")) continue;
      const rest = bare.slice(prefix.length + 1);
      for (const ns of namespaces) {
        const hit = tokenMap.get(`--${ns}-${rest}`);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Checks                                                             */
/* ------------------------------------------------------------------ */

// GitHub's heading slugger: lowercase, drop anything not word/space/hyphen, then map
// each space to one hyphen WITHOUT collapsing runs. So `Dashboard — trend & chart`
// (em-dash and `&` stripped, their surrounding spaces preserved) → `dashboard--trend--chart`.
// Collapsing with `\s+` would diverge from GitHub on every punctuated heading.
const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");

const headingsOf = (md) =>
  new Set(
    md
      .split("\n")
      .filter((l) => /^#{1,6}\s/.test(l))
      .map((l) => slug(l.replace(/^#+\s*/, ""))),
  );

const CONTRACT = /^--[A-Z]/;
const backticked = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());

const spokeFiles = existsSync(SPOKES)
  ? readdirSync(SPOKES).filter((f) => f.endsWith(".md") && f !== "README.md")
  : [];

const spokeComponents = new Map(); // component name -> spoke filename

for (const spoke of spokeFiles) {
  const md = readFileSync(join(SPOKES, spoke), "utf8");
  const title = md.split("\n").find((l) => l.startsWith("# "))?.slice(2).trim();

  // 1. Title -> real export
  if (!title) {
    errors.push(`${spoke}: no \`# Title\` heading`);
    continue;
  }
  if (!publicExports.has(title)) {
    errors.push(`${spoke}: documents "${title}", which is not a public export`);
    continue;
  }
  spokeComponents.set(title, spoke);

  const source = components.get(title);
  if (!source) {
    errors.push(`${spoke}: no source file found for "${title}"`);
    continue;
  }

  // 3. Theme tokens table
  const section = md.split(/^## /m).find((s) => s.startsWith("Theme tokens"));
  if (!section) {
    errors.push(`${spoke}: no "## Theme tokens" section`);
  } else {
    for (const row of section.split("\n")) {
      if (!row.trim().startsWith("|") || /^\|[\s|:-]+\|$/.test(row.trim())) continue;
      const cells = row.split("|").slice(1, -1);
      if (cells.length < 2) continue;

      const items = cells.flatMap(backticked);
      const claimed = items.filter((i) => CONTRACT.test(i));
      const utilities = items.filter(isUtility);

      for (const token of claimed) {
        const inCss = source.css.includes(`var(${token}`);
        const viaUtility = utilities.some((u) => resolveUtility(u) === token);
        if (!inCss && !viaUtility) {
          errors.push(
            `${spoke}: claims \`${token}\` but ${title} neither reads it in CSS nor ` +
              `reaches it through a utility in this row`,
          );
        }
      }

      for (const util of utilities) {
        // Not \b — an arbitrary value ends in `]`, so a trailing \b never matches.
        // Hyphen-aware edges also stop `bg-primary` matching inside `bg-primary-hover`.
        const escaped = util.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(source.tsx)) {
          errors.push(`${spoke}: names utility \`${util}\`, absent from ${title}.tsx`);
          continue;
        }
        const resolved = resolveUtility(util);
        if (!resolved) {
          errors.push(`${spoke}: utility \`${util}\` resolves to no token in the contract`);
          continue;
        }
        if (claimed.length && !claimed.includes(resolved)) {
          errors.push(
            `${spoke}: \`${util}\` resolves to \`${resolved}\`, not listed in its row ` +
              `(row claims ${claimed.map((c) => `\`${c}\``).join(", ")})`,
          );
        }
      }
    }
  }
}

// 2. Link integrity, across every doc
for (const file of walk(DOCS, (f) => f.endsWith(".md"))) {
  const md = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1);

  for (const m of md.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = m[1];
    if (/^(https?:|mailto:)/.test(href)) continue;

    const [path, anchor] = href.split("#");
    const target = path ? resolve(dirname(file), path) : file;

    if (path && !existsSync(target)) {
      errors.push(`${rel}: dead link -> ${href}`);
      continue;
    }
    if (anchor && !headingsOf(readFileSync(target, "utf8")).has(anchor)) {
      errors.push(`${rel}: dead anchor -> ${href}`);
    }
  }
}

// Nudge: a component code-formatted in prose that now has a spoke to link to.
for (const spoke of spokeFiles) {
  const md = readFileSync(join(SPOKES, spoke), "utf8");
  for (const [name, target] of spokeComponents) {
    if (target === spoke) continue;
    if (new RegExp("`" + name + "`").test(md)) {
      warnings.push(`${spoke}: mentions \`${name}\` in prose — could link to ${target}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

if (warnings.length) {
  console.warn("\nverify-component-docs: warnings\n" + warnings.map((w) => "  - " + w).join("\n"));
}

if (errors.length) {
  console.error(
    "\nverify-component-docs: ERRORS\n" + errors.map((e) => "  - " + e).join("\n") + "\n",
  );
  process.exit(1);
}

const documented = spokeComponents.size;
console.log(
  `verify-component-docs: OK — ${documented} spoke(s) verified ` +
    `(titles, links, token tables) against ${tokenMap.size} mapped tokens.`,
);
