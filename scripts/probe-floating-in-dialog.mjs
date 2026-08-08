#!/usr/bin/env node
// Measures, in a real browser, that a floating panel opened from inside a modal
// <dialog> is both PAINTED ON TOP and ACTUALLY CLICKABLE.
//
// WHY THIS EXISTS ALONGSIDE THE UNIT TEST
//
// `src/components/floating-in-dialog.test.tsx` enumerates every component that
// reaches `FloatingPortal` and asserts the mechanism — the panel is a DOM
// descendant of the dialog. It cannot assert the symptom. jsdom implements no
// top layer, no `::backdrop`, no `inert`, and no `showModal` at all, so in jsdom
// the defect is invisible: a panel appended to `<body>` is perfectly "visible"
// and every simulated click on it "works". A suite that green-lit the broken
// build is not a regression test.
//
// The defect has TWO mechanisms and only one of them is about painting:
//
//   1. `showModal()` promotes the dialog to the TOP LAYER, a paint phase above
//      the whole document. No `z-index` reaches it, and the modal's `::backdrop`
//      spans the viewport, so points outside the dialog's own box still
//      hit-test to the dialog.
//   2. `showModal()` makes everything outside the dialog INERT. This is the one
//      that surprises: a `<body>`-level element carrying the `popover` attribute
//      IS promoted to the top layer and STILL takes no click. Painting above is
//      not sufficient — the panel must be a DOM descendant of the dialog to be
//      interactive.
//
// So the probe asks both questions of the DOM, and check B is the load-bearing
// one: a fix that only corrected painting passes A while the panel stays inert.
//
//   A. `document.elementFromPoint(centre of the target)` resolves inside the panel.
//   B. a real mouse click at that point fires the component's own handler.
//
// THE BOUND THIS FIX DOES NOT REMOVE, AND WHY THE PROBE ASSERTS IT
//
// `dialog:modal` carries `overflow: auto` in the UA stylesheet, so a modal dialog
// is a SCROLLPORT and clips its descendants. Portalling into it therefore bounds
// the panel to the dialog's box: Floating UI correctly treats the dialog as the
// clipping ancestor, so `flip`/`shift` keep the panel inside it, and a panel wider
// than the dialog is clamped to its leading edge with the remainder clipped.
// Measured: at a 375px viewport a `DatePicker` panel is 351px inside a 337px
// Drawer, and ~14px of it is cut off — against being ENTIRELY invisible and inert
// before, which is why this ships as it is.
//
// The `popover` attribute would lift the panel into the top layer in its own
// right and escape the clip while staying a DOM descendant (so still not inert).
// That is deliberately NOT done here: it is a much larger change to every panel
// in the library, not only the ones inside a dialog. The "clipped at the dialog's
// edge" check below therefore asserts the bound is STILL THERE — if someone adds
// that half, this probe goes red and the docs that describe the bound get revisited.
//
// WHAT IT DRIVES, AND WHAT IT DOES NOT
//
// Four components are driven end to end, each because it contributes something
// the others do not: Popover (a bare panel), DropdownMenu (menu-internals, which
// ContextMenu shares), Combobox (a form listbox, which MultiSelect mirrors) and
// DatePicker (a panel of `<button>`s, which DateRangePicker mirrors). Tooltip is
// driven for check A only — it has no clickable target by design. HoverCard,
// ContextMenu, MultiSelect, ColorPicker and DateRangePicker are NOT driven here;
// they are covered at the mechanism level by the unit test, and they reach the
// portal through the same `useFloating` return value the four below do.
//
// SELF-CHECK, BECAUSE A PROBE THAT MEASURES NOTHING AGREES WITH YOU
//
// `--self-test` re-parents each portal node back to `<body>` after opening it —
// which is EXACTLY the pre-fix DOM — and requires every check to go red. A green
// self-test run means the probe cannot see the defect and its verdict is worth
// nothing, so that is a failure too.
//
// EXIT CODES: 0 pass · 1 a real violation · 2 the probe could not run (never "safe").

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(ROOT, "scripts", ".floating-in-dialog-probe");
const KEEP = process.argv.includes("--keep");
const SELF_TEST = process.argv.includes("--self-test");
const PLAYWRIGHT = join(
  process.env.HOME ?? "",
  ".bun/install/global/node_modules/playwright/index.mjs"
);

const VIEWPORT = { width: 1280, height: 900 };

/* ------------------------------------------------------------------ */
/*  1. The fixture                                                     */
/* ------------------------------------------------------------------ */

// A Drawer, because that is the composition the bug report used: a 24rem side
// sheet whose panels must overflow it. Every trigger sits inside the dialog, and
// every selection writes into `window.__hits` so check B reads the component's
// own handler rather than a synthetic listener the probe attached.
const FIXTURE = `
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Combobox, DatePicker, Dialog, Drawer, DropdownMenu, Popover, Tooltip } from "../../src";

function record(name) {
  window.__hits = window.__hits ?? {};
  window.__hits[name] = (window.__hits[name] ?? 0) + 1;
}

/**
 * A tall menu inside a CONTENT-SIZED Dialog — the vertical face of the same
 * bound, and the one that costs items rather than pixels. Drawers are 100dvh so
 * they cannot show it; a Dialog is as tall as its content.
 */
function TallMenuInDialog() {
  return (
    <Dialog open onClose={() => {}} style={{ maxHeight: "260px" }}>
      <DropdownMenu>
        <DropdownMenu.Trigger data-trigger="tallmenu">Tall menu trigger</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {Array.from({ length: 14 }, (_, i) => (
            <DropdownMenu.Item key={i} index={i} onSelect={() => record("tallmenu" + i)}>
              {"Item " + i}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
    </Dialog>
  );
}

function Fixture() {
  if (new URLSearchParams(location.search).get("host") === "tallmenu") {
    return <TallMenuInDialog />;
  }
  return (
    <>
{/* Left-hand side deliberately: it puts the band of a too-wide panel that
        hangs past the drawer's edge INSIDE the viewport, where it can be
        hit-tested. On the right that band is off-screen and proves nothing. */}
    <Drawer open onClose={() => {}} side="left">
      <div data-probe="popover">
        <Popover>
          <Popover.Trigger data-trigger="popover">Popover trigger</Popover.Trigger>
          <Popover.Content>
            <button data-target="popover" onClick={() => record("popover")}>
              Choose this
            </button>
          </Popover.Content>
        </Popover>
      </div>

      <div data-probe="overflow">
        <Popover>
          <Popover.Trigger data-trigger="overflow">Wide popover trigger</Popover.Trigger>
          <Popover.Content>
            <div style={{ width: 560 }}>
              <button data-target="overflow" onClick={() => record("overflow")}>
                Far left edge
              </button>
            </div>
          </Popover.Content>
        </Popover>
      </div>

      <div data-probe="dropdownmenu">
        <DropdownMenu>
          <DropdownMenu.Trigger data-trigger="dropdownmenu">Menu trigger</DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item index={0} onSelect={() => record("dropdownmenu")}>
              Duplicate
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      <div data-probe="combobox">
        <Combobox onValueChange={() => record("combobox")}>
          <Combobox.Input aria-label="Fruit" data-trigger="combobox" />
          <Combobox.Content>
            <Combobox.Item index={0} value="apple">Apple</Combobox.Item>
          </Combobox.Content>
        </Combobox>
      </div>

      <div data-probe="datepicker">
        <DatePicker aria-label="Date" defaultValue={new Date(2026, 5, 15)} onValueChange={() => record("datepicker")} />
      </div>

      <div data-probe="tooltip">
        <Tooltip content="Bubble text" delay={0}>
          <button data-trigger="tooltip">Tooltip trigger</button>
        </Tooltip>
      </div>
    </Drawer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<Fixture />);
`;

const FIXTURE_CSS = `
@import "../../../response-ui-css/src/index.css";
@import "../../src/styles.css";
@source "./fixture.tsx";
`;

const FIXTURE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>floating-in-dialog probe</title></head>
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
/*  3. The cases                                                       */
/* ------------------------------------------------------------------ */

/**
 * `panel` locates the surface, `target` the thing a user aims at inside it.
 * `open` is written in terms of what a user does, because the whole defect is
 * that the panel opens correctly and is still unreachable.
 */
const CASES = [
  {
    name: "Popover",
    trigger: "[data-trigger='popover']",
    panel: ".popover-content",
    target: "[data-target='popover']",
    hit: "popover",
  },
  {
    name: "DropdownMenu",
    trigger: "[data-trigger='dropdownmenu']",
    panel: ".menu-content",
    target: "[role='menuitem']",
    hit: "dropdownmenu",
  },
  {
    name: "Combobox",
    trigger: "[data-trigger='combobox']",
    openKey: "ArrowDown",
    panel: ".combobox-content",
    target: "[role='option']",
    hit: "combobox",
  },
  {
    name: "DatePicker",
    trigger: "[data-probe='datepicker'] button[aria-label='Open calendar']",
    // The panel is utility-classed with no stable hook; its accessible name is
    // the locator the package's own tests use.
    panel: "[aria-label='Choose date']",
    // `dayKey` is `getFullYear()-getMonth()-getDate()` — month is 0-based and
    // nothing is zero-padded, so June 17th 2026 is `2026-5-17`, not `2026-06-17`.
    target: "[data-day='2026-5-17']:not([data-outside])",
    hit: "datepicker",
  },
  {
    // The bug report left one question open: portalling into a 24rem Drawer
    // "risks clipping a panel that wants to overflow it". It does — `dialog:modal`
    // is `overflow: auto`, so the dialog is a scrollport. `mustOverflowHost` makes
    // the fixture prove the panel really does hang past the drawer before the
    // point beyond it is hit-tested, so the case cannot pass by being vacuous.
    name: "Popover wider than the Drawer",
    trigger: "[data-trigger='overflow']",
    panel: ".popover-content",
    target: "[data-target='overflow']",
    hit: "overflow",
    mustOverflowHost: true,
    expectClippedByHost: true,
  },
  {
    // The vertical face of the bound, and the one that costs FUNCTION rather than
    // pixels: a menu taller than its Dialog loses whole items to the scrollport,
    // and `.menu-content` sets no `max-height` (unlike `.combobox-content`). This
    // case does not assert a pass/fail count — it REPORTS how many of 14 items a
    // real click can reach, so the number in the docs is produced here and cannot
    // silently rot. It fails only if the fix regresses to reaching none.
    name: "Tall DropdownMenu in a short Dialog",
    host: "tallmenu",
    trigger: "[data-trigger='tallmenu']",
    panel: ".menu-content",
    countItems: { selector: "[role='menuitem']", hitPrefix: "tallmenu" },
  },
  {
    name: "Tooltip",
    trigger: "[data-trigger='tooltip']",
    hover: true,
    panel: ".tooltip",
    // No target: a tooltip has nothing to click, by design (#120). Check A only.
  },
];

/* ------------------------------------------------------------------ */
/*  4. Measure                                                         */
/* ------------------------------------------------------------------ */

async function runCase(page, testCase, selfTest) {
  const { name, trigger, panel, target, hit, hover, openKey, mustOverflowHost, expectClippedByHost, countItems } =
    testCase;

  if (hover) {
    await page.hover(trigger);
  } else {
    await page.click(trigger);
    if (openKey) await page.keyboard.press(openKey);
  }

  try {
    await page.waitForSelector(panel, { state: "attached", timeout: 5000 });
  } catch {
    return { name, error: `the panel (${panel}) never appeared — the fixture, not the defect` };
  }

  if (selfTest) {
    // Exactly the pre-fix DOM: floating-ui's portal node back under <body>.
    await page.evaluate((sel) => {
      const node = document.querySelector(sel)?.closest("[data-floating-ui-portal]");
      if (node) document.body.append(node);
    }, panel);
  }

  // Does the panel actually hang outside the dialog's own box? A case that
  // claims to test clipping and does not overflow would pass by testing nothing.
  const overflow = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const host = document.querySelector("dialog[open]");
    if (!el || !host) return null;
    const p = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    // The sliver of the panel that lies beyond the host on either side, kept
    // inside the viewport — a point off-screen would tell us nothing.
    const band =
      p.right > h.right + 1
        ? [Math.max(h.right, p.left), Math.min(p.right, window.innerWidth)]
        : p.left < h.left - 1
          ? [Math.max(p.left, 0), Math.min(h.left, p.right)]
          : null;
    if (!band || band[1] - band[0] < 4) return { overflows: false };
    return {
      overflows: true,
      point: { x: (band[0] + band[1]) / 2, y: p.top + p.height / 2 },
    };
  }, panel);

  if (mustOverflowHost && !overflow?.overflows) {
    const rects = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const host = document.querySelector("dialog[open]");
      const p = el.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      return { panel: [p.left, p.right, p.width], host: [h.left, h.right, h.width],
               cb: getComputedStyle(el).position, hostTransform: getComputedStyle(host).transform };
    }, panel);
    return {
      name,
      error: "the panel did not extend past the drawer: " + JSON.stringify(rects),
    };
  }

  let clippedByHost = null;
  if (overflow?.overflows) {
    clippedByHost = !(await page.evaluate(
      ({ x, y, sel }) => {
        const el = document.elementFromPoint(x, y);
        const wanted = document.querySelector(sel);
        return !!(el && wanted && (el === wanted || wanted.contains(el)));
      },
      { ...overflow.point, sel: panel }
    ));
  }

  const aimedAt = target ?? panel;
  const point = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, aimedAt);

  if (!point) {
    return { name, error: `${aimedAt} has no box to aim at — the fixture, not the defect` };
  }

  // A. What does the browser say is at that point?
  const painted = await page.evaluate(
    ({ x, y, sel }) => {
      const el = document.elementFromPoint(x, y);
      const wanted = document.querySelector(sel);
      return {
        inPanel: !!(el && wanted && (el === wanted || wanted.contains(el) || el.contains(wanted))),
        got: el ? `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(/\s+/)[0]}` : "nothing",
      };
    },
    { ...point, sel: panel }
  );

  // B. Does a real click land? Painting above is not sufficient — an inert
  // subtree paints and still swallows the press.
  let clicked = null;
  if (hit) {
    await page.evaluate(() => {
      window.__hits = {};
    });
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(120);
    clicked = await page.evaluate((key) => (window.__hits?.[key] ?? 0) > 0, hit);
  }

  // A tall panel: count how many of its items a real click can actually reach.
  let reachable = null;
  if (countItems) {
    const points = await page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }, countItems.selector);
    let landed = 0;
    for (const [i, pt] of points.entries()) {
      await page.evaluate(() => {
        window.__hits = {};
      });
      await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(30);
      if (await page.evaluate((k) => (window.__hits?.[k] ?? 0) > 0, `${countItems.hitPrefix}${i}`)) {
        landed += 1;
      }
    }
    reachable = { landed, total: points.length };
  }


  return { name, painted: painted.inPanel, got: painted.got, clicked, clippedByHost, expectClippedByHost, reachable };
}

async function main() {
  if (!existsSync(PLAYWRIGHT)) {
    console.error(
      `probe:floating-in-dialog — playwright not found at ${PLAYWRIGHT}\n` +
        `Install it, or point PLAYWRIGHT at your copy. This is a PROBE FAILURE, not a pass.`
    );
    process.exit(2);
  }

  try {
    buildFixture();
  } catch (error) {
    console.error(
      `probe:floating-in-dialog — the fixture did not build:\n${error.stdout ?? error}`
    );
    process.exit(2);
  }

  const { chromium } = await import(PLAYWRIGHT);
  const site = await serve(join(WORK, "dist"));
  const browser = await chromium.launch();
  const results = [];
  let token = "";
  let modal = false;

  try {
    for (const testCase of CASES) {
      // A fresh page per case: an open panel from the previous one would still
      // be in the top layer and would hit-test in front of the next.
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await ctx.newPage();
      await page.goto(testCase.host ? `${site.url}?host=${testCase.host}` : site.url);
      await page.waitForSelector("dialog[open]", { timeout: 15000 });

      if (!token) {
        // Two guards, both fatal. (1) The stylesheet must have loaded — a probe
        // against an unstyled page measures nothing. (2) The dialog must be a
        // REAL modal: `show()` never promotes to the top layer, so a fixture
        // that lost `showModal()` would pass every check by having no defect to
        // find.
        token = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--C-BORDER-FOCUS").trim()
        );
        modal = await page.evaluate(() => !!document.querySelector("dialog")?.matches(":modal"));
      }

      results.push(await runCase(page, testCase, SELF_TEST));
      await ctx.close();
    }
  } finally {
    await browser.close();
    site.close();
    if (!KEEP) rmSync(WORK, { recursive: true, force: true });
  }

  /* --- self-checks: a probe that measured nothing must not report OK --- */
  if (!token) {
    console.error(
      "probe:floating-in-dialog — the stylesheet did not load (`--C-BORDER-FOCUS` is empty), so\n" +
        "nothing was laid out and every box read as empty. Treating as a probe failure."
    );
    process.exit(2);
  }
  if (!modal) {
    console.error(
      "probe:floating-in-dialog — the fixture's <dialog> does not match `:modal`, so it is not in\n" +
        "the top layer and there is no defect here to detect. Treating as a probe failure."
    );
    process.exit(2);
  }
  const broken = results.filter((r) => r.error);
  if (broken.length) {
    console.error(
      `probe:floating-in-dialog — ${broken.length} case(s) could not be driven:\n` +
        broken.map((r) => `    ${r.name}: ${r.error}`).join("\n")
    );
    process.exit(2);
  }

  const failures = results.filter(
    (r) =>
      !r.painted ||
      r.clicked === false ||
      (r.expectClippedByHost && r.clippedByHost !== true) ||
      (r.reachable && r.reachable.landed === 0)
  );
  const line = (r) =>
    `${r.name}: painted-on-top ${r.painted ? "yes" : `NO (got ${r.got})`}` +
    (r.clicked === null ? "" : `, click landed ${r.clicked ? "yes" : "NO"}`) +
    (r.clippedByHost === null || r.clippedByHost === undefined
      ? ""
      : `, clipped at the dialog's edge ${r.clippedByHost ? "yes (documented)" : "NO"}`) +
    (r.reachable ? `, items a click can reach ${r.reachable.landed}/${r.reachable.total}` : "");

  if (SELF_TEST) {
    if (failures.length === results.length) {
      console.log(
        `probe:floating-in-dialog — SELF-TEST OK: with every portal node moved back under <body>,\n` +
          `all ${results.length} cases go red, so a green run means something.\n` +
          results.map((r) => `    ${line(r)}`).join("\n")
      );
      process.exit(0);
    }
    console.error(
      `probe:floating-in-dialog — SELF-TEST FAILED: ${results.length - failures.length} of ` +
        `${results.length} cases still passed with the panel under <body>.\n` +
        `This probe cannot see the defect it exists to catch, so its verdict is worthless.\n` +
        results.map((r) => `    ${line(r)}`).join("\n")
    );
    process.exit(2);
  }

  if (failures.length) {
    console.error(
      `probe:floating-in-dialog — FAIL (${failures.length} of ${results.length} cases)\n\n` +
        results.map((r) => `    ${line(r)}`).join("\n") +
        "\n\nA panel portalled to `<body>` sits under a modal dialog's top layer AND inside\n" +
        "`showModal()`'s inert subtree. Portal it into the dialog instead — see\n" +
        "`useDialogPortalRoot` in src/hooks/use-floating.ts.\n"
    );
    process.exit(1);
  }

  console.log(
    `probe:floating-in-dialog — OK (${results.length} cases in Chromium at ` +
      `${VIEWPORT.width}x${VIEWPORT.height}, inside a real :modal <dialog>)\n` +
      results.map((r) => `    ${line(r)}`).join("\n")
  );
}

main().catch((error) => {
  console.error(
    `probe:floating-in-dialog — the probe itself failed:\n${error?.stack ?? error}`
  );
  process.exit(2);
});
