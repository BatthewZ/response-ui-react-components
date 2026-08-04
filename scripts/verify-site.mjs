#!/usr/bin/env node
// Verifies that the documentation site in site/ can reach everything the docs contain.
//
// Complements the guards around it rather than repeating them:
//   gen-docs.mjs             — every examples module has a doc, every fence is current
//   verify-component-docs.mjs — every relative link resolves to a real FILE
//   this script               — every one of those files is reachable AS A PAGE
//
// The distinction is the whole reason it exists. A link can point at a file that exists
// and still be dead on the site: `docs/project-docs/` is excluded from the npm tarball
// and is not published here, and a doc added at a path the site does not glob would be
// unreachable with every other gate green. The site's route table is exactly its two
// globs — `docs/*.md` and `docs/components/*.md` — so checking membership in those globs
// checks reachability without this script needing to know how routes are spelled, which
// is what keeps the mapping in one place (site/registry.ts) rather than two.
//
// Non-.md targets are allowed and become links to the file on GitHub, so they are checked
// for existence instead of membership.
//
// Exits 1 on any failure.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const SPOKES = join(DOCS, "components");
const SRC = join(ROOT, "src", "components");

const failures = [];

/* ---- The site's route table, derived exactly as site/registry.ts derives it ---- */

const guidePages = readdirSync(DOCS).filter((f) => f.endsWith(".md"));
const spokePages = readdirSync(SPOKES).filter((f) => f.endsWith(".md"));

/** Doc paths relative to `docs/`, which is the key resolveDocLink() routes on. */
const routable = new Set([
  ...guidePages.map((f) => f),
  ...spokePages.map((f) => `components/${f}`),
]);

/* ---- 1. Every component with examples has a page, and vice versa ---- */
// The site's claim is "every component is here". gen-docs proves the doc exists; this
// proves the count the site will render matches the count the source can produce, so a
// silent drop to 89 of 91 fails rather than looking like a complete site.

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const exampleModules = readdirSync(SRC, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((group) =>
    readdirSync(join(SRC, group.name))
      .filter((f) => f.endsWith(".examples.tsx"))
      .map((f) => ({ group: group.name, slug: kebab(f.slice(0, -".examples.tsx".length)) })),
  );

for (const { slug } of exampleModules) {
  if (!routable.has(`components/${slug}.md`)) {
    failures.push(`${slug}: has an examples module but no docs/components/${slug}.md — no page`);
  }
}

for (const file of spokePages) {
  if (file === "README.md") continue;
  const slug = file.slice(0, -".md".length);
  if (!exampleModules.some((m) => m.slug === slug)) {
    failures.push(`docs/components/${file}: no examples module, so its page would render prose only`);
  }
}

/* ---- 2. Every relative link in a rendered doc lands somewhere the site can go ---- */

const inFence = () => {
  let char = null;
  let length = 0;
  return (line) => {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence) return char !== null;
    const [, run, rest] = fence;
    if (char === null) {
      if (run[0] !== "~" && rest.includes("`")) return false;
      char = run[0];
      length = run.length;
    } else if (run[0] === char && run.length >= length && rest.trim() === "") {
      char = null;
    }
    return true;
  };
};

const rendered = [
  ...guidePages.map((f) => ({ file: join(DOCS, f), dir: "" })),
  ...spokePages.map((f) => ({ file: join(SPOKES, f), dir: "components" })),
];

let linksChecked = 0;

for (const { file, dir } of rendered) {
  const skip = inFence();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (skip(line)) continue;
    for (const [, dest] of line.matchAll(/\]\(([^)\s]+)/g)) {
      if (dest.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(dest)) continue;
      linksChecked++;

      const [target] = dest.split("#");
      const path = relative(DOCS, resolve(DOCS, dir, target)).split("\\").join("/");

      if (path.endsWith(".md")) {
        if (!routable.has(path)) {
          failures.push(
            `${relative(ROOT, file)}: links to "${dest}", which the site does not publish ` +
              `(not matched by docs/*.md or docs/components/*.md) — it would render as a dead route`,
          );
        }
      } else if (!existsSync(resolve(DOCS, dir, target))) {
        failures.push(
          `${relative(ROOT, file)}: links to "${dest}", which does not exist — the site would ` +
            `send a reader to a GitHub URL for a missing file`,
        );
      }
    }
  }
}

/* ---- Report ---- */

// Per-check counts, not a bare "OK": memory/gates.md is explicit that a guard which
// silently stops finding anything to check stays green while going blind.
if (failures.length) {
  console.error("\nverify-site: FAILURES\n" + failures.map((f) => "  - " + f).join("\n") + "\n");
  process.exit(1);
}

console.log(
  `verify-site: OK — ${exampleModules.length} components with pages, ` +
    `${guidePages.length} guide page(s), ${linksChecked} relative link(s) reachable.`,
);
