# Conventions — components, CSS, docs

Authority: workspace `ETHOS.md`, `CONTRIBUTING.md` (repo-only), `AGENTS.md` (shipped to
consumers), `COMPONENT_DOCS_PLAYBOOK.md`. This is the short form.

## Tokens are a contract, not a preference

- **No raw values.** "If you're about to write a raw hex code, a raw `rem` value, or a Tailwind
  default like `p-4` / `text-sm` / `bg-blue-500` / `rounded` — stop. There is a token for it."
  (`ETHOS.md:40-41`). Use `p-r3 gap-r4`, `text-h1 text-body-2`, `bg-surface-1 text-fg-primary`,
  `border-border-default`.
- **Scales descend.** `1` is always the most significant value — `r1` is the biggest gap, `r6`
  the tightest; `h1 > h6` (`ETHOS.md:87`, `AGENTS.md:342`). **This is not a bug.** A handover
  once proposed sweeping 121 usages to "fix" it; the descending scale is documented as
  deliberate in four places and renumbering is a **closed one-way door**. Code that reads the
  scale ascending is the bug — that was two lines in `Timeline.css`.
- Responsive tokens carry their own breakpoints — never hand-write `leading-*` or breakpoint
  utilities (`ETHOS.md:86`). Trap: `--R-SIZE-6` is `0.25rem` at *both* breakpoints.
- **Contrast contract:** `--C-TEXT-*` for ink/lines/borders on `--C-SURFACE-*`. Do **not** use
  `--C-PRIMARY`/`--C-ACCENT` as text or border colour on a surface (`AGENTS.md:360`). Fill tokens
  guarantee contrast only against their paired `on-*` text.
- **Never re-point a token inside component CSS** — a theme is one file overriding ~30 custom
  properties (`ETHOS.md:65-67`), and re-pointing leaks into nested components.
- Cross-package fragility: the token mirror between `response-ui-css` and `tw-merge` is
  hand-maintained with no drift enforcement (`ETHOS.md:107-111`).

## Component shape

- `<Component>.tsx` + optional `.css` + `.test.tsx` + `.examples.tsx`, colocated by group under
  `src/components/{ui,form,data-display,layout,animation,guards,router}/`. 95 modules, 96 test
  files, 90 examples, 43 CSS files. **Docs are not colocated** — `docs/components/<kebab>.md`.
- `forwardRef`; props composed as `ComponentPropsWithRef<"div">`; module-level `baseClasses` +
  `variantClassMap` lookups; `className` merged last through `cn()`; `...props` spread last
  (`src/components/ui/Button.tsx:8-48`).
- **Always `cn()`** from this package — never raw `clsx`/`twMerge` (`AGENTS.md:349,357`).
- **Never spread `{...props}` over a handler the component also sets — compose it** with
  `mergeProps`/`composeEventHandlers` from `src/util/merge-props.ts` (`AGENTS.md:121-125`). The
  caller runs first and may `preventDefault()`; non-cancelable events need
  `{ checkDefaultPrevented: false }`. See [traps.md](./traps.md) — the spread-order fix is wrong
  in both directions and both are now tested.
- No concrete router imports — use `useLink()` / `usePathname()`.
- CSS: kebab-case classes rooted on the component name; create the `.css` beside the `.tsx` and
  add an `@import` to `src/styles.css`. `src/styles.css`'s `@source` must stay **self-relative**.
- New public export → group barrel **and** `src/index.ts` **and** `README.md` **and** `AGENTS.md`
  (`verify:docs` enforces the last two, one-directionally).

## What does NOT exist (stop looking, or build it deliberately)

- **No shared focus-ring primitive.** The ring is a duplicated literal —
  `Button.tsx:9`, `IconButton.tsx:10`, `AvatarUpload.tsx:246` share one string, `Input.tsx:25`
  uses a different one, and 20 `.css` files hand-roll `var(--C-BORDER-FOCUS)`.
- **No shared form-control primitive.** Only `useFieldError`/`useFieldErrorProps`
  (`src/components/form/Field.tsx:41,54`). Input/Textarea/Select each repeat their base string.
- `src/util/` is exactly: `accept.ts` (internal, unexported), `date.ts`, `format.ts`,
  `merge-props.ts`, `merge-refs.ts`, `style.ts`, `index.ts`.

Both absences are root causes RC-2 with ~43 rows behind them — see [open-work.md](./open-work.md).
The fix belongs in `response-ui-css`, which is **out of scope** and an owner decision.

## Docs pages

- Hub `docs/components/README.md` is **generated — never hand-edit**. One spoke per component;
  `gen-docs.mjs` computes the kebab name and errors on mismatch.
- Skeleton: `# ExactExportName` → value-first lead → props/parts table → examples → `## Theme
  tokens` (**required heading**) → `## Gotchas` → `## Accessibility` → `## Related`.
- Examples are **real compiled TS** in `<Component>.examples.tsx`, injected into
  `<!-- example:Name -->` fences. `Minimal()` first, realistic copy, must end in the returned
  JSX. **Only the returned JSX ships** — module-level imports and fixtures are stripped, so a
  fence can reference an identifier that appears nowhere on the page (this has shipped).
- **The theme-tokens table cannot lie** — every token must be genuinely reachable from that
  component's own source. Never invent a token or a utility.
- **Describe what the code does, not what it should.** Paramount, and unguarded.
- **Never edit component source during a docs pass** — log it. **Never land a fix without
  re-reading the affected `## Gotchas`** — `docs/` ships to npm and no guard reads a sentence for
  truth.
