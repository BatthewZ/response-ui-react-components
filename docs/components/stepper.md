# Stepper

The progress track for a multi-step flow — a real `<ol>` whose markers say which steps are
done, which one you are on, and what is still ahead, horizontally or vertically. It is an
indicator by default; pass `onStepClick` and every marker becomes a real button.

<!-- example:Minimal -->
```tsx
<Stepper activeStep={1}>
  <Stepper.Step title="Account" description="Your details" />
  <Stepper.Step title="Plan" description="Pick a tier" />
  <Stepper.Step title="Confirm" description="Review and pay" />
</Stepper>
```
<!-- /example -->

**Anatomy.** `Stepper` is the `<ol>` and holds **no state** — `activeStep` is fully
controlled, and the component never changes it. It hands each top-level child its position
through context; each `Stepper.Step` compares that index with `activeStep` to derive one of
three statuses and writes it to `data-status` on its `<li>`:

| `data-status` | When                   | Marker                                                  |
| ------------- | ---------------------- | ------------------------------------------------------- |
| `done`        | `index < activeStep`   | Filled brand chip with a check glyph                    |
| `active`      | `index === activeStep` | Hollow ring with the step number, `aria-current="step"` |
| `upcoming`    | `index > activeStep`   | Muted hollow ring with the step number                  |

Each `Stepper.Step` also emits a `<span class="stepper-connector">`, absolutely positioned
in CSS to reach the *next* step. It is `aria-hidden` and hidden on the last child, and it
fills with the progress ink only when its own step is `done` — so the filled track always
stops at the step you are on and never runs ahead of it.

| Part            | Renders | Props                                                                                 |
| --------------- | ------- | ------------------------------------------------------------------------------------- |
| `Stepper`       | `<ol>`  | `activeStep` · `orientation?` · `onStepClick?` · `isStepClickable?` · `statusLabels?` (+ all `ol` props) |
| `Stepper.Step`  | `<li>`  | `title` · `description?` · `icon?` · `classNames?` — see [Slots](#slots) (+ all `li` props but `title`) |

`activeStep` is a required `number`. `orientation` is `"horizontal" | "vertical"`,
defaulting to `"horizontal"`. `onStepClick` is `(index: number) => void` and
`isStepClickable` is `(index: number) => boolean`. `statusLabels` is
`Partial<Record<"done" | "active" | "upcoming", string>>` — the words each status announces,
covered under [Accessibility](#accessibility). On a step, `title` is a required `string`,
`description` an optional `string`, and `icon` a `ReactNode`. `className`, `id`, `ref`, and
`aria-*` pass through on both parts.

## Orientation

`orientation` is set once on the root and reaches every step through context — both the
`<ol>` and each `<li>` carry `data-orientation`, and the stylesheet re-lays the step
(column vs row) and re-draws the connector (a horizontal bar across the row vs a vertical
bar down the marker column) from that one attribute. `Stepper.Step` has no `orientation`
prop of its own.

<!-- example:Vertical -->
```tsx
<Stepper activeStep={2} orientation="vertical">
  <Stepper.Step title="Cart" description="2 items" />
  <Stepper.Step title="Shipping" description="Address entered" />
  <Stepper.Step title="Payment" description="Card details" />
  <Stepper.Step title="Confirmation" description="Order placed" />
</Stepper>
```
<!-- /example -->

## Clickable steps

Without `onStepClick`, the marker is a plain `<span>` and nothing in the track is
focusable. Supply the handler and each marker renders as a `<button>` that calls back with
its own index — and one that sets `type="button"` explicitly, so it will not submit an
enclosing form the way a bare `<button>` would.

By default **every** step becomes a button, including ones ahead of the current position.
Pass `isStepClickable` to narrow that — only the indices it returns `true` for render as
buttons, so a handler that ignores half its indices no longer leaves the other half as
focusable, do-nothing tab stops. Decide what a click may *do* inside the handler.

<!-- example:Clickable -->
```tsx
<Stepper
  activeStep={activeStep}
  onStepClick={(index) => {
    if (index < activeStep) setActiveStep(index);
  }}
>
  <Stepper.Step title="Account" description="Your details" />
  <Stepper.Step title="Plan" description="Pick a tier" />
  <Stepper.Step title="Confirm" description="Review and pay" />
</Stepper>
```
<!-- /example -->

`activeStep`/`setActiveStep` above are a `useState(1)` pair — the `Stepper` reads the value
and the handler writes it, so navigation is entirely yours.

[Wizard](wizard.md) is the library's multi-step form orchestrator and this is exactly how it drives
its header: it renders a `Stepper` from its `steps` array and, while `allowBackNavigation`
is on (the default), passes an `onStepClick` that acts only when `index < activeStep`.
Reach for [Wizard](wizard.md) when you also want the panel and the Back/Next footer; reach for
`Stepper` on its own when you already own the flow and only need the track.

## Step markers

The marker content is `icon ?? (status === "done" ? <Check /> : index + 1)`. So a completed
step swaps its number for a check glyph, and everything else shows its 1-based number. A
supplied `icon` wins in every status — including `done`, which then never shows the check.

<!-- example:CustomIcons -->
```tsx
<Stepper activeStep={1}>
  <Stepper.Step
    title="Order placed"
    description="12 March"
    icon={<Package aria-hidden="true" />}
  />
  <Stepper.Step
    title="In transit"
    description="Leaves the depot tonight"
    icon={<Truck aria-hidden="true" />}
  />
  <Stepper.Step
    title="Delivered"
    description="Estimated 15 March"
    icon={<Home aria-hidden="true" />}
  />
</Stepper>
```
<!-- /example -->

## The finished state

`activeStep` is not clamped, and out-of-range values are meaningful rather than broken.
Pass the step count and every index is `< activeStep`, so all steps read `done` and no step
carries `aria-current` — the "flow complete" state. (`-1` inverts it: everything upcoming.)

<!-- example:Completed -->
```tsx
<Stepper activeStep={3}>
  <Stepper.Step title="Cart" />
  <Stepper.Step title="Shipping" />
  <Stepper.Step title="Payment" />
</Stepper>
```
<!-- /example -->

## Slots

`className` addresses the step's `<li>`. `classNames` addresses the five parts it renders
inside. Class strings only, and the keys are typed, so a misspelled one is a compile error
rather than a prop that does nothing.

| Slot          | Element                        | What it addresses                              |
| ------------- | ------------------------------ | ---------------------------------------------- |
| `indicator`   | `.stepper-indicator`           | the marker — **both** its forms, see below      |
| `itemBody`    | `span.stepper-content`         | the title + description block beside the marker |
| `title`       | `span.stepper-title`           | the step's title line                           |
| `description` | `span.stepper-description`     | the description line, when `description` is set |
| `connector`   | `span.stepper-connector`       | the rule reaching to the next step              |

```tsx
<Stepper.Step
  title="Payment"
  description="Card or transfer"
  classNames={{ indicator: "size-r2", connector: "opacity-50" }}
/>
```

**`indicator` covers both forms of the marker.** A step renders it as a `<button>` where the
root's `onStepClick`/`isStepClickable` make it navigable and as a `<span>` where they do not
— a decision that belongs to the root, not to the caller of the step. One key has to cover
both, or the class disappears the moment a flow becomes navigable.

**The hidden status word takes no slot.** `Stepper.css` hand-rolls its visually-hidden clip
rather than using the `sr-only` utility, so a caller's utility arriving there would out-rank
the clip and print "completed" beside the numeral. Its wording is the `statusLabels` prop,
covered under [Accessibility](#accessibility).

Prefer a token where the change is a value: `--stepper-progress-color` re-inks the whole
track at once, which reaches every step rather than one call site.

## Theme tokens

Stepper uses **no Tailwind utilities** — the connector rail needs real positioned rules, so
all styling lives in `Stepper.css` and reads contract variables directly, the way Tabs and
ActivityFeed do. Override any of these and the track re-tints with the rest of the app, at
runtime, with no rebuild.

| Where                              | Override                                      |
| ---------------------------------- | --------------------------------------------- |
| Progress ink (current ring, filled rail) | `--stepper-progress-color`, defaulting to `--C-TEXT-PRIMARY` |
| Current ring weight                | `--_stepper-active-line-width`, `1.5 x --_stepper-line-width` |
| Done chip fill · ring and glyph    | `--C-PRIMARY` · `--C-TEXT-ON-PRIMARY`         |
| Unfilled rail · upcoming ring      | `--C-BORDER-DEFAULT`                          |
| Marker background                  | `--C-SURFACE-2`                               |
| Upcoming number                    | `--C-TEXT-MUTED`                              |
| Marker hover border (clickable)    | `--C-BORDER-STRONG`                           |
| Focus outline                      | `--C-BORDER-FOCUS`                            |
| Marker corners                     | `--RADIUS-FULL`                              |
| Step title                         | `--C-TEXT-PRIMARY` · `--Bold-Weight`, `--C-TEXT-MUTED` when upcoming |
| Step description                   | `--C-TEXT-SECONDARY`                          |
| Title type                         | `--BodyText-2` · `--BodyText-2-line-height`   |
| Number and description type        | `--BodyText-3` · `--BodyText-3-line-height`   |
| Marker → content gap               | `--R-SIZE-5`                                  |
| Title → description gap · vertical rail inset | `--R-SIZE-6`                       |
| Horizontal rail inset              | `--R-SIZE-4`                                  |
| Vertical row spacing               | `--R-SIZE-3`                                  |

**`--stepper-progress-color` is the component's own hook**, and the one override that
re-skins the track without touching a global theme token. Aim it at the root element, and
outweigh `.stepper` while you're there:

```css
.stepper.checkout-stepper {
  --stepper-progress-color: var(--C-ACCENT);
}
```

Both parts matter. `Stepper.css` declares the default **on `.stepper` itself**, not on
`:root`, so a value set on an ancestor never reaches it — a declaration on the element
always beats an inherited one. And a lone `.checkout-stepper` rule only ties `.stepper` on
specificity, leaving the winner to stylesheet order. Chaining the two classes, or setting
the property inline on the root, removes both doubts.

It defaults to a **text** token rather than `--C-PRIMARY` on purpose. The current step's
ring and the filled rail are strokes drawn straight onto the surface, and the
[contrast pairing](../theme-contract.md#the-contrast-pairing) only relates a fill to its
`on-*` text, never to the surface it is stroked onto — and in the `grimdark` and `tech`
examples `--C-PRIMARY` sits close to the surface, so a primary-coloured line would fade out.
Any theme can land there; check yours. The done chips *can* fill with `--C-PRIMARY` because
they letter and ring themselves in `--C-TEXT-ON-PRIMARY`.

Three spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale: the
marker gap (`--R-SIZE-5`, `0.5rem` → `0.75rem`), the horizontal rail inset (`--R-SIZE-4`,
`0.75rem` → `1.25rem`) and the vertical row spacing (`--R-SIZE-3`, `1rem` → `1.5rem`). The
vertical rail inset (`--R-SIZE-6`) holds at `0.25rem` on both sides, so the two orientations
do not inset their rails by the same amount. The `--BodyText-*` steps are responsive too.

Three geometry values are **not** on the contract: the marker diameter (`2rem`), the rail
thickness (`2px`), and the current marker's heavier ring (`3px`), held in
component-internal `--_stepper-*` locals. Every connector offset is derived from the first
two, so they are fixed rather than themeable. The heavier ring costs no layout because
`.stepper-indicator` states `box-sizing: border-box` itself rather than inheriting it from
a reset — under content-box the current marker would grow past `2rem` and pull off the
rail's centre line, which is positioned from that variable. That mechanism was measured in
Firefox at 1280px, with the multiplier then at `2`: every marker `32 x 32` in all four
measured themes, current ring `4px` against `2px` for done and upcoming. Border-box holds
the diameter at any border width, so the `1.5` multiplier changes the ring to `3px` and
leaves the `32 x 32` measurement standing.

The multiplier scales ring **ink**, not diameter, and `2` overshot. At `2rem` across, a
`2px` ring is ~188px² of stroke, `3px` is ~273px² and `4px` is ~352px² — so doubling the
width nearly doubles the ink. That reads as heavy-handed in any theme where `--C-PRIMARY`
is a visible fill, because the neighbouring done steps are then solid discs rather than
sibling rings, and the current marker ends up the highest-contrast object in the component
— outweighing the steps already completed. Where `--C-PRIMARY` sits near the surface the
done chip renders as a ring instead, the three markers read as one family, and the same
`4px` looked deliberate. `1.5` is the value that holds in both cases. The clickable
marker's hover transition is likewise a hard-coded `0.15s ease` rather than a motion token.

Upcoming numbers and titles are deliberately `--C-TEXT-MUTED` (hint-level contrast), so
treat what is still ahead as supplementary rather than load-bearing text.

## Gotchas

- **Steps must be direct children.** Indices come from `Children.toArray(children)`, one per
  top-level child. Wrap two `Stepper.Step`s in a `<div>` or a `<>…</>` and they share the
  wrapper's index — both render the same number and the same status, and in the `<div>` case
  you have also put a non-`<li>` inside the `<ol>`. A falsy child from
  `{canSkip && <Stepper.Step … />}` is dropped by `Children.toArray` and consumes no index,
  so conditional steps renumber cleanly.
- **`onStepClick` is all-or-nothing until you narrow it.** There is no per-step `disabled` or
  `clickable` prop; the gate is `isStepClickable` on the root. Leave it off and the handler
  turns *every* marker into a focusable button, so a five-step flow on step one has five tab
  stops and four of them do nothing unless your handler acts on them.
- **`title` shadows the HTML attribute.** `Stepper.Step` omits the native `title` from its
  `li` props, so the prop always means the step label and you cannot set a native tooltip.
- **Last-step rail suppression is `:last-child`.** The connector is hidden only when the
  `<li>` is the final child of the `<ol>`. Render anything after your last `Stepper.Step` and
  a rail to nowhere comes back.
- **`Stepper.Step` throws outside `<Stepper>`.** It reads context and raises
  `"Stepper.Step must be used within <Stepper>"`. Wrapping it in your own component is fine;
  rendering it outside the root is not.
- **Long labels widen the row.** Horizontal steps are `flex: 1 1 0` and top-aligned, so
  titles wrap and steps grow taller while staying equal width and keeping the rail on the
  markers' centre line. No `overflow-wrap` is set, though, so an unbreakable string — an
  order ID, a URL — has no wrap opportunity and pushes its column, and the `<ol>`, wider.
- **Client component.** `Stepper.tsx` opens with `"use client"` (it uses context), so it
  needs a client boundary inside an RSC tree.

## Accessibility

The track is a semantic `<ol>` of `<li>` items and the current step's `<li>` carries
`aria-current="step"`, so "you are here" is exposed as real state rather than a visual cue
only. On screen the current marker is separated from an upcoming one twice over: the ring
ink is the primary text colour against a border token close to the surface, a large
lightness gap that greyscale preserves on its own, and the ring is drawn heavier, which is
what remains if `--stepper-progress-color` is overridden to a value isoluminant with
`--C-BORDER-DEFAULT`.
There is no roving focus or arrow-key model as in [Tabs](tabs.md) — in clickable mode the
markers are ordinary tab stops in DOM order.

- **Every status that is not already announced has a word, and every word is a prop.** The two
  status phrases used to be hard-coded English built inside the component, with rest props on
  `Stepper.Step` landing on the `<li>` rather than on the marker, so neither the wording nor its
  language could be reached from outside. `statusLabels` on the **root** is that override — it
  sits there rather than on a step because they are the same words for the whole track, and
  because a step's rest props never reach its marker. It merges over the defaults
  (`{ done: "completed", active: "current step" }`), so `{ done: "abgeschlossen" }` translates
  one, `{ upcoming: "not started" }` adds a word to a status that has none, and `{ done: "" }`
  drops one:

  ```tsx
  <Stepper activeStep={1} statusLabels={{ done: "abgeschlossen", active: "aktueller Schritt" }}>
  ```

- **One word, two carriers, chosen by what the marker is.** In clickable mode the indicator is a
  `<button>` and the word joins its `aria-label`, after the step's own `title` —
  `"Profile, completed"`, `"Confirm, current step"`, or the bare `"Confirm"` for one still
  ahead. That is what keeps a completed marker, whose only child is an `aria-hidden` check
  glyph, from announcing as an unnamed button, and it holds whatever you pass as `icon` because
  the label beats the content. In the **default** (non-clickable) mode there is no control to
  name, so the same word is written as visually-hidden text inside the marker instead — which is
  what stops a completed step reaching assistive tech as nothing at all, where an upcoming one
  at least reads its numeral. The word is hidden with a `.stepper-status` rule in the component's
  own stylesheet rather than a utility class, so the "no Tailwind utilities" rule below still
  holds; measured in Firefox 146, it occupies `1 x 1px` and leaves every marker `32 x 32`.
- **`statusLabels.active` reaches the clickable marker only.** The default marker's `<li>`
  already carries `aria-current="step"`, so a hidden "current step" beside it would announce the
  state twice — which is worse than not announcing it. The word is therefore withheld from the
  current step's hidden channel and from nowhere else; `done` and `upcoming` are written in both
  modes.
- **Every status reads without colour.** A completed step changes shape — filled chip,
  check glyph. The current step keeps the hollow ring but draws it **heavier**
  (`--_stepper-active-line-width`), which is what separates it from an upcoming step for a
  reader who cannot see the tint difference; the progress-ink ring, number and title colour
  reinforce it for everyone else. A width rather than a colour, so it holds under any
  `--stepper-progress-color` override and in all four measured themes. Nothing was added to what is
  *announced*: `aria-current="step"` already carried the state, and a hidden word beside it
  would only make the current step announce twice.
- **`list-style: none` can strip the list role.** The `<ol>` hides its markers in CSS, and in
  Safari + VoiceOver that WebKit quirk drops `list`/`listitem` semantics. The component adds
  no `role="list"` itself, but `role` passes through — set `<Stepper role="list">` if
  "list, N items" navigation matters for your audience.
- **The rail is decorative.** It is an empty `<span aria-hidden="true">`, so it is never
  announced — correct.
- **Focus is visible and non-shifting.** The button marker takes a 2px `--C-BORDER-FOCUS`
  outline at 2px offset on `:focus-visible` only. The non-clickable `<span>` marker takes no
  `tabindex`, which is right for a marker that does nothing.
- **Reduced motion is handled.** The single transition — border and background on the
  clickable marker — is dropped under `prefers-reduced-motion: reduce`.

## Related

[Wizard](wizard.md) · [Timeline](timeline.md) · [ProgressBar](progress-bar.md) · [Tabs](tabs.md) ·
[ActivityFeed](activity-feed.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
