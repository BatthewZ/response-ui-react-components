# Wizard

A guided multi-step flow assembled from one array: a [Stepper](stepper.md) header that
tracks progress, the active step's content below it, and a footer that wires Back / Next /
Finish for you. The index is controllable, so cross-step validation stays yours.

<!-- example:Minimal -->
```tsx
<Wizard
  steps={[
    {
      title: "Account",
      description: "Your details",
      content: (
        <Field>
          <Label htmlFor="wizard-email">Work email</Label>
          <Input id="wizard-email" type="email" placeholder="ada@example.com" />
        </Field>
      ),
    },
    {
      title: "Plan",
      description: "Pick a tier",
      content: <Text>Team — £12 per seat, billed monthly.</Text>,
    },
    {
      title: "Confirm",
      description: "Review and pay",
      content: <Text>We will email a receipt to ada@example.com.</Text>,
    },
  ]}
  onComplete={() => window.location.assign("/dashboard")}
/>
```
<!-- /example -->

| Prop                  | Type                            | Default        |
| --------------------- | ------------------------------- | -------------- |
| `steps`               | `WizardStep[]`                  | — *(required)* |
| `step`                | `number`                        | —              |
| `defaultStep`         | `number`                        | `0`            |
| `onStepChange`        | `(step: number) => void`        | —              |
| `onComplete`          | `() => void`                    | —              |
| `orientation`         | `"horizontal" \| "vertical"`    | `"horizontal"` |
| `allowBackNavigation` | `boolean`                       | `true`         |
| `backLabel`           | `string`                        | `"Back"`       |
| `nextLabel`           | `string`                        | `"Next"`       |
| `finishLabel`         | `string`                        | `"Finish"`     |
| `className`           | `string`                        | —              |

That is the whole surface. `WizardProps` is a closed type — it does not extend the props of
a `div`, and Wizard spreads no rest props onto its root, so `className` is the only thing
you can put on the outer element. `id` and `ref` are compile errors; `data-*` and `aria-*`
are not, and disappear. See [Gotchas](#gotchas).

A `WizardStep` is three fields:

| Field         | Type        | Notes                                        |
| ------------- | ----------- | -------------------------------------------- |
| `title`       | `string`    | Required. Shown in the header.                |
| `description` | `string`    | Optional second line under the title.         |
| `content`     | `ReactNode` | Required. Rendered while that step is active. |

The rendered tree is a `<div class="wizard">` holding exactly three children: the
`<ol class="stepper">` header, a `<div class="wizard__content">`, and a
`<div class="wizard__footer">` with the two buttons.

## The index, and the state past the last step

`activeStep` runs `0`…`steps.length` — **one more value than there are steps**. That extra
terminal index is the "all done" state: every step's index is now below it, so the header
renders every marker as complete and none of them carries `aria-current`.

Pressing Finish on the last step is what enters it. The footer's primary button is disabled
there, and the last step's panel stays on screen — content is looked up at
`Math.min(activeStep, steps.length - 1)`, so nothing blanks out under the finished header.

Two consequences worth internalising before you wire anything up:

- `onStepChange` fires with `steps.length` at that moment. For a three-step flow the last
  value your handler sees is `3`. A controlled parent that clamps the incoming index into
  `0…steps.length - 1` never reaches the terminal state — see [Gotchas](#gotchas).
- Back out of it and you are on the last step again with Finish live, so `onComplete` is
  not a once-per-mount event.

Incoming indices are not clamped either. `defaultStep={9}` on a three-step wizard opens in
the completed state, and Back walks down one press at a time — seven presses to reach the
last step. Only `goTo` clamps.

## Orientation

`orientation` is forwarded to the header and nowhere else — the content region and the
footer are laid out identically in both.

<!-- example:Vertical -->
```tsx
<Wizard
  orientation="vertical"
  steps={[
    {
      title: "Cart",
      description: "2 items",
      content: <Text>Mechanical keyboard, USB-C hub.</Text>,
    },
    {
      title: "Shipping",
      description: "Where it goes",
      content: <Text>221B Baker Street, London NW1 6XE.</Text>,
    },
    {
      title: "Payment",
      description: "How you pay",
      content: <Text>Visa ending 4242.</Text>,
    },
  ]}
/>
```
<!-- /example -->

## Header navigation

With `allowBackNavigation` at its default `true`, Wizard hands the header an `onStepClick`
that acts only when `index < activeStep`: completed steps jump back, the current and
upcoming ones are ignored. That gate is Wizard's, not the header's —
[Stepper](stepper.md) turns **every** marker into a `<button>` as soon as any handler is
supplied, so the forward ones are still focusable and still do nothing.

Set it to `false` and no handler is passed at all: the markers render as `<span>`s, the
header returns to a pure indicator, and the only way through the flow is the footer.

<!-- example:LinearFlow -->
```tsx
<Wizard
  allowBackNavigation={false}
  backLabel="Previous"
  nextLabel="Continue"
  finishLabel="Submit order"
  steps={[
    {
      title: "Terms",
      description: "Read and accept",
      content: <Text>Licence renews annually unless cancelled.</Text>,
    },
    {
      title: "Confirm",
      description: "Place the order",
      content: <Text>One licence for Ada Lovelace, £144 a year.</Text>,
    },
  ]}
/>
```
<!-- /example -->

`backLabel`, `nextLabel` and `finishLabel` are the only text Wizard supplies itself —
everything else on screen comes out of `steps`. The primary button shows `finishLabel` on
the last step *and* in the completed state, `nextLabel` everywhere else.

## Driving it yourself

Pass `step` and the flow is controlled: `onStepChange` is called with the index the wizard
wants to move to, and nothing changes until you write it back. Refusing a forward move is
therefore just not calling your setter. Below, `step`/`setStep` is a `useState(0)` pair and
`accepted`/`setAccepted` a `useState(false)` pair.

<!-- example:GatedProgress -->
```tsx
<Wizard
  step={step}
  onStepChange={(next) => {
    if (next <= step || accepted) setStep(next);
  }}
  onComplete={() => window.location.assign("/orders")}
  steps={[
    {
      title: "Terms",
      description: "Accept to continue",
      content: (
        <Row gap="r5">
          <Checkbox
            id="wizard-terms"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <Label htmlFor="wizard-terms">I accept the terms of service</Label>
        </Row>
      ),
    },
    {
      title: "Details",
      description: "Who it is for",
      content: (
        <Field>
          <Label htmlFor="wizard-seat">Seat holder</Label>
          <Input id="wizard-seat" placeholder="Ada Lovelace" />
        </Field>
      ),
    },
    {
      title: "Confirm",
      description: "Place the order",
      content: <Text>One licence, billed annually.</Text>,
    },
  ]}
/>
```
<!-- /example -->

Note what this example does **not** try to do: gate the finish. `onComplete` fires in the
same click as the `onStepChange` you refused — see [Gotchas](#gotchas) — so a final check
belongs inside `onComplete` itself, not in the transition handler.

Controlled-ness is locked on the first render. Mounting with `step={undefined}` and
supplying a number later leaves the wizard uncontrolled for its whole life, and
`defaultStep` seeds the internal state once and is ignored afterwards.

## `useWizard` — the headless core

`useWizard` ships from the same module and is exported from the package root; it lives on
this page because it is the machinery `Wizard` is built from, and the two share their
options. Reach for it when you want the step logic but not the layout — a flow inside a
[Dialog](dialog.md) footer, a header rendered as [Tabs](tabs.md), a panel with no footer at
all.

```ts
const wizard = useWizard({ count, step, defaultStep, onStepChange, onComplete });
```

`count` is required; the other four match the `Wizard` props of the same name. `Wizard`
itself calls it with `count: steps.length`.

| Returns      | Type                     | Behaviour                                                                     |
| ------------ | ------------------------ | ----------------------------------------------------------------------------- |
| `activeStep` | `number`                 | `0`…`count`. `count` is the terminal "all done" index.                        |
| `isFirst`    | `boolean`                | `activeStep <= 0`.                                                            |
| `isLast`     | `boolean`                | `activeStep === count - 1` — the last actionable step, **false** once complete. |
| `isComplete` | `boolean`                | `activeStep >= count`.                                                        |
| `next()`     | `() => void`             | Advances one. On the last step lands on `count` and calls `onComplete`. No-op once complete. |
| `back()`     | `() => void`             | Retreats one. No-op at `0`; from the completed state returns to the last step. |
| `goTo(step)` | `(step: number) => void` | Clamps into `0…count - 1`, so it can never reach the completed state.         |

<!-- example:Headless -->
```tsx
<Stack gap="r4">
  <Stepper activeStep={wizard.activeStep}>
    <Stepper.Step title="Upload" />
    <Stepper.Step title="Map columns" />
    <Stepper.Step title="Import" />
  </Stepper>
  <Row gap="r5" justify="between">
    <Button variant="ghost" onClick={wizard.back} disabled={wizard.isFirst}>
      Back
    </Button>
    <Button onClick={wizard.next} disabled={wizard.isComplete}>
      {wizard.isLast || wizard.isComplete ? "Import 1,204 rows" : "Next"}
    </Button>
  </Row>
</Stack>
```
<!-- /example -->

The `isLast || isComplete` in that label is not belt-and-braces: `isLast` goes false the
moment you finish, so testing it alone would flip the button back to "Next" while it sits
disabled. `Wizard` writes the same pair for the same reason.

## Theme tokens

`Wizard.tsx` carries **no Tailwind utilities** — it emits three class names and all of its
own styling lives in `Wizard.css`, which reads four contract variables directly. Override
any of them and the wizard re-tints with the rest of the app, at runtime, with no rebuild.

| Where                                   | Override            |
| --------------------------------------- | ------------------- |
| Gap between header, content and footer  | `--R-SIZE-3`        |
| Content region ink                      | `--C-TEXT-PRIMARY`  |
| Footer button gap and its top padding   | `--R-SIZE-4`        |
| Rule above the footer                   | `--C-BORDER-DEFAULT` |

Both spacing tokens sit on the responsive `r`-scale and step up at the 40rem breakpoint —
the section gap `--R-SIZE-3` from `1rem` to `1.5rem`, the footer gap and padding
`--R-SIZE-4` from `0.75rem` to `1.25rem` — so a wizard breathes wider on desktop without a
breakpoint utility from you.

Everything else you can see is owned by the parts Wizard composes, and is documented with
them: the markers, rails and step type come from [Stepper](stepper.md), and the two footer
controls from [Button](button.md) at its default `md` size, `ghost` for back and the default
`primary` for next. Wizard sets **no background** — it inks `--C-TEXT-PRIMARY` onto whatever
surface it is dropped on, and the [theme contract](../theme-contract.md) names that token
the default body ink, meant to read on any `surface-*` token.

One geometry value is not on the contract: the content region reserves a hard `4rem`
`min-height` so the footer does not jump as you move between a one-line step and a long
form. Steps taller than that still grow the panel.

## Gotchas

- **Step content is not keyed, so DOM and component state bleed between steps.** The panel
  renders `{steps[i].content}` at a fixed position with no `key`, so React reconciles the
  outgoing and incoming nodes against each other. Any two steps whose content share a root
  element or component type keep the *same* fiber: typing `ada@example.com` into step one's
  `<input>` and pressing Next shows that value in step two's differently-labelled input
  (measured, including through a [Field](field.md) + [Input](input.md) pair), and a
  `useState` counter at 2 on step one reads 2 on step two. Give each step's content a
  distinct root, or wrap your content in an element you key by step yourself.
- **`onComplete` cannot be refused, only ignored.** `next()` calls the state setter and then
  fires `onComplete` in the same breath, with no check that the change was accepted. In a
  controlled wizard whose handler declines the final move, `onComplete` still runs — and
  because the flow never reaches the terminal index, Finish is never disabled and every
  further click fires it again (measured: three clicks, three calls). If `onComplete` submits
  an order, do the validation and the idempotency guard inside `onComplete`.
- **Do not clamp the index in a controlled parent.** `onStepChange` legitimately emits
  `steps.length`. `setStep(Math.min(next, steps.length - 1))` looks defensive and is exactly
  the bug above.
- **The completed state is reversible from the header.** With `allowBackNavigation` on, every
  marker — including the last step's — satisfies `index < activeStep` once complete, so a
  click on it drops back to the last step and re-enables Finish.
- **`allowBackNavigation` buys you dead tab stops.** It is all-or-nothing: turning it on makes
  all N markers focusable buttons, and Wizard's handler silently ignores the forward ones.
- **`goTo` cannot finish the flow, and reports moves it did not make.** It clamps to
  `count - 1`, and because the underlying setter always notifies, `goTo(0)` while already on
  step `0` still calls `onStepChange(0)`. Only `back()` guards against a no-op.
- **`aria-*` and `data-*` on the root compile and then vanish.** Wizard destructures its
  eleven props and spreads no rest, so nothing else reaches the `<div class="wizard">`.
  TypeScript catches `id` and `ref` but exempts hyphenated JSX attributes from checking, so
  `<Wizard aria-label="Checkout" data-testid="checkout" />` typechecks and the root renders
  with `class` and nothing else (measured). Wrap the wizard in your own element to label or
  target it.
- **`steps={[]}` renders quietly.** You get an empty header, an empty content region, and
  both footer buttons disabled — no throw, no warning.
- **Client component.** `Wizard.tsx` opens with `"use client"`, so it needs a client boundary
  inside an RSC tree.

## Accessibility

The header is a semantic `<ol>` with `aria-current="step"` on the active step, inherited
whole from [Stepper](stepper.md) — including its known gaps. The footer is two real
`<button type="button">`s with visible text labels, so a wizard nested in a `<form>` will not
submit it, and the disabled states are the native attribute rather than a styling trick.

- **A step change is not announced, and focus does not move.** The panel is a bare
  `<div class="wizard__content">` — no `role`, no `aria-live`, no `id`, not focusable, and
  nothing associates it with the header the way [Tabs](tabs.md) associates a panel with its
  tab. After a click on Next, focus stays on the Next button (measured), which sits *after*
  the panel in DOM order, so a screen-reader user gets no signal and has to navigate
  backwards to find what changed. If your steps are long, manage focus yourself.
- **In the completed state nothing is current.** Every marker reads `done` and no element
  carries `aria-current` (measured), so "where am I" has no answer in the accessibility tree
  once the flow is finished.
- **The region cannot be named.** `aria-label` and `aria-labelledby` are dropped before they
  reach the root (see [Gotchas](#gotchas)), so a landmark or a name for the flow has to go on
  a wrapper you render yourself.
- **Clickable markers are poorly named.** A completed marker's only child is an
  `aria-hidden` check glyph, so it announces as an unnamed button; active and upcoming ones
  are named by their number alone. `allowBackNavigation={false}` removes all of them from
  the tab order and is the better default for a strictly linear flow.
- **A disabled button explains nothing.** Back on the first step and the primary button in
  the completed state are announced as unavailable with no reason given. Nothing in Wizard
  disables Next for a failed validation, so gate it in `onStepChange` — the button stays
  enabled and the flow simply does not move, which is silent too. Put the reason in the step
  content, next to a [FieldError](field-error.md).

## Related

[Stepper](stepper.md) · [Button](button.md) · [Field](field.md) ·
[FormActions](form-actions.md) · [Tabs](tabs.md) · [Dialog](dialog.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
