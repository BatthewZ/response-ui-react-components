#!/usr/bin/env node
// Verifies that every key a props type `Omit`s is also removed at runtime.
//
// `Omit` is compile-time only, and TypeScript's excess-property check applies to
// fresh object literals — never to a spread of a *variable*. So
// `<Switch {...form.field("on")} />` delivers the very `onChange` the props type
// omitted, `tsc` reports nothing, and the key lands on the DOM element the
// component never expected it on. A direct `onChange={…}` attribute IS caught
// (TS2322); only the spread form slips through, and a spread bag with exactly one
// key is caught too (TS2559 "no properties in common") — which is why a one-key
// probe gives a false green. A real `useForm` binding is always
// `{name, value, onChange, onBlur, ref, …}`: always the silent case.
//
// No test can cover this either. Every key omitted in this package (`children`,
// `type`, `onChange`, `value`, `href`, `role`, `alt`, `color`, `size`, `title`,
// `open`) is a legitimate DOM attribute name, so React emits no unknown-prop
// warning. The damage is behavioural — a dead handler, a clobbered value — and
// never a console message.
//
// The invariant (bugs/PLAN.md, "the systemic question"):
//
//   For every props type of the form `Omit<ComponentPropsWithRef<E>, K…>`, each
//   omitted key K must either
//     (a) be destructured out of the component's props parameter — the only real
//         runtime protection, since that is what keeps K out of the rest object; or
//     (b) be re-set as an explicit JSX attribute positioned AFTER the rest-spread,
//         so a spread value cannot win. For K = "children", JSX element children
//         count: they are emitted after the spread and always take precedence; or
//     (c) appear in ALLOWLIST below with a justification.
//
// An explicit attribute written BEFORE the spread is reported but does NOT fail.
// That position means a spread value legitimately wins, which is how
// Checkbox/Radio/Slider/SearchInput/NumberInput write `type=`: the attribute is a
// default, not a guarantee. Those keys are never present in a form-binding bag, so
// the theoretical override has no live carrier. They are printed under "weak" so a
// human can see the set is not growing rather than having it hidden.
//
// Scope and non-goals, stated plainly — this is a SYNTACTIC pass (ts.createSourceFile,
// no program, no type checker), so:
// - Type aliases are resolved by NAME WITHIN ONE FILE only. An `Omit` reached through
//   a type imported from another module is invisible here.
// - An `Omit` behind an indirection (a mapped type, a conditional type, a generic
//   parameter that is instantiated with an `Omit` elsewhere) is invisible.
// - Only string-literal keys are read. `Omit<P, keyof Q>` contributes nothing.
// - Contents of OTHER spreads are not resolved: if a later `{...someBag}` happens to
//   re-set the omitted key, this still reports the key as unprotected.
// - SPREAD ORDER between handlers is not checked. `{...props}` landing before a
//   handler this component needs to own is a different defect class (see the
//   `aria-invalid` ordering note in bugs/PLAN.md) and is not covered here.
// - Only the component's own rest-spread is followed. A key handed to a child
//   component that then spreads it onward is judged at the child's own props type.
//
// Usage:
//   node scripts/verify-omit-discipline.mjs           report
//   node scripts/verify-omit-discipline.mjs --check   exit 1 on any violation (CI)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const CHECK = process.argv.includes("--check");

/**
 * Keyed `<basename>:<ComponentName>.<omitted key>`. Each entry is a component that
 * deliberately forwards an omitted key through its rest-spread; the value says why.
 */
const ALLOWLIST = new Map([
  [
    "MediaCard.tsx:MediaCardImage.alt",
    "Re-declares `alt: string` to make it REQUIRED (React's own img type has it optional) " +
      "and then forwards it through `{...props}` onto the <img>. The Omit exists to " +
      "strengthen the type, not to strip the value — reaching the DOM is the whole point.",
  ],
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

const hasBody = (n) =>
  (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)) &&
  n.body !== undefined;

/** Every string-literal member of a key union: `"a" | "b"` and `keyof P | "as"` -> ["as"]. */
function literalKeys(node) {
  const out = [];
  (function visit(n) {
    if (ts.isLiteralTypeNode(n) && ts.isStringLiteral(n.literal)) out.push(n.literal.text);
    else ts.forEachChild(n, visit);
  })(node);
  return out;
}

const unquote = (s) => s.replace(/^["'`]|["'`]$/g, "");

/**
 * Every `Omit<…, "k" | …>` in the file, tagged with the named type declaration that
 * encloses it (or `null` when it is written inline — as a `forwardRef` type argument,
 * or inside the `as <T>(props: …) => JSX` cast the polymorphic components use).
 */
function collectOmits(sf) {
  const specs = [];
  (function visit(node) {
    const name = typeHeadName(node, sf);
    if (name === "Omit" && node.typeArguments?.length >= 2) {
      const keys = literalKeys(node.typeArguments[1]);
      if (keys.length) {
        specs.push({
          node,
          keys,
          owner: enclosingTypeName(node),
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  })(sf);
  return specs;
}

/**
 * The name a type application is headed by, for the two shapes a generic can take:
 * a `TypeReferenceNode` in type position, and an `ExpressionWithTypeArguments` in an
 * `extends` clause. `interface X extends Omit<…>` is the second — the shape a
 * `TypeReferenceNode`-only walk (and a naive `Omit<` grep on type aliases) misses.
 */
function typeHeadName(node, sf) {
  if (ts.isTypeReferenceNode(node)) return node.typeName.getText(sf).split(".").pop();
  if (ts.isExpressionWithTypeArguments(node)) return node.expression.getText(sf).split(".").pop();
  return null;
}

/** Nearest enclosing `type X = …` / `interface X extends …`, or null if inline. */
function enclosingTypeName(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p)) return p.name.text;
    if (ts.isFunctionLike(p) || ts.isStatement(p)) return null;
  }
  return null;
}

/**
 * Type names a props type is COMPOSED of — the constituents of an intersection/union
 * and nothing deeper. Descending further would follow a type that is merely a member's
 * type (`type Adapter = { Link: RouterLinkComponent }`) and wrongly inherit its omits.
 */
function composedTypeNames(node, sf, out = new Set()) {
  if (!node) return out;
  if (ts.isParenthesizedTypeNode(node)) return composedTypeNames(node.type, sf, out);
  if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
    for (const t of node.types) composedTypeNames(t, sf, out);
    return out;
  }
  const name = typeHeadName(node, sf);
  if (name) out.add(name);
  return out;
}

/**
 * typeName -> the omit specs it carries, including those inherited from other local
 * aliases it composes (`type A = BProps & Omit<…>`). Fixpoint, in-file only.
 */
function buildAliasMap(sf, specs) {
  const declared = new Map(); // name -> { specs:Set, refs:Set }
  const record = (name, refs) => {
    if (!declared.has(name)) declared.set(name, { specs: new Set(), refs: new Set() });
    const entry = declared.get(name);
    for (const s of specs) if (s.owner === name) entry.specs.add(s);
    for (const r of refs) entry.refs.add(r);
  };

  (function visit(node) {
    if (ts.isTypeAliasDeclaration(node)) record(node.name.text, composedTypeNames(node.type, sf));
    else if (ts.isInterfaceDeclaration(node)) {
      const refs = new Set();
      for (const clause of node.heritageClauses ?? [])
        for (const t of clause.types) composedTypeNames(t, sf, refs);
      record(node.name.text, refs);
    }
    ts.forEachChild(node, visit);
  })(sf);

  for (let pass = 0; pass < 5; pass++) {
    let grew = false;
    for (const entry of declared.values()) {
      for (const ref of entry.refs) {
        for (const s of declared.get(ref)?.specs ?? []) {
          if (!entry.specs.has(s)) {
            entry.specs.add(s);
            grew = true;
          }
        }
      }
    }
    if (!grew) break;
  }
  return declared;
}

/** Omit specs reachable from a props type node: written inline, or via a local alias. */
function omitsOfTypeNode(typeNode, sf, specs, aliases) {
  const out = new Set();
  if (!typeNode) return out;
  const inside = (s) => s.node.getStart(sf) >= typeNode.getStart(sf) && s.node.end <= typeNode.end;
  for (const s of specs) if (inside(s)) out.add(s);
  for (const name of composedTypeNames(typeNode, sf))
    for (const s of aliases.get(name)?.specs ?? []) out.add(s);
  return out;
}

/** First function with a body inside `node` — the component, not the `as` cast's signature. */
function firstFunction(node) {
  let found = null;
  (function visit(n) {
    if (found) return;
    if (hasBody(n) && n.parameters.length > 0) {
      found = n;
      return;
    }
    ts.forEachChild(n, visit);
  })(node);
  return found;
}

/** `forwardRef<Element, Props>` type argument for a function passed to `forwardRef(…)`. */
function forwardRefPropsType(fn, sf) {
  const call = fn.parent;
  if (!call || !ts.isCallExpression(call)) return undefined;
  if (call.expression.getText(sf).split(".").pop() !== "forwardRef") return undefined;
  return call.typeArguments?.[1];
}

function componentName(fn, statement, sf) {
  if (fn.name) return fn.name.getText(sf);
  let named = null;
  (function visit(n) {
    if (named) return;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) named = n.name.text;
    ts.forEachChild(n, visit);
  })(statement);
  return named ?? "(anonymous)";
}

/** `{ a, b: c, ...rest }` -> destructured names plus the rest identifier. */
function readParam(param, sf) {
  const destructured = new Set();
  let rest = null;
  if (!param) return { destructured, rest };
  if (ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      if (el.dotDotDotToken) rest = el.name.getText(sf);
      else destructured.add(unquote((el.propertyName ?? el.name).getText(sf)));
    }
  } else if (ts.isIdentifier(param.name)) {
    rest = param.name.text; // `props: P` — the whole bag is forwarded verbatim
  }
  return { destructured, rest };
}

/** Does `node` name `ident`? `{...props}` and `{...mergeProps(props, x)}` both do. */
function mentions(node, ident) {
  let hit = false;
  (function visit(n) {
    if (hit) return;
    if (ts.isIdentifier(n) && n.text === ident) hit = true;
    else ts.forEachChild(n, visit);
  })(node);
  return hit;
}

/**
 * Does this JSX child emit a `children` entry? Whitespace text and a comment-only
 * `{/* … *\/}` are dropped by the transform, so they leave a spread `children` standing;
 * `{cond && <X/>}` does not — it emits `children: false`, which still wins.
 */
function rendersChild(child, sf) {
  if (ts.isJsxText(child)) return child.getText(sf).trim() !== "";
  if (ts.isJsxExpression(child)) return child.expression !== undefined;
  return true;
}

/** JSX opening tags inside `fn` that spread `restName`, with the spread's position. */
function spreadSites(fn, restName, sf) {
  const sites = [];
  (function visit(n) {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const attrs = n.attributes.properties;
      let spreadIndex = -1;
      attrs.forEach((a, i) => {
        if (ts.isJsxSpreadAttribute(a) && mentions(a.expression, restName)) spreadIndex = i;
      });
      if (spreadIndex >= 0) {
        const parent = ts.isJsxOpeningElement(n) ? n.parent : null;
        sites.push({
          attrs,
          spreadIndex,
          tag: n.tagName.getText(sf),
          line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
          hasChildren: parent !== null && parent.children.some((c) => rendersChild(c, sf)),
        });
      }
    }
    ts.forEachChild(n, visit);
  })(fn.body);
  return sites;
}

/** Where `key` is re-set on this tag relative to the spread: after / before / nowhere. */
function attributePosition(site, key, sf) {
  let position = "none";
  site.attrs.forEach((a, i) => {
    if (!ts.isJsxAttribute(a) || a.name.getText(sf) !== key) return;
    if (i > site.spreadIndex) position = "after";
    else if (position === "none") position = "before";
  });
  if (position === "none" && key === "children" && site.hasChildren) return "after";
  return position;
}

/* ------------------------------------------------------------------ */
/*  Scan                                                               */
/* ------------------------------------------------------------------ */

const files = walk(
  SRC,
  (p) => /\.tsx?$/.test(p) && !/\.(test|examples)\.tsx?$/.test(p),
).sort();

const violations = [];
const weak = [];
const exempt = [];
const guarded = [];
let checkedKeys = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (!text.includes("Omit<")) continue;

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const specs = collectOmits(sf);
  if (specs.length === 0) continue;

  const aliases = buildAliasMap(sf, specs);
  const rel = relative(ROOT, file);
  const claimed = new Set();

  for (const statement of sf.statements) {
    const fn = firstFunction(statement);
    if (!fn) continue;

    const propsType = forwardRefPropsType(fn, sf) ?? fn.parameters[0]?.type;
    const attached = omitsOfTypeNode(propsType, sf, specs, aliases);
    for (const s of specs)
      if (
        s.owner === null &&
        s.node.getStart(sf) >= statement.getStart(sf) &&
        s.node.end <= statement.end
      )
        attached.add(s);
    if (attached.size === 0) continue;

    const name = componentName(fn, statement, sf);
    const { destructured, rest } = readParam(fn.parameters[0], sf);
    const sites = rest ? spreadSites(fn, rest, sf) : [];

    for (const spec of attached) {
      claimed.add(spec);
      for (const key of spec.keys) {
        checkedKeys++;
        const at = `${rel}:${spec.line}`;
        const id = `${basename(file)}:${name}.${key}`;

        if (destructured.has(key)) {
          guarded.push(`${id} (${at}) — destructured out of the props parameter`);
          continue;
        }
        if (ALLOWLIST.has(id)) {
          exempt.push(`${id} (${at}) — allowlisted: ${ALLOWLIST.get(id)}`);
          continue;
        }
        if (!rest) {
          exempt.push(`${id} (${at}) — no rest parameter, nothing forwards the key`);
          continue;
        }
        if (sites.length === 0) {
          exempt.push(`${id} (${at}) — \`${rest}\` is never spread onto an element`);
          continue;
        }

        const positions = sites.map((s) => ({ site: s, at: attributePosition(s, key, sf) }));
        const open = positions.filter((p) => p.at === "none");
        if (open.length > 0) {
          const where = open
            .map((p) => `<${p.site.tag}> at ${rel}:${p.site.line}`)
            .join(", ");
          violations.push(
            `${id} (${at}) — \`${key}\` is omitted from the props type but is neither ` +
              `destructured out of \`{…, ...${rest}}\` nor re-set after the spread, so a ` +
              `spread caller reaches the element: ${where}`,
          );
          continue;
        }
        const before = positions.filter((p) => p.at === "before");
        if (before.length > 0) {
          weak.push(
            `${id} (${at}) — \`${key}=\` is written BEFORE \`{...${rest}}\` on ` +
              `<${before[0].site.tag}> (${rel}:${before[0].site.line}), so a spread value wins`,
          );
          continue;
        }
        guarded.push(
          `${id} (${at}) — re-set after \`{...${rest}}\` on <${positions[0].site.tag}> ` +
            `(${rel}:${positions[0].site.line})`,
        );
      }
    }
  }

  for (const spec of specs) {
    if (claimed.has(spec)) continue;
    violations.push(
      `UNCLAIMED  ${rel}:${spec.line} omits ${spec.keys.map((k) => `\`${k}\``).join(", ")} ` +
        `but no component in this file could be matched to that props type — the omission ` +
        `cannot be judged, so it is reported rather than assumed safe.`,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

// Every key is listed in exactly one section, always — a silently skipped component is
// the failure mode this guard exists to prevent, so "94 protected" is never enough on
// its own to prove a component was looked at.
const failed = violations.length > 0;
const out = failed ? console.error : console.log;
const section = (title, list) => {
  if (!list.length) return;
  out(`\n  ${title}`);
  for (const line of [...list].sort((a, b) => a.localeCompare(b))) out("    - " + line);
};

out(
  failed
    ? "\nverify-omit-discipline: UNPROTECTED OMITTED KEYS\n"
    : "\nverify-omit-discipline: OK — every omitted key is removed at runtime.\n",
);
if (failed) for (const v of [...violations].sort((a, b) => a.localeCompare(b))) out("  - " + v);

section("Weak (explicit attribute precedes the spread — a default, not a guarantee):", weak);
section("Exempt:", exempt);
section("Protected:", guarded);

out(
  `\n${checkedKeys} omitted key(s) across ${files.length} module(s): ` +
    `${guarded.length} protected, ${weak.length} weak, ${exempt.length} exempt, ` +
    `${violations.length} unprotected.`,
);
if (failed && !CHECK) out("(reporting only — pass --check to fail the build)");

process.exit(failed && CHECK ? 1 : 0);
