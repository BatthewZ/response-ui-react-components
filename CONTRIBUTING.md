# Contributing — @batthewz/response-ui-react-components

Maintainer-facing guide for working **on** this package — building, packaging, the CSS/RSC
internals, and adding to the public surface.

> **Repo-only — not shipped.** This file is intentionally excluded from the npm tarball:
> `files` in `package.json` is an allowlist (`dist`, `src`, `docs`, `AGENTS.md`,
> `CHANGELOG.md`, `README.md`, `LICENSE`) and this file isn't on it. The shipped,
> consumer-facing reference is [AGENTS.md](./AGENTS.md). Keep maintainer detail here, not
> there.

## Packaging

The single `exports` map points at `dist/` (`.js` + `.d.ts` + `.d.ts.map`), built by
`vite build`. Do NOT move entry points back to `src/*.ts` or stash a dist map inside
`publishConfig` — overriding `main`/`types`/`exports` via `publishConfig` is a pnpm-only
feature that npm/bun publish silently ignore (this shipped raw TSX to consumers up to
0.2.1). `src/` still ships in the tarball: the `@source` in `styles.css` and the
declaration maps point into it. When consuming this package via a local link, run
`bun run build` (or `vite build --watch`) so `dist/` tracks your edits.

## CSS layout

Per-component CSS is co-located with each `.tsx`: `src/components/ui/Accordion.tsx` ↔
`src/components/ui/Accordion.css`, `src/components/form/SearchInput.tsx` ↔
`src/components/form/SearchInput.css`, etc. The aggregator
[`src/styles.css`](./src/styles.css) `@imports` all of them and is exposed as the `./styles`
subpath export.

The aggregator also ends with `@source "../src/**/*.{ts,tsx}";` — a **self-relative**
Tailwind v4 registration of this package's own sources, so consumers' builds generate the
utility classes used inside the components under any node_modules layout (hoisted npm,
bun's isolated store, pnpm). It must stay self-relative and must keep working from both
`src/styles.css` (dev/linked) and the verbatim copy at `dist/styles.css` (published) —
`../src` satisfies both because `src/` ships in the npm package. Don't move source scanning
into `@batthewz/response-ui-css`; a sideways path from another package silently breaks
under isolated stores.

Domain tokens (trend, chart, media-card/carousel/poster) live in
[`src/tokens.css`](./src/tokens.css) (this package's extension of the universal css
contract); the exported `cn` is built with `createCn` so it dedupes these utilities.

When adding a new component that needs CSS:

1. Create `MyComponent.css` next to `MyComponent.tsx`.
2. Add an `@import "./components/…/MyComponent.css" layer(components);` line to
   [`src/styles.css`](./src/styles.css). The `layer(components)` keyword is not optional —
   `verify:css-layering` fails an import without it, because a component rule outside
   `@layer components` out-ranks a caller's utility and `<MyComponent className="…">`
   silently stops working.
3. Do **not** `import "./MyComponent.css"` from the `.tsx`. A stylesheet reached through the
   JS graph is injected *unlayered*, which defeats step 2 for that one component;
   `verify:no-css-imports` gates it.
4. The CSS file is copied to `dist/` automatically by the `copyCssAssets` plugin in
   [`vite.config.ts`](./vite.config.ts).

Class-name convention: kebab-case rooted on the component name (e.g. `.accordion`,
`.accordion-trigger`, `.accordion-content-inner`). Use `cn()` to apply, so consumer-passed
`className` can merge cleanly.

## RSC enforcement

`"use client"` is applied selectively to interactive modules; barrels and pure
presentational components stay directive-neutral so they remain server-renderable.
`verify:directives` ([scripts/verify-directives.mjs](./scripts/verify-directives.mjs))
enforces both the dist mirroring (built `dist/` files carry the same directive as their
`src/`) and a secret-free invariant (these are presentational Client Components — props
serialize to the browser, so they access no server state/secrets). Run `bun run build`
first so `dist/` exists.

## Adding to the public surface

- Add new public exports to the relevant barrel (`components/ui/index.ts`, etc.) AND the
  root `src/index.ts`.
- Don't import from `react-router-dom` (or any concrete router) inside a generic component
  — use `useLink()` / `usePathname()` from the router adapter so the component stays
  router-agnostic.
- After adding/renaming an export, update both [README.md](./README.md) and
  [AGENTS.md](./AGENTS.md). `verify:docs`
  ([scripts/verify-docs.mjs](./scripts/verify-docs.mjs)) fails if any **value** export is
  missing from either doc (`type`-only exports are optional; see the script header for the
  summarised-helper exemptions). Header counts like "UI (50)" are advisory and not
  enforced.

## File layout

```
src/
  index.ts                      <- main barrel
  components/
    animation/   data-display/   form/   guards/ (RequireAuth)
    layout/      router/ (router-adapter)   ui/
  hooks/
    use-active-section.ts, use-click-outside.ts, use-controllable-state.ts,
    use-debounce.ts, use-document-title.ts, use-floating.ts, use-focus-trap.ts,
    use-media-query.ts, use-reduced-motion.ts, use-roving-focus.ts,
    use-theme.ts, use-virtual-rows.ts, index.ts
  util/
    style.ts (cn, twMerge, tailwindMergeExtension)
    merge-props.ts (mergeProps, composeEventHandlers), merge-refs.ts
    focus.ts (the one Tailwind focus recipe — internal, see below)
    date.ts, format.ts, accept.ts, index.ts
scripts/                    (repo-only; none of these are published — `ls scripts/`)
  gen-docs.mjs              verify-chart-palette.mjs    verify-component-docs.mjs
  verify-css-layering.mjs   verify-directives.mjs       verify-docs.mjs
  verify-example-themes.mjs verify-focus-affordance.mjs verify-no-css-imports.mjs
  verify-omit-discipline.mjs verify-site.mjs            verify-slot-annotations.mjs
  verify-token-mirror.mjs   bugs-ledger.mjs             probe-cascade-layer.mjs
  probe-scrollport-containing-block.mjs                 verify-scrollport-containing-block.mjs
dev/                        (repo-only; scratch harness, `bun run dev`)
site/                       (repo-only; the published docs site — see below)
```

## The docs site

`site/` builds <https://batthewz.github.io/response-ui-react-components/> from `docs/` and
`../src`. `bun run site:dev` serves it; `bun run site:build` writes `site-dist/`; pushing to
`main` deploys it via `.github/workflows/pages.yml`.

**Adding a component to the site is not a thing you do.** The site globs
`src/components/*/*.examples.tsx` and `docs/components/*.md` and derives every route, every
nav entry and every group from what it finds — so a component gets a page by having the two
files `gen-docs.mjs` already requires, and by nothing else. That is deliberate: a per-component
registration list is the one file every doc branch would have to touch, and it would be a
permanent merge-conflict surface for no gain. If you find yourself editing `site/registry.ts`
to add a component, something upstream is wrong.

The page a reader sees is the doc, unchanged, with each `<!-- example:Name -->` block replaced
by that module rendering live above the fence `gen-docs` injected into it. One module is
therefore the source of the typecheck, the snippet and the render at once, and nothing on the
site can drift from the component.

`bun run verify:site` is the gate. It does not re-check what `verify-component-docs.mjs`
already proves (that a link resolves to a real file) — it proves each of those files is
reachable **as a page**, which is a different claim: `docs/project-docs/` exists, resolves, and
is not published, so a link into it is dead on the site with every other gate green.

Three things about `site/` that look like defensiveness and are not, each recorded where it
lives: examples render under a **reset router adapter** (`ExampleBlock.tsx`), because the site's
own adapter would otherwise make `AppShell.SidebarLink` contradict the sentence documenting it;
the registry's globs are **not `eager`** (`registry.ts`), because eager ones put all 1.6MB of
markdown and all 567 examples into the first response; and `site/styles.css` imports the
foundation **by package name**, not through `../../response-ui-css/` the way `dev/` does — the
sibling checkout does not exist in CI, and that one path is the difference between a deploy and
no deploy.

That last one generalises: **CI builds this from a clone of this repository alone.** Anything
`site/` reaches for outside the package has to come from `node_modules`. It passes locally
either way, so verify a change to the site's inputs against a copy of the repo with no siblings
on disk before trusting it.

## The focus ring lives in one place

[`src/util/focus.ts`](./src/util/focus.ts) holds the library's Tailwind focus recipe as six
constants (`focusRing`, `focusRingControl`, `focusRingControlError`, `focusRingWithin`,
`focusRingWithinError`, `focusRingGroup`). A component that carries no stylesheet of its own
composes one of those; a component that has a `.css` writes the `:focus-visible` rule there.
**Do not hand-write a new recipe** — eight of them had accumulated across 13 sites before they
were collapsed, and the divergence they had drifted into (`focus:` vs `focus-visible:`,
`ring-offset-2` vs none) was the defect, not the intent. Two constraints on that file:

- **`focus-visible`, never `focus`.** Not one rule in the component stylesheets is keyed on
  plain `:focus`; `:focus-visible` already matches a mouse-clicked text field and not a clicked
  button, so one keying is the right answer for every control type.
- **Each constant must stay one flat string literal.**
  [`verify-focus-affordance.mjs`](./scripts/verify-focus-affordance.mjs) resolves hoisted class
  constants *textually*, so a `${…}`-composed one would not resolve and would blind the guard
  to every site that consumes it.

## Every scrollport is a containing block

Any element you give `overflow: auto` or `overflow: scroll` — in a class list or in a
stylesheet — must also carry `relative`. Not "if it might hold something absolutely
positioned": **always**, and
[`verify-scrollport-containing-block.mjs`](./scripts/verify-scrollport-containing-block.mjs)
fails the build otherwise.

The reason, since the symptom never points at the cause. An absolutely-positioned box with no
offsets is laid out at its static position, *in the coordinates of its containing block* — the
nearest positioned ancestor. An unpositioned scroller is not one, so the box is neither clipped
by the scroller nor expressed in its scrolled coordinates: scroll the scrollport and the box is
stranded that far down the document, stretching the page by the whole scroll range. This library
manufactures the trigger itself, because `sr-only` is `position: absolute` with no offsets — so
a `Badge` in a table cell was enough to take a consumer's page from 800px to 530 060px.

Three notes on the shape of the rule:

- **Total, not judged.** `DialogBody` carried this declaration, with this reason in its docblock,
  three releases before `.table-wrapper` shipped without it — and then `Carousel.Track`,
  `.app-shell-main`, `CommandPalette`'s listbox and `CodeBlock`'s `<pre>`. Deciding per component
  whether the content *could* be absolutely positioned is the step that failed. A dead `relative`
  on a closed-content scrollport costs nothing; say in a comment that it is dead.
- **`relative`, not `contain` or a `transform`.** It leaves `z-index` at `auto`, so it creates no
  stacking context, and it does not capture a consumer's
  `position: fixed`. The other two do both.
- **The exception needs evidence, not a note.** A floating element gets `position: absolute` and
  a `transform` at runtime from `floatingStyles`; `relative` there would be a dead rule an inline
  style always beats. The gate accepts that only when `floatingStyles` is actually in that
  element's `style`.

**Two gates, and the linter is the weaker one.** `bun run verify:scrollport-containing-block`
reads source strings, so it enumerates the population cheaply but decides a layout property by
pattern-matching text — it cannot see a scrollport styled through a descendant variant
(`[&>ul]:overflow-y-auto`), one with no `className` at all, a class string built by a helper, or
a consumer's unlayered `.table-wrapper { position: static }` beating the utility from outside the
package. `bun run probe:scrollport` is the real check: it builds a fixture, renders it in
Chromium, enumerates what the BROWSER treats as a scrollport, and asserts both that each is a
containing block and that scrolling it to its end leaves `document.documentElement.scrollHeight`
and `scrollWidth` untouched. Run it before publishing — it is not in `prepublishOnly`, for the
same reason `probe:cascade-layer` is not: it needs a globally-installed Playwright, and a missing
one must not read as a pass. `--self-test` forces every scrollport back to `static` and requires
the probe to go red, which is the only evidence a green run means anything.

The unit suite cannot help you at all: jsdom applies no stylesheets and performs no layout, so
every one of those five defects was green across all 2792 tests, before and after.

## Testing

Tests are co-located with components (`Foo.test.tsx`) and run on Vitest + jsdom +
@testing-library/react via `bun run test`. They are **not** published — verified absent
from the `npm pack` / `bun pm pack` output (`src/` ships, but `*.test.tsx` are not in the
tarball).

When mocking the package in **app-side** tests (a consumer concern, documented in
[AGENTS.md](./AGENTS.md)), mock the whole module path once with every export the
subject-under-test uses — vitest honors only the last `vi.mock` per module path.

`window.matchMedia` is deliberately **not** stubbed in [test-setup.ts](./test-setup.ts).
Hooks that read it guard its absence (`useMediaQuery`, and `usePrefersReducedMotion` via
it), and a global stub would hide a regression in that guard — one already shipped this
way. A test that needs `prefers-reduced-motion: reduce` stubs `matchMedia` itself, per
test; see [use-reduced-motion.test.ts](./src/hooks/use-reduced-motion.test.ts), which
covers both the stubbed and the absent-API path.

**`fireEvent.animationEnd` / `transitionEnd` do not work here, and they fail silently.**
Two independent reasons, both measured in this repo: jsdom exposes no `AnimationEvent`
constructor, and React resolves animation-event names through vendor-prefix detection, so
in this environment it registers `webkitAnimationEnd` rather than `animationend`. The
result is a dispatch React never receives — the handler is not called, no error is raised,
and a test asserting a *consequence* of the handler passes for the wrong reason. React
only ever registers one of the two names, so dispatch both and exactly one lands:

```ts
function fireAnimationEnd(el: Element) {
  for (const name of ["animationend", "webkitAnimationEnd"]) {
    fireEvent(el, new Event(name, { bubbles: true }));
  }
}
```

Go through RTL's `fireEvent`, not a raw `el.dispatchEvent` — the latter is not wrapped in
`act`, so React never flushes the state update and the assertion reads stale DOM. Keep the
helper inside the `*.test.tsx` file that needs it: `src/` ships to npm and only
`*.test.*` is excluded from the tarball, so a shared `src/test-utils/` module would be
published. `ScrollReveal.test.tsx` and `AnimatePresence.test.tsx` each carry a copy.

## Known-defect ledger

Code defects found while documenting are recorded, not fixed inline, in
[bugs/LEDGER.md](./bugs/LEDGER.md) — one row per finding, with evidence in
`bugs/components/<name>.md`. Closed rows move to [bugs/ARCHIVE.md](./bugs/ARCHIVE.md); ids are
never reused and nothing is deleted, because a refutation is a result. Findings about the
*checking* rather than the shipped code — a gate that reads the wrong thing, a test that passes
for the wrong reason — belong in [bugs/AUDIT.md](./bugs/AUDIT.md), since a ledger row should be
something a user could notice. What a row *is* — its kind, its harm, and the format the validator
enforces — is [bugs/TAXONOMY.md](./bugs/TAXONOMY.md). [bugs/PLAN.md](./bugs/PLAN.md) is **retired**
and survives only as a section map: ten evidence files under `bugs/components/`, nine archived rows
and `scripts/verify-omit-discipline.mjs` still cite its `§2`/`§3`/`§5` by number.
`verify:bugs` ([scripts/bugs-ledger.mjs](./scripts/bugs-ledger.mjs)) is the oracle over
it: unique and ordered ids, statuses in the lifecycle enum, terminal statuses carrying
their evidence, `src/` anchors resolving to a real file and an in-range line, a **content
fingerprint** proving the anchor still points at the code the row describes, and a detail
block for every high or medium. **Run it after any patch** — fixing a bug shifts every
line number below it, and nothing else would notice.

When a patch moves anchored code, `node scripts/bugs-ledger.mjs --reanchor` slides the
line numbers whose fingerprint it can still find, and prints the rest under
`RE-VERIFY BY HAND` — those are rows whose anchored code *changed*, so the row's claim
itself needs re-reading, not just its line number. A prior reconcile had to do this for
157 rows by hand because no gate could tell the two cases apart.

It is intentionally absent from `prepublishOnly`: every guard in that chain checks a
shipped artifact, and `bugs/` is not in `package.json` `files`. That is deliberate and it has a
cost — the gate runs in no chain at all, and was red for a whole sweep with nobody noticing
(`bugs/AUDIT.md` #501). The workflow for taking a finding from logged to fixed —
partition, verify at source, fix, gate — is [bugs/HANDOVER.md](./bugs/HANDOVER.md).

## Build & publish

`vite build` (library mode, ESM-only, `preserveModules: true`, `vite-plugin-dts` for
types). Externalised: react, react-dom, react/jsx-runtime, @floating-ui/\*, lucide-react,
clsx, tailwind-merge.

`bun pm pack` produces a publishable `.tgz`. `prepublishOnly` is the publish gate — the
authoritative list is the script itself in [package.json](./package.json); in order it runs:

```
build → verify-directives → verify-docs → gen-docs --check → verify-component-docs
      → verify-focus-affordance → verify-no-css-imports → verify-css-layering
      → verify-token-mirror → verify-omit-discipline --check
      → verify-chart-palette --check → verify-example-themes --check
      → verify-slot-annotations → lint → typecheck → test
```

**Sixteen steps** — re-derive rather than trust this sentence, because the chain grows:

```
node -e 'console.log(require("./package.json").scripts.prepublishOnly.split("&&").length)'
```

So a broken RSC directive, an undocumented export, a stale doc fence, a bad
token table or dead link, an unrepaid `outline` reset, a CSS import in the barrel, a rule
outside its cascade layer, a domain token declared in `@theme` but never mirrored into
`createCn` (or mirrored after being deleted), a compile-time-only `Omit`, an off-palette
chart colour, an example theme name leaking into the design system, an internal element
nobody ruled on, a lint error, a type error, or a failing test each block publish.

**Know what the gates cannot see.** `verify:component-docs` reads token *tables* — a token that
changes role passes silently, and falsified prose always passes. It now resolves a token named
through a `var()` anywhere inside an arbitrary utility value (`bg-[var(--X,fallback)]`, a composed
`calc()` of two rungs), but its utility-prefix map still has no entry for the inset family, so
`right-r4` is not recognised as a utility at all and a token reachable only that way still cannot
be tabulated (`bugs/LEDGER.md` #488). `verify:token-mirror` proves the two halves of the domain
token list agree; it cannot prove the mirror *matters* — its own header records that an unmirrored
colour token still dedupes under tailwind-merge 3.6.0, so the coupling is load-bearing only once a
non-colour namespace lands in `src/tokens.css`. `verify:docs` checks that
every **value** export appears in README and AGENTS; type-only exports are optional to it, and
the `date`/`color` helper modules are summarised rather than enumerated, so a new export in
either class can go missing with every gate green (`SortState`, `toISODate` and `getMonthNames`
all did). `verify:omit-discipline` proves an omitted key is destructured out, not that omitting
it was right. `verify:slot-annotations` decides whether a caller's class *can* reach an element,
never whether it *should* — the second half is the annotation's reason, which no parser reads —
and it is blind to the props-getter form (`className:` inside a spread object literal), which it
names in its own output rather than counting as passing. Nothing anywhere reads a doc paragraph. Every promise left standing next to a
change is a claim its author now owns — re-verify it by hand or flag it.

Every guard in that chain checks a **shipped** artifact. `verify:bugs` is deliberately
excluded for that reason (see [Known-defect ledger](#known-defect-ledger)) — `bugs/` is not
in `files`. Run it at the land gate instead, not at publish.
