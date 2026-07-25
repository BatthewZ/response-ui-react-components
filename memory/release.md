# Release & versioning

**State at HEAD `ee59e65`: 0.9.0 is prepared to a reviewable commit and NOT published.** Owner
confirmed prepare-and-stop. Nothing pushed. `npm publish` is a **closed one-way door** — do not
walk it without an explicit instruction.

## The chain moves as one unit

```
response-ui-css              0.8.0 -> 0.9.0            40cc92e  (local only, never pushed)
response-ui-react-components 0.8.3 -> 0.9.0            6790ec0  (dep css ^0.8.0 -> ^0.9.0)
response-ui-renderer         peer ^0.8.2 -> ^0.9.0 + BOTH devDeps   1ed68d1
tw-merge                     0.1.3 — NO-OP, confirmed unchanged, not forgotten
```

Why it is mandatory, not tidiness: under npm's 0.x caret rule `^0.8.0` resolves `>=0.8.0 <0.9.0`,
so a css `0.9.0` **does not satisfy** it — verified with a real resolver:
`semver.satisfies('0.9.0','^0.8.0') === false`. Publishing react-components against `^0.8.0`
after the css minor lands ships the *old* stylesheet with the *new* components.

The renderer's **devDependencies** were the step a handover missed
(`response-ui-renderer/package.json:69-70`, workspace-relative) — they would have dev-installed
0.8.x under a `^0.9.0` peer. Five steps, not three. Both read `^0.9.0` today.

**`0.8.3` was never published.** npm `latest` is `0.8.2`; the registry goes 0.8.2 → 0.9.0.

## Publish order, if it is ever authorised

```bash
cd response-ui-css && npm publish          # FIRST. ⚠ zero gates run — it has no scripts key at all.
npm view @batthewz/response-ui-css@0.9.0 version
cd ../response-ui-react-components
bun install                                # ⚠ REQUIRED before publishing
npm publish
cd ../response-ui-renderer && bun install && bun run typecheck && bun run test   # do NOT publish
```

- Publishing react-components before css fails **loudly** at install. Fine.
- Skipping that `bun install` fails **silently**: `prepublishOnly` runs its whole suite against
  css `0.8.0` still in `node_modules`, everything passes, and it tells you nothing — the
  un-themed ring offset is exactly what `0.9.0` fixes.
- **`bun.lock` still pins css `0.8.0`; HEAD is not installable from scratch until step 1 lands.**
  Inherent to prepare-don't-publish, not a defect to "fix".

## The upgrade break most likely to bite a consumer

`type="button"` now defaults on every button this library renders, so a form whose submit button
was a bare `<Button>Save</Button>` has **no submitter**. Nothing throws, nothing logs, and a
one-input form still submits on Enter — a smoke test misses it. First `### Breaking` entry in the
changelog. Keep it there.

## Doors already walked in 0.9.0 (each semver-minor, each with a named revert)

`form.field()` contract across 9 components · `Button`/`IconButton` default `type="button"` ·
`SortState` widened to `SortState | null` · `accept` semantics via `src/util/accept.ts` ·
`AppShell.Main` → `<main>`.

## Doors that are closed — hand back, do not walk

`npm publish` · a WCAG floor or palette retune (**owner declined twice, in writing**) ·
`--R-SIZE` renumbering (contradicts `ETHOS.md:87`) · mass ESLint adoption · any change outside
this package, *including adding a script* to `response-ui-css`.
