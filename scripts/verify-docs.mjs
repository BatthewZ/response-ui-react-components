#!/usr/bin/env node
// Verifies every public *value* export is documented in BOTH README.md and AGENTS.md.
//
// Catches the common drift where a new component/hook is added to a barrel but one
// of the human-facing docs is never updated (how RangeCalendar / DateRangePicker /
// AvatarUpload / useMediaQuery each slipped through one doc before this guard existed).
//
// Scope & non-goals:
// - Only *value* exports are checked (components, hooks, helpers). `type`-only exports
//   are documented at the author's discretion and are NOT required in either doc.
// - Exports from intentionally-summarised helper modules (date/color bundles) and a few
//   enumerated sub-parts/constants are exempt — see SUMMARIZED_* below.
// - Header counts ("UI (50)") are advisory and NOT enforced; the per-group tallies
//   printed on success help a human keep them honest.
// - Reverse drift (a doc naming an export that no longer exists) is not checked.
//
// Exits 1 on any undocumented export. No build step required — reads src/ barrels only.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const README = join(ROOT, "README.md");
const AGENTS = join(ROOT, "AGENTS.md");

// Source-module basenames whose exports the docs summarise rather than enumerate.
const SUMMARIZED_SOURCES = new Set(["date", "color"]);
// Individual sub-part / constant exports the docs fold into a parent entry.
const SUMMARIZED_NAMES = new Set([
  "EmptyStateTitle",
  "EmptyStateDescription",
  "EmptyStateIcon",
  "EmptyStateActions",
  "STORAGE_KEY",
]);

/** Recursively collect every `src/**\/index.ts` barrel. */
function findBarrels(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findBarrels(full, out);
    else if (entry === "index.ts") out.push(full);
  }
  return out;
}

/**
 * Parse `export { ... } from "<src>"` blocks (single- or multi-line) and return
 * `{ name, base }` for every *value* specifier (`type`-only ones are dropped).
 */
function valueExports(text) {
  const out = [];
  const re = /export\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const base = m[2].split("/").pop();
    for (let spec of m[1].split(",")) {
      spec = spec.trim();
      if (!spec || spec.startsWith("type ")) continue;
      const name = spec.split(/\s+as\s+/).pop().trim(); // aliased export -> public name
      if (name) out.push({ name, base });
    }
  }
  return out;
}

const exports = new Map(); // name -> source basename (last wins; names are unique)
for (const file of findBarrels(SRC)) {
  for (const { name, base } of valueExports(readFileSync(file, "utf8"))) {
    exports.set(name, base);
  }
}

const readme = readFileSync(README, "utf8");
const agents = readFileSync(AGENTS, "utf8");
const documentedIn = (doc, name) =>
  new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(doc);

const missingReadme = [];
const missingAgents = [];
let checked = 0;

for (const [name, base] of [...exports].sort(([a], [b]) => a.localeCompare(b))) {
  if (SUMMARIZED_SOURCES.has(base) || SUMMARIZED_NAMES.has(name)) continue;
  checked++;
  if (!documentedIn(readme, name)) missingReadme.push(name);
  if (!documentedIn(agents, name)) missingAgents.push(name);
}

if (missingReadme.length || missingAgents.length) {
  console.error("\nverify-docs: UNDOCUMENTED EXPORTS\n");
  if (missingReadme.length)
    console.error("  Missing from README.md:\n" + missingReadme.map((n) => "    - " + n).join("\n"));
  if (missingAgents.length)
    console.error("  Missing from AGENTS.md:\n" + missingAgents.map((n) => "    - " + n).join("\n"));
  console.error(
    `\n${missingReadme.length + missingAgents.length} gap(s) across ${checked} checked value exports.`,
  );
  process.exit(1);
}

console.log(`verify-docs: OK — ${checked} value exports documented in README.md and AGENTS.md.`);
process.exit(0);
