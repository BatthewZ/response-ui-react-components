#!/usr/bin/env node
// Injects compiled examples from `src/**/*.examples.tsx` into the code fences of
// `docs/components/*.md`.
//
// Why: a hand-written fence rots silently — it keeps rendering as markdown long after
// the prop it demonstrates was renamed. Examples here are real modules inside
// `tsconfig.json`'s `include`, so `bun run typecheck` proves every snippet compiles
// against the current source before it can reach a doc.
//
// Ownership split: the machine owns fence contents, the author owns everything else.
// Prose (token tables, gotchas, a11y) is judgement and stays hand-written markdown.
//
// Convention, per `<Component>.examples.tsx`:
//   - each `export function Name()` is one example
//   - its leading `/** … */` becomes the prose line above the fence
//   - its `return` JSX becomes the fence body; imports and fixtures above it never ship
//
// Usage:
//   node scripts/gen-docs.mjs           write docs in place
//   node scripts/gen-docs.mjs --check   exit 1 if any doc is stale (CI)

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DOCS = join(ROOT, "docs", "components");
const CHECK = process.argv.includes("--check");

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function findExampleFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findExampleFiles(full, out);
    else if (entry.endsWith(".examples.tsx")) out.push(full);
  }
  return out;
}

/** Remove the smallest shared leading indentation across all non-blank lines. */
function dedent(lines) {
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min));
}

/** `<>…</>` is a compile-time wrapper for sibling nodes — noise in a doc. */
function unwrapFragment(lines) {
  if (lines[0]?.trim() !== "<>" || lines[lines.length - 1]?.trim() !== "</>") return lines;
  return dedent(lines.slice(1, -1));
}

/**
 * Pull `{ name, doc, code }` for each exported example.
 * Bodies are matched by a column-0 `}`, which the repo's formatting guarantees.
 */
function parseExamples(text) {
  const lines = text.split("\n");
  const examples = [];

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(/^export function (\w+)\(\)\s*\{$/);
    if (!header) continue;

    let doc = "";
    if (lines[i - 1]?.trim().startsWith("/**")) {
      doc = lines[i - 1].trim().replace(/^\/\*\*\s*/, "").replace(/\s*\*\/$/, "");
    } else if (lines[i - 1]?.trim() === "*/") {
      const start = lines.lastIndexOf("/**", i);
      doc = lines
        .slice(start + 1, i - 1)
        .map((l) => l.trim().replace(/^\*\s?/, ""))
        .join(" ")
        .trim();
    }

    const end = lines.indexOf("}", i);
    const body = lines.slice(i + 1, end);

    // Locate the return, which may sit below hook calls or fixtures — those are
    // typecheck fuel for the demo and must not reach the doc.
    const stmt = body.findIndex((l) => l.trim().startsWith("return"));
    const returnLine = body[stmt]?.trim() ?? "";

    let code;
    if (returnLine === "return (") {
      const close = body.length - 1 - [...body].reverse().findIndex((l) => l.trim() === ");");
      code = unwrapFragment(dedent(body.slice(stmt + 1, close)));
    } else {
      code = dedent([returnLine.replace(/^return\s+/, "").replace(/;$/, "")]);
    }

    const snippet = code.join("\n").trim();
    if (!snippet.startsWith("<")) {
      throw new Error(
        `could not extract JSX from example "${header[1]}" — got ${JSON.stringify(snippet)}. ` +
          `Examples must end in a single \`return <JSX>;\` or \`return (\\n…\\n);\`.`,
      );
    }

    examples.push({ name: header[1], doc, code: snippet });
    i = end;
  }

  return examples;
}

// An example block is its opening marker through the FIRST `<!-- /example -->` after it.
// Nothing about the body is asserted by the pattern, which is deliberate — see below.
//
// AUDIT #479: the previous pattern spelled the body as an optional fence,
// `(?:```tsx\n[\s\S]*?\n```\n)?`, and that silently deleted documentation. Given an EMPTY
// ```` ```tsx ```` block, the lazy inner `[\s\S]*?` cannot find its closing fence before the
// block's own `<!-- /example -->`, so it kept expanding — past the close marker, past every
// heading and paragraph that followed, and stopped at the NEXT example's closing fence, whose
// `<!-- /example -->` completed the match. One injection then overwrote the lot. The only
// signal was an "unused example" error naming the *other* example, and `--check` afterwards
// compared against the damaged file and agreed with it. It ate a section of `empty-state.md`
// and — since every page is rewritten on every run — a section of `scroll-reveal.md`, a file
// its author had never opened.
//
// Two properties make that unreachable now, and both matter:
//   1. The body is lazy and unconstrained, terminated by the first close marker. There is no
//      inner quantifier that can fail and force the match to grow past it, so a match can
//      never span more than one block whatever the body contains.
//   2. A body containing another OPENING marker means a close marker is missing upstream.
//      That is checked in the replacer and raised as an error instead of being rewritten,
//      because it is the one remaining shape where a well-formed-looking match could still
//      swallow a neighbour.
const MARKER = /<!-- example:(\w+) -->\n([\s\S]*?)<!-- \/example -->/g;

/**
 * The containment property MARKER exists to guarantee, asserted against fixtures on every
 * run — including the write path, which is the one that can destroy a file.
 *
 * It lives here rather than in a test file because `vitest.config.ts` includes only
 * `src/**` and this is a `scripts/` module: a test written elsewhere would not run with the
 * suite, and a guard nobody runs is how AUDIT #479 survived long enough to eat two pages.
 * Running it unconditionally costs microseconds and cannot be skipped.
 *
 * The fixtures are the shapes that actually broke it, kept literal so a future "simplify the
 * regex" edit fails here instead of passing review and deleting prose.
 */
function assertMarkerCannotSpanBlocks() {
  const page = (body) =>
    ["<!-- example:First -->", ...body, "<!-- /example -->", "", "## Prose", "",
     "<!-- example:Second -->", "```tsx", "const x = 1;", "```", "<!-- /example -->"].join("\n");
  const bodies = {
    "empty fence": ["```tsx", "```"], // the #479 trigger
    "no fence": [],
    "normal fence": ["```tsx", "const y = 2;", "```"],
    "fence quoting a fence": ["```tsx", 'const s = "```";', "```"],
  };
  for (const [label, body] of Object.entries(bodies)) {
    const names = [...page(body).matchAll(MARKER)].map((m) => m[1]);
    if (names.join(",") !== "First,Second") {
      throw new Error(
        `gen-docs: MARKER self-check failed for "${label}" — matched [${names}], expected ` +
          `[First,Second]. The pattern is spanning example blocks and would DELETE the ` +
          `documentation between them (AUDIT #479). Refusing to run.`,
      );
    }
  }
  // A block that never closes must be detectable, so the replacer can refuse it.
  const unclosed = ["<!-- example:First -->", "```tsx", "```", "", "## Prose", "",
    "<!-- example:Second -->", "```tsx", "z", "```", "<!-- /example -->"].join("\n");
  const [first] = [...unclosed.matchAll(MARKER)];
  if (!first || !first[2].includes("<!-- example:")) {
    throw new Error(
      "gen-docs: MARKER self-check failed — an unclosed example block no longer surfaces the " +
        "following opening marker in its body, so the replacer's guard cannot fire.",
    );
  }
}
assertMarkerCannotSpanBlocks();

let stale = [];
let errors = [];
let injected = 0;

for (const file of findExampleFiles(SRC)) {
  const component = basename(file, ".examples.tsx");
  const docPath = join(DOCS, `${kebab(component)}.md`);

  if (!existsSync(docPath)) {
    errors.push(`${component}: no doc at docs/components/${kebab(component)}.md`);
    continue;
  }

  const examples = new Map(parseExamples(readFileSync(file, "utf8")).map((e) => [e.name, e]));
  const original = readFileSync(docPath, "utf8");
  const used = new Set();

  const updated = original.replace(MARKER, (whole, name, body) => {
    // A nested opening marker means the block above this one never closed. Rewriting here
    // would consume that block's content, which is the AUDIT #479 failure mode. Refuse.
    if (body.includes("<!-- example:")) {
      errors.push(
        `${kebab(component)}.md: example "${name}" is not closed before the next ` +
          `<!-- example: --> marker. Add the missing <!-- /example -->; nothing was rewritten.`,
      );
      return whole;
    }
    const example = examples.get(name);
    if (!example) {
      errors.push(`${kebab(component)}.md references example "${name}", which no longer exists`);
      return whole;
    }
    used.add(name);
    injected++;
    return `<!-- example:${name} -->\n\`\`\`tsx\n${example.code}\n\`\`\`\n<!-- /example -->`;
  });

  for (const name of examples.keys()) {
    if (!used.has(name)) errors.push(`${component}.examples.tsx exports unused example "${name}"`);
  }

  if (updated !== original) {
    if (CHECK) stale.push(`docs/components/${kebab(component)}.md`);
    else writeFileSync(docPath, updated);
  }
}

/* ------------------------------------------------------------------ */
/*  Hub                                                                */
/* ------------------------------------------------------------------ */

// Generated, never hand-edited: a hub that can't name a component that isn't there.
// Title comes from each spoke's `# H1`, summary from the paragraph beneath it, and the
// group from the source path (src/components/<group>/…), so all three track the tree.

const GROUP_TITLES = {
  ui: "UI",
  form: "Form",
  "data-display": "Data display",
  layout: "Layout",
  animation: "Animation",
  guards: "Guards",
  router: "Router",
};

function spokeSummary(md) {
  const lines = md.split("\n");
  const h1 = lines.findIndex((l) => l.startsWith("# "));
  const body = [];
  for (let i = h1 + 1; i < lines.length; i++) {
    if (!lines[i].trim()) {
      if (body.length) break;
      continue;
    }
    if (lines[i].startsWith("#") || lines[i].startsWith("<!--")) break;
    body.push(lines[i].trim());
  }
  return { title: lines[h1].slice(2).trim(), summary: body.join(" ") };
}

const groups = new Map();
for (const file of findExampleFiles(SRC)) {
  const component = basename(file, ".examples.tsx");
  const docPath = join(DOCS, `${kebab(component)}.md`);
  if (!existsSync(docPath)) continue;

  const group = file.split(/[\\/]/).at(-2);
  const { title, summary } = spokeSummary(readFileSync(docPath, "utf8"));
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push({ title, summary, href: `${kebab(component)}.md` });
}

const hubLines = [
  "<!-- Generated by scripts/gen-docs.mjs — do not edit. -->",
  "",
  "# Components",
  "",
  "One page per component: a compiled example, its props, the theme tokens it reads,",
  "and the sharp edges. Every code block on these pages is extracted from a real",
  "module that `bun run typecheck` compiles, so nothing here can drift from the source.",
  "",
];

for (const group of Object.keys(GROUP_TITLES)) {
  const items = groups.get(group);
  if (!items?.length) continue;
  items.sort((a, b) => a.title.localeCompare(b.title));
  hubLines.push(
    `## ${GROUP_TITLES[group]}`,
    "",
    "| Component | Description |",
    "| --------- | ----------- |",
    ...items.map((i) => `| [${i.title}](${i.href}) | ${i.summary} |`),
    "",
  );
}

const hubPath = join(DOCS, "README.md");
const hub = hubLines.join("\n");
const hubExisting = existsSync(hubPath) ? readFileSync(hubPath, "utf8") : "";

if (hub !== hubExisting) {
  if (CHECK) stale.push("docs/components/README.md");
  else writeFileSync(hubPath, hub);
}

if (errors.length) {
  console.error("\ngen-docs: ERRORS\n" + errors.map((e) => "  - " + e).join("\n") + "\n");
  process.exit(1);
}

if (stale.length) {
  console.error(
    "\ngen-docs: STALE DOCS — run `node scripts/gen-docs.mjs`\n" +
      stale.map((f) => "  - " + f).join("\n") +
      "\n",
  );
  process.exit(1);
}

console.log(`gen-docs: OK — ${injected} example(s) ${CHECK ? "verified" : "injected"}.`);
