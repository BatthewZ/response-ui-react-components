# swimlane — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 171 · Swimlane — every advertised prop past the named eight is dropped (high)

`SwimlaneProps` is `{title, subtitle, viewAllHref, animation, once} & Omit<ComponentPropsWithRef<"section">, "title">`,
so the type promises the full `<section>` surface. `{...rest}` is then spread onto `ScrollReveal`,
which destructures only its own props and forwards none (#9).

**Failure scenario.** `renderToStaticMarkup` of
`<Swimlane title="Continue watching" id="cw" role="region" aria-label="Continue watching" data-analytics="lane" style={{background:"red"}} tabIndex={0}>`
emits exactly `<section class="scroll-reveal-hidden swimlane">` — no `id`, `role`, `aria-label`,
`data-*`, `style` or `tabIndex`. `className` and `ref` are the only two that survive, because
Swimlane passes them explicitly. Analytics attributes vanish silently, and the accessible name a
consumer sets is discarded, which is what makes #172's unnamed scroll region unfixable from the
call site too.

Rated high rather than medium because it is a *public API that compiles and does nothing*: there is
no runtime warning, no type error, and the failure is invisible until someone inspects the DOM.
**Fix:** spread `...rest` onto the element inside ScrollReveal, or have Swimlane render its own
`<section>` and nest ScrollReveal inside it.

### 172-175 · Swimlane — a lane that does not lane (med ×4)

**#172 — nothing scrolls.** `.swimlane__body` is `width: 100%` and nothing else; `Swimlane.css`
contains no `overflow`, `scroll-snap-type`, `scroll-behavior` or `tabindex` at all.
`<Swimlane title="Continue watching"><div/><div/><div/></Swimlane>` stacks its children vertically.
A consumer who adds `overflow-x` themselves then gets a scroll region that is neither
keyboard-focusable nor named — and cannot be named, because of #171. `Swimlane.test.tsx:23` is
called "renders a scrollable container with the swimlane class" but only asserts the class exists,
so the suite reads as covering this. **Fix:** give `.swimlane__body` `overflow-x: auto` +
`scroll-snap-type: x proximity` + a `tabIndex`/label, or drop the swimlane framing and document it
as a header-only section.

**#173 — "View all" fails AA in two themes.** The link inks `--C-ACCENT` at `--BodyText-2`
(13–14px, so the 4.5:1 normal-text threshold applies) with `text-decoration: none`. Against
surface-0/1/2: `grimdark` 2.96/2.77/2.55:1, `events` 2.72/2.63/2.52:1. `:hover` swaps in
`--C-ACCENT-HOVER`, which in `grimdark` *lowers* it to 2.31/2.16/1.98:1 — the interaction state is
worse than the rest state. Default (5.17–4.70:1) and `tech` (14.84–13.70:1) pass. Because the
underline appears on `:hover` but not `:focus-visible`, at rest the link is also distinguished from
body text by colour alone. **Fix:** raise accent lightness in those two themes, or ink the link
`--C-TEXT-PRIMARY` with a persistent underline.

**#174 — "View all" cannot be relabelled.** The string is a hard-coded English literal with no
prop, and the anchor receives only `href` and a class. Three lanes on a page produce three links
whose entire accessible name is "View all"; the section's own `aria-label` is dropped by #171, so
nothing disambiguates them, and each forces a full page reload in an SPA. **Fix:** add
`viewAllLabel?: ReactNode`, let the anchor accept anchor props, or compose the title into the
link's accessible name.

**#175 — the lane is invisible without JS.** `renderToStaticMarkup` returns
`class="scroll-reveal-hidden swimlane"` (`opacity: 0`), and a jsdom render with no
`IntersectionObserver` keeps that class forever. Under `prefers-reduced-motion: reduce` the class
resolves to `opacity: 1`, so only non-reduced-motion users are affected. This is #16's mechanism,
logged separately because Swimlane exposes **no way to opt out** — a ScrollReveal consumer can
simply not use ScrollReveal, a Swimlane consumer cannot, and the hidden content includes the
heading. **Fix:** expose an un-revealed render mode, or reveal on mount when `IntersectionObserver`
is unavailable.
