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

| Prop        | Type                       | Default        |
| ----------- | -------------------------- | -------------- |
| `open`      | `boolean`                  | — _(required)_ |
| `onClose`   | `() => void`               | — _(required)_ |
| `className` | `string`                   | —              |
| `ref`       | `Ref<HTMLDialogElement>`   | —              |
| …rest       | `dialog` props, less `open` and the native `onClose` | — |

That is the whole API — no header slot, no size preset, no close button, no `defaultOpen`.
`open` is required, so Dialog is **always** controlled; if `onClose` does not change the
boolean you hold, nothing closes. See [Closing it](#closing-it).

**And there is no `classNames` either — deliberately.** Dialog renders exactly one element, the
`<dialog>`, and puts your `children` straight inside it. There is nothing between `className`
and your own markup for a slot to name: a `header`, `footer` or `closeButton` key would be
naming *your* structure, not the component's. The scrim is the one thing Dialog paints that
`className` cannot reach as a class, because `::backdrop` takes no class name — it is a theme
value instead, `--OVERLAY-SCRIM-COLOR`. See [Theme tokens](#theme-tokens).

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

And the things it does **not** give you, which you have to decide about: a close button, an
accessible name, dismissal by clicking the scrim, an exit animation, and — despite the
inertness — body-scroll locking. The last one is solved separately; see
[Theme tokens](#theme-tokens).

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

Native modal dialogs do not light-dismiss, and the component adds no click handler and sets
no `closedby` attribute — so Escape is the only dismissal you get for free. If you want the
scrim to close it, add it yourself. A backdrop click still targets the `<dialog>` element, so
the only reliable tell is whether the pointer landed inside the panel's box:

<!-- example:DismissOnBackdropClick -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Keyboard shortcuts
</Button>
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  aria-labelledby="shortcuts-title"
  onClick={(event) => {
    const panel = event.currentTarget.getBoundingClientRect();
    const insidePanel =
      event.clientX >= panel.left &&
      event.clientX <= panel.right &&
      event.clientY >= panel.top &&
      event.clientY <= panel.bottom;
    if (!insidePanel) setOpen(false);
  }}
>
  <h2 id="shortcuts-title">Keyboard shortcuts</h2>
  <p>Press Command-K to open the command palette, or Escape to close this dialog.</p>
</Dialog>
```
<!-- /example -->

Test the coordinates rather than `event.target === event.currentTarget`: the panel's `p-r2`
padding belongs to the dialog element too, so the simpler check also fires on a click inside
the panel that happens to land on whitespace.

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
included. (That cap is exactly what `Drawer.css` re-declares to get a full-height sheet.) Give
the middle of the panel its own scroll region so the heading and the actions stay put:

<!-- example:ScrollingBody -->
```tsx
<Button type="button" onClick={() => setOpen(true)}>
  Review terms
</Button>
<Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="terms-title">
  <h2 id="terms-title">Terms of service</h2>
  <div className="max-h-[50vh] overflow-y-auto">
    <p>Acme Marketing processes your deploy logs to render the activity feed.</p>
    <p>Logs are retained for 90 days, then deleted from primary and backup storage.</p>
  </div>
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

Keep that scroll region on a **child**. A `display` utility on the Dialog itself unhides it
while closed — see [Gotchas](#gotchas).

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
  fallback. An `onClose` that logs but doesn't flip the boolean leaves Escape looking broken,
  and there is no built-in close button to fall back on — render your own.
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
  its children inline on the page while closed. Put layout classes on a wrapper inside it.
- **The children are always mounted.** The `<dialog>` and everything in it render on every
  pass, open or closed — the browser just hides them. So a closed dialog's contents are in the
  DOM and in the server-rendered HTML, and any expensive subtree inside it mounts and fetches
  up front. Gate the children on `open` yourself if either matters.
- **No light dismiss and no `closedby`.** Clicking the scrim does nothing until you wire it —
  see [Dismissing by clicking outside](#dismissing-by-clicking-outside).
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
- **Escape is the only built-in dismissal**, and it is keyboard-only. Always render a visible
  close or cancel control for pointer and touch users; the component provides none.
- **The fade respects `prefers-reduced-motion`.** The reduced-motion block in
  `response-ui-css` guards the `.fade-in` *class*, not the Tailwind utility Dialog uses — so
  the component carries its own `motion-reduce:animate-none`, and the panel appears without
  the fade for a user who asked for less motion.
- **Heading levels are yours.** The panel imposes no structure, so pick a level that makes
  sense standing alone rather than continuing the page's outline underneath it.

## Related

[Drawer](drawer.md) · [Portal](portal.md) · [Popover](popover.md) · [CommandPalette](command-palette.md) · `useFocusTrap` ·
[Button](button.md) · [FormActions](form-actions.md) · [Field](field.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
