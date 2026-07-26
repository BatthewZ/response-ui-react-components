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
//     (c) appear in ALLOWLIST below with a justification; or
//     (d) be written BEFORE the spread AND have its key named in WEAK_OK below.
//
// (d) is the "weak" bucket, and it is DEFAULT-DENY. An attribute written before the
// spread is a default, not a guarantee: the spread wins, so the omitted key does reach
// the element. That is tolerable for a static presentational/semantic default the
// component owns and no caller bag carries (`type=`, `role=`) and NOT tolerable for
// the two classes that turn the same position into the RC-1 defect itself:
//   - a DESTINATION (`href`, `src`, `action`, …) — the component computes where it
//     points and a spread silently re-points it, which is AppShell.SidebarLink's bug;
//   - a HANDLER the component's own feature runs on (`onDrop` for a drop zone) — a
//     spread does not compose with it, it replaces it, and the feature dies silently.
// Rather than list those two classes, the check inverts: a key must be named in
// WEAK_OK to be forgiven, so a key nobody has argued about fails. Each WEAK_OK entry
// carries its own argument; there is no blanket one.
//
// Scope and non-goals, stated plainly — this is a SYNTACTIC pass (ts.createSourceFile,
// no program, no type checker), so the following are NOT covered. They are named here
// because a documented blind spot is worth more than a silent one:
// - CROSS-MODULE `Omit`. Files are scanned only when they contain the literal `Omit<`,
//   and aliases resolve by NAME WITHIN ONE FILE. `import type { P } from "./types"`
//   where `P = Omit<…>` is not judged at the consuming component. Partial mitigation:
//   the declaring file is still scanned, and an `Omit` there that no local component
//   claims is reported as UNCLAIMED — so a types-only module cannot hide one. A shared
//   module that also declares a compliant component of its own does hide it.
// - `Omit` SPELLED OUT. `Pick<T, Exclude<keyof T, "k">>` is `Omit`'s own definition and
//   is invisible; so is any mapped/conditional type, and a generic parameter
//   instantiated with an `Omit` elsewhere. Closing this needs a type checker, not a
//   syntax tree.
// - NON-LITERAL key arguments. Only string literals are read, so `Omit<P, K>` with
//   `type K = "type"` and `Omit<P, keyof Q>` both contribute nothing.
// - Contents of OTHER spreads are not resolved: if a later `{...someBag}` happens to
//   re-set the omitted key, this still reports the key as unprotected.
// - SPREAD ORDER between handlers is not checked. `{...props}` landing before a
//   handler this component needs to own is a different defect class (see the
//   `aria-invalid` ordering note in bugs/PLAN.md) and is not covered here.
// - Only the component's own rest-spread is followed. A key handed to a child
//   component that then spreads it onward is judged at the child's own props type.
//
// What IS followed: the rest bag through local aliases. `const merged = { ...props }`
// then `<a {...merged} />`, and `createElement("a", { href, ...props })`, are the same
// leak as a direct `<a {...props} />` — see `carrierNames` / `spreadSites`.
//
// Usage:
//   node scripts/verify-omit-discipline.mjs           report
//   node scripts/verify-omit-discipline.mjs --check   exit 1 on any violation (CI)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const CHECK = process.argv.includes("--check");

/**
 * Keyed `<repo-relative path>:<ComponentName>.<omitted key>` — the PATH, not the
 * basename, so a second file of the same name elsewhere in the tree cannot inherit an
 * exemption argued for this one. Each entry is a component that deliberately forwards
 * an omitted key through its rest-spread; the value says why.
 */
const ALLOWLIST = new Map([
  [
    "src/components/ui/MediaCard.tsx:MediaCardImage.alt",
    "Re-declares `alt: string` to make it REQUIRED (React's own img type has it optional) " +
      "and then forwards it through `{...props}` onto the <img>. The Omit exists to " +
      "strengthen the type, not to strip the value — reaching the DOM is the whole point.",
  ],
]);

/**
 * Omitted keys that may be written BEFORE the rest-spread — i.e. that may lose to a
 * spread value — keyed by the key name, because the argument is about what the key
 * MEANS, not about which component wrote it. Anything absent from this map fails in
 * that position. Keep the arguments honest: each says what a spread override would
 * actually do, not that it cannot happen.
 */
const WEAK_OK = new Map([
  [
    "type",
    "A static input/button kind the component owns (`checkbox`, `radio`, `range`, " +
      "`search`, `button`). A spread `type` DOES reach the element and would break the " +
      "control — a `type=\"text\"` checkbox, a `type=\"submit\"` toggle that posts its " +
      "enclosing form. It is tolerated because `type` is not a value any binding surface " +
      "in this library produces: `useForm().field()` yields {name, value, onChange, " +
      "onBlur, ref}, and a literal `type=` is a TS error against the omitting type, so " +
      "the override has no live carrier. It is a presentational default, not a " +
      "destination and not a handler the component's behaviour runs through.",
  ],
  [
    "role",
    "A landmark/semantic default the component owns (`navigation` on the app-shell " +
      "sidebar). A spread `role` would replace the landmark — an accessibility " +
      "regression, and a real one — but it changes how the element is announced, not " +
      "where it goes or what it runs. Like `type`, no binding bag in this library " +
      "carries a `role` key, so there is no live carrier.",
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

/**
 * Identifiers that can carry the rest bag onto an element: the rest parameter itself,
 * plus every local variable whose initializer names one — `const merged = { ...props }`,
 * `const merged = mergeProps(props, x)`, `const merged = props`. Resolved to a fixpoint,
 * so a second hop carries too; one hop was enough to reproduce the whole bypass, and a
 * gate that closes exactly one is a gate that asks for two.
 *
 * Deliberately loose (textual `mentions`): an identifier wrongly called a carrier only
 * matters if it is then spread onto an element, and the consequence of that is an extra
 * reported site — the safe direction. Missing a carrier hides a live leak.
 */
function carrierNames(fn, restName, sf) {
  const decls = [];
  (function visit(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer)
      decls.push({ name: n.name.text, init: n.initializer });
    ts.forEachChild(n, visit);
  })(fn.body);

  const carriers = new Set([restName]);
  for (let pass = 0; pass < 5; pass++) {
    let grew = false;
    for (const d of decls) {
      if (carriers.has(d.name)) continue;
      if ([...carriers].some((c) => mentions(d.init, c))) {
        carriers.add(d.name);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return carriers;
}

const spreadsACarrier = (expr, carriers) => [...carriers].some((c) => mentions(expr, c));

/**
 * Sites where a carrier of the rest bag is spread onto an element, normalised across the
 * two ways this can be written:
 *   - JSX:            `<a href={to} {...merged} />`
 *   - createElement:  `createElement("a", { href: to, ...props })`
 * Both are ordered property lists with one spread in them, so both reduce to
 * `{ entries: [{name, index}], spreadIndex }` and are judged by the same rule. JSX is
 * how this library is written; `createElement` is covered because the transform makes
 * them identical and a syntactic gate that only knows one spelling is one refactor from
 * blind.
 */
function spreadSites(fn, restName, sf) {
  const carriers = carrierNames(fn, restName, sf);
  const sites = [];
  const at = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  (function visit(n) {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const props = n.attributes.properties;
      let spreadIndex = -1;
      props.forEach((a, i) => {
        if (ts.isJsxSpreadAttribute(a) && spreadsACarrier(a.expression, carriers)) spreadIndex = i;
      });
      if (spreadIndex >= 0) {
        const parent = ts.isJsxOpeningElement(n) ? n.parent : null;
        sites.push({
          entries: props.flatMap((a, i) =>
            ts.isJsxAttribute(a) ? [{ name: a.name.getText(sf), index: i }] : [],
          ),
          spreadIndex,
          tag: n.tagName.getText(sf),
          line: at(n),
          hasChildren: parent !== null && parent.children.some((c) => rendersChild(c, sf)),
        });
      }
    } else if (
      ts.isCallExpression(n) &&
      n.expression.getText(sf).split(".").pop() === "createElement" &&
      n.arguments.length >= 2 &&
      ts.isObjectLiteralExpression(n.arguments[1])
    ) {
      const props = n.arguments[1].properties;
      let spreadIndex = -1;
      props.forEach((p, i) => {
        if (ts.isSpreadAssignment(p) && spreadsACarrier(p.expression, carriers)) spreadIndex = i;
      });
      if (spreadIndex >= 0) {
        sites.push({
          entries: props.flatMap((p, i) =>
            p.name ? [{ name: unquote(p.name.getText(sf)), index: i }] : [],
          ),
          spreadIndex,
          tag: unquote(n.arguments[0].getText(sf)),
          line: at(n),
          // `createElement(tag, props, ...children)` — trailing args become `children`
          // and, like JSX children, are applied after the props object.
          hasChildren: n.arguments.length > 2,
        });
      }
    }
    ts.forEachChild(n, visit);
  })(fn.body);
  return sites;
}

/** Where `key` is re-set on this element relative to the spread: after / before / nowhere. */
function attributePosition(site, key) {
  let position = "none";
  for (const entry of site.entries) {
    if (entry.name !== key) continue;
    if (entry.index > site.spreadIndex) position = "after";
    else if (position === "none") position = "before";
  }
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
const weakKeys = new Set();
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
        // `id` is the stable ALLOWLIST key (path-based, no line number in it); `at`
        // points at the `Omit` that raised the question.
        const id = `${rel}:${name}.${key}`;
        const at = `omit on line ${spec.line}`;

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

        const positions = sites.map((s) => ({ site: s, at: attributePosition(s, key) }));
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
          const where = `<${before[0].site.tag}> (${rel}:${before[0].site.line})`;
          const argument = WEAK_OK.get(key);
          if (argument === undefined) {
            violations.push(
              `${id} (${at}) — \`${key}=\` is written BEFORE \`{...${rest}}\` on ${where}, so ` +
                `the omitted \`${key}\` a spread caller supplies silently replaces the ` +
                `component's own value. \`${key}\` is not in WEAK_OK: a key is forgiven in ` +
                `that position only with a written argument that it is a presentational ` +
                `default rather than a destination or a handler the component's behaviour ` +
                `runs through. Destructure it out, or re-set it after the spread.`,
            );
          } else {
            weakKeys.add(key);
            weak.push(`${id} (${at}) — \`${key}=\` before \`{...${rest}}\` on ${where}`);
          }
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

section(
  "Weak (attribute precedes the spread — a default, not a guarantee; allowed per key by WEAK_OK):",
  weak,
);
// The argument, once per key rather than once per site: it is the KEY that was argued
// about, and repeating it per line buries the list it exists to keep readable.
for (const key of [...weakKeys].sort()) out(`      \`${key}\`: ${WEAK_OK.get(key)}`);
section("Exempt:", exempt);
section("Protected:", guarded);

out(
  `\n${checkedKeys} omitted key(s) across ${files.length} module(s): ` +
    `${guarded.length} protected, ${weak.length} weak, ${exempt.length} exempt, ` +
    `${violations.length} unprotected.`,
);
if (failed && !CHECK) out("(reporting only — pass --check to fail the build)");

process.exit(failed && CHECK ? 1 : 0);
