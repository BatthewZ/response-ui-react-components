#!/usr/bin/env node
// Asserts that `src/styles.css` registers every component stylesheet in
// `@layer components`, and that `tokens.css` stays unlayered.
//
// WHY
//
// Phase 1's entire result is one token repeated on every component import line:
// `layer(components)` (45 of them then, 43 now that Phase 2 deleted two stylesheets).
// Delete it from one import and that component's CSS goes back to out-ranking
// every caller utility at every specificity — silently, with no error and no
// visual change in any environment a gate here can enter.
//
// Nothing else could see that. `vitest` stubs CSS to `""` and jsdom applies no
// stylesheets, so types, lint and 2000+ tests are all blind. And
// `probe:cascade-layer` is blind for a subtler reason worth stating: it derives
// the import list from `src/styles.css` and then adds `layer()` ITSELF to build
// its layered variant, so it compares "no layer" against "layer" whatever the
// real file says. Removing `layer(components)` from a real import leaves the
// probe green. The one artefact that decides the shipped cascade was the one
// artefact no gate read.
//
// `tokens.css` is the inverse assertion and belongs in the same script, because
// the mistake it guards against is the same edit made in the other direction:
// it carries `@theme inline`, which registers utilities and must resolve in
// Tailwind's own `theme` layer. Wrapping it in `layer(components)` would
// silently stop the package's domain tokens generating utilities.
//
// WHY THIS SHAPE OF GATE
//
// No allowlist, and it cannot be satisfied by a lie: the layer keyword is either
// on the line or it is not. An import this script cannot classify is a FAILURE
// rather than a skip — an allowlist that grows by default is how the next hole
// opens (`memory/gates.md`: "a new gate's exemptions are where the next bug
// lives"). If a genuinely new kind of import is needed here, teach this script
// what it is and why, in the same commit.
//
// It is deliberately a sibling of `verify-no-css-imports.mjs` rather than a
// branch inside it. That script asserts the JS graph never reaches a stylesheet;
// this one asserts how `src/styles.css` registers the ones it owns. They fail
// for unrelated reasons and are fixed in unrelated files, and a single red gate
// covering both would need its failures split before either could be fixed.

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STYLES = join(ROOT, "src", "styles.css");
const REL = relative(ROOT, STYLES);

// `@import "<path>" <rest>;` — `rest` is whatever sits between the closing quote
// and the semicolon, which is where `layer()`, `supports()` and media queries go.
const IMPORT = /@import\s+(?:url\(\s*)?["']([^"'\n]+)["']\s*\)?([^;\n]*);/g;

const src = readFileSync(STYLES, "utf8");
// Blank out comments so a `layer(components)` written in prose cannot satisfy
// — or an `@import` quoted in prose trip — this check.
const scannable = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

const problems = [];
let componentImports = 0;
let tokenImports = 0;

for (const match of scannable.matchAll(IMPORT)) {
  const [, path, rest] = match;
  const line = scannable.slice(0, match.index).split("\n").length;
  const at = `${REL}:${line}`;
  const layer = /\blayer\s*\(\s*([^)]*?)\s*\)/.exec(rest);
  const raw = src.split("\n")[line - 1].trim();

  if (path.startsWith("./components/") && path.endsWith(".css")) {
    componentImports += 1;
    if (!layer) {
      problems.push(
        `${at}  component import with NO layer() — its rules ship unlayered and\n` +
          `    out-rank every caller utility at every specificity:\n      ${raw}`
      );
    } else if (layer[1] !== "components") {
      problems.push(
        `${at}  component import layered as \`${layer[1]}\`, expected \`components\`:\n      ${raw}`
      );
    }
  } else if (path === "./tokens.css") {
    tokenImports += 1;
    if (layer) {
      problems.push(
        `${at}  tokens.css must stay UNLAYERED — it carries \`@theme inline\`, which\n` +
          `    registers utilities and has to resolve in Tailwind's own theme layer:\n      ${raw}`
      );
    }
  } else {
    problems.push(
      `${at}  unrecognised @import "${path}". This script classifies exactly two kinds\n` +
        `    (a ./components/*.css that must carry layer(components), and ./tokens.css\n` +
        `    that must not carry layer()). Decide which this is and teach the script,\n` +
        `    in the same commit — an unclassified import is an unasserted one:\n      ${raw}`
    );
  }
}

// A file that lost its imports altogether would otherwise pass with nothing
// checked. `memory/gates.md`: a gate that measured nothing is worse than a red one.
if (componentImports === 0) {
  problems.push(
    `${REL}  found ZERO component imports. Either the registry moved or this\n` +
      `    script's matcher stopped matching it; both make every check above vacuous.`
  );
}
if (tokenImports !== 1) {
  problems.push(
    `${REL}  expected exactly 1 \`@import "./tokens.css"\`, found ${tokenImports}.`
  );
}

if (problems.length > 0) {
  console.error(
    `verify:css-layering — ${problems.length} problem(s) in ${REL}:\n` +
      problems.map((p) => `  ${p}`).join("\n") +
      `\n\n\`@layer components\` sits BELOW \`@layer utilities\`, which is what makes\n` +
      `\`<StatCard className="flex-row">\` work. Every per-component @import carries\n` +
      `\`layer(components)\`; \`tokens.css\` carries no layer() at all. See AGENTS.md,\n` +
      `"This package's CSS is in \`@layer components\`, so \`className\` wins".`
  );
  process.exit(1);
}

console.log(
  `verify:css-layering — OK (${componentImports} component imports, all layer(components); ` +
    `tokens.css unlayered)`
);
