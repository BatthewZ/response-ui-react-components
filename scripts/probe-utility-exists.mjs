/**
 * Does this class string actually compile to CSS in THIS repo?
 *
 *   bun run scripts/probe-utility-exists.mjs 'border-b-border-default' 'ease-shift' …
 *   bun run scripts/probe-utility-exists.mjs --css 'data-[state=open]:grid-rows-[1fr]'
 *
 * Answers a question the Tailwind docs cannot: the docs say which *variants* exist, but whether
 * `ease-shift` or `duration-shift` resolves depends on whether `response-ui-css` put the token in a
 * namespace Tailwind reads. It did not — `--motion-*` is in no namespace, so `ease-shift` MISSes
 * while `ease-(--MOTION-EASE-SHIFT)` compiles. That distinction was found by running this, and
 * assuming it the other way is the failure this script exists to prevent.
 *
 * MISS means "generates nothing" — the class would land in the DOM, change nothing, and report no
 * error, which is the exact failure mode Phase 1 was about. It does NOT mean the conversion is
 * wrong; OK does not mean it is right. Whether the utility belongs in `@layer utilities` at all is
 * `AGENTS.md` §"Decision: what stays in CSS", and this script has no opinion on it.
 *
 * `--css` prints the generated rules so you can read the emitted selector and its specificity —
 * which is how the survey established that `data-[state=open]:grid-rows-[1fr]` beats a base
 * `grid-rows-[0fr]` on specificity rather than on sort order.
 */
import { compile } from "tailwindcss";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Resolved, not hardcoded: the foundation is a dependency and may be hoisted, linked or stored. */
function foundationEntry() {
  const candidates = [
    path.join(packageRoot, "node_modules/@batthewz/response-ui-css/src/index-no-fonts.css"),
    path.join(packageRoot, "../response-ui-css/src/index-no-fonts.css"),
  ];
  const found = candidates.find((p) => {
    try {
      readFileSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (!found) {
    console.error("Cannot locate response-ui-css. Looked in:\n  " + candidates.join("\n  "));
    process.exit(2);
  }
  return found;
}

const args = process.argv.slice(2);
const showCss = args.includes("--css");
const candidates = args.filter((a) => a !== "--css");

if (candidates.length === 0) {
  console.error("usage: bun run scripts/probe-utility-exists.mjs [--css] <class> [<class> …]");
  process.exit(2);
}

// The foundation is imported so token-backed names resolve. Without it every `*-r4`, `*-body-2`
// and `*-fg-primary` MISSes and the run looks like a catastrophe rather than a missing import.
const input = `@import "tailwindcss";\n@import "${foundationEntry()}";\n`;

const compiler = await compile(input, {
  base: packageRoot,
  loadStylesheet: async (id, base) => {
    const resolved =
      id === "tailwindcss"
        ? path.join(packageRoot, "node_modules/tailwindcss/index.css")
        : id.startsWith("tailwindcss/")
          ? path.join(packageRoot, "node_modules", id)
          : path.resolve(base, id);
    return {
      path: resolved,
      base: path.dirname(resolved),
      content: readFileSync(resolved, "utf8"),
    };
  },
  loadModule: async () => {
    throw new Error("probe compiles CSS only; no JS plugins");
  },
});

const css = compiler.build(candidates);

/**
 * Tailwind escapes every non-identifier character in the emitted selector.
 *
 * Escape by ALLOW-list, never by a list of characters to escape. The first
 * version of this listed the punctuation it knew about and silently omitted `&`
 * and `'`, so every arbitrary variant (`[&>svg]:size-full`) and every
 * `content-['']` reported MISS while compiling perfectly — a probe that says
 * "this generates nothing" about a class that generates something is worse than
 * no probe, because the reader deletes a working utility on its word.
 */
function emittedSelector(candidate) {
  return "." + candidate.replace(/[^\w-]/g, (ch) => "\\" + ch);
}

let missing = 0;
for (const candidate of candidates) {
  const hit = css.includes(emittedSelector(candidate));
  if (!hit) missing++;
  console.log(`${hit ? "OK  " : "MISS"}  ${candidate}`);
}

if (showCss) {
  console.log("\n" + css.trim());
}

process.exit(missing === 0 ? 0 : 1);
