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
    merge-refs.ts, format.ts, index.ts
scripts/
  verify-directives.mjs   verify-docs.mjs   (repo-only; not published)
```

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

## Known-defect ledger

Code defects found while documenting are recorded, not fixed inline, in
[bugs/LEDGER.md](./bugs/LEDGER.md) — one row per finding, with evidence in
`bugs/components/<name>.md` and the root-cause clusters in [bugs/PLAN.md](./bugs/PLAN.md).
`verify:bugs` ([scripts/bugs-ledger.mjs](./scripts/bugs-ledger.mjs)) is the oracle over
it: unique and ordered ids, statuses in the lifecycle enum, terminal statuses carrying
their evidence, `src/` anchors resolving to a real file and an in-range line, and a detail
block for every high or medium. **Run it after any patch** — fixing a bug shifts every
line number below it, and nothing else would notice.

It is intentionally absent from `prepublishOnly`: every guard in that chain checks a
shipped artifact, and `bugs/` is not in `package.json` `files`. The workflow for taking a
finding from logged to fixed is the workspace-root `BUG_TRIAGE_PLAYBOOK.md`.

## Build & publish

`vite build` (library mode, ESM-only, `preserveModules: true`, `vite-plugin-dts` for
types). Externalised: react, react-dom, react/jsx-runtime, @floating-ui/\*, lucide-react,
clsx, tailwind-merge.

`bun pm pack` produces a publishable `.tgz`. `prepublishOnly` runs
`build → verify:directives → verify:docs → typecheck → test`, so a broken directive, a doc
drift, a type error, or a failing test each block publish.
