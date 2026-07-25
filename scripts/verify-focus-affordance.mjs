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
//   If a class resets the outline (`outline: none | 0 | <any> transparent`) AND that
//   class lands on an element that can take DOM focus, then some focus-keyed rule
//   must paint a replacement ring in `--C-BORDER-FOCUS`.
//
// Focusability is derived from source, never from a list. For every class that
// appears as the subject of a reset rule, the JSX in src/**/*.tsx is scanned for the
// elements that carry it, and an element is focusable when it is a natively
// focusable tag (`button`, `input`, `select`, `textarea`, `summary`, `iframe`,
// `a[href]`), carries `tabIndex` >= 0 (including a roving `cond ? 0 : -1`), or is
// `contentEditable`. `tabIndex={-1}` and elements that are only virtually focused
// (`aria-activedescendant`) are NOT focusable, and the script prints each one with
// its reason rather than skipping it silently. A reset class that cannot be located
// in any .tsx is an error, not an exemption — the guard says so instead of guessing.
//
// A replacement may live on the element's own `:focus-visible` (or a pseudo-element
// under it: `.slider:focus-visible::-webkit-slider-thumb`), or on a `:focus-within`
// rule keyed to one of its JSX ancestors — the wrapper-ring recipe MultiSelect and
// TagInput use, where the ring belongs to the bordered box, not the bare input.
//
// Scope and non-goals, stated plainly:
// - PRESENCE only. A rule that exists but is out-specified by a competing rule (the
//   RC-6 / ledger #84 / #291 class of defect) still passes here; specificity order is
//   a different check.
// - CONTRAST is not measured. A ring declared in `--C-BORDER-FOCUS` counts even where
//   that token is too low-contrast against the surface (ledger #242).
// - Tailwind `focus:outline-none` utilities written in .tsx are the same defect class
//   (ledger #73) but are not covered: this reads src/components/**/*.css only.
//
// Exits 1 on any violation.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const COMPONENTS = join(SRC, "components");

/** A declaration that paints the house focus ring. */
const AFFORDANCE = /(?:box-shadow|outline):\s*[^;]*var\(--C-BORDER-FOCUS\)/;

/** A declaration that removes the outline: `none`, a zero width, or an invisible one. */
const RESET =
  /(?:^|;)\s*outline(?:-style|-width)?\s*:\s*(?:none|0(?:px|rem|em)?|[^;]*\btransparent\b)\s*(?:!important\s*)?(?=;|$)/;

const NATIVELY_FOCUSABLE = new Set(["button", "input", "select", "textarea", "summary", "iframe"]);

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

const cssFiles = walk(COMPONENTS, (p) => p.endsWith(".css")).sort();

const resets = []; // { cls, file, line, selector }
const ringFor = new Map(); // class -> [{ file, line, selector }]  (:focus-visible / :focus)
const withinRingFor = new Map(); // class -> [{ file, line, selector }]  (:focus-within)

for (const file of cssFiles) {
  const css = readFileSync(file, "utf8");
  for (const rule of parseRules(css)) {
    const focusKeyed = /:focus(-visible|-within)?\b/.test(rule.selector);
    const within = /:focus-within\b/.test(rule.selector);

    if (focusKeyed && AFFORDANCE.test(rule.decls)) {
      const line = lineAt(css, rule.declsStart + rule.decls.search(AFFORDANCE));
      for (const one of selectorList(rule.selector)) {
        const cls = subjectClass(one);
        if (!cls) continue;
        const bucket = within ? withinRingFor : ringFor;
        if (!bucket.has(cls)) bucket.set(cls, []);
        bucket.get(cls).push({ file, line, selector: one });
      }
    }

    const hit = rule.decls.search(RESET);
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
 * non-test module. This is what turns menu-internals' `` `${classPrefix}-item` `` into
 * the concrete `dropdown-menu-item` (via `classPrefix: CLASS_PREFIX` in DropdownMenu
 * and ContextMenu, and `const CLASS_PREFIX = "dropdown-menu"`). Without it a template
 * class is an unanchored wildcard that would wrongly claim `.combobox-item` too.
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

/**
 * Elements in one .tsx, each with its JSX ancestors' class tokens. Comments are
 * blanked first (this repo's docblocks are full of JSX), and `<` only opens a tag when
 * the preceding character cannot end an identifier — which is what separates `<div`
 * from `useState<number>` and `forwardRef<HTMLDivElement, P>`.
 */
function scanElements(file, text, literals) {
  const src = blankComments(text).replace(/(^|[^:])\/\/[^\n]*/gm, (m, keep) =>
    keep + " ".repeat(m.length - keep.length),
  );

  // `const triggerProps = mergeProps(props, { className: cn("colorpicker-trigger", …) })`
  // then `<button {...getReferenceProps({ ...triggerProps })}>` — the classes reach the
  // element through a named props object, so index those objects and follow the spread.
  const spreadClasses = new Map();
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?);\n/g)) {
    if (m[2].includes("className")) spreadClasses.set(m[1], classTokens(m[2], literals));
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
    const classes = [
      ...classTokens(attrs, literals),
      ...[...attrs.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)].flatMap(
        (m) => spreadClasses.get(m[1]) ?? [],
      ),
    ];
    out.push({
      file,
      line: lineAt(src, i),
      tag: name[1],
      classes,
      ancestorClasses: stack.flatMap((f) => f.classes),
      tabIndex: attrValue(attrs, "tabIndex"),
      href: hasAttr(attrs, "href"),
      contentEditable: hasAttr(attrs, "contentEditable"),
      role: attrValue(attrs, "role"),
    });
    if (src[end - 1] !== "/") stack.push({ tag: name[1], classes });
    i = end;
  }
  return out;
}

const tsxFiles = walk(SRC, (p) => /\.tsx?$/.test(p) && !p.includes(".test.")).sort();
const literals = buildLiteralMap(tsxFiles);
const elements = [];
const virtualFocusFiles = new Set();
for (const file of tsxFiles.filter((p) => p.endsWith(".tsx"))) {
  const text = readFileSync(file, "utf8");
  if (text.includes("aria-activedescendant")) virtualFocusFiles.add(file);
  elements.push(...scanElements(file, text, literals));
}

const carriersOf = (cls) => elements.filter((el) => el.classes.includes(cls));

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
  const virtual = virtualFocusFiles.has(el.file) && VIRTUALLY_FOCUSED_ROLES.has(el.role);
  return {
    focusable: false,
    why: virtual
      ? `<${el.tag} role="${el.role}"> with no tabIndex — virtually focused via aria-activedescendant, never DOM-focused`
      : `<${el.tag}> with no tabIndex — never DOM-focused`,
  };
}

/* ------------------------------------------------------------------ */
/*  Check                                                              */
/* ------------------------------------------------------------------ */

const violations = [];
const exemptions = [];
const guarded = [];

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

  if (!ring) {
    const el = focusable[0];
    violations.push(
      `NO AFFORDANCE  .${reset.cls} (${anchor}) resets the outline on a focusable control ` +
        `(${focusability(el).why} at ${relative(ROOT, el.file)}:${el.line}) and no focus-keyed rule ` +
        `paints a replacement in var(--C-BORDER-FOCUS).`,
    );
    continue;
  }
  const el = focusable[0];
  guarded.push(
    `.${reset.cls} (${anchor}) — ${focusability(el).why} — ring at ` +
      `${relative(ROOT, ring[0].file)}:${ring[0].line} \`${ring[0].selector}\``,
  );
}

if (violations.length > 0) {
  console.error("\nverify-focus-affordance: VIOLATIONS FOUND\n");
  for (const v of violations) console.error("  - " + v);
  if (exemptions.length) {
    console.error("\n  Exempt (not DOM-focusable, so the reset is harmless):");
    for (const e of exemptions) console.error("    - " + e);
  }
  console.error(`\n${violations.length} violation(s) across ${cssFiles.length} component stylesheets.`);
  process.exit(1);
}

console.log(
  `verify-focus-affordance: OK — ${guarded.length} focusable control(s) reset their outline and ` +
    `each declares a replacement affordance (${cssFiles.length} stylesheets scanned).\n`,
);
console.log("  Guarded (focusable, reset, replacement present):");
for (const g of guarded) console.log("    - " + g);
if (exemptions.length) {
  console.log("\n  Exempt (reset an outline but never take DOM focus):");
  for (const e of exemptions) console.log("    - " + e);
}
process.exit(0);
