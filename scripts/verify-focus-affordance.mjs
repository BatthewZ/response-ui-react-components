#!/usr/bin/env node
// Verifies that every focusable control which resets its focus outline declares a
// replacement focus affordance.
//
// Why a Node script and not a test: `tsc` cannot see CSS, jsdom applies no
// stylesheets, and vitest stubs CSS imports to an empty string (`test.css: false`),
// so no test in this package can assert anything about a rule in a .css file. The
// whole "outline removed, nothing put back" defect class (WCAG 2.4.7) is otherwise
// unguarded — see bugs/LEDGER.md #73, #116, #129, #242.
//
// The invariant:
//
//   If something resets the outline AND it lands on an element that can take DOM focus,
//   then some focus-keyed rule or utility must paint a replacement ring in
//   `--C-BORDER-FOCUS` — a ring with both a COLOUR and a WIDTH, since either alone
//   paints zero pixels.
//
// "Resets the outline" is read in every spelling, because each of these paints nothing
// and each was found live: `outline: none`, `outline: 0`, `outline: 0 solid red`,
// `outline: medium none`, `outline: 2px solid transparent`, a separate
// `outline-color: transparent` after a real `outline:` shorthand, and the Tailwind
// `outline-none` / `focus-visible:outline-none` utilities (see `isOutlineReset`).
//
// `all: unset` and `all: initial` are outline resets too, and they were the one spelling
// this script never read. `outline-style`'s initial value is `none`, so a rule whose
// first declaration is `all: unset` deletes the UA focus ring on every element it
// matches — and because the property never appears by name, `isOutlineReset` was never
// even called. Found live on `FileUpload`'s Replace and Clear all buttons, which had no
// focus indicator at all while every gate was green. Teaching it cost nothing and
// brought six further controls (`Switch`, `Pagination`, `Tabs` and three `CalendarBase`
// rules) under the guard that had been invisible to it.
//
// The reset and its replacement need not sit in the same FILE. A reset must stay
// first-in-rule and `[all:unset]` sorts last in `@layer utilities`, so the common shape
// after the CSS-to-utilities sweep is `all: unset` surviving in the stylesheet while the
// ring is a `focus-visible:outline-border-focus` utility in the `.tsx`. Both halves are
// paired by ELEMENT.
//
// "Paints a replacement" likewise requires pixels. `focus-visible:ring-border-focus`
// with no `ring-2` leaves `--tw-ring-shadow` at `0 0 #0000`, and
// `border-0 focus-visible:border-border-focus` recolours a border with no width; both
// used to pass here (see `twRing` / `hasRingWidth`).
//
// Both halves of the codebase are read, because the same defect is written both ways:
// stylesheets (src/**/*.css, ledger #116/#129) and Tailwind utilities in JSX
// `className` expressions (src/**/*.tsx, ledger #73).
//
// Focusability is derived from source, never from a list. For every class that
// appears as the subject of a reset rule, the JSX in src/**/*.tsx is scanned for the
// elements that carry it, and an element is focusable when it is a natively
// focusable tag (`button`, `input`, `select`, `textarea`, `summary`, `iframe`,
// `a[href]`), carries `tabIndex` >= 0 (including a roving `cond ? 0 : -1`), is
// `contentEditable`, or is focused at runtime by a `<FloatingFocusManager>` (see
// `managerTabStop` — a JSX attribute scan alone cannot see that one, which is what
// let ledger #129 hide behind an "exemption"). `tabIndex={-1}` and elements that are
// only virtually focused (`aria-activedescendant`) are NOT focusable, and the script
// prints each one with its reason rather than skipping it silently. A reset class
// that cannot be located in any .tsx is an error, not an exemption — the guard says
// so instead of guessing.
//
// The `<FloatingFocusManager>` exemption — "the panel holds tabbable content, so the
// manager focuses that instead" — requires POSITIVE evidence of a tab stop: a native
// control, an explicit `tabIndex >= 0`, or a child component this script can show
// renders one (`buildTabbableComponents`). A child it cannot resolve, or one marked
// `aria-hidden="true"` / `hidden`, confers nothing. An exemption granted on a guess is
// a false alarm pointing the wrong way, and it is the one that costs a ring.
//
// A replacement may live on the element's own `:focus-visible` (or a pseudo-element
// under it: `.slider:focus-visible::-webkit-slider-thumb`) or its own
// `focus:ring-border-focus` utility, or on a `:focus-within` rule / a
// `focus-within:ring-border-focus` utility keyed to one of its JSX ancestors — the
// wrapper-ring recipe MultiSelect and TagInput use, where the ring belongs to the
// bordered box, not the bare input. Reset and replacement need not sit in the same
// string: every literal in the whole `className` expression is pooled, so Radio's
// two-argument `cn("… focus:outline-none", "focus:ring-2 focus:ring-border-focus")`
// reads as one element.
//
// Utilities hoisted into a shared constant (`const FOCUS_RING = "focus:outline-none
// focus:ring-2 focus:ring-border-focus"`, then `cn(FOCUS_RING)`) are resolved through
// `buildConstStrings`, so moving the strings out of the component files does not
// blind the check. That map is scoped PER FILE and widened only along real `import`
// edges — it used to be one global identifier pool, which both raised false alarms and,
// worse, silently exempted an element by lending it a same-named constant's ring from
// an unrelated file. See `buildConstStrings`.
//
// Scope and non-goals, stated plainly:
// - PRESENCE only. A rule that exists but is out-specified by a competing rule (the
//   RC-6 / ledger #84 / #291 class of defect) still passes here; specificity order is
//   a different check.
// - CONTRAST is not measured. A ring declared in `--C-BORDER-FOCUS` counts even where
//   that token is too low-contrast against the surface (ledger #242).
// - Only string-literal constants resolve. A class string built by a function call or
//   assembled at runtime is invisible: its reset is not seen (a miss, never a false
//   alarm) and it does not count as a replacement.
// - Runtime focus() calls other than `<FloatingFocusManager>`'s are not modelled.
// - A CSS ring is judged on the presence of `var(--C-BORDER-FOCUS)` in a `box-shadow`
//   or `outline`, and only the `outline` half is checked for zero width. A
//   `box-shadow: 0 0 0 0 var(--C-BORDER-FOCUS)` would count while painting nothing —
//   the CSS twin of the Tailwind colour-without-width hole closed in `twRing`.
// - Reset rules whose subject is not a class (`*:focus`, `button:focus-visible`,
//   `[data-x]:focus`) are skipped: `subjectClass` returns null and there is no class to
//   trace to a JSX carrier. A global element-selector reset is therefore invisible.
// - `buildTabbableComponents` resolves at FILE granularity — every component a file
//   declares inherits that file's verdict. A file that exports both a `<button>`-based
//   trigger and a decorative sibling marks both as holding a tab stop, which can grant
//   an exemption that a per-component analysis would refuse.
//
// Exits 1 on any violation.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

/** A declaration that paints the house focus ring. */
const AFFORDANCE = /(?:box-shadow|outline):\s*[^;]*var\(--C-BORDER-FOCUS\)/g;

const ZERO_LENGTH = /^0(?:px|rem|em|pt|%)?$/;

/**
 * Whether a declaration leaves nothing painted where the outline was. Every spelling
 * counts, not just `outline: none`: the width can be zeroed (`outline: 0 solid red`),
 * the style can be dropped inside the shorthand (`outline: medium none`), and the
 * colour can be made invisible from a separate longhand (`outline: 2px solid;
 * outline-color: transparent`) — which is the form that used to vanish from the report
 * entirely.
 *
 * `all` is the spelling that does not name the property, and it was this script's one
 * blind spot until 2026-07-31. `all: unset` resets every property including
 * `outline-style`, whose initial value is `none` — so the rule deletes the UA focus
 * ring on every element it matches while the word `outline` appears nowhere for
 * `OUTLINE_DECL` to find. Found live on `FileUpload`'s Replace and Clear all buttons,
 * which had no focus indicator at all while this gate stayed green. `initial` and
 * `revert-layer` behave the same way; `revert` rolls back to the UA sheet, which for a
 * `<button>` is `outline: auto` on `:focus-visible` and therefore NOT a reset —
 * it is listed here anyway because a `revert` inside `@layer components` reverts to the
 * layers below it, not to the UA origin, and this package's rules all sit in a layer.
 */
const ALL_RESET = /^(?:unset|initial|revert|revert-layer)$/;

function isOutlineReset(longhand, value) {
  const v = value.replace(/!important/gi, "").trim().toLowerCase();
  if (!v) return false;
  if (longhand === "all") return ALL_RESET.test(v);
  if (longhand === "-offset") return false;
  if (longhand === "-style") return /^(?:none|hidden)$/.test(v);
  if (longhand === "-width") return ZERO_LENGTH.test(v);
  if (longhand === "-color")
    return /\btransparent\b/.test(v) || /rgba?\([^)]*,\s*0(?:\.0+)?\s*\)/.test(v);
  return splitTopLevel(v, (c) => " \t\n".includes(c)).some(
    (t) => t === "none" || t === "hidden" || t === "transparent" || ZERO_LENGTH.test(t),
  );
}

/**
 * `all` is matched only at the head of a declaration, so a `transition: all 0.2s` value
 * cannot be mistaken for it.
 */
const OUTLINE_DECL =
  /(?:^|;)[ \t\r\n]*(?:(all)|outline(-style|-width|-color|-offset)?)\s*:\s*([^;]*)/g;

/** Offset of the property name in the first outline-removing declaration, or -1. */
function resetIndex(decls) {
  OUTLINE_DECL.lastIndex = 0;
  for (let m; (m = OUTLINE_DECL.exec(decls)); ) {
    const longhand = m[1] ?? m[2] ?? "";
    if (isOutlineReset(longhand, m[3]))
      return m.index + m[0].indexOf(m[1] ? "all" : "outline");
  }
  return -1;
}

/**
 * Offset of the first declaration that paints the house ring, or -1. An `outline`
 * shorthand that names the colour and still resets (`outline: 0 solid var(--C-BORDER-FOCUS)`)
 * is not an affordance — it is the reset wearing the token's name.
 */
function affordanceIndex(decls) {
  AFFORDANCE.lastIndex = 0;
  for (let m; (m = AFFORDANCE.exec(decls)); ) {
    const shorthand = /^outline\s*:\s*([^;]*)/.exec(decls.slice(m.index));
    if (shorthand && isOutlineReset("", shorthand[1])) continue;
    return m.index;
  }
  return -1;
}

const NATIVELY_FOCUSABLE = new Set(["button", "input", "select", "textarea", "summary", "iframe"]);

/** Tailwind bases that remove the outline, and the ones that name the house ring colour. */
const TW_RESET = /^(?:outline-none|outline-hidden|outline-0|outline-transparent)$/;
const TW_RING_COLOR = /^(ring|outline|border|shadow)-border-focus$/; // --color-border-focus: var(--C-BORDER-FOCUS)
const FOCUS_VARIANTS = new Set(["focus", "focus-visible", "focus-within"]);

/**
 * Variants that narrow WHERE a utility applies but not to which interaction state, so a
 * reset carrying one still applies while the element is focused. Anything outside this
 * set (`hover:`, `disabled:`, `group-*`, `peer-*`, `data-*`) may exclude the focused
 * state, and a reset carrying one is not read as a focus-state reset.
 *
 * `forced-colors` / `not-forced-colors` are here for the same reason as `dark` and
 * `print`: they select an ENVIRONMENT, never an interaction state, so a reset carrying
 * one is still a focus reset wherever it applies at all. Without this entry
 * `focusOutlineResetControl` — which is `not-forced-colors:focus:outline-none` — stops
 * being recognised as a reset, and this guard drops `Radio` and the six other
 * `focusRingControl` sites out of its coverage entirely: green, and blind. That is
 * `memory/gates.md`'s "a new gate's exemptions are where the next bug lives" arriving
 * on schedule, so it was made to fail on purpose once before being trusted.
 */
const STATE_NEUTRAL_VARIANT =
  /^(?:sm|md|lg|xl|2xl|dark|light|print|rtl|ltr|portrait|landscape|motion-safe|motion-reduce|forced-colors|not-forced-colors|min-\[.*\]|max-.*|supports-.*|\[.*\])$/;

/** Per family: what counts as a ring WIDTH, and which members of that family are zero. */
const RING_WIDTH = {
  ring: { width: /^ring(?:-(?:\d+|\[[^\]]+\]))?$/, zero: /^ring-0$/ },
  outline: { width: /^outline(?:-(?:\d+|\[[^\]]+\]))?$/, zero: /^outline-0$/ },
  border: {
    width: /^border(?:-[xytrbles])?(?:-(?:\d+|\[[^\]]+\]))?$/,
    zero: /^border(?:-[xytrbles])?-0$/,
  },
  shadow: {
    width: /^shadow(?:-(?:sm|md|lg|xl|2xl|inner|\[[^\]]+\]))?$/,
    zero: /^shadow-none$/,
  },
};

const twParts = (token) => {
  const parts = token.split(":");
  return { variants: parts.slice(0, -1), base: parts[parts.length - 1] };
};

/** A reset applies to the focused state when it is unconditional or focus-keyed. */
function isTwReset(token) {
  const { variants, base } = twParts(token);
  return (
    TW_RESET.test(base) &&
    variants.every((v) => FOCUS_VARIANTS.has(v) || STATE_NEUTRAL_VARIANT.test(v))
  );
}

/**
 * A width for `family` that is in effect while `variant` matches. An unqualified width
 * counts — that is how `util/focus.ts` writes the recipe, hoisting `ring-2` out of the
 * variant and switching only the colour. A width scoped to the variant overrides the
 * unqualified ones, so `border-0 focus-visible:border-2` has a width and
 * `border-0 focus-visible:border-border-focus` does not.
 */
function hasRingWidth(tokens, family, variant) {
  const { width, zero } = RING_WIDTH[family];
  const applies = [];
  for (const token of tokens) {
    const { variants, base } = twParts(token);
    if (!width.test(base) && !zero.test(base)) continue;
    if (variants.length && !variants.includes(variant)) continue;
    applies.push({ scoped: variants.length > 0, base });
  }
  const scoped = applies.filter((a) => a.scoped);
  const pool = scoped.length ? scoped : applies;
  return pool.some((a) => !zero.test(a.base));
}

/**
 * The token that paints a visible house ring for `variant`, or undefined.
 *
 * A COLOUR ALONE PAINTS NOTHING. `ring-border-focus` sets `--tw-ring-color` and leaves
 * `--tw-ring-shadow` at `0 0 #0000`; `border-border-focus` recolours a border that
 * `border-0` gave no width. Both used to pass here at zero pixels painted, which is the
 * whole defect this script exists to catch. A width in the same family is required.
 */
function twRing(tokens, variant) {
  for (const token of tokens) {
    const { variants, base } = twParts(token);
    const m = TW_RING_COLOR.exec(base);
    if (!m || !variants.includes(variant)) continue;
    if (hasRingWidth(tokens, m[1], variant)) return token;
  }
  return undefined;
}

const twOwnRing = (tokens) => twRing(tokens, "focus") ?? twRing(tokens, "focus-visible");
const twWithinRing = (tokens) => twRing(tokens, "focus-within");

/** Roles whose elements are pointed at by `aria-activedescendant` instead of focused. */
const VIRTUALLY_FOCUSED_ROLES = new Set([
  "option",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "row",
  "gridcell",
  "treeitem",
  "tab",
]);

/** Recursively collect files under `dir` matching `predicate`. */
function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

/* ------------------------------------------------------------------ */
/*  CSS                                                                */
/* ------------------------------------------------------------------ */

/** Blank out comments while preserving every byte offset (and so every line number). */
const blankComments = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/**
 * Brace-aware rule split. Nested blocks (`@media`, `@keyframes`) push a frame, so an
 * at-rule prelude never swallows the rules inside it the way a flat regex does.
 * At-rule frames themselves are dropped; their children are returned as normal rules.
 */
function parseRules(css) {
  const src = blankComments(css);
  const rules = [];
  const stack = [];
  let buf = "";
  let bufStart = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") {
      stack.push({ prelude: buf.trim(), start: bufStart });
      buf = "";
      bufStart = i + 1;
    } else if (ch === "}") {
      const frame = stack.pop();
      if (frame && frame.prelude && !frame.prelude.startsWith("@")) {
        rules.push({ selector: frame.prelude, decls: buf, declsStart: bufStart });
      }
      buf = "";
      bufStart = i + 1;
    } else {
      buf += ch;
    }
  }
  return rules;
}

/** Split on top-level `,` / combinators, ignoring anything inside `(...)` or `[...]`. */
function splitTopLevel(text, isBoundary) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && isBoundary(ch)) {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const selectorList = (sel) => splitTopLevel(sel, (c) => c === ",");
const compounds = (sel) => splitTopLevel(sel, (c) => " \t\n>+~".includes(c));

/** Classes named in a compound, with `(...)` groups (`:not(.x)`) removed first. */
function classesIn(compound) {
  const flat = compound.replace(/\([^()]*\)/g, "");
  return [...flat.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
}

/** The class the rule actually styles: the last class of its rightmost compound. */
function subjectClass(selector) {
  const parts = compounds(selector);
  for (let i = parts.length - 1; i >= 0; i--) {
    const found = classesIn(parts[i]);
    if (found.length) return found[found.length - 1];
  }
  return null;
}

const cssFiles = walk(SRC, (p) => p.endsWith(".css")).sort();

const resets = []; // { cls, file, line, selector }
const ringFor = new Map(); // class -> [{ file, line, selector }]  (:focus-visible / :focus)
const withinRingFor = new Map(); // class -> [{ file, line, selector }]  (:focus-within)

for (const file of cssFiles) {
  const css = readFileSync(file, "utf8");
  for (const rule of parseRules(css)) {
    const focusKeyed = /:focus(-visible|-within)?\b/.test(rule.selector);
    const within = /:focus-within\b/.test(rule.selector);

    const paint = focusKeyed ? affordanceIndex(rule.decls) : -1;
    if (paint !== -1) {
      const line = lineAt(css, rule.declsStart + paint);
      for (const one of selectorList(rule.selector)) {
        const cls = subjectClass(one);
        if (!cls) continue;
        const bucket = within ? withinRingFor : ringFor;
        if (!bucket.has(cls)) bucket.set(cls, []);
        bucket.get(cls).push({ file, line, selector: one });
      }
    }

    const hit = resetIndex(rule.decls);
    if (hit === -1) continue;
    const line = lineAt(css, rule.declsStart + hit);
    for (const one of selectorList(rule.selector)) {
      const cls = subjectClass(one);
      if (cls) resets.push({ cls, file, line, selector: one });
    }
  }
}

/* ------------------------------------------------------------------ */
/*  JSX                                                                */
/* ------------------------------------------------------------------ */

/**
 * Reads the opening tag starting at `<` and returns its end offset, honouring quotes
 * and brace nesting so `onChange={(e) => f(e)}` does not end the tag at its arrow.
 */
function tagEnd(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return i;
  }
  return -1;
}

/** Every string/template literal body inside an attribute expression, split into tokens. */
function literalTokens(text) {
  const out = [];
  for (const m of text.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
    for (const token of (m[1] ?? m[2] ?? m[3]).split(/\s+/)) if (token) out.push(token);
  }
  return out;
}

/**
 * Reads `name`'s value out of an opening tag's attribute text, returning the raw text
 * and how it was delimited. Accepts both `name={…}` / `name="…"` and `name: …`, because
 * half this library writes its props through Floating UI's prop getters —
 * `<input {...getReferenceProps({ className: cn(…) })} />` — where the attribute is an
 * object property inside the spread, not a JSX attribute.
 */
function readAttr(attrs, name) {
  const re = new RegExp(`(?:^|[\\s{,])${name}\\s*[=:]\\s*`, "i");
  const m = re.exec(attrs);
  if (!m) return undefined;
  const rest = attrs.slice(m.index + m[0].length);

  if (rest[0] === "{") {
    let depth = 0;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "{") depth++;
      else if (rest[i] === "}" && --depth === 0) return { kind: "expr", text: rest.slice(1, i) };
    }
    return { kind: "expr", text: rest.slice(1) };
  }

  const q = rest[0];
  if (q === '"' || q === "'") {
    const end = rest.indexOf(q, 1);
    return { kind: "string", text: end === -1 ? rest.slice(1) : rest.slice(1, end) };
  }

  // Bare object-property value: consume a balanced expression up to the next top-level
  // `,` / `}` / newline, so a multi-line `cn(\n "a",\n b,\n)` is not truncated at `cn(`.
  let depth = 0;
  let quote = null;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      if (depth === 0) return { kind: "expr", text: rest.slice(0, i) };
      depth--;
    } else if (depth === 0 && (ch === "," || ch === "\n"))
      return { kind: "expr", text: rest.slice(0, i) };
  }
  return { kind: "expr", text: rest };
}

const attrValue = (attrs, name) => readAttr(attrs, name)?.text;

const hasAttr = (attrs, name) => new RegExp(`(?:^|[\\s{])${name}\\b`, "i").test(attrs);

/**
 * Identifier -> the string literals it can hold, resolved to a fixpoint across every
 * non-test module, so a template class such as `` `${PREFIX}-item` `` resolves to the
 * concrete names it can actually emit. Without it a template class is an unanchored
 * wildcard that would wrongly claim `.combobox-item` too.
 *
 * The case this was written for — `menu-internals`' `` `${classPrefix}-item` ``,
 * resolved through `CLASS_PREFIX` in DropdownMenu and ContextMenu — **no longer
 * exists**: those five class names are static now, precisely because a template class
 * is invisible to Tailwind's scanner and to every static reader including this one.
 * The resolver stays because the shape can recur and because an unresolvable
 * interpolation is dropped rather than widened (see `expandTemplate`).
 */
function buildLiteralMap(files) {
  const literals = new Map(); // name -> Set<string>
  const aliases = []; // [name, otherName]
  const add = (name, value) => {
    if (!literals.has(name)) literals.set(name, new Set());
    literals.get(name).add(value);
  };
  for (const file of files) {
    const text = blankComments(readFileSync(file, "utf8"));
    for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']([^"'\n]*)["']/g))
      add(m[1], m[2]);
    for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*["']([^"'\n]*)["']/g)) add(m[1], m[2]);
    for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)\s*(?=[,}\n])/g))
      aliases.push([m[1], m[2]]);
  }
  for (let pass = 0; pass < 5; pass++) {
    let grew = false;
    for (const [name, source] of aliases) {
      for (const value of literals.get(source) ?? []) {
        const before = literals.get(name)?.size ?? 0;
        add(name, value);
        if ((literals.get(name)?.size ?? 0) !== before) grew = true;
      }
    }
    if (!grew) break;
  }
  return literals;
}

/**
 * Expand `${ident}` against the literal map. A token whose interpolations cannot all
 * be resolved is dropped rather than turned into a wildcard: a wildcard would match
 * unrelated classes, and a dropped token surfaces later as an UNLOCATED violation.
 */
function expandTemplate(token, literals) {
  let out = [token];
  for (let guard = 0; guard < 4 && out.some((t) => t.includes("${")); guard++) {
    out = out.flatMap((t) => {
      const m = /\$\{\s*([A-Za-z_$][\w$]*)\s*\}/.exec(t);
      if (!m) return [t];
      const values = literals.get(m[1]);
      if (!values || values.size === 0) return [];
      return [...values].map((v) => t.slice(0, m.index) + v + t.slice(m.index + m[0].length));
    });
  }
  return out.filter((t) => !t.includes("${"));
}

/**
 * Class tokens an element may carry. `className={cn("a", flag && "b")}` yields both;
 * `` className={`${prefix}-item`} `` is expanded through the literal map.
 */
function classTokens(attrs, literals) {
  const raw = readAttr(attrs, "className");
  if (raw === undefined) return [];
  const tokens =
    raw.kind === "string" ? raw.text.split(/\s+/).filter(Boolean) : literalTokens(raw.text);
  return tokens.flatMap((t) => (t.includes("${") ? expandTemplate(t, literals) : [t]));
}

const CONST_DECL = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

/** `import { a, b as c } from "./x"` — the named bindings and the module they came from. */
const IMPORT_DECL = /\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

/**
 * Resolve a relative specifier the way the bundler does, against the file list we
 * already have. Extensionless and `/index` forms both occur in this package.
 */
function resolveSpecifier(fromFile, spec, known) {
  if (!spec.startsWith(".")) return null;
  const base = join(dirname(fromFile), spec);
  for (const cand of [base, `${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")])
    if (known.has(cand)) return cand;
  return null;
}

/**
 * `const NAME = "…"` string constants, **scoped to the file that declares them** and
 * widened only along real `import` edges. Deliberately narrower than `buildLiteralMap`:
 * object properties are excluded, because `className: "…"` appears as a property all
 * over this library and would then resolve the *parameter* named `className` in every
 * `cn(…, className)` call to some other file's classes.
 *
 * **The scoping is the correctness property, not a tidy-up.** This map used to be one
 * global identifier → value pool, so every file declaring `const panelClasses` shared
 * one merged value. 42 top-level names are duplicated across `src/components` right now
 * (`rootClasses`, `contentClasses`, `baseClasses`, `triggerClasses`, `panelClasses` …),
 * and the pooling failed in BOTH directions:
 *
 * - Loudly — `Tabs.tsx`'s `panelClasses` ("pt-r3") pooled with `ColorPicker.tsx`'s
 *   (which carries `outline-none`), and the gate reported a false `NO AFFORDANCE`
 *   violation on a `tabIndex={0}` tabpanel that resets nothing.
 * - Silently, which is worse — a pooled *ring* from an unrelated file satisfies an
 *   element that has none, and the gate prints OK. Nothing distinguished the two cases,
 *   and the quiet one leaves a real control with no focus indicator.
 *
 * Imports are followed so the shared recipes in `util/focus.ts` and `layout/shared.ts`
 * still resolve at every consumer — which is the one thing the global pool got right,
 * and the only reason it survived this long.
 */
function buildConstStrings(files) {
  const known = new Set(files);
  const own = new Map(); // file -> Map(name -> Set<string>)
  const imports = new Map(); // file -> [{ local, imported, from }]

  for (const file of files) {
    const text = blankComments(readFileSync(file, "utf8"));
    const declared = new Map();
    for (const m of text.matchAll(CONST_DECL)) {
      if (!declared.has(m[1])) declared.set(m[1], new Set());
      declared.get(m[1]).add(m[2] ?? m[3] ?? m[4]);
    }
    own.set(file, declared);

    const edges = [];
    for (const m of text.matchAll(IMPORT_DECL)) {
      const from = resolveSpecifier(file, m[2], known);
      if (!from) continue;
      for (const clause of m[1].split(",")) {
        const [imported, local] = clause.trim().split(/\s+as\s+/);
        if (imported) edges.push({ local: (local ?? imported).trim(), imported: imported.trim(), from });
      }
    }
    imports.set(file, edges);
  }

  // Per-file view: own declarations win over an imported binding of the same name.
  const scoped = new Map();
  for (const file of files) {
    const view = new Map(own.get(file));
    for (const { local, imported, from } of imports.get(file) ?? []) {
      if (view.has(local)) continue;
      const values = own.get(from)?.get(imported);
      if (values) view.set(local, new Set(values));
    }
    scoped.set(file, view);
  }

  // Expand `${…}` to a fixpoint, each file against its own view only.
  for (let pass = 0; pass < 4; pass++) {
    for (const view of scoped.values()) {
      for (const [name, values] of view) {
        const resolved = [...values].map((v) =>
          v.replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, id) => {
            const source = view.get(id);
            // An ambiguous or unknown name is left as written: it survives as a token
            // that matches neither a reset nor a ring, which is inert either way.
            return source?.size === 1 ? [...source][0] : whole;
          }),
        );
        view.set(name, new Set(resolved));
      }
    }
  }
  return scoped;
}

/**
 * Utility tokens an element may carry: its own literals plus the contents of any
 * string constant it names, so a `className={cn(FOCUS_RING)}` refactor stays visible.
 * Kept separate from `classTokens` so a resolved constant can never be mistaken for a
 * component class and silently re-point the stylesheet half of the check.
 */
function utilityTokens(attrs, literals, consts) {
  const raw = readAttr(attrs, "className");
  if (raw === undefined) return [];
  const tokens = classTokens(attrs, literals);
  if (raw.kind !== "expr") return tokens;
  const identifiers = raw.text.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, " ");
  const named = [...identifiers.matchAll(/[A-Za-z_$][\w$]*/g)]
    .flatMap((m) => [...(consts.get(m[0]) ?? [])])
    .flatMap((v) => v.split(/\s+/))
    .filter(Boolean);
  return [...tokens, ...named];
}

/**
 * Elements in one .tsx, each with its JSX ancestors' class tokens. Comments are
 * blanked first (this repo's docblocks are full of JSX), and `<` only opens a tag when
 * the preceding character cannot end an identifier — which is what separates `<div`
 * from `useState<number>` and `forwardRef<HTMLDivElement, P>`.
 */
function scanElements(file, text, literals, consts) {
  const src = blankComments(text).replace(/(^|[^:])\/\/[^\n]*/gm, (m, keep) =>
    keep + " ".repeat(m.length - keep.length),
  );

  // `const triggerProps = mergeProps(props, { className: cn("colorpicker-trigger", …) })`
  // then `<button {...getReferenceProps({ ...triggerProps })}>` — the classes reach the
  // element through a named props object, so index those objects and follow the spread.
  // `{ as: Tag = "button" }` then `<Tag>`: a polymorphic tag whose default is a
  // literal element name is that element, not an opaque component. Button's whole
  // focus affordance rides on this — without it `<Tag>` reads as unfocusable.
  const tagAliases = new Map();
  for (const m of src.matchAll(/\b([A-Z][\w$]*)\s*=\s*["']([a-z][a-z0-9]*)["']/g)) {
    if (!tagAliases.has(m[1])) tagAliases.set(m[1], new Set());
    tagAliases.get(m[1]).add(m[2]);
  }
  const resolveTag = (tag) => {
    const values = tagAliases.get(tag);
    return values?.size === 1 ? [...values][0] : tag;
  };

  const spreadClasses = new Map();
  const spreadUtilities = new Map();
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?);\n/g)) {
    if (!m[2].includes("className")) continue;
    spreadClasses.set(m[1], classTokens(m[2], literals));
    spreadUtilities.set(m[1], utilityTokens(m[2], literals, consts));
  }

  const out = [];
  const stack = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "<") continue;

    if (src[i + 1] === "/") {
      const m = /^<\/\s*([A-Za-z][A-Za-z0-9._$-]*)\s*>/.exec(src.slice(i));
      if (!m) continue;
      for (let d = stack.length - 1; d >= 0; d--) {
        if (stack[d].tag === m[1]) {
          stack.length = d;
          break;
        }
      }
      i += m[0].length - 1;
      continue;
    }

    const prev = src[i - 1];
    if (prev !== undefined && /[A-Za-z0-9_$)\]]/.test(prev)) continue;
    const name = /^<([A-Za-z][A-Za-z0-9._$-]*)/.exec(src.slice(i));
    if (!name) continue;
    const end = tagEnd(src, i);
    if (end === -1) continue;

    const attrs = src.slice(i + name[0].length, end).replace(/\/$/, "");
    const spreads = [...attrs.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
    const classes = [
      ...classTokens(attrs, literals),
      ...spreads.flatMap((n) => spreadClasses.get(n) ?? []),
    ];
    const utilities = [
      ...utilityTokens(attrs, literals, consts),
      ...spreads.flatMap((n) => spreadUtilities.get(n) ?? []),
    ];
    const parent = stack[stack.length - 1];
    const manager = parent?.tag === "FloatingFocusManager" ? parent : undefined;
    out.push({
      id: out.length,
      file,
      line: lineAt(src, i),
      tag: resolveTag(name[1]),
      classes,
      utilities,
      ancestorIds: stack.map((f) => f.id),
      ancestorClasses: stack.flatMap((f) => f.classes),
      ancestorUtilities: stack.flatMap((f) => f.utilities),
      tabIndex: attrValue(attrs, "tabIndex"),
      href: hasAttr(attrs, "href"),
      contentEditable: hasAttr(attrs, "contentEditable"),
      role: attrValue(attrs, "role"),
      ariaHidden: attrValue(attrs, "aria-hidden"),
      hidden: hasAttr(attrs, "hidden"),
      managerOrder: manager && attrValue(manager.attrs, "order"),
      managed: manager !== undefined,
    });
    if (src[end - 1] !== "/")
      stack.push({ id: out.length - 1, tag: name[1], classes, utilities, attrs });
    i = end;
  }
  return out;
}

const tsxFiles = walk(SRC, (p) => /\.tsx?$/.test(p) && !p.includes(".test.")).sort();
const literals = buildLiteralMap(tsxFiles);
const constStrings = buildConstStrings(tsxFiles);
const elements = [];
const virtualFocusFiles = new Set();
const dialogRoleFiles = new Set();
for (const file of tsxFiles.filter((p) => p.endsWith(".tsx"))) {
  const text = readFileSync(file, "utf8");
  if (text.includes("aria-activedescendant")) virtualFocusFiles.add(file);
  if (/useRole\([^)]*role:\s*["'](?:dialog|alertdialog)["']/.test(text)) dialogRoleFiles.add(file);
  elements.push(...scanElements(file, text, literals, constStrings.get(file) ?? new Map()));
}

const carriersOf = (cls) => elements.filter((el) => el.classes.includes(cls));

/** Removed from the accessibility tree or from layout, so it holds no tab stop. */
const isDecorative = (el) =>
  el.ariaHidden?.trim().replace(/^["']|["']$/g, "") === "true" ||
  el.hidden ||
  el.classes.includes("hidden") ||
  el.utilities.includes("hidden");

/** A tab stop visible in the element's own attributes, with no guessing about children. */
const nativeTabStop = (el) =>
  el.tabIndex !== undefined
    ? !/^-\s*1$/.test(el.tabIndex.trim())
    : NATIVELY_FOCUSABLE.has(el.tag) || (el.tag === "a" && el.href) || el.contentEditable;

/**
 * Component names whose render is KNOWN to contain a tab stop. Resolved at file
 * granularity — every component a file declares inherits that file's verdict — and to a
 * fixpoint through the capitalized tags each file renders, so `<Calendar>` is known to
 * hold day buttons while an icon imported from outside `src` is known only as "no
 * evidence".
 *
 * The polarity is the point. The rule this replaces treated ANY `<Capitalized/>` child
 * as a possible tab stop, so adding one decorative icon to a floating panel made
 * `managerTabStop` conclude the manager would focus the icon instead of the panel — and
 * a real NO-AFFORDANCE violation became an "Exempt" line (ledger #129, reachable by the
 * most ordinary edit anyone makes to a popover). Requiring positive evidence instead
 * means an unknown child leaves the panel looking like the tab stop, which demands a
 * ring: the direction that reports rather than excuses.
 */
function buildTabbableComponents(files, els) {
  const declares = new Map();
  const uses = new Map();
  const tabbableFiles = new Set();
  for (const file of files) {
    const text = blankComments(readFileSync(file, "utf8"));
    declares.set(
      file,
      new Set(
        [...text.matchAll(/\b(?:function|const|let|var|class)\s+([A-Z][\w$]*)/g)].map((m) => m[1]),
      ),
    );
    uses.set(file, new Set());
  }
  for (const el of els) {
    if (isDecorative(el)) continue;
    if (nativeTabStop(el)) tabbableFiles.add(el.file);
    else if (/^[A-Z]/.test(el.tag)) uses.get(el.file)?.add(el.tag);
  }

  const declarersOf = new Map(); // component name -> files declaring it
  for (const [file, names] of declares) {
    for (const name of names) {
      if (!declarersOf.has(name)) declarersOf.set(name, []);
      declarersOf.get(name).push(file);
    }
  }

  for (let pass = 0; pass < 10; pass++) {
    let grew = false;
    for (const [file, tags] of uses) {
      if (tabbableFiles.has(file)) continue;
      for (const tag of tags) {
        if ((declarersOf.get(tag) ?? []).some((f) => tabbableFiles.has(f))) {
          tabbableFiles.add(file);
          grew = true;
          break;
        }
      }
    }
    if (!grew) break;
  }

  const known = new Set();
  for (const file of tabbableFiles) for (const name of declares.get(file) ?? []) known.add(name);
  return known;
}

const tabbableComponents = buildTabbableComponents(
  tsxFiles.filter((p) => p.endsWith(".tsx")),
  elements,
);

/** Something that holds a tab stop: seen directly, or a component known to render one. */
const maybeTabbable = (el) =>
  !isDecorative(el) &&
  (nativeTabStop(el) ||
    (el.tabIndex === undefined && /^[A-Z]/.test(el.tag) && tabbableComponents.has(el.tag)));

const hasTabbableContent = (el) =>
  elements.some((d) => d.file === el.file && d.ancestorIds.includes(el.id) && maybeTabbable(d));

const isDialog = (el) => /dialog/i.test(el.role ?? "") || dialogRoleFiles.has(el.file);

/**
 * Whether `<FloatingFocusManager>` turns its child into a tab stop and focuses it.
 * Ported from the library's own `handleTabIndex`: for a floating element that is a
 * dialog (or an explicit `order` that includes "floating") it sets `tabindex="0"`
 * when there is no tabbable content to hold focus instead, and the mount effect then
 * focuses `tabbables[initialFocus] || floatingElement`. `initialFocus={-1}` only
 * suppresses that initial move — the tab stop remains — so it is not consulted here.
 */
function managerTabStop(el) {
  if (!el.managed) return false;
  const floatingFirst = /\bfloating\b/.test(el.managerOrder ?? "");
  if (!floatingFirst && !isDialog(el)) return false;
  return floatingFirst || !hasTabbableContent(el);
}

/**
 * Focusability, from the element alone. `tabIndex` wins over the tag: a `<button
 * tabIndex={-1}>` (Combobox's toggle) is not in the tab order and is not focused by
 * the component, while a roving `tabIndex={active ? 0 : -1}` is.
 */
function focusability(el) {
  if (el.tabIndex !== undefined) {
    const t = el.tabIndex.trim();
    if (/^-\s*1$/.test(t)) return { focusable: false, why: `tabIndex={-1}` };
    if (/(?:^|[^-\w])\d/.test(t) || /^\d/.test(t))
      return { focusable: true, why: `tabIndex={${t}}` };
    return { focusable: true, why: `tabIndex={${t}} (not statically resolvable — treated as focusable)` };
  }
  if (NATIVELY_FOCUSABLE.has(el.tag)) return { focusable: true, why: `<${el.tag}>` };
  if (el.tag === "a" && el.href) return { focusable: true, why: `<a href>` };
  if (el.contentEditable) return { focusable: true, why: `contentEditable` };
  if (managerTabStop(el))
    return {
      focusable: true,
      why: `<${el.tag}> given tabindex="0" and focused by <FloatingFocusManager> (dialog holding no tabbable content)`,
    };
  const virtual = virtualFocusFiles.has(el.file) && VIRTUALLY_FOCUSED_ROLES.has(el.role);
  const managed = el.managed
    ? isDialog(el)
      ? `<${el.tag}> in <FloatingFocusManager> — holds tabbable content, so the manager focuses that instead, never the panel`
      : `<${el.tag}> in <FloatingFocusManager> — not a dialog, so the manager leaves it without a tabindex and never focuses it`
    : undefined;
  return {
    focusable: false,
    why:
      managed ??
      (virtual
        ? `<${el.tag} role="${el.role}"> with no tabIndex — virtually focused via aria-activedescendant, never DOM-focused`
        : `<${el.tag}> with no tabIndex — never DOM-focused`),
  };
}

/* ------------------------------------------------------------------ */
/*  Check                                                              */
/* ------------------------------------------------------------------ */

const violations = [];
const exemptions = [];
const guarded = [];
const scanned = `${cssFiles.length} stylesheets, ${elements.length} JSX elements`;

const seen = new Set();
for (const reset of resets.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
  const key = `${reset.file}#${reset.cls}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const anchor = `${relative(ROOT, reset.file)}:${reset.line}`;
  const carriers = carriersOf(reset.cls);
  if (carriers.length === 0) {
    violations.push(
      `UNLOCATED  .${reset.cls} (${anchor}) resets its outline, but no element in src/**/*.tsx ` +
        `carries that class — focusability cannot be derived, so the reset cannot be judged.`,
    );
    continue;
  }

  const focusable = carriers.filter((el) => focusability(el).focusable);
  if (focusable.length === 0) {
    const reasons = [...new Set(carriers.map((el) => focusability(el).why))].join("; ");
    exemptions.push(
      `.${reset.cls} (${anchor}) — ${reasons} [${relative(ROOT, carriers[0].file)}:${carriers[0].line}]`,
    );
    continue;
  }

  const own = ringFor.get(reset.cls);
  const wrapper = focusable
    .flatMap((el) => el.ancestorClasses)
    .flatMap((cls) => withinRingFor.get(cls) ?? []);
  const ring = own ?? (wrapper.length ? wrapper : null);

  /**
   * The replacement need not live in CSS, and after the CSS-to-utilities sweep it
   * usually does not. A reset has to stay first-in-rule and `[all:unset]` would sort
   * last in `@layer utilities`, so the common shape is now `all: unset` surviving in
   * the stylesheet while the ring that answers it is a
   * `focus-visible:outline-border-focus` utility in the `.tsx` — `Pagination` and
   * `Tabs` are both exactly this. This half of the script only ever consulted CSS
   * rings, so it called both of them unguarded. Pair by ELEMENT, not by file: the two
   * halves are one control either way, and demanding they share a file would fail two
   * correct components and teach the next author to put the reset back into the class
   * list, which is the inversion the sweep exists to avoid.
   */
  const twSite = ring
    ? null
    : focusable
        .map((el) => {
          const token = twOwnRing(el.utilities) ?? twWithinRing(el.ancestorUtilities);
          return token ? { el, token } : null;
        })
        .find(Boolean);

  if (!ring && !twSite) {
    const el = focusable[0];
    violations.push(
      `NO AFFORDANCE  .${reset.cls} (${anchor}) resets the outline on a focusable control ` +
        `(${focusability(el).why} at ${relative(ROOT, el.file)}:${el.line}) and neither a ` +
        `focus-keyed rule nor a focus-variant utility paints a replacement in var(--C-BORDER-FOCUS).`,
    );
    continue;
  }
  if (twSite) {
    guarded.push(
      `.${reset.cls} (${anchor}) — ${focusability(twSite.el).why} — ring \`${twSite.token}\` ` +
        `at ${relative(ROOT, twSite.el.file)}:${twSite.el.line}`,
    );
    continue;
  }
  const el = focusable[0];
  guarded.push(
    `.${reset.cls} (${anchor}) — ${focusability(el).why} — ring at ` +
      `${relative(ROOT, ring[0].file)}:${ring[0].line} \`${ring[0].selector}\``,
  );
}

/* Tailwind utilities: the same invariant, one element at a time (ledger #73). */
for (const el of elements) {
  const reset = el.utilities.find(isTwReset);
  if (!reset) continue;

  const anchor = `${relative(ROOT, el.file)}:${el.line}`;
  const { focusable, why } = focusability(el);
  if (!focusable) {
    exemptions.push(`\`${reset}\` (${anchor}) — ${why}`);
    continue;
  }

  const own = twOwnRing(el.utilities);
  const wrapper = twWithinRing(el.ancestorUtilities);
  const ownCss = el.classes.flatMap((cls) => ringFor.get(cls) ?? [])[0];
  const wrapperCss = el.ancestorClasses.flatMap((cls) => withinRingFor.get(cls) ?? [])[0];

  if (own) guarded.push(`\`${reset}\` (${anchor}) — ${why} — ring \`${own}\` on the same element`);
  else if (wrapper)
    guarded.push(`\`${reset}\` (${anchor}) — ${why} — ring \`${wrapper}\` on a JSX ancestor`);
  else if (ownCss || wrapperCss) {
    const rule = ownCss ?? wrapperCss;
    guarded.push(
      `\`${reset}\` (${anchor}) — ${why} — ring at ` +
        `${relative(ROOT, rule.file)}:${rule.line} \`${rule.selector}\``,
    );
  } else
    violations.push(
      `NO AFFORDANCE  \`${reset}\` (${anchor}) resets the outline on a focusable control ` +
        `(${why}) and neither it nor a JSX ancestor declares a replacement ring in ` +
        `border-focus / var(--C-BORDER-FOCUS).`,
    );
}

if (violations.length > 0) {
  console.error("\nverify-focus-affordance: VIOLATIONS FOUND\n");
  for (const v of violations) console.error("  - " + v);
  if (exemptions.length) {
    console.error("\n  Exempt (not DOM-focusable, so the reset is harmless):");
    for (const e of exemptions) console.error("    - " + e);
  }
  console.error(`\n${violations.length} violation(s) across ${scanned}.`);
  process.exit(1);
}

console.log(
  `verify-focus-affordance: OK — ${guarded.length} focusable control(s) reset their outline and ` +
    `each declares a replacement affordance (${scanned}).\n`,
);
console.log("  Guarded (focusable, reset, replacement present):");
for (const g of guarded) console.log("    - " + g);
if (exemptions.length) {
  console.log("\n  Exempt (reset an outline but never take DOM focus):");
  for (const e of exemptions) console.log("    - " + e);
}
process.exit(0);
