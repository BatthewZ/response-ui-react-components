#!/usr/bin/env node
// Verifies "use client" directive placement across src/ and the built dist/.
//
// - Every SOURCE module (src/**/*.ts(x), excluding *.test.*, *.d.ts, index.ts)
//   that carries a top-level "use client" must have a matching dist/<rel>.js
//   whose first line is the directive (BUILD-MIRROR CHECK).
// - No dist barrel (dist/index.js or dist/**/index.js) may carry the directive
//   (BARREL CHECK).
// - No module under src/components or src/hooks may read process.env or
//   import.meta.env (SECRET-FREE GUARD). localStorage is allowed.
//
// Run `bun run build` first so dist/ exists. Exits 1 on any violation.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

/** Recursively collect files under `dir` matching `predicate`. */
function walk(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

const isSourceModule = (p) => {
  const base = p.split(sep).pop();
  if (!/\.tsx?$/.test(base)) return false;
  if (/\.test\./.test(base)) return false;
  if (base.endsWith(".d.ts")) return false;
  if (base === "index.ts") return false;
  return true;
};

/**
 * Returns true if the first non-empty / non-comment line of `text` is a
 * "use client" (or 'use client') directive.
 */
function hasLeadingDirective(text) {
  const lines = text.split(/\r?\n/);
  let i = 0;
  let inBlockComment = false;
  for (; i < lines.length; i++) {
    let line = lines[i].trim();
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2).trim();
      inBlockComment = false;
    }
    if (line === "") continue;
    if (line.startsWith("//")) continue;
    if (line.startsWith("/*")) {
      const end = line.indexOf("*/");
      if (end === -1) {
        inBlockComment = true;
        continue;
      }
      line = line.slice(end + 2).trim();
      if (line === "") continue;
    }
    return /^["']use client["'];?$/.test(line);
  }
  return false;
}

/** Whether the literal first line is the directive (used for dist .js checks). */
function firstLineIsDirective(text) {
  const first = text.split(/\r?\n/)[0]?.trim() ?? "";
  return /^["']use client["'];?$/.test(first);
}

const violations = [];

// --- gather source modules ---
const sourceModules = walk(SRC, isSourceModule);
const clientSources = [];
const neutralSources = [];
for (const file of sourceModules) {
  const text = readFileSync(file, "utf8");
  if (hasLeadingDirective(text)) clientSources.push(file);
  else neutralSources.push(file);
}

// --- BUILD-MIRROR CHECK ---
for (const file of clientSources) {
  const rel = relative(SRC, file).replace(/\.tsx?$/, ".js");
  const distFile = join(DIST, rel);
  if (!existsSync(distFile)) {
    violations.push(`MISSING DIST: ${relative(ROOT, file)} -> expected ${relative(ROOT, distFile)}`);
    continue;
  }
  const distText = readFileSync(distFile, "utf8");
  if (!firstLineIsDirective(distText)) {
    violations.push(`DIST FIRST LINE NOT DIRECTIVE: ${relative(ROOT, distFile)}`);
  }
}

// --- BARREL CHECK ---
const distJs = walk(DIST, (p) => p.endsWith(".js"));
const barrelLeaks = [];
for (const file of distJs) {
  const base = file.split(sep).pop();
  if (base !== "index.js") continue;
  const text = readFileSync(file, "utf8");
  // top-level directive: first line, or any standalone "use client" statement
  if (firstLineIsDirective(text) || /^\s*["']use client["'];?\s*$/m.test(text)) {
    barrelLeaks.push(relative(ROOT, file));
  }
}
for (const f of barrelLeaks) {
  violations.push(`BARREL LEAK (dist barrel has "use client"): ${f}`);
}

// --- SECRET-FREE GUARD ---
const guarded = sourceModules.filter((p) => {
  const rel = relative(SRC, p);
  return rel.startsWith("components" + sep) || rel.startsWith("hooks" + sep);
});
const secretOffenders = [];
for (const file of guarded) {
  const text = readFileSync(file, "utf8");
  if (/process\.env|import\.meta\.env/.test(text)) {
    secretOffenders.push(relative(ROOT, file));
  }
}
for (const f of secretOffenders) {
  violations.push(`SECRET ACCESS (process.env / import.meta.env): ${f}`);
}

// --- report ---
if (violations.length > 0) {
  console.error("\nverify-directives: VIOLATIONS FOUND\n");
  for (const v of violations) console.error("  - " + v);
  console.error(`\n${violations.length} violation(s).`);
  process.exit(1);
}

console.log(
  `verify-directives: OK — ${clientSources.length} client modules verified ` +
    `(${neutralSources.length} neutral), no barrel leaks, no secret access.`
);
process.exit(0);
