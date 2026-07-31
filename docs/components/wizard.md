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
| `classNames`          | `{ body?, footer? }` — see [Slots](#slots) | —   |
| …rest                 | `div` props, minus `children`; `onChange` is a compile error | — |

Rest props are spread onto the root `<div class="wizard">`, so `id`, `aria-label`,
`data-testid`, `ref` and handlers all land there. `onChange` is declared `onChange?: never`
— a compile error, not a prop that quietly does nothing — because the change channel is
`onStepChange`, and a spread `{...form.field("x")}` would otherwise land a handler that a
step's own inputs fire by bubbling.

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
plus an `isStepClickable` gate that admits only earlier steps: completed steps jump back,
the current and upcoming ones stay plain `<span>` markers — [Stepper](stepper.md) renders a
`<button>` only for the steps the gate admits, so there are no focusable markers that do
nothing.

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

Gating the transition gates the finish too: `onComplete` follows the *state*, not the
request, so refusing the final `onStepChange` means the flow never enters the completed
state and `onComplete` never fires. One handler guards both.

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
| `next()`     | `() => void`             | Advances one. On the last step requests the terminal `count`; `onComplete` fires only when the state actually lands there. No-op once complete. |
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

## Slots

`className` addresses the outer `<div>`. `classNames` addresses the two regions below the
header. Class strings only, and the keys are typed, so a misspelled one is a compile error
rather than a prop that does nothing.

| Slot     | Element                 | What it addresses                                     |
| -------- | ----------------------- | ----------------------------------------------------- |
| `body`   | `div.wizard__content`   | the panel holding the active step's `content` — the `role="group"` that takes focus on each advance |
| `footer` | `div.wizard__footer`    | the Back / Next row                                    |

```tsx
<Wizard steps={steps} classNames={{ body: "min-h-80", footer: "justify-between" }} />
```

The header is a [Stepper](stepper.md) with its own documented surface, so it takes no slot
here. If you need to reach inside it, drive the flow yourself with
[`useWizard`](#usewizard--the-headless-core) and render the `Stepper` — the section below
shows the whole shape, and it is the same markup `Wizard` emits.

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

- **Step content remounts on every step change.** The panel is keyed by the active index, so
  moving between steps unmounts the outgoing content and mounts the incoming content fresh —
  which is what stops two steps sharing a root element type from sharing a fiber and bleeding
  state into each other. The cost is the other side of the same coin: nothing inside a step's
  `content` survives leaving it. A `useState` draft, a scroll position, an uncontrolled
  `<input>`'s value are all gone when the user presses Back and returns. Hold anything that has
  to persist across steps in the parent that renders the `Wizard`, not inside a step.
- **`onComplete` follows the state, not the click.** It is edge-triggered on *entering* the
  completed state, so a controlled parent that declines the final `onStepChange` never
  receives it, and while the flow sits complete it does not re-fire. It is still not
  once-per-mount: back out of the completed state and finish again, and it fires again.
- **Do not clamp the index in a controlled parent.** `onStepChange` legitimately emits
  `steps.length`. `setStep(Math.min(next, steps.length - 1))` looks defensive, but it means
  the flow never enters the completed state — Finish never disables and `onComplete` never
  fires.
- **The completed state is reversible from the header — except through the last marker.**
  Once complete, the last step's marker is deliberately not clickable, so a stray click
  cannot silently un-complete the flow; the *earlier* markers still jump back, which leaves
  the completed state and re-arms Finish on the way forward.
- **Header buttons exist only where they act.** `allowBackNavigation` makes exactly the
  reachable (earlier) markers into buttons; the current and upcoming markers stay
  non-focusable spans, so there are no dead tab stops.
- **`goTo` cannot finish the flow.** It clamps to `count - 1`, so it can never reach the
  terminal "all done" index that `next()` lands on. It no longer reports moves it did not
  make: `useControllableState` skips `onChange` when the resolved value equals the current
  one, so `goTo(0)` while already on step `0` is silent.
- **The step panel remount also remounts its focus.** Every step change moves DOM focus to
  the panel itself (`tabIndex={-1}`), including a Back — so a keyboard user's position is
  always the new content, not the button they pressed. The initial mount does not steal
  focus.
- **`steps={[]}` renders quietly.** You get an empty header, an empty content region, and
  both footer buttons disabled — no throw, no warning.
- **Client component.** `Wizard.tsx` opens with `"use client"`, so it needs a client boundary
  inside an RSC tree.

## Accessibility

The header is a semantic `<ol>` with `aria-current="step"` on the active step, inherited
whole from [Stepper](stepper.md) — including its known gaps. The footer is two real
`<button type="button">`s with visible text labels, so a wizard nested in a `<form>` will not
submit it, and the disabled states are the native attribute rather than a styling trick.

- **A step change moves focus to the panel and announces it.** The content region is a
  `role="group"` named with the active step's `title`, holds `tabIndex={-1}`, and receives
  DOM focus on every step change after the initial mount — so a screen-reader user lands on
  the new content instead of hunting backwards from the Next button.
- **In the completed state nothing is current.** Every marker reads `done` and no element
  carries `aria-current` (measured), so "where am I" has no answer in the accessibility tree
  once the flow is finished.
- **Name the flow through rest props.** `aria-label` or `aria-labelledby` on the `Wizard`
  reaches the root `<div>` untouched, so the whole flow can be a labelled region without a
  wrapper.
- **Clickable markers are named.** A header button announces as `"{title}, {status}"` — the
  status word is part of the accessible name because the check glyph is `aria-hidden` and
  `aria-current` sits on the `<li>`, not the control. Non-clickable markers carry the same
  status as visually-hidden text, withheld on the current step where `aria-current="step"`
  already announces it.
- **A disabled button explains nothing.** Back on the first step and the primary button in
  the completed state are announced as unavailable with no reason given. Nothing in Wizard
  disables Next for a failed validation, so gate it in `onStepChange` — the button stays
  enabled and the flow simply does not move, which is silent too. Put the reason in the step
  content, next to a [FieldError](field-error.md).

## Related

[Stepper](stepper.md) · [Button](button.md) · [Field](field.md) ·
[FormActions](form-actions.md) · [Tabs](tabs.md) · [Dialog](dialog.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
