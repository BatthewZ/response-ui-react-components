# Alert

A tinted, bordered banner for a single status message — `info`, `success`,
`warning`, or `error`. It renders one live region, names its own severity for
screen readers, shows that severity as a glyph rather than a colour, and re-tints
from your theme's status tokens, so a custom theme restyles every alert for free.

<!-- example:Minimal -->
```tsx
<Alert>Your changes are saved automatically as you type.</Alert>
```
<!-- /example -->

| Prop        | Type                                            | Default  |
| ----------- | ----------------------------------------------- | -------- |
| `variant`   | `"success" \| "warning" \| "error" \| "info"`   | `"info"` |
| `statusLabel` | `string`                                      | the word for `variant` |
| `statusIcon` | `ReactNode`                                    | the glyph for `variant` |
| `className` | `string`                                        | —        |
| `ref`       | `Ref<HTMLDivElement>`                            | —        |
| …rest       | props of `div` (`role`, `aria-live`, `id`, …)   | —        |

`role` and `aria-live` follow the variant — `role="alert"` + `assertive` for
`error`, `role="status"` + `polite` for the rest — and both sit **before** `…rest`,
so a call-site prop overrides either. See [Gotchas](#gotchas).

## Variants

Each variant sets two things: the `--C-STATUS-*` pair that fills, inks and borders
the banner, and the glyph that leads it — `CircleCheck`, `TriangleAlert`,
`CircleX`, `Info` from `lucide-react`, the peer dependency the package already
requires. Padding, radius, and layout stay identical across all four; the glyph is
the only shape that changes, and it is what makes the variants tell apart in
greyscale.

<!-- example:Variants -->
```tsx
<Alert variant="info">A new dashboard layout is available in settings.</Alert>
<Alert variant="success">Invoice #4021 was sent to the customer.</Alert>
<Alert variant="warning">Your trial ends in 3 days.</Alert>
<Alert variant="error">We couldn't reach the payment provider.</Alert>
```
<!-- /example -->

## Rich content

Children render as-is inside a flex row, after the severity glyph. There is no
`title` prop and no general-purpose icon slot — `statusIcon` names the severity
and nothing else, so compose the structure you need:

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

Severity travels on two channels, one per audience, and neither repeats the other.

**To a screen reader:** a visually-hidden word — "Success", "Warning", "Error",
"Information" — as the first thing inside the live region, so it hears "Error,
Payment failed" rather than the message alone. `statusLabel="Fehler"` translates
it; `statusLabel=""` removes it when the message already names the severity.

**On screen:** a glyph before the message, one shape per variant, so the four
banners are distinguishable in greyscale and to a colour-blind reader.
`statusIcon` replaces it; `statusIcon={null}` removes it. The two props are twins
on purpose — same defaulting, same removal, one idea to learn.

The glyph is `aria-hidden`, deliberately: the word is already in the live region,
and a named icon beside it would announce the severity twice. If you pass your
own `statusIcon`, mark it `aria-hidden` for the same reason.

Both channels are defaults, not requirements — a message that says what it means
still reads better than one leaning on either:

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
four measured themes.

## Gotchas

- **The glyph is the variant's only non-colour channel.** Pass `statusIcon={null}` and the
  four banners are identical in greyscale again — the tint is all that is left. Remove it
  only where your own text already names the severity.
- **The glyph is drawn in `currentColor`,** so it inks the variant's `--C-STATUS-*`
  foreground, the same token as the message text beside it. It introduces no new colour
  pairing, and it inherits whatever contrast your theme gives that pair.
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

The **visual** half of WCAG 1.4.1 is carried by the glyph (`statusIcon`), not by the
tint: `CircleCheck`, `TriangleAlert`, `CircleX` and `Info` are four different shapes, so
the variants survive greyscale and colour-vision deficiency. It is `aria-hidden`, so it
adds nothing to what is announced — the word already did that.

Measured, the glyph is the variant's foreground on the variant's tinted background, the
pairing the message text already uses: **success 4.57 · warning 3.07 · error 4.41 · info
4.75** in the default theme, `events` the same but info 5.20, `tech` 13.39 / 11.78 / 5.35
/ 8.47, `grimdark` 6.70 / 7.97 / 4.59 / 3.53. Every one clears the 3:1 floor WCAG 1.4.11
sets for a meaningful graphical object.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

## Related

[Toast](toast.md) · [Badge](badge.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
