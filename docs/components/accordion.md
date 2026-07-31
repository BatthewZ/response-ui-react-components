# Accordion

A stack of disclosure sections that share one open/closed policy — `mode="single"` keeps
exactly one section open, `mode="multiple"` lets them stack. Reach for it when a page has
more sections than fit comfortably at once: an FAQ, a settings group, a filter panel. For
one independent disclosure with no siblings to coordinate, use [Collapsible](collapsible.md) instead;
Accordion exists specifically to *manage a set*.

<!-- example:Minimal -->
```tsx
<Accordion defaultValue="shipping">
  <Accordion.Item value="shipping">
    <Accordion.Trigger>When will my order ship?</Accordion.Trigger>
    <Accordion.Content>
      <p>Orders placed before 2pm ship the same working day.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="returns">
    <Accordion.Trigger>How do I return an item?</Accordion.Trigger>
    <Accordion.Content>
      <p>Start a return from your order history within 30 days of delivery.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```
<!-- /example -->

**Anatomy.** `Accordion` owns the open set and hands it down through context; it renders a
plain full-width `<div>` and draws nothing itself. Each `Accordion.Item` is a `<div>`
carrying one required `value` — that string is the item's identity in
`defaultValue`/`value` and in every `onValueChange` payload. Inside an item,
`Accordion.Trigger` renders the `<button>` (with its own chevron `<svg>`, `aria-hidden`)
inside a heading element — `<h3>` by default, set by the root's `headingLevel` — and
`Accordion.Content` renders the panel. Both read the item's identity from context
rather than taking an accordion `value` prop, so they cannot be mismatched — and both throw
if rendered outside an `Accordion.Item`. (`Trigger` still accepts the *native* `button`
`value` attribute; it has no effect on the accordion.)

| Part                 | Renders    | Props                                                    |
| -------------------- | ---------- | -------------------------------------------------------- |
| `Accordion`          | `<div>`    | `mode?` · `defaultValue?` · `value?` · `onValueChange?` · `headingLevel?` |
| `Accordion.Item`     | `<div>`    | `value` (required) · `disabled?`                         |
| `Accordion.Trigger`  | heading › `<button>` | `classNames?` — see [Slots](#slots) (plus `button` props) |
| `Accordion.Content`  | `<div>`    | — (plus `div` props)                                      |

| Root prop       | Type                                    | Default    |
| --------------- | --------------------------------------- | ---------- |
| `mode`          | `"single" \| "multiple"`                | `"single"` |
| `defaultValue`  | `string \| string[]`                    | — (none open) |
| `value`         | `string \| string[]`                    | —          |
| `onValueChange` | `(value: string \| string[]) => void`   | —          |
| `headingLevel`  | `1 \| 2 \| 3 \| 4 \| 5 \| 6`            | `3`        |

All four parts spread the rest of their element's props, so `className`, `id`, `ref` and
`aria-*` pass through — with the handler caveat in [Gotchas](#gotchas). The root `Omit`s
the native `defaultValue`, and `Item` `Omit`s the native `value`, so both props always mean
the accordion's own identifier. `Item` also sets `data-state="open" | "closed"` and
`data-disabled` for styling hooks.

## One at a time, or many

`mode` is a property of the whole open set, not just of the toggle. On toggle: in `single`,
opening an item replaces the open set; in `multiple`, it is added to it. And at the seed:
a `single` accordion given an array `defaultValue` or `value` keeps only the **first**
entry — the rest are dropped, so two panels never render open in `single` mode. Both modes
accept a string or an array.

<!-- example:MultipleOpen -->
```tsx
<Accordion mode="multiple" defaultValue={["billing", "security"]}>
  <Accordion.Item value="billing">
    <Accordion.Trigger>Billing</Accordion.Trigger>
    <Accordion.Content>
      <p>Visa ending 4242. Next invoice 1 August.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="security">
    <Accordion.Trigger>Security</Accordion.Trigger>
    <Accordion.Content>
      <p>Two-factor authentication is on for every member of the workspace.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="notifications">
    <Accordion.Trigger>Notifications</Accordion.Trigger>
    <Accordion.Content>
      <p>Weekly digest only. Nothing is sent outside working hours.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```
<!-- /example -->

## Controlled

Pass `value` and `onValueChange` and the root stops tracking state — useful when something
outside the accordion has to move it, like a "collapse all" [Button](button.md). Below,
`openSections` / `setOpenSections` come from `useState<string | string[]>(["billing"])`.

<!-- example:Controlled -->
```tsx
<Button variant="secondary" onClick={() => setOpenSections([])}>
  Collapse all
</Button>
<Accordion mode="multiple" value={openSections} onValueChange={setOpenSections}>
  <Accordion.Item value="billing">
    <Accordion.Trigger>Billing</Accordion.Trigger>
    <Accordion.Content>
      <p>Visa ending 4242. Next invoice 1 August.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="security">
    <Accordion.Trigger>Security</Accordion.Trigger>
    <Accordion.Content>
      <p>Two-factor authentication is on for every member of the workspace.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```
<!-- /example -->

There is no `defaultValue`-plus-`value` requirement — but **the first render decides the
mode, and nothing revisits it.** If `value` is anything other than `undefined` on that
render, the root is controlled for the rest of its life and `defaultValue` is ignored;
if it is `undefined`, the root is uncontrolled for the rest of its life and a `value`
that arrives later is ignored. On a controlled root a later `undefined` reads as *nothing
open*, not as a handover to internal state, so `value={v ?? undefined}` stays controlled
throughout. See [Gotchas](#gotchas) for why that matters more than it sounds.

In `single` mode a collapse reports the **empty string**, not `undefined`.

## Disabled items

`disabled` on an `Item` disables its `<button>` natively — it greys out, stops responding
to clicks, and leaves the tab order entirely.

<!-- example:DisabledItem -->
```tsx
<Accordion defaultValue="plan">
  <Accordion.Item value="plan">
    <Accordion.Trigger>Change plan</Accordion.Trigger>
    <Accordion.Content>
      <p>You are on Team. Upgrading takes effect at the next billing date.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="transfer" disabled>
    <Accordion.Trigger>Transfer ownership</Accordion.Trigger>
    <Accordion.Content>
      <p>Only the workspace owner can transfer ownership.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```
<!-- /example -->

## Heading semantics

Every trigger renders inside a real heading element, so screen-reader users can jump
between sections with heading navigation out of the box. The level defaults to `<h3>`;
set `headingLevel` on the root (`1`–`6`) to match your page outline — it applies to every
trigger in the set.

The wrapper is presentation-neutral by design, but not perfectly: `.accordion-heading`
zeroes the margin and sets `font: inherit`, which strips the theme's heading face, size and
weight — the trigger keeps its own `--BodyText-2` type. `letter-spacing` and
`text-transform` are *not* part of the `font` shorthand, though, and `response-ui-css` sets
both on `h1`–`h6`, so those two still reach the trigger. The default theme leaves both at
their neutral values; of the worked examples only `grimdark` sets them to anything visible,
where triggers render **uppercase** with wide tracking (in the body face, not Cinzel). Check
it in your theme.

Do not wrap the trigger in a heading of your own — that now nests a heading inside a
heading, which is invalid HTML. Set `headingLevel` instead:

<!-- example:WithHeadings -->
```tsx
<Accordion mode="multiple" headingLevel={2}>
  <Accordion.Item value="shipping">
    <Accordion.Trigger>When will my order ship?</Accordion.Trigger>
    <Accordion.Content>
      <p>Orders placed before 2pm ship the same working day.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="returns">
    <Accordion.Trigger>How do I return an item?</Accordion.Trigger>
    <Accordion.Content>
      <p>Start a return from your order history within 30 days of delivery.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```
<!-- /example -->

## Slots

`Accordion.Trigger` is the one part with elements a `className` cannot reach. Its own
`className` and `ref` stay on the `<button>` — that is the control, and it is what arrow-key
navigation finds by selector — so `classNames` addresses the heading it sits inside and the
two spans it wraps. Class strings only, and the keys are typed, so a misspelled one is a
compile error rather than a prop that does nothing.

| Slot          | Element                          | What it addresses                          |
| ------------- | -------------------------------- | ------------------------------------------ |
| `heading`     | the `headingLevel` element       | the `<h2>`…`<h6>` wrapper, which exists so heading navigation finds each section |
| `triggerText` | `span.accordion-trigger-text`    | the label span inside the button            |
| `chevron`     | `svg.accordion-chevron`          | the disclosure glyph                        |

```tsx
<Accordion.Trigger classNames={{ chevron: "size-r3", triggerText: "font-semibold" }}>
  Shipping
</Accordion.Trigger>
```

`Accordion.Item` and `Accordion.Content` need no slots — `className` already lands on the
element each of them is. The one element inside `Content` that a class cannot reach is its
clipper, and that is deliberate: it carries `overflow: hidden` and nothing else, while the
box outside it animates `grid-template-rows`. Varying it does not restyle the panel, it stops
the open and close transition working.

## Theme tokens

Accordion paints in Tailwind utilities, each resolving to a contract variable. Override any
of these and it re-tints with the rest of the app, at runtime, with no rebuild — and because
the utilities sit in `@layer utilities`, a `className` of your own beats every one of them.

| Where                | Utility                                                       | Override                                                         |
| -------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Item divider         | `border-border-default`                                       | `--C-BORDER-DEFAULT`                                             |
| Trigger label        | `text-fg-primary` · `disabled:text-fg-muted`                  | `--C-TEXT-PRIMARY` · `--C-TEXT-MUTED` when disabled              |
| Trigger hover fill   | `hover:not-disabled:bg-surface-2`                             | `--C-SURFACE-2`                                                  |
| Chevron & panel copy | `text-fg-secondary`                                           | `--C-TEXT-SECONDARY`                                             |
| Focus outline        | `focus-visible:outline-border-focus` · `focus-visible:rounded-sm` | `--C-BORDER-FOCUS` · `--RADIUS-SM`                           |
| Type                 | `text-body-2` · `font-semibold`                               | `--BodyText-2` · `--BodyText-2-line-height` · `--Semibold-Weight` |
| Inset                | `py-r4` · `px-r6` · `pb-r4`                                   | `--R-SIZE-4` (block) · `--R-SIZE-6` (inline)                     |
| Motion               | `duration-[var(--MOTION-DURATION-SHIFT)]` · `ease-[var(--MOTION-EASE-SHIFT)]` | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |

One rule stays in `Accordion.css` — the heading wrapper's `font: inherit`. It is a reset,
and a reset has to *lose* to a class you pass rather than beat it, which is what the
component layer buys it. The file says so at the top.

**The panel's inset is `classNames.body`, not `className`.** `Accordion.Content` renders
three boxes: the one that animates (`className` and `ref` address this one), a clipper that
does nothing but `overflow: hidden`, and a padded body. The inset has to sit on the body,
because the two outer boxes are collapsed to zero height while the panel is closed and their
padding would survive that collapse as a visible strip. So `<Accordion.Content
className="p-0">` will not flatten the panel — `classNames={{ body: "p-0" }}` will.

**The open/close animation is `grid-template-rows: 0fr` → `1fr`**, with `overflow: hidden`
on an inner wrapper — not a `max-height` guess. A panel therefore animates to its true
height whatever it contains, and nothing is ever clipped when open. The chevron rotates
180° off `[aria-expanded="true"]`. Both transitions are dropped under
`prefers-reduced-motion: reduce`; the trigger's hover-background fade is not in that block
and still animates.

The inset is worth reading twice: `--R-SIZE-4` is the block padding (`0.75rem`, stepping to
`1.25rem` at the 40rem breakpoint) and `--R-SIZE-6` is the inline padding — the smallest
step on the responsive scale (`0.25rem`, flat across the breakpoint). Sections sit nearly
flush with their container, and the gap between label and container edge does **not** grow
on wide screens. That inverts the library's usual pairing — a *larger* inline inset with a
smaller block one — so budget for a `className` on the trigger if you want a real gutter.
`--Semibold-Weight` applies to the trigger only; panel copy sets no weight and inherits
whatever the surrounding page has. Accordion paints no background — it inks text tokens
onto whatever surface it is dropped onto.

## Gotchas

- **The controlled/uncontrolled mode locks on the first render, and both directions bite
  silently.** A root that mounts with `value` set is controlled forever: if you pass no
  `onValueChange`, or your handler ignores the emission, **clicking a trigger does
  nothing** — no state to fall back on, and nothing thrown or logged to say so. A root that
  mounts with `value` `undefined` is uncontrolled forever: a `value` that arrives later
  (from a fetch, say) is **ignored**, so your state and the open set drift apart in silence.
  Decide at mount — pass `value={v ?? []}` rather than `v ?? undefined` if you mean
  controlled — or remount with a changing `key` to re-decide. (Before this was fixed, the
  mode was recomputed every render, so an `undefined` frame handed the accordion back to
  internal state the parent could not see.)
- **Your `onClick` on a `Trigger` composes with the toggle.** `Accordion.Trigger` runs your
  handler first and then its own, so `<Accordion.Trigger onClick={…}>` fires *and* the section
  still opens; `onKeyDown` composes the same way, leaving arrow-key navigation intact. Call
  `preventDefault()` in your handler to suppress the component's behaviour. (Before this was
  fixed, `...props` was spread after both handlers and yours won outright.)
  Put side effects on `onValueChange`, or on `Accordion.Item`, which has no handler of its
  own for a click to collide with.
- **Closed panels stay mounted — they go `inert`, not away.** `Accordion.Content` always
  renders its children; closing is a `0fr` grid clip plus `inert`. The `inert` half covers
  reachability: while closed the panel takes no clicks, leaves the tab order, and drops out of
  the accessibility tree, so focus can't land on something the user cannot see. What it does
  *not* cover is everything else about being mounted — effects keep running, images keep
  loading, and an `inert` form control is still submitted with the form. Render the children
  conditionally yourself if what you're avoiding is the cost of a closed panel rather than its
  reachability. (`hidden`/`display: none` are not an option here: either would kill the
  `grid-template-rows` transition.)
- **Wrap panel content in a single element.** The panel's padding, font size and colour are
  written against `.accordion-content-inner > *`, so a bare string child
  (`<Accordion.Content>Ships today</Accordion.Content>`) gets none of them and sits flush
  against the item edge, while two sibling elements each get the full padding block.
- **`mode="single"` truncates an array seed to its first entry.** `defaultValue={["billing",
  "security"]}` opens only `"billing"`, and a controlled `value` array is normalised the same
  way on every render — the extra entries are dropped silently, not kept until the first
  click. (Before this was fixed, `mode` was applied only in the toggle handler and a
  two-item seed rendered both open.)
- **A `defaultValue` naming no item is kept, silently.** Nothing opens and nothing warns. In
  `multiple` mode that phantom string stays in the open set and is re-emitted in every
  `onValueChange` array.
- **Every item draws a bottom border, including the last**, so the set closes with a rule
  under it. There is no `:last-child` suppression, so override the border on the last
  `Item` if you don't want the trailing rule.
- **Nested accordions share the outer arrow ring.** The key handler walks up to the nearest
  `.accordion` and queries *all* triggers beneath it, so Arrow Down on an outer trigger can
  land inside a nested accordion, while a nested trigger only cycles within its own set.

## Accessibility

Each trigger is a real `<button type="button">` — it carries `aria-expanded` and
`aria-controls`, and the explicit `type` keeps it from submitting an enclosing form. Each
panel is `role="region"` named by its trigger via `aria-labelledby`; the id pair is
generated from a `useId` base, so nothing to wire.

- **Keyboard.** Tab reaches every trigger — there is no roving `tabindex`, which matches the
  WAI-ARIA accordion pattern. On a focused trigger, Arrow Down / Arrow Up move to the next /
  previous trigger and wrap around, Home and End jump to the first and last, and all four
  call `preventDefault` so the page does not scroll underneath. Disabled triggers are
  skipped. Enter and Space toggle, as they do for any button.
- **Headings are built in.** Each trigger sits inside a real heading element — `<h3>` by
  default, `headingLevel` on the root picks the rank — as the WAI-ARIA pattern asks, so
  heading navigation reaches every section. See
  [Heading semantics](#heading-semantics) for the styling caveats.
- **Every panel is a landmark, open or closed.** `role="region"` is applied unconditionally,
  so a twelve-section FAQ contributes twelve regions to the landmark list. That is more
  proliferation than the pattern recommends past roughly six panels — `role` passes through
  `Accordion.Content`, so override it on long sets.
- **A disabled item is unreachable, not announced.** It uses the native `disabled` attribute
  rather than `aria-disabled`, so the trigger leaves the tab order and arrow navigation
  entirely — keyboard users get no signal that the section exists. Its label also drops to
  `--C-TEXT-MUTED`, hint-level ink.
- **Reduced motion** is honoured for the height and chevron transitions, which are both
  disabled under `prefers-reduced-motion: reduce`.

## Related

[Collapsible](collapsible.md) · [Tabs](tabs.md) · [DescriptionList](description-list.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
