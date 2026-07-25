# stepper — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 134 · Stepper — completed steps announce as an unnamed button (high)

With `onStepClick` supplied, every marker becomes a `<button>`. A **completed** step's only child
is the `<Check/>` glyph, which `lucide-react` correctly marks `aria-hidden`, so the button has no
text at all. Measured with `computeAccessibleName` on a three-step stepper at `activeStep={2}`:
`["", "", "3"]` — the two completed markers have empty names, and even the reachable one announces
only its number, never its title.

`Stepper.Step` spreads `{...props}` onto the `<li>`, so `<Stepper.Step aria-label="Shipping">`
lands the label on the list item and never on the button. **There is no call-site fix.**

Rated high rather than medium because `Wizard.tsx:128` defaults `allowBackNavigation = true`, so a
bare `<Wizard steps={…}/>` — the library's own flagship consumer — ships unnamed back-navigation
buttons. **Fix:** build the button's name from the step `title` plus a status word.
