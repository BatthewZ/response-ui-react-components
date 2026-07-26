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
2. Add an `@import` line to [`src/styles.css`](./src/styles.css).
3. The CSS file is copied to `dist/` automatically by the `copyCssAssets` plugin in
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
    animation/   form/   guards/ (RequireAuth)
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
    date.ts, format.ts, index.ts
scripts/                    (repo-only; none of these are published)
  gen-docs.mjs              verify-component-docs.mjs   verify-directives.mjs
  verify-docs.mjs           verify-focus-affordance.mjs verify-omit-discipline.mjs
  bugs-ledger.mjs
```

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
`bugs/components/<name>.md` and the root-cause clusters in [bugs/PLAN.md](./bugs/PLAN.md).
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
shipped artifact, and `bugs/` is not in `package.json` `files`. The workflow for taking a
finding from logged to fixed is the workspace-root `BUG_TRIAGE_PLAYBOOK.md`.

## Build & publish

`vite build` (library mode, ESM-only, `preserveModules: true`, `vite-plugin-dts` for
types). Externalised: react, react-dom, react/jsx-runtime, @floating-ui/\*, lucide-react,
clsx, tailwind-merge.

`bun pm pack` produces a publishable `.tgz`. `prepublishOnly` is the publish gate — the
authoritative list is the script itself in [package.json](./package.json); in order it runs:

```
build → verify-directives → verify-docs → gen-docs --check → verify-component-docs
      → verify-focus-affordance → verify-omit-discipline --check → lint → typecheck → test
```

So a broken RSC directive, an undocumented export, a stale doc fence, a bad token table or
dead link, an unrepaid `outline` reset, a compile-time-only `Omit`, a lint error, a type
error, or a failing test each block publish.

**Know what the gates cannot see.** `verify:component-docs` reads token *tables* — a token that
changes role passes silently, and falsified prose always passes. `verify:docs` checks that
every **value** export appears in README and AGENTS; type-only exports are optional to it, and
the `date`/`color` helper modules are summarised rather than enumerated, so a new export in
either class can go missing with every gate green (`SortState`, `toISODate` and `getMonthNames`
all did). `verify:omit-discipline` proves an omitted key is destructured out, not that omitting
it was right. Nothing anywhere reads a doc paragraph. Every promise left standing next to a
change is a claim its author now owns — re-verify it by hand or flag it.

Every guard in that chain checks a **shipped** artifact. `verify:bugs` is deliberately
excluded for that reason (see [Known-defect ledger](#known-defect-ledger)) — `bugs/` is not
in `files`. Run it at the land gate instead, not at publish.
