# Changelog

All notable changes to `@batthewz/response-ui-react-components` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Until 1.0.0, breaking changes will bump the **minor** version.

## [Unreleased]

### Added

- **Headless form orchestration (`useForm`)** — a store-backed, dependency-free form layer for the existing form controls. Validation is via [**Standard Schema**](https://github.com/standard-schema/standard-schema) (Zod, Valibot, ArkType, … all conform) — the consumer brings the validator, no runtime dependency is added. A single unified `field(name)` accessor binds BOTH native inputs and the library's controlled components (`Combobox`, `TagInput`, `Slider`, `Select`, …) — there is no register-vs-Controller split. For non-string values, annotate the bind: `field<string[]>("tags")`; `checked`-based controls (`Checkbox`, `Switch`) are wired via `watch`/`setValue` instead. Validation modes: `mode` (`onSubmit` | `onBlur` | `onChange` | `onTouched` | `all`), `reValidateMode` (`onChange` | `onBlur`), and `criteriaMode` (`firstError` | `all`). Manual/server errors (`setError`) always win and survive a validation pass; schema errors only surface once a field is touched/dirty or the form has been submitted, so errors never flash at fields the user hasn't reached. Also: `reset`/`resetField`, `trigger`, `clearErrors`, `focusFirstError` (`shouldFocusError` on by default), and a reactive external `values` prop that re-seeds the form when its identity changes. ([`src/components/form/use-form.tsx`](./src/components/form/use-form.tsx), [`form-store.ts`](./src/components/form/form-store.ts), [`standard-schema.ts`](./src/components/form/standard-schema.ts))
- **`FormProvider` + `Field`/`FieldError` auto-wiring** — `Field` now takes optional `name` and `error` props (backward compatible). Inside a `FormProvider`, `<Field name="x">` auto-wires that field's surfaced error into context, `<FieldError />` with no children renders the form-derived error (with `role="alert"` and `aria-describedby` wiring), and bound inputs reflect the error state via `aria-invalid`. ([`src/components/form/Field.tsx`](./src/components/form/Field.tsx), [`FieldError.tsx`](./src/components/form/FieldError.tsx))
- **Store-backed reactivity via `useSyncExternalStore`** — the component calling `useForm` re-renders on any change; `useFieldState(form, name)` and `useFormState(form)` give opt-in render isolation (re-render only when that field's slice / a form-level flag changes).
- **`useFieldArray`** — dynamic lists with stable keys (`id` survives reorders): `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `update`, `replace`.
- **New form exports** — `useForm`, `useFieldArray`, `useFieldState`, `useFormState`, `useFormContext`, `FormProvider`, and types `FieldBindings`, `SubmitHelpers`, `UseFormOptions`, `FormApi`, `FieldArrayItem`, `UseFieldArrayReturn`, `FieldSnapshot`, `FormStateSnapshot`, `ValidationMode`, `ReValidateMode`, `StandardSchemaV1`, `InferInput`, `InferOutput`.

## [0.5.0] — 2026-06-13

### Added

- **`VirtualizedDataTable`** — a row-virtualizing data table for large datasets (10,000+ rows). Only a small window of rows is mounted in the DOM, so scrolling stays smooth and memory stays flat. Built on the same `Table` primitive and `ColumnDef` contract as `DataTable`, sharing its sort comparator and cycle logic (extracted to [`src/components/ui/data-table-utils.ts`](./src/components/ui/data-table-utils.ts) as a single source of truth). Fixed/uniform `rowHeight`; the `Table` root doubles as the scroll container so the sticky header pins for free. Optional `onEndReached` for infinite/lazy loading. Select-all spans the **entire** dataset (vs `DataTable`'s page-scoped select-all). Use it instead of `DataTable` when you want continuous scrolling rather than pagination.
- **`useVirtualRows` hook** — table-agnostic, dependency-free fixed-height windowing primitive (`src/hooks/use-virtual-rows.ts`). Tracks scroll offset and viewport height (passive `scroll` listener + `ResizeObserver`) and returns the row slice to mount plus top/bottom spacer heights.

## [0.4.0] — 2026-06-13

### Added

- **18 new ui/form components** — `Switch`, `Slider`, `NumberInput`, `TagInput`, `OTPInput`, `Combobox`, `DatePicker` (form); `CodeBlock`, `CopyButton`, `Kbd`, `Rating`, `Collapsible`, `CommandPalette`, `ContextMenu`, `HoverCard`, `Drawer`, `Stepper`, `Calendar` (ui).
- **`components/data-display` group** — a discoverable home for dashboard primitives: `Sparkline`, `ProgressRing`, `Meter`, `DescriptionList`, `ActivityFeed`. (Existing `StatCard`, `Timeline`, `Table`, `DataTable` stay where they are.)
- **`StatCard.Sparkline` slot and `StatCard.Trend` format** — `StatCard` now composes the new `Sparkline` primitive as a slot, and `StatCard.Trend` takes an optional `format(value)` for custom delta rendering.
- **`useControllableState` hook** — controlled/uncontrolled state helper, used by the new interactive components.
- **Date utilities** (`src/util/date.ts`) — `addDays`, `addMonths`, `buildMonthGrid`, `clampDate`, `formatDate`, `getDateFieldOrder`, `getMonthLabel`, `getWeekdayNames`, `isAfter`, `isBefore`, `isSameDay`, `parseDateInput`, `startOfDay`, `startOfMonth` — backing `Calendar` and `DatePicker`.
- **RSC support** — interactive modules ship a `"use client"` directive so the components work in React Server Component frameworks (Next.js App Router, etc.). Pure presentational components (Button, Text, layout) stay server-renderable. A `verify:directives` script enforces dist mirroring and a secret-free invariant.

### Changed

- **DataTable** — Date- and nullish-aware sorting; `defaultSort` for uncontrolled initial sort; client-side `pageSize` pagination (table slices and derives pages itself); a footer slot.
- **Domain tokens now owned by this package** — `response-ui-css` is the universal contract and no longer mints data-viz / single-component tokens. This package now OWNS its trend (`--C-TREND-*`), chart (`--C-CHART-1..5`), and media (`--MEDIA-ASPECT-POSTER`, `--MEDIA-CARD-HOVER-*`, `--MEDIA-CAROUSEL-*`) tokens in [`src/tokens.css`](./src/tokens.css) — imported first by `styles.css`, including their `@theme inline` mappings and per-theme (grimdark/tech/events) re-tuning. Since `@batthewz/response-ui-tw-merge` no longer carries `trend-*`/`chart-*` in its built-in color list, the exported `cn` is now built with `createCn({ theme: { color: [...] } })` so those utilities (`text-trend-up`, `bg-chart-3`, …) still dedupe. `MediaCard`'s landscape/square ratios now read the contract's renamed `--ASPECT-WIDE`/`--ASPECT-SQUARE`.
- **Dependency bump** — `@batthewz/response-ui-css` `^0.5.0` → `^0.6.0` (renames its generic aspect ratios to `--ASPECT-WIDE`/`--ASPECT-SQUARE` and sheds the relocated domain tokens). `@batthewz/response-ui-tw-merge` `^0.1.0` → `^0.1.1` (its `createCn`/`mergeExtension` types now accept the top-level `theme` key that this package's domain-token `createCn` relies on).

## [0.3.0] — 2026-06-11

### Added

- **Self-relative Tailwind `@source` in [`src/styles.css`](./src/styles.css)** — importing `@batthewz/response-ui-react-components/styles` now registers this package's own sources with Tailwind v4, so the utility classes used inside the components are generated under any node_modules layout (hoisted npm, bun's isolated store, pnpm, linked workspaces). Previously scanning relied on sideways `@source` globs inside `@batthewz/response-ui-css`, which silently matched nothing under isolated stores — adopters needed a manual `@source "../../node_modules/@batthewz/response-ui-react-components/src/**/*.{ts,tsx}"` workaround. That workaround can now be removed.
- **Declaration maps** (`.d.ts.map`) — consumers' go-to-definition now lands in the real `src/*.tsx` source, which ships in the tarball alongside `dist/`.

### Changed

- **`@batthewz/response-ui-css` dependency bumped `^0.2.0` → `^0.5.0`** — the old caret range could never resolve to newer published releases (0.x caret semantics), leaving transitive installs behind. Now tracks the latest css release (0.5.0, which pairs with this release's self-relative `@source`).
- **Local/linked development now resolves `dist/` like published installs do** (see the packaging fix below) — run `bun run build` (or `vite build --watch`) after editing source when consuming the package via a link.

### Fixed

- **Published packaging: the `exports` map now actually points at `dist/` (`.js` + `.d.ts`).** Previously `main`/`types`/`exports` pointed at raw `src/*.ts(x)` and the dist mappings lived in `publishConfig` — but overriding entry points via `publishConfig` is a pnpm-only feature that npm/bun publish silently ignore. Published consumers were served raw TSX (working only where esbuild prebundles `node_modules`, e.g. Vite) and typechecked the library's source instead of `.d.ts` stubs, while the entire built `dist/` shipped as dead weight. The dead `publishConfig` overrides are removed; a `prepack` build guards against stale `dist` in tarballs.
- **Deep subpath imports (`./components/*`, `./hooks/*`) are now live on the published package** — on 0.2.1 they only existed in the ignored `publishConfig` block, so the README's documented `…/components/ui/Button` import never resolved from npm.

## [0.2.1] — 2026-06-05

### Added

- **`createCn(extension?)` export** — ergonomic factory for apps that add custom tokens on top of the design system. Sourced from [`@batthewz/response-ui-tw-merge@0.1.0`](../response-ui-tw-merge/CHANGELOG.md). Safe against the "forgot to spread" footgun the older `tailwindMergeExtension` spread pattern had.
- **`mergeExtension(extension?)` export** — low-level helper for power users who drive `extendTailwindMerge` themselves.

### Changed

- **`prepublishOnly` hook added** — `bun run build && bun run typecheck && bun run test`. Prevents shipping a stale `dist/` or a build that doesn't pass tests/typecheck.
- **`publishConfig.access`** set to `"public"` explicitly so a fresh-clone publish can't accidentally ship a private package.

### Notes

`0.2.0` published with a hard dep on `@batthewz/response-ui-tw-merge@^0.1.0` that did not yet exist on npm — installs of 0.2.0 fail to resolve until `@batthewz/response-ui-tw-merge@0.1.0` publishes. Upgrade to `0.2.1` once tw-merge is on npm.

## [0.2.0] — 2026-06-05

### Breaking

- **Per-component CSS now ships from this package and requires an additional CSS import.** Consumers must add a second `@import` to their app CSS:

  ```css
  /* src/app.css — before */
  @import "@batthewz/response-ui-css";

  /* src/app.css — after */
  @import "@batthewz/response-ui-css";
  @import "@batthewz/response-ui-react-components/styles";
  ```

  Order matters: each per-component file reads `var(--…)` tokens defined by `response-ui-css`, so the foundation has to load first. Without the second import, components render with utility classes only and visual implementations (accordion grid animation, popover surface, pagination layout, etc.) are missing.

  **Why this changed:** the per-component CSS files (Accordion, AppShell, Button, Carousel, DropdownMenu, EmptyState, FileUpload, Hero, MasonryGrid, MediaCard, Pagination, Popover, ProgressBar, SearchInput, Skeleton, Spotlight, StatCard, Swimlane, Table, Tabs, ThemeSwitcher, Timeline, Tooltip — 24 files) are visual implementations of React components in *this* package. Co-locating them with their `.tsx` makes ownership clear, lets the React component own its visual contract end-to-end, and keeps `@batthewz/response-ui-css` honest as a framework-agnostic design-system foundation.

### Added

- **`./styles` subpath export** — single CSS entry point that `@imports` all 24 per-component CSS files in stable order. See [`src/styles.css`](./src/styles.css).
- **Co-located component CSS** — `src/components/ui/Accordion.css` next to `Accordion.tsx`, `src/components/form/SearchInput.css` next to `SearchInput.tsx`, etc. (24 files total).
- **`copyCssAssets` Vite plugin** in [`vite.config.ts`](./vite.config.ts) — globs `src/**/*.css` and copies to `dist/` at build time, so the `./styles` export resolves correctly in published consumers.
- **`createCn(extension?)` re-export** — ergonomic factory for apps that add custom tokens on top of the design system. Sourced from [`@batthewz/response-ui-tw-merge@0.1.0`](../response-ui-tw-merge/CHANGELOG.md), now a required dep. Safe against the "forgot to spread" footgun the older `tailwindMergeExtension` spread pattern had.
- **`mergeExtension(extension?)` re-export** — low-level helper for power users who drive `extendTailwindMerge` themselves.
- **Live demo link** in the README pointing at <https://ai-website-starter.benmatthews-it.workers.dev/demo>.

### Changed

- **README "Use" section** now documents both required CSS imports with the order-matters note.
- **AGENTS.md** gained a "CSS layout" section explaining the co-location convention and the workflow for adding CSS to a new component (create `MyComponent.css` next to `MyComponent.tsx`; add an `@import` line to `src/styles.css`; build copies it to `dist/` automatically).
- **AGENTS.md hard-requirements section** updated: now lists both CSS imports and clarifies that `@batthewz/response-ui-css` is a regular dependency (auto-installed), not a peer dependency, while the consumer's `@import` is still manual (Tailwind v4 needs to see it in the consumer's CSS graph).

### Removed

- Stale "ThemeEditor in the showcase" reference from [docs/theme-contract.md](./docs/theme-contract.md) — no `ThemeEditor` or showcase component exists in this package.

### Migration guide

1. **Update your app CSS** to add the second import:

   ```css
   @import "@batthewz/response-ui-css";
   @import "@batthewz/response-ui-react-components/styles";
   ```

2. **No code changes required** — all component imports, props, and class names are unchanged. If your build hot-reloads CSS, it should pick up the new import immediately.

3. **If you wrote custom CSS** that depended on classes like `.accordion-trigger`, `.popover-content`, etc. being available from `@batthewz/response-ui-css` alone, those classes now come from `@batthewz/response-ui-react-components/styles`. The class names themselves are unchanged.

## [0.1.0] — Initial release

Initial public release.
