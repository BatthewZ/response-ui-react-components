#!/usr/bin/env node
// Asserts that this package's hand-maintained token mirror has not drifted:
// every name declared in a `@theme` block under `src/` is mirrored in the
// `createCn({ theme: … })` call in `src/util/style.ts`, and nothing is mirrored
// that no `@theme` block declares.
//
// WHY
//
// `ETHOS.md` ("Known fragility") names the hand-maintained token mirror between
// the CSS and the tailwind-merge layers as the system's main fragility — "with
// no runtime enforcement to catch drift". This is the half of it that lives in
// this package: `src/tokens.css` declares domain tokens in `@theme inline`,
// Tailwind turns each one into a utility (`bg-chart-3`, `text-trend-up`), and
// `src/util/style.ts` re-states the same names so `cn()` knows they conflict.
// Two files, one list, no coupling — exactly the shape that rots quietly.
//
// WHAT IT ASSERTS, WHICH IS BOTH NARROWER AND WIDER THAN THE OBVIOUS RULE
//
//   1. Every `@theme` name resolves to a Tailwind theme NAMESPACE that
//      tailwind-merge also has a theme key for. `--color-chart-6` resolves to
//      `color`; `--colour-chart-6` resolves to nothing and is a FAILURE, not a
//      skip, because a namespace nobody can mirror is a token that will never
//      dedupe. The namespace list is read out of the installed tailwind-merge's
//      own `getDefaultConfig().theme`, never transcribed — longest prefix wins,
//      so `--text-shadow-glow` is `text-shadow` and not `text`.
//   2. Both directions. A name in `tokens.css` and not in `createCn` is the
//      drift everyone expects. A name in `createCn` and not in `tokens.css` is
//      the direction `memory/gates.md` says guards forget ("drift is usually
//      only checked in one direction") — dead config that reads as live, and
//      free to catch here.
//
// WHAT IT CANNOT SEE, STATED PLAINLY
//
//   - It cannot see whether the mirror MATTERS. Measured against
//     tailwind-merge 3.6.0: `createCn()` and `createCn({theme:{color:[…the 9
//     names…]}})` return identical output for all 12,474 class pairs built from
//     every colour-taking prefix × every token × twenty neighbours, in both
//     orders and with one variant-scoped form. (Method, to re-run: import
//     `createCn` twice, once bare and once with the list, and diff the two
//     outputs over that cross product.) The reason is visible in
//     `getDefaultConfig().theme` — `color: [isAny]` — so
//     an unmirrored COLOUR token still dedupes, and PLAN-overridability.md §8's
//     "a named token value … is the only real drift" is refuted for the only
//     namespace this package currently uses. The controls hold and are the
//     other half of that measurement: the default `spacing` scale is
//     `[isNumber, 'px']` and the default `text` scale is `[isTshirtSize]`, so
//     `p-gutter p-r3` and `text-display text-fg-primary` DO merge differently
//     with and without their theme entry. So this gate guards a coupling that
//     is load-bearing the moment a non-colour namespace lands in `tokens.css`,
//     and documentation-grade until then. That is worth having written down at
//     every run; it is not worth pretending is a live bug.
//   - It cannot see the OTHER half of the fragility `ETHOS.md` names — the
//     mirror between `response-ui-css` and `response-ui-tw-merge`'s built-in
//     list. That coupling crosses a package boundary this package may not
//     reach (`memory/README.md` §6), so nothing here can assert it.
//   - It reads `createCn`'s argument as a literal. A list built at runtime, or
//     spread in from elsewhere, is a FAILURE rather than a skip — this script
//     would have to become a resolver to see one, and `memory/README.md` §51 is
//     what that costs.
//   - It says nothing about whether a token is USED, whether it resolves to a
//     real contract variable, or whether the docs describe it correctly. Those
//     are `verify:component-docs` and `verify:chart-palette`.
//
// No allowlist. Zero `@theme` names is a FAILURE, so it cannot pass vacuously.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { getDefaultConfig } from "tailwind-merge";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const STYLE_TS = join(ROOT, "src", "util", "style.ts");
const rel = (p) => relative(ROOT, p);

const problems = [];

/* ------------------------------------------------------------------ */
/*  Namespaces — taken from tailwind-merge, never transcribed          */
/* ------------------------------------------------------------------ */

// Tailwind v4's theme namespaces and tailwind-merge's theme keys are the same
// vocabulary (`--color-*` <-> `color`, `--font-weight-*` <-> `font-weight`), so
// the installed library's own config is the authoritative list. Longest first:
// `--text-shadow-glow` is `text-shadow`, not `text` with a name of `shadow-glow`.
const NAMESPACES = Object.keys(getDefaultConfig().theme).sort((a, b) => b.length - a.length);

/** `--color-chart-1` -> `{ namespace: "color", name: "chart-1" }`, or null. */
function resolveNamespace(variable) {
  const bare = variable.slice(2);
  for (const ns of NAMESPACES) {
    if (bare.startsWith(ns + "-") && bare.length > ns.length + 1) {
      return { namespace: ns, name: bare.slice(ns.length + 1) };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Side A — every `@theme` block under src/                           */
/* ------------------------------------------------------------------ */

function cssFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) cssFiles(full, out);
    else if (entry.endsWith(".css")) out.push(full);
  }
  return out;
}

/** Blank comment bodies so prose can neither satisfy nor trip the scan. */
const blankComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

// `@theme`, `@theme inline`, `@theme static`, `@theme reference` — every form
// registers utilities, so every form needs the mirror.
const THEME_BLOCK = /@theme\b([^{]*)\{/g;

const declared = new Map(); // namespace -> Map<name, "file:line">
const themeFiles = [];

for (const file of cssFiles(SRC)) {
  const scannable = blankComments(readFileSync(file, "utf8"));
  for (const open of scannable.matchAll(THEME_BLOCK)) {
    const start = open.index + open[0].length;
    let depth = 1;
    let end = start;
    while (end < scannable.length && depth > 0) {
      if (scannable[end] === "{") depth += 1;
      else if (scannable[end] === "}") depth -= 1;
      end += 1;
    }
    if (depth !== 0) {
      problems.push(`${rel(file)}  unterminated \`@theme\` block — nothing in it was checked.`);
      continue;
    }
    themeFiles.push(rel(file));
    const body = scannable.slice(start, end - 1);
    const lineOf = (offset) => scannable.slice(0, start + offset).split("\n").length;

    let offset = 0;
    for (const rawEntry of body.split(";")) {
      const here = offset;
      offset += rawEntry.length + 1;
      if (!rawEntry.trim()) continue;
      const at = `${rel(file)}:${lineOf(here + rawEntry.search(/\S/))}`;
      const decl = /^\s*(--[A-Za-z0-9-]+)\s*:\s*(\S[\s\S]*)$/.exec(rawEntry);
      if (!decl) {
        problems.push(
          `${at}  unparseable entry inside \`@theme\`: \`${rawEntry.trim().slice(0, 60)}\`.\n` +
            `    This script reads \`--name: value;\` declarations and nothing else. An entry\n` +
            `    it cannot read is an unasserted one — teach the script what this is, in the\n` +
            `    same commit.`
        );
        continue;
      }
      const variable = decl[1];
      const resolved = resolveNamespace(variable);
      if (!resolved) {
        problems.push(
          `${at}  \`${variable}\` is in a \`@theme\` block but matches no Tailwind theme\n` +
            `    namespace (${NAMESPACES.length} known, from tailwind-merge's own default config).\n` +
            `    Tailwind generates no utility from it and \`createCn\` has no key to mirror it\n` +
            `    under, so nothing can ever teach the merge helper about it. Either it belongs\n` +
            `    in the \`:root\` block above instead, or the name is wrong.`
        );
        continue;
      }
      if (!declared.has(resolved.namespace)) declared.set(resolved.namespace, new Map());
      declared.get(resolved.namespace).set(resolved.name, at);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Side B — the `createCn` call in src/util/style.ts                  */
/* ------------------------------------------------------------------ */

const mirrored = new Map(); // theme key -> Set<name>
const styleSrc = readFileSync(STYLE_TS, "utf8");
const sourceFile = ts.createSourceFile(STYLE_TS, styleSrc, ts.ScriptTarget.Latest, true);
const at = (node) =>
  `${rel(STYLE_TS)}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`;

const calls = [];
(function walk(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "createCn"
  ) {
    calls.push(node);
  }
  ts.forEachChild(node, walk);
})(sourceFile);

if (calls.length !== 1) {
  problems.push(
    `${rel(STYLE_TS)}  expected exactly 1 \`createCn(…)\` call, found ${calls.length}. The mirror\n` +
      `    is asserted against that one call; more than one means the package has two \`cn\`s\n` +
      `    and this script is checking the wrong half.`
  );
} else {
  const [arg] = calls[0].arguments;
  if (!arg || !ts.isObjectLiteralExpression(arg)) {
    problems.push(
      `${at(calls[0])}  \`createCn(…)\` is not called with an object literal. This script reads\n` +
        `    the argument as a literal; resolving one built at runtime needs a whole\n` +
        `    identifier-to-value resolver (\`memory/README.md\` §51), so it fails instead.`
    );
  } else {
    for (const prop of arg.properties) {
      if (!ts.isPropertyAssignment(prop) || !prop.name) {
        problems.push(`${at(prop)}  unreadable property in the \`createCn\` config.`);
        continue;
      }
      const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
      if (key !== "theme") {
        problems.push(
          `${at(prop)}  \`createCn\` config key \`${key ?? "<computed>"}\` — this script asserts\n` +
            `    \`theme\` only, because that is the half \`tokens.css\` mirrors. Decide what this\n` +
            `    key means for the mirror and teach the script, in the same commit.`
        );
        continue;
      }
      if (!ts.isObjectLiteralExpression(prop.initializer)) {
        problems.push(`${at(prop)}  \`theme\` is not an object literal.`);
        continue;
      }
      for (const entry of prop.initializer.properties) {
        if (!ts.isPropertyAssignment(entry) || !entry.name) {
          problems.push(`${at(entry)}  unreadable entry in \`createCn\`'s \`theme\`.`);
          continue;
        }
        const ns =
          ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name) ? entry.name.text : null;
        if (!ns || !NAMESPACES.includes(ns)) {
          problems.push(
            `${at(entry)}  \`theme.${ns ?? "<computed>"}\` is not a tailwind-merge theme key.\n` +
              `    Known keys: ${NAMESPACES.slice().sort().join(", ")}.`
          );
          continue;
        }
        if (!ts.isArrayLiteralExpression(entry.initializer)) {
          problems.push(`${at(entry)}  \`theme.${ns}\` is not an array literal.`);
          continue;
        }
        const names = new Set();
        for (const element of entry.initializer.elements) {
          if (!ts.isStringLiteral(element) && !ts.isNoSubstitutionTemplateLiteral(element)) {
            problems.push(
              `${at(element)}  \`theme.${ns}\` holds a non-literal entry. Every token name has to\n` +
                `    be readable as text here, or the mirror cannot be compared against the CSS.`
            );
            continue;
          }
          names.add(element.text);
        }
        mirrored.set(ns, names);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Compare, both directions                                           */
/* ------------------------------------------------------------------ */

let checked = 0;

for (const [ns, names] of declared) {
  const list = mirrored.get(ns) ?? new Set();
  for (const [name, where] of names) {
    checked += 1;
    if (!list.has(name)) {
      problems.push(
        `${where}  \`--${ns}-${name}\` is declared in \`@theme\` but missing from\n` +
          `    \`createCn({ theme: { ${ns}: [ … ] } })\` in ${rel(STYLE_TS)}. Tailwind generates a\n` +
          `    utility from it; \`cn()\` is not told the utility exists.`
      );
    }
  }
}

for (const [ns, names] of mirrored) {
  const list = declared.get(ns) ?? new Map();
  for (const name of names) {
    if (!list.has(name)) {
      problems.push(
        `${rel(STYLE_TS)}  \`theme.${ns}\` mirrors \`${name}\`, which no \`@theme\` block under\n` +
          `    ${rel(SRC)} declares. Either the token was deleted and this entry is dead config\n` +
          `    that reads as live, or the name is misspelled on one side.`
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Vacuity — a gate that measured nothing is worse than a red one     */
/* ------------------------------------------------------------------ */

if (themeFiles.length === 0) {
  problems.push(
    `${rel(SRC)}  found ZERO \`@theme\` blocks. Either the domain tokens moved or this\n` +
      `    script's matcher stopped matching them; both make every check above vacuous.`
  );
}
if (checked === 0) {
  problems.push(
    `${rel(SRC)}  found ZERO \`@theme\` names to check. Nothing above asserted anything.`
  );
}

/* ------------------------------------------------------------------ */

if (problems.length > 0) {
  console.error(
    `verify:token-mirror — ${problems.length} problem(s):\n` +
      problems.map((p) => `  ${p}`).join("\n") +
      `\n\n\`src/tokens.css\` and \`createCn\` in \`src/util/style.ts\` state the same list of\n` +
      `domain token names, in two files, by hand. \`ETHOS.md\` ("Known fragility") calls that\n` +
      `coupling out as the system's main fragility; this script is the runtime enforcement it\n` +
      `says does not exist.`
  );
  process.exit(1);
}

const namespaces = [...declared.keys()].sort();
console.log(
  `verify:token-mirror — OK (${checked} @theme name(s) in ${[...new Set(themeFiles)].join(", ")}, ` +
    `all mirrored in createCn, none stale; ${namespaces.length} namespace(s): ${namespaces.join(", ")})`
);
