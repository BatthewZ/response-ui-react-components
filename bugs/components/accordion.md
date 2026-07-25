# accordion — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 135 · Accordion — a caller `onClick` silently deletes the toggle (med)

Accordion.tsx:207-209 is `onClick={handleClick} onKeyDown={handleKeyDown} {...props}`,
and the props type at :152 is a bare `ComponentPropsWithRef<"button">` — **no `Omit`**,
making this the CalendarBase #316 variant where the prop is not even hidden. Measured:
`<Accordion.Trigger onClick={track}>` gives "consumer onClick calls: 1 /
`aria-expanded` after click: **false**" — the section never opens. A caller `onKeyDown`
removes Arrow/Home/End roving navigation the same way.
**Fix:** exactly what `Collapsible.Trigger` (Collapsible.tsx:82-97) already does —
destructure the handler names, call them first, and bail on `e.defaultPrevented`. Pattern:
*rest-spread after a component's own handler*, confirmed against source rather than
assumed.

### 137 · Accordion — no heading wrapper by default (low · downgraded from med)

**Downgraded from med after investigation.** True about the code: Accordion.tsx:135 is a bare
`<div className="accordion-item">`, and grep for `headingLevel|Accordion.Header|role="heading"`
across `src/` returns zero hits. But the escape hatch is documented *and shipped* —
`docs/components/accordion.md:144` plus `Accordion.examples.tsx:99-116` wrap the trigger in an
`<h3>` — and it genuinely works: the CSS is all class selectors and the roving-focus code uses
`closest(".accordion")` + `querySelectorAll`, so an intervening heading breaks nothing. The
failure is only constructible as "the consumer ignored the documented pattern", and adding a
`headingLevel` prop is a feature request, not a defect fix.
**But the doc's promise about that pattern is false, and that is a separate real defect:**
`accordion.md:148-151` says wrapping is layout-neutral because the reset "makes heading type
inherit". `response-ui-css/src/responsive/text.css:126-141` *sets* `font-family`,
`letter-spacing` and `text-transform` on `h1`-`h6`, and `.accordion-trigger`'s `all: unset`
inherits all three while re-setting only size, weight, line-height and colour. Measured theme
values: grimdark `"Cinzel", serif` + **uppercase** + 0.06em, events `"Playfair Display", serif`,
tech `"Space Grotesk", sans-serif`. So the documented advice restyles the trigger in three of
four themes. Fix the doc (it ships to npm), and consider re-setting those three properties.
