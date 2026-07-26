# Alert

A tinted, bordered banner for a single status message — `info`, `success`,
`warning`, or `error`. It renders one live region, names its own severity for
screen readers, and re-tints from your theme's status tokens, so a custom theme
restyles every alert for free.

<!-- example:Minimal -->
```tsx
<Alert>Your changes are saved automatically as you type.</Alert>
```
<!-- /example -->

| Prop        | Type                                            | Default  |
| ----------- | ----------------------------------------------- | -------- |
| `variant`   | `"success" \| "warning" \| "error" \| "info"`   | `"info"` |
| `statusLabel` | `string`                                      | the word for `variant` |
| `className` | `string`                                        | —        |
| `ref`       | `Ref<HTMLDivElement>`                            | —        |
| …rest       | props of `div` (`role`, `aria-live`, `id`, …)   | —        |

`role` and `aria-live` follow the variant — `role="alert"` + `assertive` for
`error`, `role="status"` + `polite` for the rest — and both sit **before** `…rest`,
so a call-site prop overrides either. See [Gotchas](#gotchas).

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

Each variant ships a visually-hidden severity word — "Success", "Warning",
"Error", "Information" — as the first thing inside the live region, so a screen
reader hears "Error, Payment failed" rather than the message alone. Override it
with `statusLabel="Fehler"` to translate it, or `statusLabel=""` when the message
already names the severity itself.

That closes the assistive-tech half of WCAG 1.4.1 and nothing else: **on screen
the variants still differ only in tint**, so a greyscale or colour-blind reader
still can't tell success from error. Lead with a visible text label (or an icon
that has an accessible name) when the severity matters:

<!-- example:LabelledForColorBlindness -->
```tsx
<Alert variant="error" statusLabel="">
  <strong>Error:</strong> The uploaded file exceeds the 25 MB limit.
</Alert>
```
<!-- /example -->

## Interrupting for urgent errors

`error` already announces `assertive` — it is the one variant that exists to
interrupt. The attribute is still yours to set, which is how you promote another
variant to the same urgency (or demote `error` to `polite`):

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

- **Variant is still colour-only on screen.** The visually-hidden severity word reaches
  assistive tech, but nothing visible changes between variants except the tint — in
  greyscale the four are one banner. Supply your own visible label or icon (see the
  example above).
- **The hidden word is part of the alert's text.** It sits inside the live region as the
  first child, so `textContent` and any `getByText`-style query see it too. Pass
  `statusLabel=""` where that is a problem.
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

The container is a live region — `role="alert"` + `aria-live="assertive"` for `error`,
`role="status"` + `aria-live="polite"` for the rest — so a message rendered in response
to an event is announced without moving focus. The severity travels with it as a
visually-hidden first child (`statusLabel`), which is what stops an error and a success
announcing identically.

That leaves the **visual** half of WCAG 1.4.1 open: the variants differ only in tint on
screen, so pair one with a visible label or icon when a colour-blind reader has to tell
them apart. The theme's status pairing covers foreground/background *contrast* only, not
that the meaning survives without colour.

## Related

[Toast](toast.md) · [Badge](badge.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
