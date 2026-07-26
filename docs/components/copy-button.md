# CopyButton

Copy-to-clipboard in a single prop: hand it a string and it writes it, swaps its icon to a
check, renames itself, and resets a couple of seconds later. It is icon-only, and the
browser API it stands on is not available everywhere — plan for both.

<!-- example:Minimal -->
```tsx
<CopyButton value="bun add @batthewz/response-ui-react-components" />
```
<!-- /example -->

| Prop          | Type                                                 | Default      |
| ------------- | ---------------------------------------------------- | ------------ |
| `value`       | `string` — the text written to the clipboard         | — (required) |
| `timeout`     | `number` — milliseconds the confirmation holds       | `2000`       |
| `copiedLabel` | `string` — the confirmation wording                  | `"Copied"`   |
| `onCopyError` | `(error: Error) => void` — clipboard missing, or the write rejected | —   |
| `className`   | `string` — merged into IconButton's own classes      | —            |
| `ref`         | `Ref<HTMLButtonElement>`                             | —            |
| …rest         | every `<button>` prop except `value` and `children`  | —            |

It renders [IconButton](icon-button.md) and adds no box of its own, so the hit area, focus
ring, hover and press surfaces, and `className` merge are all that component's. Its glyphs
are 16px, which makes the target exactly the 32px/40px IconButton documents. Three
attributes are set on the way through — `type="button"`, an `aria-label` it maintains, and
`data-copied`. `type` and `aria-label` are written *before* your rest props, so you can
override either. `data-copied` is written *after*, because it reports whether the clipboard
write actually succeeded and a caller-set value would lie about it. See [Gotchas](#gotchas).

## What a click actually does

In order:

1. Your `onClick` runs, synchronously, with the click event.
2. `navigator.clipboard?.writeText` is tested. **If it is absent the handler calls
   `onCopyError` and returns** — no copy, no confirmation.
3. `await navigator.clipboard.writeText(value)`. If it rejects, `onCopyError` gets the
   rejection and nothing else changes.
4. Only on a resolved write does `copied` flip true and a `setTimeout` get armed to flip it
   back after `timeout`.

`setCopied(true)` sits *after* the `await`, so **a failed copy never paints the
confirmation.** Nothing is drawn on failure either: `onCopyError` is the only channel, so
supply it if a failure has to reach the user — with one edge case, in [Gotchas](#gotchas).

## Beside the value it copies

<!-- example:BesideTheValue -->
```tsx
<div className="flex items-center gap-r6">
  <code className="text-body-3">{remoteUrl}</code>
  <CopyButton value={remoteUrl} />
</div>
```
<!-- /example -->

Nothing in the button says what it copies, so whatever sits next to it is doing that job.
Keeping the value visible and selectable is also the only fallback a user has when the
write can't happen at all.

## When there is no clipboard

`navigator.clipboard` is exposed **only in a secure context** — `https:`, or `localhost`
during development. Ship the same build to a plain `http:` origin (a LAN address, an
intranet box, a staging host without a certificate) and the property is `undefined`, the
guard in step 2 fires, and every click is a no-op with the button still reading "Copy".
The API can also be present and still fail: `writeText` rejects when the document lacks
transient user activation or focus, in a cross-origin iframe whose permissions policy
withholds `clipboard-write`, and in an embedded webview that exposes `writeText` and then
rejects it. Those are the paths that end in the `catch`, which hands the rejection to
`onCopyError`. A webview that ships no `writeText` at all lands somewhere else entirely: the
guard in step 2 fires and the handler calls `onCopyError` — with a synthetic "Clipboard API
unavailable" error, since there is no promise to reject — before returning.

Every failing path therefore reaches `onCopyError`; what CopyButton still has no callback
for is **success** — and `onClick` cannot stand in for one, because it has already fired by
then and it fires on the failing paths too. Mind the near-miss: `onCopy`
*does* compile. `ComponentPropsWithRef<"button">` carries React's DOM `copy` handler and rest
props pass straight through, so it reaches the real `<button>` as a live listener — for the
event the browser fires when a *user* copies a selection. A programmatic `writeText` does not
raise it, so a copy that succeeds calls your `onCopy` zero times. Rendering a fallback when
the copy didn't land is what `onCopyError` is for; if your product has to *know* that it
did land — analytics, a confirmation of your own — call the clipboard yourself and use
[IconButton](icon-button.md) for the shell.

Two things follow. Exercise the copy on the origin you actually ship rather than only on
`localhost`, where the API is always *exposed* — which, per the paragraph above, is not the
same as a write that lands. And keep the value on screen, as above.

## The confirmation window

<!-- example:CustomConfirmation -->
```tsx
<CopyButton value={secretKey} copiedLabel="API key copied" timeout={5000} />
```
<!-- /example -->

While `copied` is true the button draws a check instead of the copy glyph, carries
`data-copied="true"`, names itself with `copiedLabel`, and fills a visually hidden live
region with the same string.

- **Re-clicking extends the window rather than cutting it short.** Every successful copy
  clears the pending timer before arming a new one, so a second click buys a full fresh
  `timeout` from that click.
- **Unmounting is clean, in flight or not.** A mount-scoped effect clears any pending timer,
  and the handler checks that it is still mounted after the `await` — so a button unmounted
  while the write is in flight neither writes state nor arms a timer.
- **`timeout` is read at click time.** Changing the prop while the confirmation is on screen
  does not retime the window already in flight.
- **Nothing but the timer clears `copied`.** Changing `value` mid-window leaves the
  confirmation up, now vouching for a string that is no longer the one on offer.

## Styling the copied state

<!-- example:TintedConfirmation -->
```tsx
<CopyButton value={inviteLink} className="data-copied:text-status-success" />
```
<!-- /example -->

`data-copied` is the only hook the component exposes for the confirmed state. It is set to
`copied || undefined`, so at rest the attribute is *absent* rather than `"false"` — both a
plain `[data-copied]` selector and Tailwind's `data-copied:` variant work as presence tests.
Out of the box the confirmation is not tinted; the check inherits exactly the ink the copy
glyph had. If you want it to read as success rather than as a change of shape, add that at
the call site — `data-copied:text-status-success` resolves to `--C-STATUS-SUCCESS` and so
still follows the theme.

## Naming it

<!-- example:DistinctNames -->
```tsx
<CopyButton value={publishableKey} aria-label="Copy publishable key" />
<CopyButton value={secretKey} aria-label="Copy secret key" />
```
<!-- /example -->

Several copy buttons on one page present a screen-reader user with a list of identically
named "Copy" buttons. Passing your own `aria-label` fixes that and, because `{...props}` is
spread after the internal one, yours wins on every render — including while `copied` is
true, so the name stops flipping to `copiedLabel`.

Understand what that costs. The confirmation rides two channels, and fixing the name closes
the first of them. The second — the hidden live region — survives: it is a sibling of the
button, not a descendant, so neither the button's `role` nor your `aria-label` suppresses it.
See [Accessibility](#accessibility).

`aria-labelledby` passes through as well, and it outranks `aria-label` in the accessible-name
computation — so it freezes the name just as firmly while leaving the internal `aria-label`
set to a string nobody will hear.

## Reacting to the click

<!-- example:TrackedClick -->
```tsx
<CopyButton value={inviteLink} onClick={trackCopyClick} />
```
<!-- /example -->

`onClick` is destructured out and invoked as the handler's first statement, before the
clipboard is even checked. Its return value is discarded, so an `async` handler of yours
neither delays nor blocks the write — which is the right call, since an `await` in front of
`writeText` can outlive the click's transient user activation, which the write depends on.
What `onClick`
cannot do is confirm anything: it fires identically whether the copy succeeds, rejects, or
is never attempted.

## Theme tokens

CopyButton has no CSS file and writes exactly one class of its own — `sr-only`, on the live
region — which is pure geometry and reads no theme variable. Every visible pixel belongs to
[IconButton](icon-button.md#theme-tokens); override the variables listed there and the copy
button retints with every other icon button in the app, at runtime, with no rebuild.

| Where            | Comes from                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| The button box   | [IconButton](icon-button.md#theme-tokens) — ink, hover and press surfaces, focus ring, radius, padding, transition |
| The glyphs       | `lucide-react` `Copy` / `Check`, hard-coded at 16px, drawn in `currentColor` |
| The copied state | No tint of its own — hang it off `data-copied` yourself                      |
| The live region  | `sr-only` — visually hidden geometry, no token                               |

The 16px glyph size is the one geometry value CopyButton fixes, and it is what turns
IconButton's padding into the 32px/40px target. Because the glyph is `currentColor`, a single
`text-*` utility on `className` retints icon and button together.

## Gotchas

- **It is a client component.** `"use client"` is the first line, and it has to be: `useState`
  for the confirmation, `useRef` for the timer, `useEffect` for the teardown, and a DOM click
  handler reaching for `navigator`. Import it into an RSC tree and it becomes a client
  boundary — it cannot render on the server, and it ships to the browser whether or not
  anyone clicks it.
- **`value` is not the native `<button value>`.** The prop type omits the HTML attribute and
  reuses the name for the copy payload, so a CopyButton can never carry a form value.
- **`children` is omitted too.** You cannot change the glyphs, their size, or add a visible
  label. If you need any of that, build it on [IconButton](icon-button.md).
- **Your rest props overwrite `type` and `aria-label`, but not the state hook.** Both are
  written before `{...props}`: `type="button"` is the default and the correct one, but
  `type="submit"` compiles and will submit an enclosing form; `aria-label` is covered under
  [Naming it](#naming-it) and [Accessibility](#accessibility). `data-copied` is no longer
  overridable — it is derived from whether the copy succeeded, so a caller-set value would
  make the styling hook disagree with reality.
- **`copiedLabel=""` silently keeps the name as `"Copy"`.** An empty confirmation wording no
  longer blanks the accessible name for the window; the button keeps its own name and the live
  region stays empty, so the confirmation simply is not announced.
- **A failed copy can hide behind an earlier success.** Copy once, then click again inside
  the confirmation window and have that second write reject: `onCopyError` fires, but `copied`
  is already true with its timer still running, so the button goes on showing the confirmation.
  It is the one case where the UI implies a copy that did not happen — and it is worse if
  `value` changed between the two clicks.
- **No tooltip.** Icon-only, and it sets no `title`, so a mouse user gets no hover hint. `title`
  passes through if you want one.

## Accessibility

CopyButton supplies an accessible name by default — it hands [IconButton](icon-button.md) an
`aria-label` of `"Copy"`, or `copiedLabel` while confirming, and marks both glyphs
`aria-hidden="true"` so the icon never doubles up on it.

It is a default, not a guarantee. `{...props}` is spread last, so your `aria-label` overrides
it, and `aria-label=""` leaves the button nameless — the same hole
[IconButton documents](icon-button.md#gotchas). `aria-label={undefined}` compiles too and is
the quieter version: it removes the attribute outright, and with both glyphs `aria-hidden` and
the live region empty at rest, there is nothing left for the name to be computed from.
`copiedLabel=""` no longer blanks the name — the button falls back to its own `"Copy"`.

The confirmation is pushed on two channels:

- **The name changes.** `aria-label` flips from `"Copy"` to `copiedLabel`. Screen readers
  differ on whether they re-announce the name of an element that already has focus, which is
  exactly the element the user is on after clicking.
- **A polite live region.** An `sr-only` `<span role="status" aria-live="polite">` is rendered
  from the first paint holding an empty string and filled with `copiedLabel` on success. That
  order is right — a live region injected at the same moment as its content is frequently
  missed. It is a **sibling** of the `<button>`, not a descendant, so neither the button's
  presentational-children rule nor its `aria-label` suppresses it. CopyButton therefore renders
  a fragment: a button and a span, not a single element.

- **Nothing is announced on failure.** The icon is the only thing that moves, and it does not.
  `onCopyError` is the hook for your own announcement — drive a [Toast](toast.md) or your own
  live region from it.
- **Focus, target size, and `disabled` behave exactly as on
  [IconButton](icon-button.md#accessibility)** — CopyButton changes none of them, down to the
  `focus-visible:` ring drawn flush against the button at `ring-offset-0`.

## Related

[IconButton](icon-button.md) · [Button](button.md) · [CodeBlock](code-block.md) · [Toast](toast.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
