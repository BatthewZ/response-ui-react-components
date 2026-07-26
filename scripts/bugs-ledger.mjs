#!/usr/bin/env node
/**
 * Guard + report over the BUGS.md findings table.
 *
 * Nothing read BUGS.md before this existed, so 420 hand-maintained rows had no
 * oracle at all — and the moment a patch lands, every `file:line` anchor below it
 * shifts with nothing to notice. That is the defect class this catches.
 *
 * Bounds-checking the line number was never enough: a patch above an anchor shifts it
 * onto unrelated code that still *exists*, so the number stays valid while the row
 * silently starts describing something else. One reconcile moved 157 such anchors and
 * no gate saw one. Every anchor therefore carries a content fingerprint in the markdown
 * link title — `(src/x.tsx#L12 "fp:1a2b3c4d")` — which renders as a tooltip, stays out
 * of the table, and is asserted against source on every run. A missing or malformed
 * fingerprint is a violation, not a skip.
 *
 * Deliberately NOT wired into `prepublishOnly`. Every guard in that chain checks a
 * shipped artifact (`docs/`, `README.md`, `AGENTS.md`, `dist/`); `bugs/` is not in
 * package.json `files` and is not published, so gating a release on it would cross
 * the boundary this repo is careful about. Run it at the land gate instead — see
 * CONTRIBUTING.md "Known-defect ledger".
 *
 *   bun run verify:bugs                  # report
 *   bun run verify:bugs -- --check       # exit 1 on any structural violation
 *   node scripts/bugs-ledger.mjs --reanchor   # relocate shifted anchors, restamp fingerprints
 *   node scripts/bugs-ledger.mjs --json
 *   node scripts/bugs-ledger.mjs --status confirmed   # filter the row listing
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(opt("pkg", path.join(HERE, "..")));
const LEDGER = path.resolve(opt("file", path.join(PKG, "bugs/LEDGER.md")));
const DETAILS_DIR = path.resolve(opt("details", path.join(PKG, "bugs/components")));

/**
 * Terminal statuses must carry a `·`-separated payload naming the evidence: a commit
 * sha for `fixed`, a reason for `refuted`/`wontfix`, the blocking decision for
 * `deferred`, the superseding id for `superseded`. An unevidenced verdict is the
 * failure mode this enum exists to prevent.
 */
const LIFECYCLE = {
  unaudited: { evidence: false, open: true },
  investigating: { evidence: false, open: true },
  confirmed: { evidence: true, open: true },
  refuted: { evidence: true, open: false },
  fixed: { evidence: true, open: false },
  wontfix: { evidence: true, open: false },
  deferred: { evidence: true, open: true },
  superseded: { evidence: true, open: false },
};
const CONFIDENCE = new Set(["corroborated", "spot-checked", "candidate", "caveat"]);
const SEVERITIES = new Set(["high", "med", "low"]);

/**
 * `[text](src/path#L12 "fp:1a2b3c4d")` — link text, path, line, title, all optional
 * past the path. `[^)#\s]+` stops the path before the fragment and before a title.
 */
const ANCHOR_RE = /(?:\[([^\]]*)\])?\((src\/[^)#\s]+)(?:#L(\d+))?(?:\s+"([^"]*)")?\)/;
const FINGERPRINT_RE = /^fp:([0-9a-f]{8})$/;

/** A trailing newline terminates the last line; it does not begin another one. */
const sourceCache = new Map();
function sourceLines(abs) {
  if (!sourceCache.has(abs)) {
    const src = readFileSync(abs, "utf8").split("\n");
    if (src.at(-1) === "") src.pop();
    sourceCache.set(abs, src);
  }
  return sourceCache.get(abs);
}

/**
 * Hashes the anchored line plus one line either side, each trimmed and internally
 * whitespace-collapsed. The line alone is ambiguous — 13.8% of this table's anchors
 * sit on a line that repeats verbatim elsewhere in its own file, and 11 sit on a blank
 * line — so a lone-line digest would silently accept a shifted anchor. Reformatting is
 * the opposite risk: a digest that reddens every row on a reindent gets re-baselined,
 * and a gate everyone re-baselines is worse than none. Normalising whitespace answers
 * that, and the wider window costs nothing measurable — replaying the last 18 commits,
 * 148 anchors changed content and *zero* of them would have fired from a neighbour
 * moving while the anchored line held still.
 */
function fingerprint(fileLines, line) {
  const window = [line - 2, line - 1, line]
    .map((i) => (fileLines[i] ?? "").trim().replace(/\s+/g, " "))
    .join("\n");
  return createHash("sha256").update(window).digest("hex").slice(0, 8);
}

const raw = readFileSync(LEDGER, "utf8");
const lines = raw.split("\n");

const rows = [];
/**
 * Rows whose closing `|` was lost. Split-and-rejoin parses these happily — the
 * summary simply absorbs the missing delimiter — so nothing here noticed when a
 * scripted edit stripped the pipe from 27 rows at once. Markdown *does* notice:
 * the row stops being a table row and renders as loose text. Recorded as its own
 * list because the row still has an id and a status, so every other check on it
 * passes and the file reads green while a chunk of the table is not a table.
 */
const malformed = [];
lines.forEach((line, i) => {
  if (!/^\|\s*\d+\s*\|/.test(line)) return;
  if (!/\|\s*$/.test(line)) malformed.push({ id: Number(line.match(/^\|\s*(\d+)/)[1]), line: i + 1 });
  const c = line.split("|").map((s) => s.trim());
  const [, id, status, component, loc, sev, ...rest] = c;
  const parts = status.split("·").map((s) => s.trim());
  rows.push({
    id: Number(id),
    line: i + 1,
    status: parts[0],
    tags: parts.slice(1),
    component,
    loc,
    sev: sev.replace(/\*/g, ""),
    summary: rest.join("|").replace(/\|\s*$/, "").trim(),
  });
});

/** Detail-block headings cover single ids, ranges (`55-59`) and lists (`103-104 ·`). */
function coveredIds(sources) {
  const covered = new Set();
  for (const text of sources) {
    for (const line of text.split("\n")) {
      const m = line.match(/^###\s+([\d\s·,\-–]+?)(?:\s*[·—]\s*\D|$)/);
      if (!m) continue;
      for (const part of m[1].split(/[·,]/)) {
        const t = part.trim();
        const r = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (r) for (let n = Number(r[1]); n <= Number(r[2]); n++) covered.add(n);
        else if (/^\d+$/.test(t)) covered.add(Number(t));
      }
    }
  }
  return covered;
}

const detailSources = [raw];
if (DETAILS_DIR && existsSync(DETAILS_DIR)) {
  for (const f of readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".md"))) {
    detailSources.push(readFileSync(path.join(DETAILS_DIR, f), "utf8"));
  }
}
const covered = coveredIds(detailSources);

/**
 * Rewrites anchors in place. A shifted anchor is *relocated*: the stored fingerprint is
 * searched for across the file, and a single hit moves the line number while keeping the
 * digest — which is the case that produced 157 hand-reconciled rows last time. Anything
 * else (content gone, or several equally-good candidates) is restamped and reported
 * loudly, because those are the rows where only a human can say whether the finding
 * still holds. Restamping asserts nothing about the row's sentence; that re-reading is
 * the part this mode cannot do for you.
 */
if (flag("reanchor")) {
  const out = [...lines];
  const moved = [];
  const changed = [];
  const stampedRows = [];
  const unresolved = [];

  for (const r of rows) {
    const anchor = r.loc.match(ANCHOR_RE);
    if (!anchor) continue;
    const [whole, text = "", file, lineNo, title] = anchor;
    if (!lineNo) continue;

    const abs = path.join(PKG, file);
    if (!existsSync(abs)) {
      unresolved.push(`#${r.id} ${file} — file missing`);
      continue;
    }
    const fileLines = sourceLines(abs);
    const was = Number(lineNo);
    const prior = title?.match(FINGERPRINT_RE)?.[1];
    if (was <= fileLines.length && prior && prior === fingerprint(fileLines, was)) continue;

    let line = was;
    let digest;
    if (prior) {
      const hits = [];
      for (let n = 1; n <= fileLines.length; n++) if (fingerprint(fileLines, n) === prior) hits.push(n);
      if (hits.length === 1) {
        line = hits[0];
        digest = prior;
        moved.push(`#${r.id} ${file}:${was} → :${line}`);
      } else if (was > fileLines.length) {
        unresolved.push(
          `#${r.id} ${file}:${was} — past end of file (${fileLines.length} lines) and ` +
            `${hits.length === 0 ? "the old content is gone" : `${hits.length} candidate lines match`}; re-anchor by hand`,
        );
        continue;
      } else {
        digest = fingerprint(fileLines, line);
        changed.push(
          `#${r.id} ${file}:${line} — ${hits.length === 0 ? "old content gone" : `${hits.length} candidates, ambiguous`}; ` +
            `now \`${(fileLines[line - 1] ?? "").trim().slice(0, 60)}\` · ${r.summary.slice(0, 60)}`,
        );
      }
    } else if (was > fileLines.length) {
      unresolved.push(`#${r.id} ${file}:${was} — past end of file (${fileLines.length} lines); re-anchor by hand`);
      continue;
    } else {
      digest = fingerprint(fileLines, line);
      stampedRows.push(`#${r.id} ${file}:${line}`);
    }

    const label = text.replace(/:\d+$/, `:${line}`);
    const token = `${text ? `[${label}]` : ""}(${file}#L${line} "fp:${digest}")`;
    const at = out[r.line - 1].indexOf(whole);
    if (at < 0) {
      unresolved.push(`#${r.id} ${file} — could not locate anchor text in ledger line ${r.line}`);
      continue;
    }
    out[r.line - 1] = out[r.line - 1].slice(0, at) + token + out[r.line - 1].slice(at + whole.length);
  }

  writeFileSync(LEDGER, out.join("\n"));
  const report = (title, xs) => {
    if (!xs.length) return;
    console.log(`\n${title} (${xs.length}):`);
    for (const x of xs) console.log(`  ${x}`);
  };
  console.log(`reanchored ${path.relative(process.cwd(), LEDGER)}`);
  report("relocated — line moved, content identical, row still holds", moved);
  report("RE-VERIFY BY HAND — content at the anchor changed", changed);
  report("stamped for the first time — fingerprint records today's content, nothing verified", stampedRows);
  report("UNRESOLVED — left untouched, still a violation", unresolved);
  if (!moved.length && !changed.length && !stampedRows.length && !unresolved.length) console.log("  nothing to do");
  process.exit(0);
}

const violations = [];
const v = (row, msg) => violations.push({ id: row.id, line: row.line, msg });

for (const m of malformed) {
  v(m, "row does not end in `|` — it is no longer a table row and will render as loose text");
}

const seen = new Map();
let prev = 0;
for (const r of rows) {
  if (seen.has(r.id)) v(r, `duplicate id (also line ${seen.get(r.id)})`);
  seen.set(r.id, r.line);
  if (r.id <= prev) v(r, `id out of order (previous was ${prev})`);
  prev = Math.max(prev, r.id);

  const spec = LIFECYCLE[r.status];
  if (!spec) v(r, `unknown status "${r.status}" (expected one of ${Object.keys(LIFECYCLE).join(", ")})`);
  else if (spec.evidence && r.tags.length === 0) v(r, `status "${r.status}" requires evidence after a "·"`);

  if (r.status === "unaudited") {
    for (const t of r.tags) if (!CONFIDENCE.has(t)) v(r, `unknown confidence tag "${t}"`);
  }
  if (!SEVERITIES.has(r.sev)) v(r, `unknown severity "${r.sev}"`);
  if (!r.component) v(r, "empty component");
  if (!r.summary) v(r, "empty summary");

  // A row either points at one resolvable source line, or declares why it cannot:
  // library-wide sweeps and cross-package findings have no single anchor.
  const SCOPED = /^(library-wide|cross-package|\d+ files, see detail)$/i;
  const anchor = r.loc.match(ANCHOR_RE);
  if (!anchor) {
    const scoped = SCOPED.test(r.loc) || /cross-package|response-ui-(css|tw-merge)/i.test(`${r.component} ${r.summary}`);
    if (!scoped) v(r, `no src/ anchor and no declared scope in "${r.loc}"`);
  } else {
    const [, , file, lineNo, title] = anchor;
    const abs = path.join(PKG, file);
    if (!existsSync(abs)) v(r, `anchor file missing: ${file}`);
    else if (lineNo) {
      const fileLines = sourceLines(abs);
      const line = Number(lineNo);
      if (line > fileLines.length) v(r, `anchor line ${line} > ${fileLines.length} lines in ${file}`);
      else {
        const want = fingerprint(fileLines, line);
        const stamped = title?.match(FINGERPRINT_RE);
        if (!stamped) {
          v(r, `anchor has no content fingerprint: write \`(${file}#L${line} "fp:${want}")\`, or run --reanchor`);
        } else if (stamped[1] !== want) {
          v(
            r,
            `anchor content changed: ${file}:${line} was fp:${stamped[1]}, now fp:${want} — ` +
              `the row may be describing the wrong code. Re-read the row's summary against ` +
              `${file}:${line} (now \`${(fileLines[line - 1] ?? "").trim().slice(0, 60)}\`); ` +
              `--reanchor relocates it if the code merely moved`,
          );
        }
      }
    }
  }

  if ((r.sev === "high" || r.sev === "med") && !covered.has(r.id)) {
    v(r, `${r.sev} finding has no detail block (BUGS.md format requires one)`);
  }
}

const tally = (key) =>
  Object.entries(rows.reduce((a, r) => ((a[r[key]] = (a[r[key]] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
const open = rows.filter((r) => LIFECYCLE[r.status]?.open ?? true);
const closed = rows.filter((r) => LIFECYCLE[r.status] && !LIFECYCLE[r.status].open);

if (flag("json")) {
  console.log(JSON.stringify({ file: LEDGER, rows, violations, open: open.length, closed: closed.length }, null, 2));
  process.exit(flag("check") && violations.length ? 1 : 0);
}

const want = opt("status", null);
if (want) {
  for (const r of rows.filter((r) => r.status === want)) {
    console.log(`#${String(r.id).padStart(3)} ${r.sev.padEnd(4)} ${r.component.padEnd(22)} ${r.summary.slice(0, 90)}`);
  }
  process.exit(0);
}

console.log(`# ${path.relative(process.cwd(), LEDGER)} — ${rows.length} findings\n`);
console.log(`open ${open.length}   closed ${closed.length}\n`);
console.log("by status:");
for (const [k, n] of tally("status")) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("\nby severity:");
for (const [k, n] of tally("sev")) console.log(`  ${String(n).padStart(4)}  ${k}`);

console.log(`\ntop components by open findings:`);
const byComp = Object.entries(
  open.reduce((a, r) => ((a[r.component] = a[r.component] || []).push(r), a), {}),
).sort((a, b) => b[1].length - a[1].length);
for (const [comp, rs] of byComp.slice(0, 12)) {
  const h = rs.filter((r) => r.sev === "high").length;
  const m = rs.filter((r) => r.sev === "med").length;
  const l = rs.filter((r) => r.sev === "low").length;
  console.log(`  ${String(rs.length).padStart(3)}  ${comp.padEnd(24)} ${h}h ${m}m ${l}l`);
}
console.log(`  … ${byComp.length} components carry open findings`);

/**
 * Not a proof — a surfaced obligation. 90/90 docs pages ship a `## Gotchas`
 * section and ~68 of them describe current-broken behaviour; docs/ is published to
 * npm. Fixing a bug without re-reading its page leaves a lie in a shipped doc, and
 * no existing guard can detect that.
 */
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const fixed = rows.filter((r) => r.status === "fixed");
if (fixed.length) {
  console.log(`\ndocs pages to re-read for stale Gotchas (${fixed.length} fixed finding(s)):`);
  for (const c of [...new Set(fixed.map((r) => r.component))]) {
    const p = `docs/components/${kebab(c)}.md`;
    console.log(`  ${existsSync(path.join(PKG, p)) ? p : `${p}  (no spoke — internal component)`}`);
  }
}

if (violations.length) {
  console.log(`\n${violations.length} structural violation(s):`);
  const grouped = violations.reduce((a, x) => ((a[x.msg.replace(/[:"].*/, "").trim()] ||= []).push(x), a), {});
  for (const [kind, xs] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(xs.length).padStart(4)}  ${kind}`);
    for (const x of xs.slice(0, 4)) console.log(`          #${x.id} (line ${x.line}): ${x.msg}`);
    if (xs.length > 4) console.log(`          … and ${xs.length - 4} more`);
  }
  console.log(`\nbugs-ledger: FAIL — ${violations.length} violation(s)`);
} else {
  console.log(`\nbugs-ledger: OK — ${rows.length} findings, ids unique and ordered, anchors resolve.`);
}

process.exit(flag("check") && violations.length ? 1 : 0);
