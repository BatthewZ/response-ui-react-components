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
//                    component's source, by one of the three paths the system supports:
//                      a) CSS reads it directly            — `var(--C-ACCENT)` in Tabs.css
//                      b) a Tailwind arbitrary value in the .tsx names it outright —
//                         `bg-[linear-gradient(90deg,var(--C-ACCENT),var(--C-ACCENT-HOVER))]`
//                      c) a Tailwind utility resolves to it — `bg-primary`
//                         → `--color-primary` → `--C-PRIMARY`, per response-ui-css
//                    Utilities are checked in both directions: present in the .tsx, and
//                    paired with the right variable in their own table row.
//
// Path (b) is the newest and was a measured blind spot, not a hypothetical one. Until it
// existed a token a component painted from an arbitrary utility was reachable by NO path:
// there is no CSS to read it, and a row naming the utility failed too, because
// `resolveUtility` only understood an arbitrary value of the exact form `[var(--X)]` —
// not one carrying a fallback or sitting inside a larger value. The docs recorded the
// hole rather than the gate catching it: `avatar-upload.md` said its scrim was "not in
// that table on purpose" because "an arbitrary-value utility carrying a `var()` is not
// something verify-component-docs can resolve to a token", and `dialog.md` tabulated four
// of its five themeable utilities and described the fifth in prose. Then Phase 3 deleted
// `--progress-bar-fill`/`-fill-end` and made ProgressBar's fill a `bg-*` utility, which
// made the hole a live under-report: `--C-ACCENT-HOVER` and `--C-CANVAS` re-tint that
// component's gradient and could not be tabulated. Reproduced before it was fixed — a row
// claiming `--C-ACCENT-HOVER` for ProgressBar went red with "neither reads it in CSS nor
// reaches it through a utility in this row" — and `memory/gates.md` is explicit that a
// guard which only under-reports stays green while going blind, so the headline now
// carries a per-route claim count. If the arbitrary-value figure falls to zero, that
// path stopped working, whatever the exit code says.
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
 *
 * A resolved sibling *module* also contributes its OWN sibling stylesheet. Until
 * `Calendar.css` was renamed to `CalendarBase.css` — after its real owner, since every
 * selector in it targets markup `CalendarBase` renders — a component's stylesheet was
 * always `X.css` beside `X.tsx`, so this half never had a case and was never written. It
 * is the same one-hop rule the paragraph above states, applied to the CSS: `Calendar`
 * imports `./CalendarBase`, so `CalendarBase.css` is what paints what `Calendar` renders.
 * Without it the gate goes *blind* for the whole calendar family rather than strict.
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
        if (p.endsWith(".css")) {
          css += "\n" + t;
        } else {
          tsx += "\n" + t;
          // One hop only, and only this module's own stylesheet — not a transitive walk.
          const sheet = p.replace(/\.tsx?$/, ".css");
          if (sheet !== p && existsSync(sheet)) css += "\n" + readFileSync(sheet, "utf8");
        }
        break;
      }
    }
  }
  return { tsx, css };
}

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** Every `var(--TOKEN)` named inside an arbitrary value, in source order. */
const varsIn = (value) => [...value.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)].map((m) => m[1]);

/**
 * Contract variables a component reaches through a Tailwind ARBITRARY value written in
 * its own TS/TSX — `bg-[linear-gradient(90deg,var(--C-ACCENT),var(--C-ACCENT-HOVER))]`.
 *
 * Scoped to string literals, then to whitespace-separated words inside them, then to the
 * bracket span inside a word: that is what a class string is, and it is what keeps a
 * `var()` written in ordinary TS — an inline `style` object, an array of CSS strings —
 * from counting as a utility. Comments are stripped first for the reason the focus recipe
 * below strips them: a doc must not be able to satisfy this check against a sentence, and
 * ProgressBar's ramp is argued for in a docblock that quotes its own class names.
 *
 * Brackets are balanced rather than matched with `[^\]]*`, because these values nest —
 * `color-mix(in_oklch,var(--X)_75%,var(--Y))` inside a `linear-gradient()` inside `bg-[…]`
 * (`memory/README.md` §106: the oxide scanner reads the whole bracketed value too).
 *
 * Unlike `resolveUtility`, this does NOT filter by `definedTokens`. The question here is
 * "does this component read that variable", which a `var()` in its own class string
 * settles; whether the variable exists is a different question and not this gate's.
 */
function arbitraryValueTokens(text) {
  const found = new Set();
  for (const literal of stripComments(text).matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    for (const word of literal[2].split(/\s+/)) {
      for (const token of varsIn(bracketSpan(word))) found.add(token);
    }
  }
  return found;
}

/** The first BALANCED `[…]` span in a word, brackets included; `""` if there is none. */
function bracketSpan(word) {
  const open = word.indexOf("[");
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < word.length; i += 1) {
    if (word[i] === "[") depth += 1;
    else if (word[i] === "]") {
      depth -= 1;
      if (depth === 0) return word.slice(open, i + 1);
    }
  }
  return "";
}

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
  const source =
    tsx +
    (tsx.includes("util/focus") ? focusRecipe : "") +
    (tsx.includes("layout/shared") ? gapScale : "");
  components.set(name, {
    tsx: source,
    css: ownCss + extra.css,
    arbitrary: arbitraryValueTokens(source),
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
/**
 * Contract variables that a `--text-*` scale entry drags along rather than a doc author
 * choosing them: `--text-body-2--line-height` -> `--BodyText-2-line-height`. A row naming
 * `text-body-2` MAY claim one (`resolveUtility` returns it, so the claim resolves), but is
 * never REQUIRED to list it — the size is the choice and the leading follows it. Forcing
 * the reverse direction turned 28 existing rows red across the docs set for naming the
 * size alone, which is not drift and not something a doc author decided.
 */
const lineHeightCompanions = new Set();
for (const dir of [CSS_PKG, SRC]) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir, (f) => f.endsWith(".css"))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/(--[a-zA-Z0-9-]+):\s*var\((--[A-Za-z0-9-]+)\)/g)) {
      tokenMap.set(m[1], m[2]);
      if (m[1].endsWith("--line-height")) lineHeightCompanions.add(m[2]);
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

// The `/` split drops an opacity modifier (`bg-primary/50`) — but only outside a bracket,
// because an arbitrary value can contain a `/` of its own that is part of the value
// (`bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]`), and truncating there silently
// changed which tokens the value was read to name.
const bareUtility = (util) => {
  const last = util.split(":").pop().replace(/^-/, "");
  return last.includes("[") ? last : last.split("/")[0];
};

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

/**
 * The contract variables a utility names. `hover:bg-primary-hover` -> `["--C-PRIMARY-HOVER"]`;
 * an empty array means it maps to no token at all.
 *
 * An arbitrary value returns EVERY token it names, not the one token the old exact-form
 * match could see: a gradient ramp legitimately reads two or three, and a row naming it
 * has to account for all of them or the table under-describes what re-tints the mark.
 */
function resolveUtility(util) {
  const bare = bareUtility(util);

  // Arbitrary value: `gap-[var(--BUTTON-GAP-MD)]` names its tokens outright.
  const open = bare.indexOf("[");
  if (open !== -1) return varsIn(bare.slice(open)).filter((t) => definedTokens.has(t));

  for (const [prefixes, namespaces] of PREFIX_NAMESPACES) {
    for (const prefix of prefixes) {
      if (!bare.startsWith(prefix + "-")) continue;
      const rest = bare.slice(prefix.length + 1);
      for (const ns of namespaces) {
        const hit = tokenMap.get(`--${ns}-${rest}`);
        if (!hit) continue;
        // A `--text-*` scale entry carries a `--…--line-height` companion and the
        // `text-*` utility emits BOTH declarations, so a row naming the utility can
        // legitimately claim either variable. Returning only the size made the
        // line-height token unresolvable through any route the moment a component
        // stopped reading it from CSS, which cost accordion.md a variable that does
        // still re-tint it. Companions are NOT forced into the reverse direction —
        // see `pairedOptional` at the row check.
        const paired = tokenMap.get(`--${ns}-${rest}--line-height`);
        return paired ? [hit, paired] : [hit];
      }
    }
  }
  return [];
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

// Per-route coverage, for the headline. `memory/gates.md`: a guard's summary line is
// evidence only against its previous value — and a widened guard goes blind rather than
// red, so the route that was widened needs a number of its own to compare.
let claimsViaCss = 0;
let claimsViaArbitrary = 0;
let claimsViaUtility = 0;

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
        // Attribution order puts the arbitrary-value route LAST on purpose, so its bucket
        // counts only the claims no older route can resolve. Ordered the other way it
        // reads 7 on this tree and every one of those is also reachable through its row's
        // utility — a number that looks like coverage the widening added and is not.
        // It decides only which bucket a claim is counted in, never whether it passes.
        if (source.css.includes(`var(${token}`)) claimsViaCss += 1;
        else if (utilities.some((u) => resolveUtility(u).includes(token))) claimsViaUtility += 1;
        else if (source.arbitrary.has(token)) claimsViaArbitrary += 1;
        else {
          errors.push(
            `${spoke}: claims \`${token}\` but ${title} neither reads it in CSS, nor names ` +
              `it in an arbitrary utility value, nor reaches it through a utility in this row`,
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
        if (!resolved.length) {
          errors.push(`${spoke}: utility \`${util}\` resolves to no token in the contract`);
          continue;
        }
        const unlisted = resolved.filter(
          (r) => !claimed.includes(r) && !lineHeightCompanions.has(r),
        );
        if (claimed.length && unlisted.length) {
          errors.push(
            `${spoke}: \`${util}\` resolves to ${unlisted.map((r) => `\`${r}\``).join(", ")}, ` +
              `not listed in its row (row claims ${claimed.map((c) => `\`${c}\``).join(", ")})`,
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
    `(titles, links, token tables) against ${tokenMap.size} mapped tokens; ` +
    `${claimsViaCss + claimsViaArbitrary + claimsViaUtility} token claim(s) resolved ` +
    `(${claimsViaCss} via CSS, ${claimsViaArbitrary} via a .tsx arbitrary value, ` +
    `${claimsViaUtility} via a row utility).`,
);
