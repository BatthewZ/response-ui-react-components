#!/usr/bin/env node
/**
 * Guard + report over the BUGS.md findings table.
 *
 * Nothing read BUGS.md before this existed, so 420 hand-maintained rows had no
 * oracle at all — and the moment a patch lands, every `file:line` anchor below it
 * shifts with nothing to notice. That is the defect class this catches.
 *
 * Deliberately NOT wired into `prepublishOnly`. Every guard in that chain checks a
 * shipped artifact (`docs/`, `README.md`, `AGENTS.md`, `dist/`); `bugs/` is not in
 * package.json `files` and is not published, so gating a release on it would cross
 * the boundary this repo is careful about. Run it at the land gate instead — see
 * BUG_TRIAGE_PLAYBOOK.md §4 G5.
 *
 *   bun run verify:bugs                  # report
 *   bun run verify:bugs -- --check       # exit 1 on any structural violation
 *   node scripts/bugs-ledger.mjs --json
 *   node scripts/bugs-ledger.mjs --status confirmed   # filter the row listing
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

const raw = readFileSync(LEDGER, "utf8");
const lines = raw.split("\n");

const rows = [];
lines.forEach((line, i) => {
  if (!/^\|\s*\d+\s*\|/.test(line)) return;
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

const violations = [];
const v = (row, msg) => violations.push({ id: row.id, line: row.line, msg });

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
  const anchor = r.loc.match(/\((src\/[^)#]+)(?:#L(\d+))?\)/);
  if (!anchor) {
    const scoped = SCOPED.test(r.loc) || /cross-package|response-ui-(css|tw-merge)/i.test(`${r.component} ${r.summary}`);
    if (!scoped) v(r, `no src/ anchor and no declared scope in "${r.loc}"`);
  } else {
    const abs = path.join(PKG, anchor[1]);
    if (!existsSync(abs)) v(r, `anchor file missing: ${anchor[1]}`);
    else if (anchor[2]) {
      const total = readFileSync(abs, "utf8").split("\n").length;
      if (Number(anchor[2]) > total) v(r, `anchor line ${anchor[2]} > ${total} lines in ${anchor[1]}`);
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
