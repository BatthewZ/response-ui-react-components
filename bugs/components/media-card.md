# media-card — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 167-168 · MediaCard — the action layer covers the card, and the white ink never applies (med)

**#167.** `MediaCard.Action` renders `absolute inset-0 z-10 flex items-center justify-center` with
pointer events left on — unlike `.media-card__overlay`, which is correctly `pointer-events: none`.
A card with `<MediaCard.Content><a href="/x">Read more</a></MediaCard.Content>` plus any
`<MediaCard.Action>` renders the link focusable by keyboard and unclickable by mouse, because the
Action div is the hit target across the full card box. That is a keyboard/pointer mismatch, not
just a dead link. **Fix:** add `pointer-events-none` to the Action wrapper and `pointer-events-auto`
to its children, matching `.media-card__overlay`.

**#168.** `.media-card__content` re-declares `--C-TEXT-PRIMARY`, `-SECONDARY`, `-MUTED`,
`-INVERSE`, `-ON-PRIMARY` and `-ON-ACCENT` to white, but sets no `color` property — so the
redefinition only reaches children that *read* one of those variables (`Text`, `text-fg-*`).
`<MediaCard.Content><h3>Card Title</h3></MediaCard.Content>` — exactly what `MediaCard.test.tsx:32`
renders — inherits the ambient page ink and lands dark-on-dark over a 70%-black gradient. The CSS
comment above the rule says "force light text in all themes", which is what it fails to do.
**Fix:** add `color: var(--C-TEXT-PRIMARY)` to `.media-card__content`. Both are reasoned from the
source plus the compiled stylesheet; jsdom does not hit-test, so neither is browser-measured.
