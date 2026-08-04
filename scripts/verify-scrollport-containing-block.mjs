#!/usr/bin/env node
// Asserts that every scrollport in `src/` also establishes a containing block.
//
// WHY
//
// An absolutely-positioned box with no offsets is laid out at its STATIC
// POSITION — but expressed in the coordinates of its containing block, which is
// the nearest positioned ancestor. If a scroll container is not positioned, the
// containing block of everything inside it is somewhere OUTSIDE the scroll clip,
// so two things follow at once: the box is not clipped by the scroller, and its
// coordinates are the scroller's UNSCROLLED content coordinates. Scroll the
// scrollport and the escaped box is left sitting that far down (or across) the
// page — stretching the document by the full scroll range.
//
// This is not a hypothetical. This library's visually-hidden text is
// `position: absolute` with no offsets — that is what `sr-only` is — and `Badge`
// puts one in the page by default, so ANY status cell is a trigger. Measured in
// Chromium at a 375x800 viewport (see CHANGELOG 0.17.0):
//
//   VirtualizedDataTable, 10 000 rows, scrolled to the end
//     documentElement.scrollHeight   530 060 -> 800
//   Table, three rows, wide enough to scroll sideways
//     documentElement.scrollWidth        620 -> 375
//   Carousel.Track, 40 slides, inside AppShell.Main
//     .app-shell-main scrollWidth     11 266 -> 4 000
//   AppShell.Main, one Badge at the end of 4000px of content
//     documentElement.scrollWidth      3 885 -> 375
//
// WHY THIS SHAPE OF GATE
//
// Nothing else in the package can see it. jsdom applies no stylesheets and does
// no layout, so all 2792 tests stay green with every one of those defects in
// place — verified by measuring the fix in a real browser and then watching the
// suite not move. `tsc` cannot see CSS. A screenshot at rest misses it too,
// because the damage needs an interaction: it is the SCROLL that displaces the
// escaped box.
//
// THE RULE: EVERY SCROLLPORT, NO EXCEPTIONS
//
// The invariant is deliberately total rather than "every scrollport that can
// hold something absolutely positioned". `DialogBody` was given this exact
// declaration in 0.15.0, for this exact reason, stated in its docblock — and
// `.table-wrapper` still shipped without it, because judging content case by
// case is what lets the next one through. `CodeBlock`'s `<pre>` therefore
// carries `relative` even though its content is a string it renders itself.
//
// WHAT COUNTS AS A SCROLLPORT
//
// `overflow` (or `-x` / `-y` / `-block` / `-inline`) resolving to `auto` or
// `scroll`, written either as a Tailwind utility in a `className` or as a
// declaration in a `.css` file. Note that ONE axis is enough: a box with
// `overflow-x: auto` computes `overflow-y` to `auto` as well, which is why
// `.table-wrapper` scrolls vertically under `maxHeight` while only ever naming
// the x axis.
//
// `overflow: hidden` is OUT of scope, stated here so nobody reads its absence as
// an oversight. It is a scroll container per spec and abspos descendants escape
// its clip identically — but it has no scroll offset, so an escaped box lands at
// the position it would have had anyway. That is a clipping artifact, not the
// page-stretching defect this gate exists for, and pulling `Card`, `Avatar`,
// `Accordion`'s animation clipper and a dozen others into a positioning change
// is a separate decision with its own blast radius.
//
// WHAT COUNTS AS A CONTAINING BLOCK
//
// `position` other than `static`, or a `transform` / `translate` / `scale` /
// `rotate` / `filter` / `backdrop-filter` / `perspective`, or `contain` with
// `paint`/`layout`/`strict`/`content`, or `will-change` naming one of those.
// Only `position` is checked as a Tailwind utility by name (`relative`,
// `absolute`, `fixed`, `sticky`) plus the arbitrary-property spellings; the rest
// are recognised in CSS declarations. `position: relative` is the right answer
// almost every time: it leaves `z-index` at `auto` so no stacking context is
// created, and — unlike `transform` and `contain` — it does NOT capture a consumer's
// `position: fixed` overlay. It DOES change paint order: a positioned box with
// `z-index: auto` moves from Appendix E step 4 to step 8, so it can now cover an
// earlier-in-tree positioned element that has no `z-index`. Say so rather than
// claiming the change is free.
//
// PAIRING IS BY ELEMENT, NOT BY FILE
//
// The two halves may sit apart, the same way `verify-focus-affordance.mjs`
// pairs a reset with its ring: a scrollport declared in `.css` may take its
// containing block from a utility in the `.tsx` that renders the class, and vice
// versa. Every string literal in an element's whole `className` expression is
// pooled, and module-local `const` strings and string-valued records are
// resolved into that pool, so hoisting the utilities out of the JSX does not
// blind the check.
//
// THE ONE EXEMPTION, AND THE POSITIVE EVIDENCE IT REQUIRES
//
// A floating element positioned by `@floating-ui/react` gets `position: absolute`
// AND a `transform` from the `floatingStyles` object it spreads into `style` —
// two containing blocks over, written at runtime. Declaring `relative` on those
// would be a dead rule an inline style always beats. The exemption requires the
// identifier `floatingStyles` to actually appear in that element's own `style`
// attribute; a `style` the script cannot read that way confers nothing.
//
// Inline `style` is not otherwise read for `overflow`. A component that scrolls
// a child component's root — `VirtualizedDataTable` passing `overflowY: "auto"`
// to `Table` — is checked where that root is DEFINED, which is the only place
// its class list exists. Only lowercase (DOM) tags are scrollport candidates by
// their inline style, for the same reason.

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { globSync } from "glob";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const AXES = "(?:-x|-y|-block|-inline)?";

/** `overflow-auto`, `overflow-y-scroll`, `md:overflow-x-auto`, `[overflow:auto]`, … */
const SCROLL_UTILITY = new RegExp(
  `(?:^|:)overflow${AXES}-(?:auto|scroll)$|^\\[overflow${AXES}:(?:auto|scroll)\\]$`
);

/**
 * `relative`, `[position:sticky]`, `translate-x-2`, `contain-paint`, … — UNPREFIXED only.
 *
 * A variant prefix used to be accepted here (`hover:absolute`, `md:relative`) and that was a
 * hole, not a convenience: `print:relative` leaves the element `position: static` on every
 * screen, and the gate scored it identical to the fix while the page grew by half a million
 * pixels. A containing block that exists only under a media query, a pseudo-class or a print
 * stylesheet is not a containing block for the case this gate is about, so the utility must be
 * unconditional. `probe-scrollport-containing-block.mjs` is what catches the rest.
 */
const CONTAINING_BLOCK_UTILITY = new RegExp(
  [
    "^(?:relative|absolute|fixed|sticky)$",
    String.raw`^\[position:(?:relative|absolute|fixed|sticky)\]$`,
    // Tailwind utilities that create a containing block by other means. Recognised so a
    // legitimately-positioned glass panel or contained region is not a false positive — the
    // noise that buys an allowance list.
    String.raw`^-?(?:translate|scale|rotate|skew)-`,
    String.raw`^(?:blur|backdrop-blur|backdrop-filter|perspective)(?:-|$)`,
    String.raw`^contain-(?:paint|layout|strict|content)$`,
    String.raw`^will-change-(?:transform|filter|perspective|contents)$`,
    String.raw`^\[(?:transform|filter|backdrop-filter|contain|perspective|will-change):`,
  ].join("|")
);

/** A CSS declaration block that makes the element a scrollport. */
const SCROLL_DECLARATION = new RegExp(`(?:^|[;{\\s])overflow${AXES}\\s*:\\s*(?:auto|scroll)\\b`);

/** A CSS declaration block that makes the element a containing block for `absolute`. */
const CONTAINING_BLOCK_DECLARATION =
  /(?:^|[;{\s])(?:position\s*:\s*(?!static\b)[a-z-]+|(?:transform|translate|scale|rotate|filter|backdrop-filter|perspective)\s*:\s*(?!none\b)[^;}]+|contain\s*:\s*[^;}]*\b(?:paint|layout|strict|content)\b|will-change\s*:\s*[^;}]*\b(?:transform|filter|perspective|contain)\b)/;

const splitClasses = (pool) => pool.flatMap((s) => s.split(/\s+/)).filter(Boolean);

const hasScrollUtility = (pool) => splitClasses(pool).some((c) => SCROLL_UTILITY.test(c));
const hasContainingBlockUtility = (pool) =>
  splitClasses(pool).some((c) => CONTAINING_BLOCK_UTILITY.test(c));

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/* ------------------------------------------------------------------ */
/*  Reading a .tsx file                                                */
/* ------------------------------------------------------------------ */

/**
 * Module-local `const NAME = "…"` and `const NAME = { k: "…" }`, so utilities
 * hoisted out of the JSX still reach the pool of the element that uses them.
 * Scoped per file on purpose: a global pool would lend one file's constant to a
 * same-named one elsewhere and silently exempt an element — but see
 * `constStrings`, which widens it along real `import` edges, because a shared
 * class string in a sibling module is how `DatePicker` and `DateRangePicker`
 * write their popovers and a per-file map alone could not see either.
 */
function ownConstStrings(src) {
  const map = new Map();
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*/g)) {
    const rest = src.slice(m.index + m[0].length);
    const single = /^(["'`])((?:\\.|(?!\1)[\s\S])*)\1/.exec(rest);
    if (single) {
      map.set(m[1], [single[2]]);
      continue;
    }
    if (!rest.startsWith("{")) continue;
    const body = balanced(rest, 0, "{", "}");
    if (body === null) continue;
    map.set(m[1], [...body.matchAll(/(["'])((?:\\.|(?!\1)[\s\S])*)\1/g)].map((s) => s[2]));
  }
  return map;
}

/**
 * The value written at `at`, in any of the three spellings an attribute takes:
 * a JSX expression container `{…}`, a quoted string, or — for a property of a
 * props object — a bare expression such as `cn(a, b)`, which ends at the first
 * comma or closing brace that is not nested inside brackets or a string.
 */
function valueExpression(src, at) {
  const rest = src.slice(at);
  if (rest.startsWith("{")) return balanced(rest, 0, "{", "}");
  const quoted = /^(["'`])((?:\\.|(?!\1)[\s\S])*)\1/.exec(rest);
  if (quoted) return quoted[0];

  let depth = 0;
  let quote = null;
  for (let i = 0; i < rest.length; i += 1) {
    const ch = rest[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) {
      if (depth === 0) return rest.slice(0, i);
      depth -= 1;
    } else if (ch === "," && depth === 0) return rest.slice(0, i);
  }
  return null;
}

/** The substring from `start` through its matching close, or null if unbalanced. */
function balanced(src, start, open, close) {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/** The JSX tag name owning the attribute at `index` — `div`, `Table`, or null. */
function owningTag(src, index) {
  const open = src.lastIndexOf("<", index);
  if (open === -1) return null;
  return /^<\s*([A-Za-z][\w.$]*)/.exec(src.slice(open, index))?.[1] ?? null;
}

/**
 * The value expression of `attr` on the same element as the attribute at
 * `index` — where "same element" spans BOTH spellings the codebase uses: a JSX
 * attribute (`style={…}`) and a property of a props object spread onto the tag
 * (`getFloatingProps({ style: … })`), which is how every floating-ui popover in
 * this package is written.
 */
function siblingAttribute(src, index, attr) {
  const open = src.lastIndexOf("<", index);
  if (open === -1) return null;
  const tag = balancedTag(src, open);
  if (tag === null) return null;
  const m = new RegExp(`\\b${attr}\\s*[:=]\\s*`).exec(tag);
  if (!m) return null;
  return valueExpression(tag, m.index + m[0].length);
}

/** The whole `<tag …>` opening element starting at `open`, brace-aware. */
function balancedTag(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (ch === ">" && depth === 0) return src.slice(open, i + 1);
  }
  return null;
}

/**
 * Every `className` on a JSX element, as `{ pool, line, tag, index }`. The pool
 * is every string literal in the expression plus the contents of every
 * module-local constant it names.
 *
 * BOTH spellings are read. `className=` is the JSX attribute; `className:` is a
 * property of a props object spread onto the tag, which is how `Combobox`,
 * `MultiSelect`, `DatePicker` and `DateRangePicker` write their popovers
 * (`getFloatingProps({ className: … })`). Matching only `=` made those four
 * scrolling listboxes invisible to this gate — the exact false negative that
 * makes a guard worse than none, since it reports OK over unchecked code.
 */
function classNameSites(src, consts) {
  const sites = [];
  for (const m of src.matchAll(/\bclassName\s*[:=]\s*/g)) {
    const expression = valueExpression(src, m.index + m[0].length);
    if (!expression) continue;

    const pool = [...expression.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map((s) => s[2]);
    for (const id of expression.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      const resolved = consts.get(id[1]);
      if (resolved) pool.push(...resolved);
    }
    sites.push({ pool, line: lineOf(src, m.index), tag: owningTag(src, m.index), index: m.index });
  }
  return sites;
}

/* ------------------------------------------------------------------ */
/*  The check                                                          */
/* ------------------------------------------------------------------ */

const offenders = [];
/** Every class that appears in ANY `className` pool alongside a containing-block utility. */
const classesWithUtilityContainingBlock = new Set();

const tsxFiles = globSync("**/*.tsx", { cwd: SRC, absolute: true, nodir: true }).sort();
const cssFiles = globSync("**/*.css", { cwd: SRC, absolute: true, nodir: true }).sort();
/** `.ts` too: a shared class string is routinely a plain module with no JSX in it. */
const moduleFiles = globSync("**/*.{ts,tsx}", { cwd: SRC, absolute: true, nodir: true }).sort();

const tsxSources = new Map(tsxFiles.map((f) => [f, readFileSync(f, "utf8")]));
const moduleSources = new Map(moduleFiles.map((f) => [f, readFileSync(f, "utf8")]));
const ownConsts = new Map([...moduleSources].map(([f, src]) => [f, ownConstStrings(src)]));

/** A relative specifier resolved to a file this script has read, or null. */
function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = join(dirname(fromFile), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (moduleSources.has(candidate)) return candidate;
  }
  return null;
}

/**
 * A file's own constants, widened by the named imports it actually writes. Only
 * along real `import` edges and only for the names it actually imports, so no
 * element is ever exempted by a same-named constant it does not reference.
 */
const constCache = new Map();
function constStrings(file) {
  const cached = constCache.get(file);
  if (cached) return cached;
  const map = new Map(ownConsts.get(file) ?? []);
  for (const m of (moduleSources.get(file) ?? "").matchAll(
    /\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g
  )) {
    const target = resolveSpecifier(file, m[2]);
    if (!target) continue;
    const exported = ownConsts.get(target);
    if (!exported) continue;
    for (const spec of m[1].split(",")) {
      // `import { a as b }` binds under the LOCAL name.
      const [imported, local] = spec.trim().split(/\s+as\s+/);
      const name = (local ?? imported)?.trim();
      const value = exported.get(imported?.trim());
      if (name && value) map.set(name, value);
    }
  }
  constCache.set(file, map);
  return map;
}

// Pass 1 — collect which bare class names are accompanied by a positioning
// utility, so `.tabs-list { overflow-x: auto }` in CSS can be satisfied by a
// `relative` written in the .tsx, and vice versa.
for (const [file, src] of tsxSources) {
  const consts = constStrings(file);
  for (const site of classNameSites(src, consts)) {
    if (!hasContainingBlockUtility(site.pool)) continue;
    for (const c of splitClasses(site.pool)) classesWithUtilityContainingBlock.add(c);
  }
}

// Pass 2 — .tsx scrollports.
let tsxScrollports = 0;
for (const [file, src] of tsxSources) {
  const consts = constStrings(file);
  for (const site of classNameSites(src, consts)) {
    const isDomTag = site.tag !== null && /^[a-z]/.test(site.tag);
    const inlineStyle = siblingAttribute(src, site.index, "style") ?? "";
    const scrollsByUtility = hasScrollUtility(site.pool);
    const scrollsByInlineStyle =
      isDomTag && new RegExp(`overflow(?:X|Y|Block|Inline)?\\s*:\\s*["']?(?:auto|scroll)`).test(inlineStyle);
    if (!scrollsByUtility && !scrollsByInlineStyle) continue;

    tsxScrollports += 1;
    if (hasContainingBlockUtility(site.pool)) continue;
    if (/\bfloatingStyles\b/.test(inlineStyle)) continue;

    offenders.push(
      `${relative(ROOT, file)}:${site.line}  <${site.tag ?? "?"}> scrolls but is not positioned` +
        `\n      classes: ${splitClasses(site.pool).join(" ") || "(none)"}`
    );
  }
}

// Pass 3 — .css scrollports. Rules are matched on their whole selector list and
// on each individual selector, so `.a, .b { overflow: auto }` is judged per name.
let cssScrollports = 0;
for (const file of cssFiles) {
  const src = readFileSync(file, "utf8");
  const declarationsBySelector = new Map();
  for (const rule of src.matchAll(/(^|[}\s])([^{}@/]+?)\{([^{}]*)\}/g)) {
    const selector = rule[2].trim();
    if (!selector || selector.startsWith("@")) continue;
    for (const one of selector.split(",")) {
      const key = one.trim();
      if (!key) continue;
      declarationsBySelector.set(key, (declarationsBySelector.get(key) ?? "") + ";" + rule[3]);
    }
  }
  for (const [selector, declarations] of declarationsBySelector) {
    if (!SCROLL_DECLARATION.test(declarations)) continue;
    cssScrollports += 1;
    if (CONTAINING_BLOCK_DECLARATION.test(declarations)) continue;
    // The other half may be a utility in the .tsx that renders this class.
    const bare = /^\.([\w-]+)$/.exec(selector)?.[1];
    if (bare && classesWithUtilityContainingBlock.has(bare)) continue;
    // The selector where it OPENS a rule, not its first mention — which is
    // routinely a docblock discussing the class dozens of lines earlier.
    const opens = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:,[^{}]*)?\\{`);
    const line = lineOf(src, opens.exec(src)?.index ?? src.indexOf(selector));
    offenders.push(
      `${relative(ROOT, file)}:${line}  \`${selector}\` scrolls but is not positioned`
    );
  }
}

if (offenders.length > 0) {
  console.error(
    `verify:scrollport-containing-block — ${offenders.length} scrollport(s) with no containing block:\n` +
      offenders.map((o) => `  ${o}`).join("\n") +
      "\n\nA scrollport that is not a containing block lets every absolutely-positioned\n" +
      "descendant resolve against an ancestor OUTSIDE its clip, laid out at its static\n" +
      "position in UNSCROLLED content coordinates — so scrolling the scrollport leaves\n" +
      "that box stretching the page by the full scroll range. The library's own\n" +
      "visually-hidden text is `position: absolute` with no offsets and `Badge` renders\n" +
      "one by default, so any content at all is enough to trigger it.\n\n" +
      "Add `relative` (or `position: relative`) to the element itself. It leaves\n" +
      "`z-index: auto`, so it creates no stacking context, and unlike\n" +
      "`transform`/`contain` it does not capture a consumer's `position: fixed`."
  );
  process.exit(1);
}

console.log(
  `verify:scrollport-containing-block — OK (${tsxScrollports} utility + ${cssScrollports} stylesheet scrollports, all positioned)`
);
