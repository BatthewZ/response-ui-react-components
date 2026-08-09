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
// THE THIRD MECHANISM, AND WHY IT NEEDED A THIRD ANSWER
//
// Being a DOM descendant of the dialog answers both mechanisms above and creates
// one of its own. `dialog:modal` carries `overflow: auto` in the UA stylesheet,
// so a modal dialog is a SCROLLPORT and clips its descendants — Floating UI
// correctly treats it as the clipping ancestor, so `flip`/`shift` bound the panel
// to the dialog's box rather than the viewport's. That was measured and accepted
// knowingly for one change, as strictly better than the total invisibility it
// replaced, and it cost real function: 1 of 14 items reachable in a tall menu.
//
// `useTopLayer` closes it. The `popover` attribute lifts the panel into the top
// layer in its own right, which takes it out of every ancestor clip, while
// leaving it a FLAT-TREE descendant of the dialog — so it is still not inert, and
// both mechanisms above stay answered. Floating UI knows the same trick from the
// other side: `isTopLayer()` reports no clipping ancestors, and `strategy:
// "fixed"` matches the viewport containing block a top-layer element resolves
// against. The two go together; either alone leaves the panel misplaced.
//
// So the two checks that measured the bound now measure its ABSENCE:
//
//   C. the band of a too-wide panel hanging past the drawer is HIT-TESTABLE.
//   D. a tall menu inside a short dialog reaches as many items as the same menu
//      with no dialog on the page — parity, not an absolute count, because a
//      472px menu opened 438px down a 900px viewport loses its last item to the
//      SCREEN either way and no fix can change that.
//
// Check C was `expectClippedByHost: true` for one change, as a tripwire: it
// asserted the bound still existed so nobody could remove it without being sent
// to the docs describing it. It has been INVERTED rather than deleted, so it is
// the same tripwire pointing the other way.
//
// `--no-popover` deletes `showPopover` before the app boots and asserts the
// PREVIOUS behaviour comes back whole — clipped, but painted and clickable.
// `popover` is Baseline 2024, so on every browser anyone runs this in the fallback
// is dead code; the one way to know it still works is to take the platform away.
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
// `--self-test` reproduces EXACTLY the pre-fix DOM and requires every check to go
// red. A green self-test run means the probe cannot see the defect and its verdict
// is worth nothing, so that is a failure too.
//
// Reproducing it now takes two undo steps rather than one: the popover attribute
// comes off FIRST, then the portal node goes back under `<body>`. Re-parenting a
// `:popover-open` element takes it out of the top layer, and
// `[popover]:not(:popover-open) { display: none }` is a UA rule — so re-parenting
// alone leaves every panel with no box at all, which this script correctly reads
// as a broken fixture (exit 2) rather than as a detected defect. The self-test
// would then fail for the wrong reason and assert nothing.
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
// Deletes `HTMLElement.prototype.showPopover` before the app boots, so
// `useTopLayer`'s feature detect takes its other branch. `popover` is Baseline
// 2024 and this is what an older engine gets: the panel must fall back to the
// PREVIOUS behaviour — a plain descendant of the dialog, painted, clickable and
// clipped by it — and never to nothing. A degrade-to-nothing is the failure mode
// a feature detect is supposed to prevent and the one nobody would notice, since
// every modern browser takes the other branch.
const NO_POPOVER = process.argv.includes("--no-popover");
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

/** 14 items, so the menu is far taller than the Dialog that hosts it. */
function TallMenu({ name }) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger data-trigger={name}>Tall menu trigger</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {Array.from({ length: 14 }, (_, i) => (
          <DropdownMenu.Item key={i} index={i} onSelect={() => record(name + i)}>
            {"Item " + i}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/**
 * A tall menu inside a CONTENT-SIZED Dialog — the vertical face of the bound,
 * and the one that costs items rather than pixels. Drawers are 100dvh so they
 * cannot show it; a Dialog is as tall as its content.
 */
/**
 * A Popover inside a plain Dialog, which is NOT the same test as any of the
 * Drawer cases below even though it looks like it.
 *
 * Drawer slides in on a transform, and a transformed ancestor is a containing
 * block for fixed-position descendants; a Dialog has no transform, so it is not.
 * This change is sensitive to exactly that difference in both directions — it is
 * why fixed positioning alone escapes one and not the other, and it is why the
 * feature-detect fallback had to gate the strategy as well as the promotion.
 * It also holds a Tooltip INSIDE the panel — two floating surfaces open at once,
 * nested, both promoted. That is the composition that decides popover="manual"
 * versus "auto": measured, switching the promotion to "auto" leaves this panel
 * permanently hidden (attached, carrying the attribute, never :popover-open),
 * because the platform's own light dismiss acts on the click that opened it. Every
 * other case in this file — all of them a single panel in a Drawer — stayed green
 * under that same mutation, so without this one the choice of "manual" would be an
 * unchecked assertion in a docblock.
 */
function PopoverInDialog() {
  return (
    <Dialog open onClose={() => {}}>
      <Popover>
        <Popover.Trigger data-trigger="dialogpopover">Panel trigger</Popover.Trigger>
        <Popover.Content>
          <Tooltip content="Bubble text" delay={0}>
            <button data-target="dialogpopover" onClick={() => record("dialogpopover")}>
              Choose this
            </button>
          </Tooltip>
        </Popover.Content>
      </Popover>
    </Dialog>
  );
}

function TallMenuInDialog() {
  return (
    <Dialog open onClose={() => {}} style={{ maxHeight: "260px" }}>
      <TallMenu name="tallmenu" />
    </Dialog>
  );
}

/**
 * The SAME menu, from a trigger at the SAME viewport coordinates, with no dialog
 * anywhere on the page — the control the in-dialog count is compared against.
 *
 * This exists because an absolute count cannot say whether the fix worked. A
 * 14-item menu is 472px tall and no fix can put that inside a 900px viewport
 * from a trigger 438px down it: the last item falls off the SCREEN, which is a
 * property of menus everywhere and not of dialogs (filed separately as #507).
 * What the fix claims is *parity* — that opening a panel inside a dialog costs
 * nothing that opening it outside one does not — so parity is what the probe
 * asserts, and it stays true whatever the viewport, the item height or the
 * theme's type scale turn out to be.
 *
 * The offsets match TallMenuInDialog's trigger, and the probe FAILS rather than
 * compares if they ever drift apart. (No backticks in this docblock: it lives
 * inside the FIXTURE template literal, where one would end the string.)
 */
function TallMenuNoDialog() {
  return (
    <div style={{ position: "absolute", top: "438px", left: "352px" }}>
      <TallMenu name="tallmenucontrol" />
    </div>
  );
}

function Fixture() {
  const host = new URLSearchParams(location.search).get("host");
  if (host === "tallmenu") return <TallMenuInDialog />;
  if (host === "dialogpopover") return <PopoverInDialog />;
  if (host === "tallmenucontrol") return <TallMenuNoDialog />;
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
    // "risks clipping a panel that wants to overflow it". It did, until the panel
    // started promoting itself into the top layer — `dialog:modal` is
    // `overflow: auto`, so the dialog is a scrollport, and only leaving that
    // scrollport's clip escapes it.
    //
    // `mustOverflowHost` makes the fixture prove the panel really does hang past
    // the drawer before the point beyond it is hit-tested, so the case cannot
    // pass by being vacuous — it is the guard that keeps `expectClippedByHost:
    // false` meaning "the band beyond the drawer is REACHABLE" rather than "there
    // was no band to test".
    //
    // This flag was `true` for one release, deliberately, as a tripwire: it
    // asserted the bound was still there so that whoever removed it could not do
    // so without being sent to the docs that describe it. It has now been
    // inverted rather than deleted, which is the same tripwire pointing the other
    // way — reintroduce the clip and this goes red.
    name: "Popover wider than the Drawer",
    trigger: "[data-trigger='overflow']",
    panel: ".popover-content",
    target: "[data-target='overflow']",
    hit: "overflow",
    mustOverflowHost: true,
    expectClippedByHost: false,
  },
  {
    // A Popover in a plain Dialog rather than a Drawer — no transform on the
    // host, so a different containing block for the panel. See PopoverInDialog.
    name: "Popover in a plain Dialog",
    host: "dialogpopover",
    trigger: "[data-trigger='dialogpopover']",
    panel: ".popover-content",
    target: "[data-target='dialogpopover']",
    hit: "dialogpopover",
  },
  {
    // The vertical face of the bound, and the one that cost FUNCTION rather than
    // pixels: a menu taller than its Dialog lost whole items to the scrollport.
    //
    // The count is REPORTED, not asserted against a fixed number — the figure in
    // the docs is produced here and cannot silently rot. What IS asserted is
    // `parity`: the same menu, from a trigger at the same coordinates, with no
    // dialog on the page at all, must reach exactly the same number of items. An
    // absolute target could not be honest, because a 472px menu opened 438px down
    // a 900px viewport loses its last item to the SCREEN whether or not a dialog
    // is involved. See TallMenuNoDialog in the fixture.
    name: "Tall DropdownMenu in a short Dialog",
    host: "tallmenu",
    trigger: "[data-trigger='tallmenu']",
    panel: ".menu-content",
    countItems: { selector: "[role='menuitem']", hitPrefix: "tallmenu" },
    // Keyboard and dismissal through the promoted panel — the branch jsdom
    // cannot reach. See runInteractionChecks.
    interaction: { hitPrefix: "tallmenu" },
    parityControl: {
      host: "tallmenucontrol",
      trigger: "[data-trigger='tallmenucontrol']",
      panel: ".menu-content",
      countItems: { selector: "[role='menuitem']", hitPrefix: "tallmenucontrol" },
    },
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

/**
 * How many of a panel's items a real click can reach, with the panel REOPENED
 * before every one. That reopening is the whole correctness of this number.
 * Selecting an item closes the menu, and `useTransitionStyles` keeps the panel in
 * the DOM while it fades — so a straight sweep of clicks measures how much of the
 * fade each press caught, not what a user can reach. The same two builds read
 * 1/14 and 6/14 by a straight sweep, and 1/14 and 13/14 by hit test; the sweep
 * was answering a question nobody asked. One press per freshly-opened panel is
 * the only version of this that means what its sentence says.
 */
async function countReachableItems(page, { trigger, panel, countItems }) {
  const total = await page.evaluate(
    (sel) => document.querySelectorAll(sel).length,
    countItems.selector
  );
  let landed = 0;
  for (let i = 0; i < total; i += 1) {
    // Reopen if the previous press closed it — by select, or by landing outside
    // the panel and tripping `useDismiss`.
    if (!(await page.$(panel))) {
      await page.click(trigger);
      await page.waitForSelector(panel, { state: "attached", timeout: 5000 });
    }
    const point = await page.evaluate(
      ({ sel, index }) => {
        const el = document.querySelectorAll(sel)[index];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
      { sel: countItems.selector, index: i }
    );
    if (!point) continue;
    await page.evaluate(() => {
      window.__hits = {};
    });
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(40);
    if (await page.evaluate((k) => (window.__hits?.[k] ?? 0) > 0, `${countItems.hitPrefix}${i}`)) {
      landed += 1;
    }
  }
  return { landed, total };
}

/** The trigger's viewport box, so two runs can prove they are comparable. */
function triggerRect(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }, selector);
}

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
    // `visible`, not `attached`. A panel carrying `popover` that was never
    // successfully shown is `display: none` under the UA's
    // `[popover]:not(:popover-open)` rule while still being perfectly attached —
    // so `attached` alone accepts the exact failure this file exists to catch.
    // Measured: switching the promotion to `popover="auto"` leaves a Popover in a
    // Dialog hidden (the platform's own light dismiss closes it on the very click
    // that opened it), and every case here passed anyway until this said `visible`.
    await page.waitForSelector(panel, { state: "visible", timeout: 5000 });
  } catch {
    return {
      name,
      error:
        `the panel (${panel}) never became visible. Either the fixture is wrong, or the ` +
        `promotion left it \`display: none\` — an element carrying \`popover\` that was never ` +
        `successfully shown is hidden by the UA rule. Check \`useTopLayer\`.`,
    };
  }

  if (selfTest) {
    // Exactly the pre-fix DOM, which is now TWO undo steps rather than one.
    //
    // Un-promote first: moving a `:popover-open` element in the DOM takes it out
    // of the top layer, and `[popover]:not(:popover-open) { display: none }` is a
    // UA rule — so re-parenting alone leaves a panel with no box at all, and
    // every case below reports "no box to aim at", which this script correctly
    // classifies as a broken FIXTURE rather than a detected defect. The self-test
    // would then exit 2 for the wrong reason and never assert what it exists to
    // assert. Strip the attribute deliberately, then re-parent.
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el?.hasAttribute("popover")) {
        try {
          el.hidePopover();
        } catch {
          // already out of the top layer
        }
        el.removeAttribute("popover");
        el.classList.remove("floating-top-layer");
      }
      const node = el?.closest("[data-floating-ui-portal]");
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
  const reachable = countItems
    ? await countReachableItems(page, { trigger, panel, countItems })
    : null;
  const triggerBox = countItems ? await triggerRect(page, trigger) : null;

  return {
    name,
    painted: painted.inPanel,
    got: painted.got,
    clicked,
    clippedByHost,
    expectClippedByHost,
    reachable,
    triggerBox,
  };
}

/**
 * Keyboard and dismissal through a PROMOTED panel.
 *
 * This is the one path with no other coverage at all. `floating-in-dialog.test.tsx`
 * exercises keyboard navigation thoroughly, but jsdom implements no `showPopover`,
 * so every one of those tests runs the *fallback* branch — the promoted branch is
 * invisible to the whole suite. And promotion is exactly the kind of change that
 * could break it: `FloatingFocusManager` runs modal focus management over the
 * panel, `useDismiss` closes it on an outside press, and `Dialog` has its own
 * Escape handling underneath. Three things that must each still be true:
 *
 *   E1. arrow keys move through the items and Enter fires the item's own handler.
 *   E2. Escape closes the MENU and leaves the dialog open — one layer at a time.
 *   E3. a press elsewhere inside the dialog closes the menu, not the dialog.
 */
async function runInteractionChecks(page, spec) {
  const open = async () => {
    await page.click(spec.trigger);
    await page.waitForSelector(spec.panel, { state: "attached", timeout: 5000 });
    await page.evaluate(() => {
      window.__hits = {};
    });
  };
  const settled = async () => {
    // Long enough for the close transition to unmount the panel; `useDismiss`
    // and Escape both go through the same fade.
    await page.waitForTimeout(400);
    return page.evaluate(
      (sel) => ({
        panel: !!document.querySelector(sel),
        dialog: !!document.querySelector("dialog[open]"),
      }),
      spec.panel
    );
  };

  await open();
  for (let i = 0; i < 3; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const keyboardSelect = await page.evaluate(
    (k) => (window.__hits?.[k] ?? 0) > 0,
    `${spec.hitPrefix}2`
  );

  await page.waitForTimeout(400);
  await open();
  await page.keyboard.press("Escape");
  const afterEscape = await settled();

  await open();
  const spot = await page.evaluate(() => {
    const r = document.querySelector("dialog[open]").getBoundingClientRect();
    return { x: r.right - 6, y: r.top + 6 };
  });
  await page.mouse.click(spot.x, spot.y);
  const afterOutsidePress = await settled();

  return {
    keyboardSelect,
    escapeClosedMenu: !afterEscape.panel,
    escapeKeptDialog: afterEscape.dialog,
    pressClosedMenu: !afterOutsidePress.panel,
    pressKeptDialog: afterOutsidePress.dialog,
  };
}

/**
 * The same panel opened with NO dialog anywhere on the page, so the in-dialog
 * count has something to be equal to. Deliberately not a `CASES` entry: it has no
 * dialog, so `runCase`'s checks — and the self-test, which re-parents portal
 * nodes back to `<body>` — have nothing to say about it. It is an input to
 * another case's assertion, not a case.
 */
async function runParityControl(page, spec) {
  await page.click(spec.trigger);
  try {
    await page.waitForSelector(spec.panel, { state: "attached", timeout: 5000 });
  } catch {
    return { error: `the control panel (${spec.panel}) never appeared` };
  }
  return {
    reachable: await countReachableItems(page, spec),
    triggerBox: await triggerRect(page, spec.trigger),
  };
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
      if (NO_POPOVER) {
        await page.addInitScript(() => {
          delete HTMLElement.prototype.showPopover;
        });
      }
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

      const result = await runCase(page, testCase, SELF_TEST);
      await ctx.close();

      if (NO_POPOVER) {
        // Without the promotion the dialog is the clipping ancestor again, so
        // the bound is EXPECTED back. Asserting its return is what makes this
        // mode a check rather than a demonstration: a fallback that quietly
        // produced no panel at all would otherwise read as "not clipped".
        if (result.expectClippedByHost !== undefined) result.expectClippedByHost = true;
        // Parity is a property of the fix, not of the fallback.
        delete result.parity;
      }

      if (testCase.interaction && !SELF_TEST && !result.error) {
        const iCtx = await browser.newContext({ viewport: VIEWPORT });
        const iPage = await iCtx.newPage();
        if (NO_POPOVER) {
          await iPage.addInitScript(() => {
            delete HTMLElement.prototype.showPopover;
          });
        }
        await iPage.goto(`${site.url}?host=${testCase.host}`);
        await iPage.waitForSelector("dialog[open]", { timeout: 15000 });
        result.interaction = await runInteractionChecks(iPage, {
          trigger: testCase.trigger,
          panel: testCase.panel,
          ...testCase.interaction,
        });
        await iCtx.close();
      }

      // The control run is skipped under --self-test: that mode deliberately
      // breaks the in-dialog case, and comparing a broken figure against a
      // healthy one is the point rather than a fault to report twice.
      if (testCase.parityControl && !SELF_TEST && !NO_POPOVER && !result.error) {
        const controlCtx = await browser.newContext({ viewport: VIEWPORT });
        const controlPage = await controlCtx.newPage();
        await controlPage.goto(`${site.url}?host=${testCase.parityControl.host}`);
        await controlPage.waitForSelector(testCase.parityControl.trigger, { timeout: 15000 });
        result.parity = await runParityControl(controlPage, testCase.parityControl);
        await controlCtx.close();
      }

      results.push(result);
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
  const broken = results.filter((r) => r.error || r.parity?.error);
  if (broken.length) {
    console.error(
      `probe:floating-in-dialog — ${broken.length} case(s) could not be driven:\n` +
        broken.map((r) => `    ${r.name}: ${r.error ?? r.parity.error}`).join("\n")
    );
    process.exit(2);
  }

  // Comparing two counts taken from triggers at different coordinates would be
  // comparing nothing. A drift here is a FIXTURE fault, not a defect in the
  // library, so it exits 2 — the probe could not run, rather than "the code is
  // wrong".
  const misaligned = results.filter(
    (r) =>
      r.parity &&
      JSON.stringify(r.triggerBox) !== JSON.stringify(r.parity.triggerBox)
  );
  if (misaligned.length) {
    console.error(
      `probe:floating-in-dialog — a parity control's trigger is not where the case's trigger is,\n` +
        `so the two counts are not comparable and the assertion below would mean nothing:\n` +
        misaligned
          .map(
            (r) =>
              `    ${r.name}: in dialog ${JSON.stringify(r.triggerBox)} vs control ` +
              `${JSON.stringify(r.parity.triggerBox)} — realign TallMenuNoDialog in the fixture.`
          )
          .join("\n")
    );
    process.exit(2);
  }

  const failures = results.filter(
    (r) =>
      !r.painted ||
      r.clicked === false ||
      (r.expectClippedByHost !== undefined && r.clippedByHost !== r.expectClippedByHost) ||
      (r.reachable && r.reachable.landed === 0) ||
      (r.parity && r.parity.reachable.landed !== r.reachable.landed) ||
      (r.interaction && Object.values(r.interaction).some((ok) => !ok))
  );
  const line = (r) =>
    `${r.name}: painted-on-top ${r.painted ? "yes" : `NO (got ${r.got})`}` +
    (r.clicked === null ? "" : `, click landed ${r.clicked ? "yes" : "NO"}`) +
    (r.clippedByHost === null || r.clippedByHost === undefined
      ? ""
      : `, clipped at the dialog's edge ${r.clippedByHost ? "YES" : "no"}`) +
    (r.reachable ? `, items a click can reach ${r.reachable.landed}/${r.reachable.total}` : "") +
    (r.interaction
      ? `, keyboard+dismiss ${
          Object.entries(r.interaction)
            .filter(([, ok]) => !ok)
            .map(([k]) => `${k} NO`)
            .join(" ") || "all ok"
        }`
      : "") +
    (r.parity
      ? ` (same menu with no dialog: ${r.parity.reachable.landed}/${r.parity.reachable.total}` +
        `${r.parity.reachable.landed === r.reachable.landed ? " — parity" : " — NO PARITY"})`
      : "");

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
        "\n\nTwo different regressions land here, and the columns above tell them apart.\n\n" +
        "  `painted-on-top NO` or `click landed NO` — the panel is back at `<body>`,\n" +
        "  where it sits under a modal dialog's top layer AND inside `showModal()`'s\n" +
        "  inert subtree. Portal it into the dialog: `useDialogPortalRoot` in\n" +
        "  src/hooks/use-floating.ts.\n\n" +
        "  `clipped at the dialog's edge YES` or `NO PARITY` — the panel reaches the\n" +
        "  dialog but is bounded by it, because `dialog:modal` is `overflow: auto` and\n" +
        "  so a scrollport. The panel has to promote ITSELF into the top layer to leave\n" +
        "  that clip while staying interactive inside the dialog: `useTopLayer` in the\n" +
        "  same file, and the reset it depends on in\n" +
        "  src/components/ui/floating-top-layer.css. Note that the promotion and\n" +
        "  `strategy: \"fixed\"` are a pair — either alone misplaces the panel.\n"
    );
    process.exit(1);
  }

  console.log(
    `probe:floating-in-dialog — OK (${results.length} cases in Chromium at ` +
      `${VIEWPORT.width}x${VIEWPORT.height}, inside a real :modal <dialog>` +
      `${NO_POPOVER ? ", with showPopover DELETED — the pre-Baseline-2024 fallback" : ""})\n` +
      results.map((r) => `    ${line(r)}`).join("\n")
  );
}

main().catch((error) => {
  console.error(
    `probe:floating-in-dialog — the probe itself failed:\n${error?.stack ?? error}`
  );
  process.exit(2);
});
