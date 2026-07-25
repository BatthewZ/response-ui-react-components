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
and `Accordion.Content` renders the panel. Both read the item's identity from context
rather than taking an accordion `value` prop, so they cannot be mismatched — and both throw
if rendered outside an `Accordion.Item`. (`Trigger` still accepts the *native* `button`
`value` attribute; it has no effect on the accordion.)

| Part                 | Renders    | Props                                                    |
| -------------------- | ---------- | -------------------------------------------------------- |
| `Accordion`          | `<div>`    | `mode?` · `defaultValue?` · `value?` · `onValueChange?`   |
| `Accordion.Item`     | `<div>`    | `value` (required) · `disabled?`                         |
| `Accordion.Trigger`  | `<button>` | — (plus `button` props)                                   |
| `Accordion.Content`  | `<div>`    | — (plus `div` props)                                      |

| Root prop       | Type                                    | Default    |
| --------------- | --------------------------------------- | ---------- |
| `mode`          | `"single" \| "multiple"`                | `"single"` |
| `defaultValue`  | `string \| string[]`                    | — (none open) |
| `value`         | `string \| string[]`                    | —          |
| `onValueChange` | `(value: string \| string[]) => void`   | —          |

All four parts spread the rest of their element's props, so `className`, `id`, `ref` and
`aria-*` pass through — with the handler caveat in [Gotchas](#gotchas). The root `Omit`s
the native `defaultValue`, and `Item` `Omit`s the native `value`, so both props always mean
the accordion's own identifier. `Item` also sets `data-state="open" | "closed"` and
`data-disabled` for styling hooks.

## One at a time, or many

`mode` only decides what happens **on toggle**: in `single`, opening an item replaces the
open set; in `multiple`, it is added to it. Both modes accept a string or an array.

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

There is no `defaultValue`-plus-`value` requirement: passing `value` (anything other than
`undefined`) is what switches the root into controlled mode, and `defaultValue` is then
ignored. In `single` mode a collapse reports the **empty string**, not `undefined`.

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

`Accordion.Item` renders a `<div>`, not a heading, and there is no `headingLevel` prop — so
out of the box a screen-reader user cannot jump between sections with heading navigation.
Wrap the trigger in whatever level your page outline calls for.

**This is not quite layout-neutral, so check it in your theme.** `.accordion-trigger` starts
from `all: unset` and then re-sets its own `font-size`, `font-weight`, `line-height` and
`color` — but not `font-family`, `letter-spacing` or `text-transform`. Those three are
inherited properties, and `response-ui-css` sets all three on `h1`–`h6`, so the trigger
picks up the heading face, tracking and casing from whatever level you wrap it in. In the
shipped themes that means Playfair Display (`events`), Space Grotesk (`tech`), and Cinzel
**uppercase** with wide tracking (`grimdark`). Heading margins are zeroed by the reset, so
spacing is unaffected.

<!-- example:WithHeadings -->
```tsx
<Accordion mode="multiple">
  <Accordion.Item value="shipping">
    <h3>
      <Accordion.Trigger>When will my order ship?</Accordion.Trigger>
    </h3>
    <Accordion.Content>
      <p>Orders placed before 2pm ship the same working day.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="returns">
    <h3>
      <Accordion.Trigger>How do I return an item?</Accordion.Trigger>
    </h3>
    <Accordion.Content>
      <p>Start a return from your order history within 30 days of delivery.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```
<!-- /example -->

## Theme tokens

Accordion uses **no Tailwind utilities** — everything lives in `Accordion.css` and reads
the contract variables directly. Override any of these and it re-tints with the rest of the
app, at runtime, with no rebuild.

| Where                 | Override                                                        |
| --------------------- | ---------------------------------------------------------------- |
| Item divider          | `--C-BORDER-DEFAULT`                                             |
| Trigger label         | `--C-TEXT-PRIMARY` · `--C-TEXT-MUTED` when disabled              |
| Trigger hover fill    | `--C-SURFACE-1`                                                  |
| Chevron & panel copy  | `--C-TEXT-SECONDARY`                                             |
| Focus outline         | `--C-BORDER-FOCUS` · `--RADIUS-SM`                               |
| Type                  | `--BodyText-2` · `--BodyText-2-line-height` · `--Semibold-Weight` |
| Inset                 | `--R-SIZE-4` (block) · `--R-SIZE-6` (inline)                     |
| Motion                | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`                |

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

- **Your `onClick` on a `Trigger` composes with the toggle.** `Accordion.Trigger` runs your
  handler first and then its own, so `<Accordion.Trigger onClick={…}>` fires *and* the section
  still opens; `onKeyDown` composes the same way, leaving arrow-key navigation intact. Call
  `preventDefault()` in your handler to suppress the component's behaviour. (Before this was
  fixed, `...props` was spread after both handlers and yours won outright.)
  Put side effects on `onValueChange`, or on `Accordion.Item`, which has no handler of its
  own for a click to collide with.
- **Closed panels stay in the DOM, in the tab order, and in the accessibility tree.**
  `Accordion.Content` always renders its children; closing is purely visual (`0fr` plus
  `overflow: hidden`), with no `hidden` attribute and no `inert`. A link or button inside a
  collapsed section is still reachable with Tab — focus lands on something the user cannot
  see — and nothing in the DOM marks the panel hidden, so its text stays reachable by
  assistive tech despite `aria-expanded="false"`. Render the children conditionally
  yourself if a panel holds focusable controls.
- **Wrap panel content in a single element.** The panel's padding, font size and colour are
  written against `.accordion-content-inner > *`, so a bare string child
  (`<Accordion.Content>Ships today</Accordion.Content>`) gets none of them and sits flush
  against the item edge, while two sibling elements each get the full padding block.
- **`mode` is not enforced on the value you pass in.** It is applied in the toggle handler
  only, so `mode="single"` with `defaultValue={["billing", "security"]}` renders both open
  until the first click; a controlled `value` array keeps them open indefinitely.
- **A `defaultValue` naming no item is kept, silently.** Nothing opens and nothing warns. In
  `multiple` mode that phantom string stays in the open set and is re-emitted in every
  `onValueChange` array.
- **`value` is interpolated straight into DOM ids** (`${baseId}-trigger-${value}`). A value
  containing a space — `"shipping info"` — produces an id with a space in it, which turns
  the `aria-controls`/`aria-labelledby` pair into multi-id references that resolve to
  nothing. Keep values slug-shaped.
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
- **No heading wrapper.** The pattern asks for the trigger button to sit inside an element
  with `role="heading"` at the right level; `Accordion.Item` is a bare `<div>`, so heading
  navigation skips the whole component. See [Heading semantics](#heading-semantics) for the
  workaround, which is the only fix available without changing the component.
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
