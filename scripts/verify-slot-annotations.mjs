#!/usr/bin/env node
// Asserts, for every `className` JSX attribute in production `src/`, that a
// caller's class can reach that element OR that a source annotation records the
// judgement that it must not.
//
// THE RULE, IN ONE SENTENCE
//
//   Every `className` JSX attribute under `src/` (excluding `*.test.tsx` and
//   `*.examples.tsx`) is either REACHABLE — its initialiser text mentions
//   `className` or `classNames?.`/`classNames.` — or ANNOTATED with a leading
//   `// slot:(a) <reason>`, `// slot:(b) <reason>` or `// slot:(e) <reason>`;
//   anything else fails.
//
// WHY THIS GATE AND NOT THE OBVIOUS ONE
//
// `PLAN-overridability.md` §8 ("Why `verify:slot-reachability` was re-scoped")
// rejected the literal version — "every class literal must be reachable". It
// fails ~300 of 478 literals and needs an allowlist roughly TWICE THE SIZE of
// the clean set it guards, which is the exact anti-pattern
// `verify-focus-affordance.mjs`'s own header warns against. The flaw is
// conceptual: it conflates two questions.
//
//   Does a caller `className` flow to this element?  -> decidable by a parser
//   SHOULD it?                                       -> judgement, (a)-(f) triage
//
// So this gate decides only the first, and takes the second from the annotation
// the lane wrote at the element. That is the whole design: no allowlist, and an
// attribute it cannot classify is a FAILURE rather than a skip.
//
// WHY ONLY (a), (b) AND (e) DISCHARGE IT
//
// The question at an unreachable `className` is not "was this triaged" but "does
// the consumer's need have a route somewhere OTHER than this attribute". Three
// of plan §5's six outcomes answer yes and are therefore settling:
//
//   (a) not a gap    — no route is owed; the class IS the mechanism
//   (b) token        — the route is a custom property, because the override is
//                      a VALUE rather than a choice of utilities
//   (e) render prop  — the element is loop-generated or lives in a subtree the
//                      consumer replaces wholesale, so what they want is
//                      different CONTENT and the route is `render*`
//
// The other three do not, because each one ENDS in a `className` merge, at this
// attribute or at another:
//
//   (c) slot         — the route is `cn(base, classNames?.key)` right here, so a
//                      settled (c) is REACHABLE and needs no comment
//                      (`PHASE3-PATTERN.md` §6: "(c) is proved by the code")
//   (d) compound     — the route is the subcomponent's own `className`, at a
//                      different and reachable attribute. Annotated here, it
//                      means the compound was named and not built
//   (f) just-className — §4b's house rule: add `className` and merge it. Once
//                      done, the attribute is reachable
//
// So `slot:(c)`, `slot:(d)` and `slot:(f)` on an unreachable attribute are each
// a contradiction, reported as their own failure rather than silently accepted
// or silently ignored. `PHASE3-PATTERN.md` §6 predates the (e) rulings — it lists
// the grammar as `[a-e]` and discusses only (a)/(b), because at the time the only
// shipped annotations were (a) and (b). `FileUpload`'s `renderPreview`/`renderFile`
// subtrees are the worked (e) case and the reason this set is three, not two.
//
// BLIND SPOTS — READ THESE BEFORE RESTING ON A GREEN RUN
//
// `memory/gates.md`: "a new gate's exemptions are where the next bug lives", and
// "a check described as one that cannot be satisfied by a lie almost always
// can". The honest statement is narrower: this gate cannot be satisfied by an
// EMPTY annotation, and its false verdicts are a NAMED, CLOSED set:
//
//  1. THE REACHABILITY TEST IS A NAME MATCH ON THE ATTRIBUTE INITIALISER, NOT
//     DATA FLOW. Measured consequences, both directions:
//       - `const cls = cn("x", className)` then `className={cls}` reads as
//         UNREACHABLE. A false alarm — loud, and the correct direction.
//       - `const { item } = classNames ?? {}` then `className={cn("x", item)}`:
//         same shape, one level down. Same false alarm.
//       - `<Leaf tone={classNames?.item} />` — a leaf taking the slot under
//         another prop name. Same false alarm; `PHASE3-PATTERN.md` §2 requires
//         the value be passed down as `className`, and this is the enforcement.
//       - `const className = "static"` in scope then `className={className}`
//         reads as REACHABLE when it is not. THE ONE SILENT FALSE PASS.
//         `AGENTS.md`'s own `cn()` example names its local `className`, so the
//         shape is house style and this hole cannot be closed by naming alone.
//     THE DOCTRINE IS TO KEEP THE `cn()` AT THE ATTRIBUTE. Do not widen the
//     match to chase the false alarms: widening trades three loud false alarms
//     for an open set of silent false passes, and is how a gate acquires the
//     allowlist §8 says it must never need.
//
//  2. THE ANNOTATION MUST BEGIN A LINE. `ts.getLeadingCommentRanges` returns a
//     comment only when nothing but whitespace precedes it on its own line. So a
//     trailing `/* slot:(a) … */` after another attribute, and a comment placed
//     above the ELEMENT rather than inside its opening tag, are NOT SEEN — the
//     site fails as unannotated. That is loud and therefore safe, but it is also
//     the natural instinct for a one-line element, so it is written here before
//     the next reader "fixes" it. `memory/README.md` §28: this rule was measured
//     against the parser, not reasoned from the prose, and both readings of the
//     prose were wrong in opposite directions.
//     Seen:     annotation on its own line, `className` on the next line or the
//               same line after it; other attributes above and below it; an
//               ordinary comment above the annotation (first match wins).
//     Not seen: `<div /* slot:(a) … */ className="x" />`; `id="x" /* … */` then
//               `className` on the next line; `{/* … */}` or `//` before `<div`.
//
//  3. THE PROPS-GETTER FORM IS INVISIBLE. `className: "…"` or `className: cn(…)`
//     inside an object literal that is later spread onto an element is not a
//     `JsxAttribute`, so this walk never visits it. Those sites are counted and
//     NAMED in the run's own output under "BLIND SPOT", because an unstated
//     blind spot is where the next bug lives — but they are not classified, in
//     either direction, before or after a fix. `memory/README.md` §70: plan §7
//     item 5's grep undercounts them, because it matches only string-literal
//     initialisers and misses every `className: cn(…)`.
//
//  4. IT CANNOT DISTINGUISH "(c), DECIDED" FROM "REACHABLE, NEVER CONSIDERED".
//     Accepted by `PHASE3-PATTERN.md` §6, and the same cost §7 item 3 already
//     takes by treating reachability as sufficient.
//
//  5. IT READS THE TEXT OF THE INITIALISER, NOT THE RUNTIME. `className={cond ?
//     className : "x"}` reads as reachable on the strength of one branch.
//
// WHY IT CANNOT PASS VACUOUSLY
//
// Three separate ways, because a gate that is structurally incapable of failing
// is this repo's most expensive recurring defect (`memory/gates.md`):
//   - zero `className` attributes found  -> failure (bad root, bad glob)
//   - zero ANNOTATED attributes found    -> failure (the annotations reverted,
//     or the walk stopped seeing comments)
//   - an attribute that is neither       -> failure, never a skip
//
// USAGE
//
//   node scripts/verify-slot-annotations.mjs [root]     # root defaults to src/
//   node scripts/verify-slot-annotations.mjs --list     # print every site
//
// The optional root exists so the fail-on-purpose procedure can be run against a
// throwaway copy of the tree instead of editing `src/` in place.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const list = args.includes("--list");
const root = resolve(REPO, args.find((a) => !a.startsWith("--")) ?? "src");

// `slot:(<letter>) <reason>` with a NON-EMPTY reason. An empty reason fails the
// pattern, which is what stops `// slot:(a)` on its own from discharging
// anything (`PHASE3-PATTERN.md` §6: "not a restatement of the class").
const ANNOTATION = /^\s*slot:\(([a-f])\)\s+\S/;
// Anything that looks like an attempt at one. A marker that matches this and not
// ANNOTATION is MALFORMED — reported as such rather than falling through to
// "unannotated", so a typo names itself instead of reading as an oversight.
const ATTEMPT = /\bslot\s*:\s*\(/;
// (a) not-a-gap, (b) token and (e) render prop settle an unreachable element:
// each routes the consumer's need somewhere other than this attribute. (c), (d)
// and (f) all end in a `className` merge and so cannot. See the header.
const SETTLING = new Set(["a", "b", "e"]);

// The props-getter form this walk cannot see. Matches `className: "…"` AND
// `className: cn(…)`; plan §7 item 5's grep matches only the first and so
// undercounts (`memory/README.md` §70).
const PROPS_GETTER = /(^|[^\w.?])className\s*:\s*(cn\(|["'`])/;

function productionTsx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...productionTsx(path));
    } else if (
      entry.endsWith(".tsx") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".examples.tsx")
    ) {
      out.push(path);
    }
  }
  return out.sort();
}

const sites = [];
const blindSpots = [];

for (const file of productionTsx(root)) {
  const text = readFileSync(file, "utf8");
  const rel = relative(REPO, file);
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineOf = (pos) => source.getLineAndCharacterOfPosition(pos).line + 1;

  text.split("\n").forEach((lineText, i) => {
    if (PROPS_GETTER.test(lineText)) blindSpots.push({ rel, line: i + 1, text: lineText.trim() });
  });

  (function walk(node) {
    if (ts.isJsxAttribute(node) && node.name.getText() === "className") {
      const initialiser = node.initializer ? node.initializer.getText() : "";
      const reachable = /\bclassName\b/.test(initialiser) || /\bclassNames\s*[?.]/.test(initialiser);

      const comments = (ts.getLeadingCommentRanges(text, node.pos) ?? []).map((r) =>
        text.slice(r.pos, r.end).replace(/^\/\/|^\/\*|\*\/$/g, "")
      );
      const letter = comments.map((c) => c.match(ANNOTATION)).find(Boolean)?.[1] ?? null;
      const malformed = letter === null && comments.some((c) => ATTEMPT.test(c));

      sites.push({ rel, line: lineOf(node.getStart()), reachable, letter, malformed });
    }
    ts.forEachChild(node, walk);
  })(source);
}

const verdict = (s) => {
  if (s.malformed) return ["FAIL", "a `slot:(…)` marker that does not match `slot:([a-f]) <reason>`"];
  if (s.reachable && s.letter)
    return ["FAIL", `annotated (${s.letter}) but a caller class reaches it — the annotation is refuted by the code`];
  if (s.reachable) return ["ok", "reachable"];
  if (s.letter === null) return ["FAIL", "unreachable and unannotated"];
  if (!SETTLING.has(s.letter))
    return [
      "FAIL",
      `annotated (${s.letter}), which ends in a \`className\` merge — an unreachable element is settled only by (a), (b) or (e)`,
    ];
  return ["ok", `annotated (${s.letter})`];
};

const failures = [];
const counts = { reachable: 0, annotated: 0, byLetter: {} };

for (const site of sites) {
  const [state, why] = verdict(site);
  if (state === "FAIL") failures.push({ ...site, why });
  else if (site.reachable) counts.reachable += 1;
  else {
    counts.annotated += 1;
    counts.byLetter[site.letter] = (counts.byLetter[site.letter] ?? 0) + 1;
  }
  if (list) console.log(`  ${site.rel}:${site.line}  ${state} — ${why}`);
}

const rel = relative(REPO, root) || ".";
console.log(`\nverify:slot-annotations — ${sites.length} className attributes under ${rel}/`);
const byLetter = [...SETTLING].map((l) => `${l}:${counts.byLetter[l] ?? 0}`).join(" ");
console.log(
  `  reachable: ${counts.reachable}   annotated: ${counts.annotated} (${byLetter})   failing: ${failures.length}`
);

console.log(
  `\nBLIND SPOT — ${blindSpots.length} props-getter site(s) this gate CANNOT see (\`className:\` inside an\n` +
    "object literal is not a JsxAttribute, so it is unclassified in both directions).\n" +
    "They need hand-triage; a green run above says nothing about them:"
);
for (const b of blindSpots) console.log(`  ${b.rel}:${b.line}  ${b.text}`);
if (blindSpots.length === 0) console.log("  (none found — verify the grep, not the zero)");

if (sites.length === 0) {
  console.error(`\nFAIL: no className attributes found under ${rel}/. A gate with nothing to assert
is not a passing gate — check the root argument and the file filter.`);
  process.exit(1);
}

if (counts.annotated === 0) {
  console.error(`\nFAIL: no \`slot:(a|b|e)\` annotations found under ${rel}/. Either the triage
annotations have been reverted, or this script has stopped seeing leading comments.
Zero annotated sites is a failure, not a vacuous pass.`);
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILURE(S):\n`);
  for (const f of failures) console.error(`  ${f.rel}:${f.line}  ${f.why}`);
  console.error(`
Each one is either an element a caller's class cannot reach and nobody ruled on —
add \`// slot:(a) <reason>\`, \`// slot:(b) <reason>\` or \`// slot:(e) <reason>\` as the
first thing on its own line inside the opening tag, directly before \`className\` —
or an element that should have a route, in which case merge the caller's value
with \`cn()\` AT THE ATTRIBUTE. Do not hoist the merge into a local to satisfy this
script: see the blind-spot notes in this file's header.`);
  process.exit(1);
}

console.log("\nOK");
