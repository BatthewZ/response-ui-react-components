#!/usr/bin/env node
// Asserts that no `.ts`/`.tsx` under `src/` imports a `.css` file.
//
// WHY
//
// `src/styles.css` is the single registry of this package's component CSS, and
// since Phase 1 every entry in it carries `layer(components)`. A second import
// of the same stylesheet from the JS graph defeats that completely: the bundler
// injects it UNLAYERED, where it out-ranks `@layer components` — so the
// component keeps beating a caller's utility and Phase 1's headline promise
// silently does not hold, for that component only.
//
// That was live: `src/components/layout/Grid.tsx:5` did `import "./Grid.css"`,
// the only such import in the package, and `dev/styles.css` imports
// `../src/styles.css`, so the dev app was exactly the environment that
// exhibited it.
//
// WHY THIS SHAPE OF GATE
//
// `probe:cascade-layer` structurally cannot see it: it derives its entries from
// `src/styles.css` and builds CSS with no JS graph, so it goes green while the
// real bundle disagrees (`memory/README.md` §14 — the verification environment
// and the shipped one disagreeing). This check has no allowlist and cannot be
// satisfied by a lie: either the import statement is there or it is not. If a
// component genuinely needs new CSS, add it to `src/styles.css` with
// `layer(components)`, which is the only place that decides layering.

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { globSync } from "glob";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

// One alternation, so a dynamic import at the head of a line is reported once
// rather than by both branches.
const CSS_IMPORT = new RegExp(
  [
    // `import "./x.css"` and `import x from "./x.css"`, at the head of a line.
    String.raw`(?:^|\n)\s*import\b[^\n;]*["'][^"'\n]+\.css["']`,
    // The dynamic form, anywhere in the line.
    String.raw`import\(\s*["'][^"'\n]+\.css["']\s*\)`,
  ].join("|"),
  "g"
);

const files = globSync("**/*.{ts,tsx}", { cwd: SRC, absolute: true, nodir: true });
const offenders = [];

for (const file of files.sort()) {
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(CSS_IMPORT)) {
    const line = src.slice(0, match.index).split("\n").length;
    offenders.push(`${relative(ROOT, file)}:${line}  ${match[0].trim()}`);
  }
}

if (offenders.length > 0) {
  console.error(
    `verify:no-css-imports — ${offenders.length} CSS import(s) from JS:\n` +
      offenders.map((o) => `  ${o}`).join("\n") +
      "\n\nA stylesheet reached through the JS graph is injected UNLAYERED and beats\n" +
      "`@layer components`, so the component stops being overridable from a caller's\n" +
      "`className`. Register the file in `src/styles.css` with `layer(components)`\n" +
      "instead — that file is the only place layering is decided."
  );
  process.exit(1);
}

console.log(`verify:no-css-imports — OK (${files.length} .ts/.tsx files, 0 CSS imports)`);
