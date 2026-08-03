# Dialog

A modal built on the browser's own `<dialog>` element, opened with `showModal()` — so the
focus trap, the inert background, the `::backdrop` scrim and stacking above every `z-index`
on the page are the platform's behaviour rather than a re-implementation. You supply `open`
and `onClose`; everything inside the panel is yours.

<!-- example:Minimal -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Invite teammates
</Button>
<Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="invite-title">
  <h2 id="invite-title">Invite teammates</h2>
  <p>Everyone you invite joins Acme Marketing with the Editor role.</p>
  <FormActions>
    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
      Cancel
    </Button>
    <Button type="button" onClick={() => setOpen(false)}>
      Send invites
    </Button>
  </FormActions>
</Dialog>
```
<!-- /example -->

| Prop           | Type                       | Default        |
| -------------- | -------------------------- | -------------- |
| `open`         | `boolean`                  | — _(required)_ |
| `onClose`      | `() => void`               | — _(required)_ |
| `lightDismiss` | `boolean`                  | `false`        |
| `className`    | `string`                   | —              |
| `ref`          | `Ref<HTMLDialogElement>`   | —              |
| …rest          | `dialog` props, less `open` and the native `onClose` | — |

That is the whole API — no size preset and no `defaultOpen`. `open` is required, so Dialog is
**always** controlled; if `onClose` does not change the boolean you hold, nothing closes. See
[Closing it](#closing-it).

Two optional parts sit inside it — [DialogHeader and DialogBody](#the-parts) — for the one
piece of structure that cannot be assembled correctly from the outside: a panel whose middle
scrolls while its title and its actions stay put.

**And there is no `classNames` — deliberately.** The panel is the root, so `className` is
already the single writer for it; a slot object would be a second one for the same element.
Where Dialog does own elements you cannot reach — the header row, the scroll region — they are
parts you render and put your own `className` on, not keys in a bag. The scrim is the one thing
Dialog paints that `className` cannot reach as a class, because `::backdrop` takes no class
name — it is a theme value instead, `--OVERLAY-SCRIM-COLOR`. See [Theme tokens](#theme-tokens).

## A destructive confirmation

The panel is an empty box. A heading, the body copy, the button row and the accessible name
are all supplied at the call site — [FormActions](form-actions.md) gives the footer its
standard right-aligned spacing.

<!-- example:DestructiveConfirm -->
```tsx
<Button type="button" variant="danger" onClick={() => setOpen(true)}>
  Delete workspace
</Button>
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  aria-labelledby="delete-workspace-title"
  aria-describedby="delete-workspace-body"
>
  <h2 id="delete-workspace-title">Delete Acme Marketing?</h2>
  <p id="delete-workspace-body">
    Every project, deploy history and invite link goes with it. This cannot be undone.
  </p>
  <FormActions>
    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
      Keep workspace
    </Button>
    <Button type="button" variant="danger" onClick={() => setOpen(false)}>
      Delete workspace
    </Button>
  </FormActions>
</Dialog>
```
<!-- /example -->

## What the native element gives you

Every Dialog is modal: the effect only ever opens it with `showModal()`, and the native
`open` attribute is `Omit`ted from the prop type so you cannot render it any other way. That
distinction matters — a `<dialog open>` shown by the attribute alone is **non-modal**: no top
layer, no `::backdrop`, no inert background, nothing trapped. Ruling it out at the type level
means the four behaviours below always hold.

| You get                | Because                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| Top-layer stacking     | A `:modal` dialog paints above the whole page regardless of `z-index`, `transform`, or `overflow: hidden` on any ancestor — so no portal is needed, and none is used. |
| An inert background    | The rest of the document stops taking clicks, focus and assistive-tech navigation for as long as the dialog is open. |
| A real focus trap      | Tab and Shift-Tab cycle inside the dialog. Opening moves focus to the `autofocus` element, or the first focusable descendant, or the dialog itself when it has none; closing returns it to whatever was focused before. |
| Escape                 | The browser raises a `cancel` event, which the component turns into your `onClose`. |

And the things the element does **not** give you, which you have to decide about: an accessible
name, a close button, dismissal by clicking the scrim, an exit animation, and — despite the
inertness — body-scroll locking. The middle two are what `DialogHeader`'s `onClose` and
`lightDismiss` answer, and both are opt-in rather than assumed. The name is yours in every
case; body-scroll locking is solved separately, see [Theme tokens](#theme-tokens); and the exit
animation is not solved at all here — [Drawer](drawer.md) is the component that has one.

## Closing it

There is exactly one rule: **every close path has to run through your `open` state.** An
effect watching `open` calls `showModal()` when it flips to `true` and `close()` when it
flips to `false`, and both calls are guarded by the element's own `dialog.open`, so a
re-render never calls `showModal()` on an already-open dialog (which throws
`InvalidStateError`).

Escape is wired to respect that rule rather than bypass it. The `cancel` listener calls
`preventDefault()` **first**, so the browser's own close is cancelled and the element stays
open; then it calls `onClose()`, and the dialog actually shuts on the next render when `open`
becomes `false`. The payoff is that the usual failure of this component shape — the user hits
Escape, the DOM closes, your `open` is still `true`, and re-opening does nothing — cannot
happen here.

The other native close paths are covered too. Submitting a `<form method="dialog">`, clicking
a `<button formmethod="dialog">`, or calling `close()` on a ref all close the element directly
and fire `close`, not `cancel` — and the component listens for that as well: a `close` that
arrives while your `open` is still `true` is mirrored into `onClose`, so your state follows
the element. Driving the form from your own submit handler is still the shape to prefer when
you want the data before anything closes:

<!-- example:WithForm -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Rename project
</Button>
<Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="rename-title">
  <h2 id="rename-title">Rename project</h2>
  <form
    onSubmit={(event) => {
      event.preventDefault();
      setOpen(false);
    }}
  >
    <Field>
      <Label htmlFor="project-name">Project name</Label>
      <Input id="project-name" name="name" defaultValue="Acme Marketing" />
    </Field>
    <FormActions>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button type="submit">Save changes</Button>
    </FormActions>
  </form>
</Dialog>
```
<!-- /example -->

## Dismissing by clicking outside

Native modal dialogs do not light-dismiss and the component sets no `closedby` attribute, so
`lightDismiss` is the opt-in:

<!-- example:LightDismiss -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Keyboard shortcuts
</Button>
<Dialog open={open} onClose={() => setOpen(false)} lightDismiss aria-labelledby="shortcuts-title">
  <h2 id="shortcuts-title">Keyboard shortcuts</h2>
  <p>Press Command-K to open the command palette, or Escape to close this dialog.</p>
</Dialog>
```
<!-- /example -->

**Off is the default, and the default is the decision.** A panel that light-dismisses is a panel
a misplaced press throws away: right for something you are reading, wrong for a destructive
confirmation and wrong for anything holding a half-finished form. Only the call site knows
which it has.

What it does is narrower than "closes on a click outside", because the naive version has two
bugs the platform hands you for free:

- **It is geometry, not containment.** A press on the scrim is dispatched at the `<dialog>`
  element itself, so `event.target === event.currentTarget` is true for the scrim *and* for the
  panel's own `p-r2` padding — and `useClickOutside` is blind here for the same reason,
  reporting "inside" for every press it sees, including the ones on the scrim. The tell is
  whether the pointer landed beyond the panel's border box.
- **Both ends of the press must land outside.** Keyed on the release alone, selecting text in
  the panel and dragging past its edge dismisses it and throws away what you were editing: the
  click resolves to the dialog and its coordinates read "outside". A pointer-only manual pass
  never finds that one.

Both live in `useLightDismiss`, which is exported — the same hook
[CommandPalette](command-palette.md) uses, and the one to reach for if you build your own
top-layer panel.

**`onClick` and `onPointerDown` behave unlike every other prop here.** The component needs both,
so they are composed rather than spread: yours runs first, then the component's. That means
passing one cannot silently delete light dismiss — and calling `preventDefault()` in yours is
the per-event opt-out.

## The parts

Two optional children, for the panel that is longer than the screen it opens on. Neither is
required — a short dialog puts its children straight inside, as every example above does.

| Part           | Prop         | Type         | Default   |
| -------------- | ------------ | ------------ | --------- |
| `DialogHeader` | `onClose`    | `() => void` | —         |
|                | `closeLabel` | `string`     | `"Close"` |
|                | …rest        | `div` props  | —         |
| `DialogBody`   | …rest        | `div` props  | —         |

`DialogHeader` renders a close control at the end of its row when you pass `onClose`, and no
control at all when you don't — a panel that has to be read to the end is entitled to withhold
one. It is first in the DOM on purpose: `showModal()` puts focus on the first focusable
descendant, so a dismissal at the *end* of the content is also what decides where a scrolling
panel opens.

`DialogBody` is the only part that scrolls. It carries no padding — the panel's `p-r2` is
already the gutter — and it is a containing block, because the library's visually-hidden text
is `position: absolute` with no offsets and would otherwise escape the clip and stretch the
page. See [Long content](#long-content).

## Sizing

The panel is `w-full` capped at `max-w-[40rem]`, centred with `m-auto`. `className` goes
through `tailwind-merge`, so a single width utility replaces the default rather than
fighting it:

<!-- example:CustomWidth -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Export report
</Button>
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  className="max-w-[24rem]"
  aria-labelledby="export-title"
>
  <h2 id="export-title">Export Q3 revenue</h2>
  <p>A CSV lands in your inbox as soon as the export finishes.</p>
  <FormActions>
    <Button type="button" onClick={() => setOpen(false)}>
      Start export
    </Button>
  </FormActions>
</Dialog>
```
<!-- /example -->

The 40rem cap also overrides the max-width a browser's UA stylesheet puts on `dialog:modal`,
which is where a native modal's viewport gutter comes from. Below 40rem the panel therefore
spans the viewport edge to edge with no margin. If you want a gutter back on small screens,
override the **width** and leave the cap alone — `className="w-[calc(100%-2rem)]"` merges
over `w-full` and keeps `max-w-[40rem]`.

## Long content

Dialog sets no `max-height` of its own — but the browser does: the UA rule
`dialog:modal { max-height: calc(100% - 6px - 2em) }` caps the panel just short of the
viewport, and the UA's `overflow: auto` then scrolls the **whole panel**, padding and heading
included. (That cap is exactly what `Drawer.css` re-declares to get a full-height sheet.)
Scrolling the whole panel is rarely what you want: the title that says what is being read
leaves the screen, and so does every control that dismisses it — which on a phone is the
difference between a dismissal you can reach and one you have to go and find.

The panel is a **column** while it is open, so `DialogBody` is the one part that gives and the
header and the actions hold their places either side of it:

<!-- example:ScrollingBody -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Review terms
</Button>
<Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="terms-title">
  <DialogHeader onClose={() => setOpen(false)}>
    <h2 id="terms-title">Terms of service</h2>
  </DialogHeader>
  <DialogBody>
    <p>Acme Marketing processes your deploy logs to render the activity feed.</p>
    <p>Logs are retained for 90 days, then deleted from primary and backup storage.</p>
  </DialogBody>
  <FormActions>
    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
      Decline
    </Button>
    <Button type="button" onClick={() => setOpen(false)}>
      Accept terms
    </Button>
  </FormActions>
</Dialog>
```
<!-- /example -->

Rolling your own instead of using the parts is fine, but keep the scroll region on a **child**
and give it `min-h-0` — a flex item's floor is its own content, so without that the region
grows to fit and pushes the panel past the viewport rather than scrolling inside it. What you
must not do is reach for the panel: a `display` utility on the Dialog itself unhides it while
closed — see [Gotchas](#gotchas). That is the trap the column exists to spare you, which is why
it is declared as `open:flex`, qualified so it cannot apply to a closed panel.

## Theme tokens

Dialog has no CSS file: everything it paints is a Tailwind utility in the `.tsx`. Six of them
do the painting, and five resolve to a contract variable a theme can override:

| Where          | Utility        | Override        |
| -------------- | -------------- | --------------- |
| Panel surface  | `bg-surface-0` | `--C-SURFACE-0` |
| Corners        | `rounded-lg`   | `--RADIUS-LG`   |
| Elevation      | `shadow-lg`    | `--SHADOW-LG`   |
| Panel padding  | `p-r2`         | `--R-SIZE-2`    |
| Backdrop scrim | `backdrop:bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]` | `--OVERLAY-SCRIM-COLOR` |

`p-r2` is on the responsive `r`-scale — 1.25rem below the 40rem breakpoint, 2rem above it —
so the panel's padding grows with the viewport without a breakpoint utility from you.

**The scrim follows the theme.** It is the same contract token [Drawer](drawer.md) and
[CommandPalette](command-palette.md) read in their stylesheets, with the same 50% black
fallback, which only applies when `@batthewz/response-ui-css` isn't loaded at all. Override
`--OVERLAY-SCRIM-COLOR` and all three scrims re-tint together.

**Motion** is `animate-fade-in`, which resolves through `--animate-fade-in` to
`--MOTION-DURATION-ENTER` and `--MOTION-EASE-ENTER`, so retiming every enter animation in the
library retimes this one. It is enter-only: nothing transitions on the way out, so `close()`
takes the panel and its scrim off the screen instantly. ([Drawer](drawer.md) gets a real exit by
transitioning `overlay` and `display` with `transition-behavior: allow-discrete`; Dialog's
one-shot animation utility cannot.) A `motion-reduce:animate-none` sibling suppresses it for
users who ask for less motion — see [Accessibility](#accessibility).

**Off the contract:** the geometry — a hard `40rem` cap, plus the `w-full` and `m-auto` that
centre it — resolves to no contract variable, so the panel's proportions are not themeable;
override them per call site with `className`. Body-scroll locking is not a token either — it
is the `no-body-scroll` class, which
does nothing on its own; the rule `body:has(dialog[open].no-body-scroll) { overflow: hidden }`
lives in `@batthewz/response-ui-css`'s base layer. `showModal()` alone does **not** lock body
scroll, so if you have not imported that package's CSS, the page scrolls behind the modal.

## Gotchas

- **Nothing closes it but your own state.** `open` is required and there is no internal
  fallback. Every route out — Escape, `lightDismiss`, the control `DialogHeader` renders — calls
  your `onClose` and nothing else, so an `onClose` that logs without flipping the boolean leaves
  all three looking broken at once.
- **`<form method="dialog">` cannot desync it.** That form, `formmethod="dialog"`, and
  `ref.current.close()` all close the element natively and fire `close` — which the component
  listens for, calling `onClose` whenever the element closes while your `open` is still
  `true`. Ignore that callback, though, and the element still ends up closed with `open`
  `true`; the sync effect only reacts to a *change* in `open`, so the dialog then stays shut
  until you toggle the boolean off and on again.
- **You can't subscribe to the DOM `close` event through the props.** The custom `onClose`
  occupies the name of the native `dialog` React handler and is destructured out rather than
  spread, so a `close` listener of your own never reaches the element through props.
  `onCancel` *is* spread and does fire, but it can't opt out of the interception — the
  internal listener calls `preventDefault()` unconditionally. Use the `ref` and
  `addEventListener` if you need the real `close`.
- **A `display` utility unhides it.** Browsers hide a closed dialog with a UA-stylesheet rule,
  `dialog:not([open]) { display: none }`. Author declarations beat the UA origin no matter how
  low their specificity, so `className="flex"`, `"grid"` or `"block"` makes the dialog render
  its children inline on the page while closed — in flow, with no backdrop and no top layer,
  over whatever it lands on. Put layout classes on a wrapper inside it, or qualify them with
  the `open:` variant, which is how the component's own column is declared. The corollary: a
  bare `display` utility no longer overrides that column either, since `open:flex` outranks it
  while the panel is open. Reach for `open:grid` and the like instead.
- **The children are always mounted.** The `<dialog>` and everything in it render on every
  pass, open or closed — the browser just hides them. So a closed dialog's contents are in the
  DOM and in the server-rendered HTML, and any expensive subtree inside it mounts and fetches
  up front. Gate the children on `open` yourself if either matters.
- **Light dismiss is opt-in, and no `closedby` is set.** Clicking the scrim does nothing until
  you pass `lightDismiss`; the component sets no `closedby` attribute, so nothing depends on
  that attribute's browser support either — see
  [Dismissing by clicking outside](#dismissing-by-clicking-outside).
- **Edge-to-edge under 40rem.** `w-full` plus the `max-w-[40rem]` override leaves no viewport
  gutter on a phone. See [Sizing](#sizing).
- **The scroll lock can shift the page.** It works by putting `overflow: hidden` on `<body>`,
  which removes the scrollbar; on platforms drawing classic space-taking scrollbars, the page
  behind the scrim jumps by the scrollbar's width as the dialog opens. It also depends on
  `:has()`, so it silently does nothing in a browser without it.
- **It's a client component.** The file carries `"use client"`, so importing Dialog opts its
  module into the client bundle. It server-renders as a closed `<dialog>` with its children
  inside; the open call only happens in an effect, so a Dialog mounted with `open` already
  `true` appears one paint after hydration.

## Accessibility

A `<dialog>` opened with `showModal()` is modal to assistive technology, not merely painted
over the page: the rest of the document is genuinely inert, so the component sets no
`aria-modal` and needs none. Focus enters the panel on open and returns to the trigger on
close, and Tab is trapped in between — all native.

- **It has no accessible name.** Nothing is generated from your children, so an unlabelled
  dialog announces as just "dialog". Give the panel `aria-labelledby` pointing at its heading,
  as every example here does, or an `aria-label`. Pair it with `aria-describedby` when the
  body copy is the part that must be read out — a destructive confirmation, most obviously.
- **The scrim needs no `aria-hidden`.** It is `::backdrop`, a pseudo-element, so it never
  enters the accessibility tree. A hand-built scrim `<div>` — the kind [Portal](portal.md)
  documents — does need marking; this one does not.
- **Escape is the only dismissal that is always there**, and it is keyboard-only. `lightDismiss`
  is pointer-only, so it is not a substitute either: a panel wired with nothing else is
  undismissable by a touch user who cannot find the scrim, and by a screen-reader user who has
  no pointer at all. Render a visible close or cancel control — `DialogHeader`'s `onClose` is
  the shortest route to one, and it is named, focusable and first in the tab order.
- **The fade respects `prefers-reduced-motion`.** The reduced-motion block in
  `response-ui-css` guards the `.fade-in` *class*, not the Tailwind utility Dialog uses — so
  the component carries its own `motion-reduce:animate-none`, and the panel appears without
  the fade for a user who asked for less motion.
- **Heading levels are yours.** The panel imposes no structure, so pick a level that makes
  sense standing alone rather than continuing the page's outline underneath it.

## Related

[Drawer](drawer.md) · [Portal](portal.md) · [Popover](popover.md) · [CommandPalette](command-palette.md) · `useFocusTrap` ·
`useLightDismiss` · [Button](button.md) · [FormActions](form-actions.md) · [Field](field.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
