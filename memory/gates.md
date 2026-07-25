# Gates — what each one checks, and what it cannot see

Every guard here passes today. **A guard's exemptions are where the next bug lives** — a `high`
row sat inside `verify:focus-affordance`'s documented blind spot from the day it shipped.

## Commands

```bash
bun run test              # vitest run (jsdom)
bun run typecheck         # tsc --noEmit  — MANDATORY after any code change
bun run lint              # eslint . --max-warnings 0
bun run build             # required before verify:directives (it reads dist/)
bun run verify:directives # RSC "use client" mirroring + secret-free
bun run verify:docs       # every public value export named in README.md AND AGENTS.md
bun run verify:examples   # gen-docs.mjs --check (doc fences stale?)
bun run verify:component-docs   # spoke H1s, link integrity, theme-token tables
bun run verify:focus-affordance # outline resets must be repaid with a focus ring
bun run verify:bugs       # ledger oracle — NOT in prepublishOnly, by design
bun run dev               # dev gallery, port 5179 (for real-browser checks)
```

`prepublishOnly` (`package.json:52`) chains: `build` → `verify:directives` → `verify:docs` →
`gen-docs --check` → `verify:component-docs` → `verify:focus-affordance` → `lint` →
`typecheck` → `test`. `verify:bugs` is deliberately absent — every publish guard checks a
*shipped* artifact and `bugs/` is not in `package.json` `files` (`scripts/bugs-ledger.mjs:9-13`).
Run it at the land gate instead: **fixing a bug shifts every line below it, and nothing else
would notice.**

## Blind spots, per guard

| Guard                     | Cannot see                                                                                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify:directives`       | Whether a module *should* carry the directive. Skips `*.test.*`, `*.d.ts`, every `index.ts`. Needs `dist/` — no build, no signal.                                                                                                       |
| `verify:docs`             | **Reverse drift**: a doc naming a deleted export passes. Match is a bare word-boundary regex — a mention anywhere counts. `type`-only exports exempt; header counts ("UI (50)") advisory.                                                |
| `verify:component-docs`   | All prose. Gotchas, accessibility notes and every sentence on the page are unchecked — **falsified prose always passes**. Token *tables* are checked; a token that changes **role** (accent moving from ink to edge) passes silently. Follows `./` sibling imports only, not `../`. |
| `verify:focus-affordance` | **Presence only** — a focus rule out-specified by a competing rule passes (#84/#291 class). Contrast unmeasured (#242). Reads `src/components/**/*.css` **only**, so a Tailwind `focus:outline-none` in a `.tsx` is invisible — 10 such occurrences exist today (#73). |
| `gen-docs --check`        | Only fence *contents* are machine-owned. Prose, token tables, gotchas, a11y are hand-written and unverified. Parsing depends on `export function Name()` on one line, closed by a column-0 `}`.                                          |
| `verify:bugs`             | **That an anchor still points at the code its row describes.** It bounds-checks that the line *exists*, nothing more — that gap let 157 anchors rot. Also blind to summary accuracy and whether a `fixed · <sha>` is a real commit.      |
| `tsc` + `eslint`          | **An unknown prop delivered through a JSX spread.** Measured directly, both are silent. No guard in this repo inspects a prop type — so the next `Omit<>` reproduces the whole RC-1 class.                                               |

## eslint is narrow on purpose

Two rules only — `react/jsx-key`, `react-hooks/rules-of-hooks` (`eslint.config.js:5-41`), scoped
to `src/`. `noInlineConfig: true` makes "never suppress, only fix" mechanical: a disable comment
cannot silence anything and is itself reported. `exhaustive-deps` is deliberately off — its two
findings here are false positives whose "fix" introduces a bug. **Mass ESLint adoption is a
closed door**; keep any addition narrow and high-signal.

## Adding a gate

The two added in pass 2 both caught live defects on their first run — `verify:focus-affordance`
found `.command-palette-input` with no focus rule at all. Worth doing. But write the non-goals
into the script's own docblock (both of these do), because **that docblock is the only place the
next agent learns what the green tick excludes**.
