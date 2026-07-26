# Toast

A transient status message that slides into the bottom-right corner, stacks with its
siblings, and removes itself after five seconds. You fire it imperatively from any handler,
so a save deep in the tree can report success without threading state back up to a banner.

**Read [Server rendering](#server-rendering) before you mount it in a server-rendered app.**
The stack renders through [Portal](portal.md), which emits nothing on the server, so the
client's first pass portals into HTML that isn't there — a hydration mismatch that costs you
the page's server HTML.

<!-- example:Minimal -->
```tsx
<Button onClick={() => toast("Deployment finished", { variant: "success" })}>
  Deploy to production
</Button>
```
<!-- /example -->

`toast` comes from `const { toast } = useToast()` just above that JSX, and `useToast()` throws
unless a `ToastProvider` is somewhere above this component — so mount one first, per
[Mount the provider once](#mount-the-provider-once).

## The public surface

Three exports, and they are the whole API.

`useToast()` returns three functions. It throws
`"useToast must be used within a ToastProvider"` when there is no provider above it.

| Function                       | Returns  | Does                                                       |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `toast(message, options?)`     | `string` | Queues a toast and hands back its id                       |
| `dismiss(id)`                  | `void`   | Starts the exit animation for one toast                    |
| `dismissAll()`                 | `void`   | Starts the exit animation for every toast on screen        |

`message` is a `string`, not a `ReactNode` — the provider renders it as text. The options:

| Option     | Type                                          | Default  |
| ---------- | --------------------------------------------- | -------- |
| `variant`  | `"success" \| "warning" \| "error" \| "info"` | `"info"` |
| `title`    | `string`                                      | —        |
| `statusLabel` | `string` — visually-hidden severity word    | the word for `variant` |
| `statusIcon` | `ReactNode` — decorative severity glyph     | the glyph for `variant` |
| `dismissLabel` | `string` — accessible name of the dismiss button | `"Dismiss"` |
| `duration` | `number` (ms; `0` disables auto-dismiss)      | `5000`   |

`ToastProvider` takes **`children` and nothing else**. Corner, stack limit, gap, width, and
the default duration are all fixed in the source; there is no prop, no context override, and
no `className` to reach them.

`Toast` itself is exported too, for when you want the surface without the queue — see
[Rendering a Toast yourself](#rendering-a-toast-yourself).

## Mount the provider once

Put it above everything that fires a toast. The stack itself is portalled to
`document.body`, so the provider's position in your tree affects nothing visual — only which
components can call `useToast()`.

<!-- example:MountTheProvider -->
```tsx
<ToastProvider>
  <Dashboard />
</ToastProvider>
```
<!-- /example -->

## Server rendering

`ToastProvider` renders its stack through [Portal](portal.md), which returns `null` while
`document` is undefined. Server-rendering the provider therefore emits your children and
nothing else — `renderToStaticMarkup(<ToastProvider><p>app tree</p></ToastProvider>)` is
exactly `<p>app tree</p>`, verified. The `"use client"` directive at the top of the module is
not what does that: it marks the module client-*capable*, and the server still renders it to
produce the initial HTML.

That guard is load-bearing. React's own server renderer refuses portals ("Portals are not
currently supported by the server renderer"), but only once a portal is actually created — so
returning `null` before `createPortal` is what keeps the server pass from throwing.

What it leaves behind is the hydration mismatch [Portal](portal.md#gotchas) documents. The
server emits nothing where the stack goes, `document` *is* defined on the client's first pass,
and React discards the whole hydration root rather than reconcile the difference. The provider
portals the stack unconditionally — toasts or none — so an empty stack does not spare you
either.

Two ways to avoid that, and both amount to keeping the provider off the server pass:

- Import it with `next/dynamic` and `ssr: false`, so the module is only ever evaluated in the
  browser.
- Mount it below a boundary that never server-renders — inside a component whose subtree is
  gated on a `mounted` flag you set in an effect. That renders `null` on both passes and only
  then portals.

Both cost you the server HTML for everything *inside* the provider, which the provider would
otherwise have rendered fine. So wrap it around the part of the tree that calls `useToast()`
rather than the root layout — or accept the mismatch on a page whose first paint you don't
need.

## Variants

`variant` picks the tint, the leading glyph **and** the announcement: `error` renders
`role="alert"` with `aria-live="assertive"`; `success`, `warning`, and `info` render
`role="status"` with `aria-live="polite"`. The glyphs are `CircleCheck`, `TriangleAlert`,
`CircleX` and `Info` from `lucide-react`, the peer dependency the package already requires,
and they are what makes the four cards tell apart in greyscale. Nothing else differs —
padding, radius, width, and layout are identical across all four.

<!-- example:Variants -->
```tsx
<div className="flex flex-wrap gap-r5">
  <Button onClick={() => toast("Invoice #4021 was sent.", { variant: "success" })}>
    Send invoice
  </Button>
  <Button onClick={() => toast("A new dashboard layout is available.")}>
    Show what's new
  </Button>
  <Button onClick={() => toast("Your API key expires in 7 days.", { variant: "warning" })}>
    Check API key
  </Button>
  <Button onClick={() => toast("We couldn't reach the payment provider.", { variant: "error" })}>
    Retry payment
  </Button>
</div>
```
<!-- /example -->

Neither role names the variant, so what a screen-reader user actually hears is your message
text and nothing else; see [Accessibility](#accessibility).

## Titles

`title` renders as a bold line above the message. It is the component's own prop, not the
HTML `title` attribute — `ToastProps` omits the native one, so there is no tooltip.

<!-- example:WithTitle -->
```tsx
<Button
  onClick={() =>
    toast("Remove files or upgrade your plan.", {
      variant: "warning",
      title: "Storage almost full",
    })
  }
>
  Check storage
</Button>
```
<!-- /example -->

## Timing, stacking, and dismissal

A toast lives for `duration` milliseconds (5000 by default), then animates out and is removed
from the DOM 300 ms later. Pass `duration: 0` — or any non-positive number — and no timer is
scheduled at all, so the toast stays until you dismiss it:

<!-- example:Persistent -->
```tsx
<Button onClick={() => toast("Syncing 1,204 records.", { duration: 0 })}>Start sync</Button>
```
<!-- /example -->

`toast()` returns the id you need for that. `dismiss(id)` clears the pending auto-dismiss
timer and starts the exit; `dismissAll()` does the same for everything on screen.

<!-- example:DismissingEarly -->
```tsx
<div className="flex flex-wrap gap-r5">
  <Button onClick={() => setUploadId(toast("Uploading report.csv…", { duration: 0 }))}>
    Start upload
  </Button>
  <Button
    variant="secondary"
    onClick={() => {
      if (uploadId) dismiss(uploadId);
      setUploadId(null);
    }}
  >
    Upload finished
  </Button>
  <Button variant="ghost" onClick={dismissAll}>
    Clear notifications
  </Button>
</div>
```
<!-- /example -->

Five things about the queue are worth knowing, because none of them are configurable:

- **Newest first.** A new toast is prepended, and the column is anchored to the bottom of the
  viewport, so it appears above the existing ones and nothing already on screen moves.
- **The limit is five.** A sixth toast pushes the oldest into its exit animation — so six are
  briefly on screen together, settling back to five after 300 ms.
- **Hovering does not pause anything.** There is no pointer or focus handling; the timer runs
  to completion whether or not the user is reading it, or has the dismiss button focused.
- **The stack does not block the page.** The portal container is `pointer-events-none` and
  each toast re-enables `pointer-events-auto`, so clicks land on your UI everywhere except on
  a toast itself.
- **Timers are cleaned up on unmount, mostly.** The provider clears every timer it tracks in a
  `useEffect` cleanup, but two are never tracked: the sweep `dismissAll()` schedules, and the
  eviction of the oldest toast when the sixth arrives. See [Gotchas](#gotchas).

## Rendering a Toast yourself

`Toast` is a plain `div` — no context, no portal, no timers. Reach for it when you need the
surface somewhere the provider doesn't put it (an inline slot, a fixture, your own queue).
You own placement, the exit animation flag, and removal.

| Prop         | Type                                                 | Default  |
| ------------ | ---------------------------------------------------- | -------- |
| `onDismiss`  | `() => void` — **required**                          | —        |
| `variant`    | `"success" \| "warning" \| "error" \| "info"`        | `"info"` |
| `title`      | `string`                                             | —        |
| `statusLabel` | `string` — visually-hidden severity word            | the word for `variant` |
| `statusIcon` | `ReactNode` — decorative severity glyph              | the glyph for `variant` |
| `dismissLabel` | `string` — accessible name of the dismiss button   | `"Dismiss"` |
| `dismissing` | `boolean` — swaps the slide-in animation for slide-out | `false`  |
| `className`  | `string`                                             | —        |
| `ref`        | `Ref<HTMLDivElement>`                                | —        |
| …rest        | props of `div`, minus `title`                        | —        |

<!-- example:Standalone -->
```tsx
<Toast variant="warning" title="Storage almost full" onDismiss={dismissStorageWarning}>
  You're using 9.4 GB of your 10 GB quota.
</Toast>
```
<!-- /example -->

`dismissing` only swaps the animation class — it does not schedule anything. Removing the
element after the exit finishes is your job, and the provider's own 300 ms is the number to
match if you want it to look the same.

## Toast or Alert?

The two are not interchangeable, and the difference is not styling.

|                | Toast                                          | [Alert](alert.md)                          |
| -------------- | ---------------------------------------------- | ------------------------------------------- |
| Where it lives | Fixed corner, portalled out of your layout     | In the flow, next to what it's about        |
| How long       | 5 s, then gone                                 | Until you unmount it                        |
| How it's fired | Imperatively, from a handler                   | Declaratively, from state                   |
| Interrupts?    | Yes — it appears over the page                 | No — the page reflows around it             |

Reach for a toast when the message confirms something the user just did and losing it costs
nothing: "Invoice sent", "Copied", "Deployment finished". Reach for an [Alert](alert.md) when
the message explains a region of the page, must survive a glance away, or has to be re-read
while the user acts on it — a validation summary, a quota warning, a failed payment with a
retry. Anything the user *must not miss* belongs in neither: five seconds with no pause on
hover is not a delivery guarantee.

## Theme tokens

Toast hard-codes no colour, radius, spacing, or type. Every utility below resolves to a
contract variable — override the `--C-STATUS-*` pair for a variant and every toast of that
variant re-tints at runtime, with no rebuild.

| Where           | Utility                                                                 | Override                                     |
| --------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| Info variant    | `bg-status-info-bg` `text-status-info` `border-status-info/20`           | `--C-STATUS-INFO` `--C-STATUS-INFO-BG`       |
| Success variant | `bg-status-success-bg` `text-status-success` `border-status-success/20` | `--C-STATUS-SUCCESS` `--C-STATUS-SUCCESS-BG` |
| Warning variant | `bg-status-warning-bg` `text-status-warning` `border-status-warning/20` | `--C-STATUS-WARNING` `--C-STATUS-WARNING-BG` |
| Error variant   | `bg-status-error-bg` `text-status-error` `border-status-error/20`       | `--C-STATUS-ERROR` `--C-STATUS-ERROR-BG`     |
| Elevation       | `shadow-lg`                                                             | `--SHADOW-LG`                                |
| Corner radius   | `rounded-md`                                                            | `--RADIUS-MD`                                |
| Padding         | `p-r4`                                                                  | `--R-SIZE-4`                                 |
| Text/button gap | `gap-r5`                                                                | `--R-SIZE-5`                                 |
| Dismiss inset   | `-mr-r6` `-mt-r6`                                                       | `--R-SIZE-6`                                 |
| Type scale      | `text-body-2`                                                           | `--BodyText-2`                               |
| Title weight    | `font-semibold`                                                         | `--Semibold-Weight`                          |

Like [Alert](alert.md), the border is the variant's own foreground token at `/20` alpha, so it
tracks the text colour and there is no separate border variable to tune. The tinted
background is what the [contrast pairing](../theme-contract.md#the-contrast-pairing) puts
that foreground on, so the defaults are built to stay legible across the shipped themes.

**The width is a literal.** `w-80` — a fixed `20rem` — is not on the contract and there is no
prop for it. With the stack's 0.75rem right offset a toast claims 332px, so on a 320px-wide
phone it is wider than the viewport.

**The stack's own utilities live in `ToastContext.tsx`, not here**: `bottom-r4 right-r4`
(`--R-SIZE-4` again) place the column, `gap-r5` (`--R-SIZE-5`) separates the toasts, and
`z-50` is a Tailwind literal — the contract defines no z-index scale.

**Motion is themeable but unguarded.** `animate-slide-in-right` and `animate-slide-out-right`
are `@theme` animations from `@batthewz/response-ui-css`, built from
`--MOTION-DURATION-ENTER`/`--MOTION-EASE-ENTER` and `--MOTION-DURATION-EXIT`/
`--MOTION-EASE-EXIT`. The `prefers-reduced-motion` block that ships beside them only covers
the `.fade-*` classes, so these two slide regardless of the user's motion setting. The exit
duration is also already out of step: the provider's removal delay is a hard-coded `300`, and
while the base token is `200ms`, the shipped `grimdark` theme sets
`--MOTION-DURATION-EXIT: 350ms` — so on `grimdark` every toast is removed from the DOM at
300 ms, 50 ms before its slide-out finishes. `events` (`220ms`) and `tech` (`120ms`) are
clear; any theme of yours over 300 ms truncates the same way.

The dismiss button is an [IconButton](icon-button.md); its own colour, radius, padding, and
focus tokens are documented there.

## Gotchas

- **The stack is absent from server-rendered HTML.** The provider portals it unconditionally,
  so the client's first pass mounts a portal the server HTML doesn't have and React throws away
  the page's hydration root — see [Server rendering](#server-rendering).
- **`dismissAll()` also wipes toasts created in the next 300 ms.** It schedules an
  unconditional "clear everything" for after the exit animation, and that timer does not check
  what arrived in the meantime. `dismissAll(); toast("Saved")` shows the new toast for 300 ms
  and then deletes it — verified. Wait out the animation before queueing the next one.
- **`crypto.randomUUID()` is secure-context only.** Ids come from it, unguarded, so
  `toast()` throws a `TypeError` on a page served over plain `http` to anything but
  `localhost` — the usual case being a phone testing against a dev server on a LAN IP.
- **`message` is a string.** No links, no `<strong>`, no line breaks. Rich content means
  rendering `Toast` yourself, and even then `children` land inside a `<p>`, so a `<div>` or a
  list nests invalidly and the browser will split the paragraph around it.
- **Two timers escape the unmount cleanup.** The provider tracks auto-dismiss and removal
  timers in a ref and clears them on unmount, but the `dismissAll()` sweep and the eviction of
  the oldest toast past the limit of five are bare `setTimeout`s. If the provider unmounts
  inside their window, they fire against a dead component. React 19 makes that a no-op rather
  than a warning, so nothing surfaces.
- **The timer map grows for the life of the provider.** Removal timers are stored under
  `` `${id}-remove` `` but deleted under `id`, so every dismissed toast leaves one dead entry
  behind. Only unmounting — or `dismissAll()`, which clears the map wholesale — reclaims it.
- **`role` and `aria-live` are overridable on `Toast`,** because the variant's pair is spread
  before `…rest`. You cannot reach them through `toast()`, though; the provider passes no
  extra props to the toasts it renders. `className` is merged with `cn()`, not replaced.
- **`useToast()`'s three functions are stable; the object holding them is not.** Each is a
  `useCallback` with stable deps, but the returned object is rebuilt on every provider render
  — and the provider re-renders whenever a toast appears or leaves. Destructure it before you
  put anything in a dependency array.
- **Client-only in practice.** `ToastContext.tsx` carries `"use client"`. `Toast.tsx` has no
  directive and uses no hooks, so it compiles into an RSC tree — but `onDismiss` is required
  and event handlers cannot cross the server boundary, so a Server Component still cannot
  render one.

## Accessibility

A hand-rendered `<Toast>` is its own live region: `role="status"` + `aria-live="polite"`, or
`role="alert"` + `aria-live="assertive"` for `error`. Through `ToastProvider` the wiring
moves outward — the always-mounted stack container carries `aria-live="polite"` and the
toast's own region is stripped, so a message arrives as a *change inside* an existing region
rather than as a region that appears pre-filled. `error` keeps `role="alert"`, the one
insertion case screen readers do special-case, because it is the variant that must interrupt.

- **A hand-rendered toast still announces on insertion.** Outside the provider there is no
  persistent container, so the region and its text arrive in the same update — the pattern
  screen readers handle least consistently. Mount your own `aria-live` wrapper first if you
  are running your own queue.
- **Severity travels on two channels, one per audience.** To a screen reader, a
  visually-hidden word — "Success", "Warning", "Error", "Information" — ahead of the title
  and the message, so success and error no longer read identically. On screen, a glyph
  before the title, one shape per variant, so they no longer *look* identical either. Both
  are overridable from either entry point:
  `toast(msg, { variant: "error", statusLabel: "Fehler", statusIcon: null })` or the props
  on a hand-rendered `<Toast>`; `statusLabel=""` and `statusIcon={null}` remove them. The
  glyph is `aria-hidden` — the word already reaches assistive tech, and naming the icon
  would read the severity twice. Measured, the glyph is the variant foreground on the
  variant tinted background, the pairing the message text already uses: **success 4.57 ·
  warning 3.07 · error 4.41 · info 4.75** default, `events` the same but info 5.20, `tech`
  13.39 / 11.78 / 5.35 / 8.47, `grimdark` 6.70 / 7.97 / 4.59 / 3.53 — all above the 3:1
  floor WCAG 1.4.11 sets for a meaningful graphical object. Same treatment on
  [Alert](alert.md#gotchas) and [Badge](badge.md).
- **Dismissing returns focus to where it came from.** The toast records what was focused
  before focus entered it and restores that element *before* the unmount, so a keyboard user
  who tabs into a toast and closes it lands back where they were rather than on `<body>`.
  If that element has itself gone away, the browser's fallback applies.
- **Nothing pauses.** The five-second default runs regardless of hover, focus, or reading
  speed, and there is no prop to extend it. That is a WCAG 2.2.1 (Timing Adjustable) problem
  for anything a user is expected to act on. `duration: 0` is the only escape, and it makes
  dismissal entirely manual.
- **The dismiss icon is a hand-rolled inline `<svg>`,** not a `lucide-react` glyph — unlike
  the severity glyph beside the title, which is. It exposes no `<title>` and no `role="img"`,
  so it contributes no accessible name and the button reads as its `aria-label`. That string
  is `dismissLabel`, defaulting to `"Dismiss"` and reachable from both entry points:
  `toast(msg, { dismissLabel: "Schließen" })` or the prop on a hand-rendered `<Toast>`. Unlike
  `statusLabel`, an empty string does **not** remove it — it is the button's only accessible
  name, so `""` falls back to the default rather than shipping an unnamed control.
- **Focus is never moved to a toast.** Correct for a transient message, but it means anything
  inside one is only reachable by tabbing to it before it disappears. `Toast` offers no action
  slot, so in practice the only thing to reach is the dismiss button.

## Related

[Alert](alert.md) · [IconButton](icon-button.md) · [Portal](portal.md) · [Badge](badge.md) ·
[Spinner](spinner.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
