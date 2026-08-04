#!/usr/bin/env node
// Measures, in a real browser, that no scrollport leaks its contents into the page.
//
// WHY THIS EXISTS ALONGSIDE THE LINTER
//
// `verify-scrollport-containing-block.mjs` reads SOURCE STRINGS. That is useful — it
// enumerates the whole population cheaply and catches a missing `relative` at the point
// someone writes it — but it decides a LAYOUT property by pattern-matching text, and a
// string matcher cannot do that soundly. Four spellings it scores identical to the fix,
// each of which leaves the element `position: static` in the browser:
//
//   className="print:relative overflow-x-auto"      variant-gated; never positioned on screen
//   className={cn(cls, false && "relative")}         provably dead branch
//   className="relative [&>ul]:overflow-y-auto"      the SCROLLPORT is the <ul>; `relative`
//                                                    is on the parent, which is the defect
//   <div style={{ overflowY: "auto" }}>              no `className` at all — never examined
//
// The third is the worst of them, because applying the linter's own remediation advice to
// the wrong element is what silences it. Measured: that markup renders a **79 960px**
// document at rest where the correct one renders 800.
//
// A consumer can also defeat the fix from outside the package entirely. Tailwind utilities
// live in `@layer utilities`, so an unlayered `.table-wrapper { position: static }` in an
// app's own CSS out-ranks `relative` at any specificity — and `.table-wrapper` is a
// documented styling hook. No source-level check can ever see that.
//
// So this probe asks the question the linter only approximates, and asks it of the DOM:
// **for every element the browser actually treats as a scrollport, is it a containing
// block, and does scrolling it to its end leave the document's scroll extent alone?**
// It does not care how the class was spelled, whether it came from a variant, a const, a
// helper, an inline style, or a stylesheet the package never saw.
//
// THE ASSERTION IS THE ONE THE BUG REPORT ASKED FOR
//
// The consumer who found this wrote: "A regression test needs a real browser: assert
// `document.documentElement.scrollHeight` is unchanged after scrolling a tall table's
// scrollport to its end." That is exactly check B below, generalised from "a tall table"
// to every scrollport on the fixture.
//
// SELF-CHECK, BECAUSE A PROBE THAT MEASURES NOTHING AGREES WITH YOU
//
// Two guards, both fatal rather than skippable. (1) The stylesheet must have loaded — read
// as a real token value off `:root`. (2) The fixture must actually PRODUCE scrollports, and
// at least one must have a non-trivial scroll range; a fixture that silently rendered
// nothing would otherwise pass every check by having nothing to check. `--self-test`
// additionally forces every scrollport back to `position: static` and requires the probe to
// go red, which is the only evidence that a green run means anything.
//
// EXIT CODES: 0 pass · 1 a real violation · 2 the probe could not run (never "safe").

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(ROOT, "scripts", ".scrollport-probe");
const KEEP = process.argv.includes("--keep");
const SELF_TEST = process.argv.includes("--self-test");
const PLAYWRIGHT = join(
  process.env.HOME ?? "",
  ".bun/install/global/node_modules/playwright/index.mjs"
);

const VIEWPORT = { width: 375, height: 800 };

/* ------------------------------------------------------------------ */
/*  1. The fixture                                                     */
/* ------------------------------------------------------------------ */

/**
 * One page holding every component in the package that owns a scrollport, each with
 * content that (a) overflows it and (b) contains visually-hidden text — because
 * `sr-only` is the `position: absolute` box this whole defect class turns on, and a
 * scrollport with nothing absolutely positioned inside it cannot demonstrate anything.
 *
 * `Badge` is the carrier of choice for the same reason it was the carrier of the
 * original bug: it renders an `sr-only` variant word with no opt-in.
 */
const FIXTURE = `
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  AppShell, Badge, Card, Carousel, CodeBlock, CommandPalette, Dialog, DialogBody,
  Table, VirtualizedDataTable,
} from "../../src";

const ROWS = Array.from({ length: 2000 }, (_, i) => ({
  id: i,
  name: "A reasonably long row label " + i,
  status: (["success", "warning", "error"])[i % 3],
}));

const COLUMNS = [
  { key: "id", header: "ID", width: 80 },
  { key: "name", header: "Name" },
  { key: "status", header: "Status", width: 120,
    render: (row) => <Badge variant={row.status}>{row.status}</Badge> },
];

const CODE = Array.from({ length: 40 }, (_, i) =>
  "const aVeryLongLineOfCodeThatMustScrollSideways_" + i + " = " + i + ";").join("\\n");

function Fixture() {
  return (
    <AppShell>
      <AppShell.Sidebar>
        <AppShell.SidebarLink to="/">Home</AppShell.SidebarLink>
      </AppShell.Sidebar>
      <AppShell.Main>
        <div data-probe="virtualized">
          <VirtualizedDataTable
            data={ROWS} columns={COLUMNS} rowKey={(r) => r.id}
            rowHeight={48} height={400}
          />
        </div>

        <div data-probe="table">
          <Table maxHeight={200}>
            <Table.Head><Table.Row>
              <Table.HeaderCell>A deliberately long first column header</Table.HeaderCell>
              <Table.HeaderCell>Another long second column header</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row></Table.Head>
            <Table.Body>
              {ROWS.slice(0, 20).map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>A deliberately long first column value</Table.Cell>
                  <Table.Cell>Another long second column value</Table.Cell>
                  <Table.Cell><Badge variant={r.status}>{r.status}</Badge></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div data-probe="carousel">
          <Carousel title="Slides">
            <Carousel.Track>
              {ROWS.slice(0, 40).map((r) => (
                <Carousel.Item key={r.id}>
                  <Card><Badge variant="success">Slide {r.id}</Badge></Card>
                </Carousel.Item>
              ))}
            </Carousel.Track>
          </Carousel>
        </div>

        <div data-probe="codeblock">
          <CodeBlock code={CODE} language="ts" label="probe" />
        </div>

        <div data-probe="dialogbody">
          <Dialog open onClose={() => {}} aria-label="probe dialog">
            <DialogBody style={{ maxHeight: 160 }}>
              {ROWS.slice(0, 40).map((r) => (
                <p key={r.id}><Badge variant={r.status}>{r.status}</Badge> {r.name}</p>
              ))}
            </DialogBody>
          </Dialog>
        </div>

        <div data-probe="wide" style={{ width: 4000, textAlign: "right" }}>
          <Badge variant="warning">far right badge</Badge>
        </div>

        <div data-probe="palette">
          <CommandPalette
            open onClose={() => {}}
            items={ROWS.slice(0, 200).map((r) => ({
              id: String(r.id), label: r.name, onSelect: () => {},
            }))}
          >
            {({ item }) => (
              <CommandPalette.Item>
                <Badge variant="success">{item.label}</Badge>
              </CommandPalette.Item>
            )}
          </CommandPalette>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode><Fixture /></StrictMode>
);
`;

const FIXTURE_CSS = `
@import "../../../response-ui-css/src/index.css";
@import "../../src/styles.css";
@source "./fixture.tsx";
`;

const FIXTURE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>scrollport probe</title></head>
<body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>
`;

const VITE_CONFIG = `
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  root: ${JSON.stringify(WORK)},
  plugins: [react(), tailwindcss()],
  logLevel: "error",
  build: { outDir: ${JSON.stringify(join(WORK, "dist"))}, emptyOutDir: true },
  resolve: { dedupe: ["react", "react-dom"] },
});
`;

function buildFixture() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  writeFileSync(join(WORK, "fixture.tsx"), FIXTURE);
  writeFileSync(join(WORK, "styles.css"), FIXTURE_CSS);
  writeFileSync(join(WORK, "index.html"), FIXTURE_HTML);
  writeFileSync(join(WORK, "vite.config.mjs"), VITE_CONFIG);
  execFileSync("npx", ["vite", "build", "--config", join(WORK, "vite.config.mjs")], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/* ------------------------------------------------------------------ */
/*  2. Serve                                                           */
/* ------------------------------------------------------------------ */

// Over HTTP, not `file://` — Vite emits `<link crossorigin>` and CORS drops a
// crossorigin stylesheet on `file://`, which is how a sibling probe in this
// directory once came up green against a completely unstyled page.
function serve(dir) {
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
  };
  const server = createServer((req, res) => {
    const path = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!path.startsWith(dir) || !existsSync(path)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(readFileSync(path));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}/index.html`,
        close: () => server.close(),
      })
    );
  });
}

/* ------------------------------------------------------------------ */
/*  3. Measure                                                         */
/* ------------------------------------------------------------------ */

/**
 * Runs in the page. Enumerates what the BROWSER calls a scrollport — computed
 * `overflow-*` of `auto`/`scroll` with something to scroll — and answers two
 * questions per element.
 *
 * `<textarea>`/`<select>` are excluded and counted separately: they are replaced
 * elements whose scrolling is inside a UA shadow tree, so they cannot host an
 * absolutely-positioned descendant of ours and have nothing to leak.
 */
const IN_PAGE = async (forceStatic) => {
  // Two frames plus a macrotask. Scrolling a virtualized list is a scroll event ->
  // setState -> re-render, so the rows (and the escaped boxes that ride on them) do
  // not exist in the DOM on the line after `scrollTop = …`. Reading the document
  // there measures the OLD window and check B silently never fires — which is
  // exactly what the first version of this probe did.
  const settle = () =>
    new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0)))
    );

  const REPLACED = new Set(["TEXTAREA", "SELECT", "INPUT"]);
  const describe = (el) => {
    const id = el.closest("[data-probe]")?.dataset.probe;
    const cls = (typeof el.className === "string" ? el.className : "").trim().split(/\s+/)[0];
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${id ? ` (${id})` : ""}`;
  };

  const all = [...document.querySelectorAll("*")];
  const scrollports = all.filter((el) => {
    if (REPLACED.has(el.tagName)) return false;
    const cs = getComputedStyle(el);
    const scrolls = (v) => v === "auto" || v === "scroll";
    if (!scrolls(cs.overflowX) && !scrolls(cs.overflowY)) return false;
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  });

  if (forceStatic) for (const el of scrollports) el.style.position = "static";

  const doc = document.documentElement;
  const unpositioned = [];
  const leaks = [];
  let maxRange = 0;

  for (const el of scrollports) {
    if (getComputedStyle(el).position === "static") {
      unpositioned.push(describe(el));
    }
  }

  // Check B — the requester's own assertion, generalised to every scrollport.
  for (const el of scrollports) {
    const range = Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth);
    maxRange = Math.max(maxRange, range);
    if (range < 2) continue;
    const beforeH = doc.scrollHeight;
    const beforeW = doc.scrollWidth;
    const prevTop = el.scrollTop;
    const prevLeft = el.scrollLeft;
    el.scrollTop = el.scrollHeight;
    el.scrollLeft = el.scrollWidth;
    await settle();
    const afterH = doc.scrollHeight;
    const afterW = doc.scrollWidth;
    el.scrollTop = prevTop;
    el.scrollLeft = prevLeft;
    await settle();
    if (afterH !== beforeH || afterW !== beforeW) {
      leaks.push(
        `${describe(el)} — scrolling it to its end took the document from ` +
          `${beforeW}x${beforeH} to ${afterW}x${afterH} (+${afterW - beforeW} wide, ` +
          `+${afterH - beforeH} tall)`
      );
    }
  }

  return {
    token: getComputedStyle(doc).getPropertyValue("--C-BORDER-FOCUS").trim(),
    total: all.length,
    scrollports: scrollports.map(describe),
    maxRange,
    unpositioned,
    leaks,
    docWidth: doc.scrollWidth,
    viewportWidth: doc.clientWidth,
  };
};

async function main() {
  if (!existsSync(PLAYWRIGHT)) {
    console.error(
      `probe:scrollport — playwright not found at ${PLAYWRIGHT}\n` +
        `Install it, or point PLAYWRIGHT at your copy. This is a PROBE FAILURE, not a pass.`
    );
    process.exit(2);
  }

  try {
    buildFixture();
  } catch (error) {
    console.error(`probe:scrollport — the fixture did not build:\n${error.stdout ?? error}`);
    process.exit(2);
  }

  const { chromium } = await import(PLAYWRIGHT);
  const site = await serve(join(WORK, "dist"));
  const browser = await chromium.launch();
  let result;
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await page.goto(site.url);
    await page.waitForSelector("[data-probe='virtualized'] .table-wrapper", { timeout: 15000 });
    result = await page.evaluate(IN_PAGE, SELF_TEST);
  } finally {
    await browser.close();
    site.close();
    if (!KEEP) rmSync(WORK, { recursive: true, force: true });
  }

  /* --- self-checks: a probe that measured nothing must not report OK --- */
  if (!result.token) {
    console.error(
      "probe:scrollport — the stylesheet did not load (`--C-BORDER-FOCUS` is empty), so every\n" +
        "computed `overflow` read as the UA default and nothing was actually measured."
    );
    process.exit(2);
  }
  if (result.scrollports.length === 0) {
    console.error(
      `probe:scrollport — the fixture rendered ${result.total} elements and NOT ONE scrollport.\n` +
        "Every check below would pass by having nothing to check. Treating as a probe failure."
    );
    process.exit(2);
  }
  if (result.maxRange < 1000) {
    console.error(
      `probe:scrollport — the largest scroll range on the fixture is ${result.maxRange}px, which is\n` +
        "too small to demonstrate the defect. The fixture is not rendering its long content."
    );
    process.exit(2);
  }

  const failures = [];
  if (result.unpositioned.length) {
    failures.push(
      `${result.unpositioned.length} scrollport(s) computed \`position: static\`:\n` +
        result.unpositioned.map((s) => `    ${s}`).join("\n")
    );
  }
  if (result.leaks.length) {
    failures.push(
      `${result.leaks.length} scrollport(s) grew the document when scrolled:\n` +
        result.leaks.map((s) => `    ${s}`).join("\n")
    );
  }
  if (result.docWidth > result.viewportWidth) {
    failures.push(
      `the document scrolls sideways at ${VIEWPORT.width}px: scrollWidth ${result.docWidth} ` +
        `vs clientWidth ${result.viewportWidth}`
    );
  }

  if (failures.length) {
    console.error(
      `probe:scrollport — FAIL (${result.scrollports.length} scrollports measured, max range ${result.maxRange}px)\n\n` +
        failures.map((f) => `  ${f}`).join("\n\n") +
        "\n\nAn unpositioned scrollport lets absolutely-positioned descendants resolve against an\n" +
        "ancestor OUTSIDE its clip, in its UNSCROLLED coordinates — so scrolling strands them\n" +
        "down the page. Add `relative` to the scrolling element ITSELF (not its parent).\n"
    );
    process.exit(1);
  }

  console.log(
    `probe:scrollport — OK (${result.scrollports.length} scrollports measured in Chromium at ` +
      `${VIEWPORT.width}x${VIEWPORT.height}, max scroll range ${result.maxRange}px; all are ` +
      `containing blocks, none grows the document when scrolled, no horizontal page overflow)`
  );
}

main().catch((error) => {
  console.error(`probe:scrollport — the probe itself failed:\n${error?.stack ?? error}`);
  process.exit(2);
});
