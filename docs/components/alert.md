# Alert

A tinted, bordered banner for a single status message — `info`, `success`,
`warning`, or `error`. It renders one `role="alert"` live region and re-tints from
your theme's status tokens, so a custom theme restyles every alert for free.

<!-- example:Minimal -->
```tsx
<Alert>Your changes are saved automatically as you type.</Alert>
```
<!-- /example -->

| Prop        | Type                                            | Default  |
| ----------- | ----------------------------------------------- | -------- |
| `variant`   | `"success" \| "warning" \| "error" \| "info"`   | `"info"` |
| `className` | `string`                                        | —        |
| `ref`       | `Ref<HTMLDivElement>`                            | —        |
| …rest       | props of `div` (`role`, `aria-live`, `id`, …)   | —        |

`role="alert"` and `aria-live="polite"` are set for you, but both sit **before**
`…rest`, so a call-site prop overrides either. See [Gotchas](#gotchas).

## Variants

The four variants only re-tint — fill, text, and border all read the matching
`--C-STATUS-*` pair, so padding, radius, and layout stay identical across them.

<!-- example:Variants -->
```tsx
<Alert variant="info">A new dashboard layout is available in settings.</Alert>
<Alert variant="success">Invoice #4021 was sent to the customer.</Alert>
<Alert variant="warning">Your trial ends in 3 days.</Alert>
<Alert variant="error">We couldn't reach the payment provider.</Alert>
```
<!-- /example -->

## Rich content

Children render as-is inside a flex row. There is no `title` or `icon` prop —
compose the structure you need:

<!-- example:WithTitle -->
```tsx
<Alert variant="warning">
  <div>
    <strong>Storage almost full</strong>
    <p>You're using 9.4 GB of your 10 GB quota. Remove files or upgrade your plan.</p>
  </div>
</Alert>
```
<!-- /example -->

## Don't lean on colour alone

Nothing but the tint distinguishes the variants — no icon or label ships. On its
own that fails WCAG 1.4.1: a greyscale or colour-blind reader can't tell success
from error, and a screen reader hears only the message, never its severity. Lead
with a text label (or an icon that has an accessible name):

<!-- example:LabelledForColorBlindness -->
```tsx
<Alert variant="error">
  <strong>Error:</strong> The uploaded file exceeds the 25 MB limit.
</Alert>
```
<!-- /example -->

## Interrupting for urgent errors

The announcement is `polite` for every variant, which queues an error behind
whatever the screen reader is already saying. For a genuinely urgent failure,
override it to `assertive`:

<!-- example:UrgentError -->
```tsx
<Alert variant="error" aria-live="assertive">
  <div>
    <strong>Payment failed.</strong> Your card was declined.
  </div>
  <Button variant="danger" size="sm" onClick={retrySave}>
    Retry
  </Button>
</Alert>
```
<!-- /example -->

## Theme tokens

Alert hard-codes no colour, radius, or spacing. Every utility below resolves to a
contract variable — override the `--C-STATUS-*` pair for a variant and every alert
of that variant re-tints at runtime, with no rebuild.

| Where            | Utility                                                          | Override                             |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Info variant     | `bg-status-info-bg` `text-status-info` `border-status-info/20`         | `--C-STATUS-INFO` `--C-STATUS-INFO-BG`       |
| Success variant  | `bg-status-success-bg` `text-status-success` `border-status-success/20` | `--C-STATUS-SUCCESS` `--C-STATUS-SUCCESS-BG` |
| Warning variant  | `bg-status-warning-bg` `text-status-warning` `border-status-warning/20` | `--C-STATUS-WARNING` `--C-STATUS-WARNING-BG` |
| Error variant    | `bg-status-error-bg` `text-status-error` `border-status-error/20`       | `--C-STATUS-ERROR` `--C-STATUS-ERROR-BG`     |
| Corner radius    | `rounded-md`                                                     | `--RADIUS-MD`                        |
| Padding          | `p-r4`                                                           | `--R-SIZE-4`                         |
| Row gap          | `gap-r5`                                                         | `--R-SIZE-5`                         |
| Type scale       | `text-body-2`                                                   | `--BodyText-2`                       |

The border is that variant's foreground token at `/20` alpha, so it always tracks
the text colour — there is no separate border token to tune. The tinted background
(`--C-STATUS-*-BG`) is the background the [contrast pairing](../theme-contract.md#the-contrast-pairing)
puts each status foreground on, so the default variants are built to stay legible across the
shipped themes.

## Gotchas

- **Variant is colour-only.** No icon, label, or `aria` hint encodes severity — the
  message reads identically to assistive tech and in greyscale regardless of variant.
  Supply your own label or icon (see the example above).
- **Announced `polite`, even for errors.** `role="alert"` normally implies an
  *assertive* live region, but the component sets `aria-live="polite"` explicitly,
  which downgrades it. An `error` won't interrupt the screen reader unless you pass
  `aria-live="assertive"` yourself.
- **Only announced when inserted or changed after render.** A live region present on
  first paint is not re-announced — an alert that's on the page at load is read as
  ordinary content, not as an alert. Mount it in response to the event it reports.
- **`role` and `aria-live` are overridable.** They're spread before `…rest`, so
  `<Alert role="status">` or a custom `aria-live` from the call site wins. `className`
  is merged through `cn()`, not overridden.
- **No per-component CSS.** Alert has no sibling `.css`; every style is a Tailwind
  utility resolving to a token from `@batthewz/response-ui-css`, so that import is
  required.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

The container is a `role="alert"` live region with `aria-live="polite"`, so a message
rendered in response to an event is announced without moving focus. Because severity
is carried only by colour, pair the variant with a textual or icon label so it reaches
colour-blind and screen-reader users — the pairing only covers the foreground/background
*contrast*, not that the meaning survives without colour.

## Related

[Toast](toast.md) · [Badge](badge.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
