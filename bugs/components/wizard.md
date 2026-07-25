# wizard — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 302 · Wizard — step content is unkeyed, so state bleeds between steps (high)

The panel renders `<div className="wizard__content">{active?.content}</div>` at a fixed position
with no `key`, so React reconciles the outgoing step's content against the incoming one. Any two
steps whose `content` share a root element or component type keep the *same fiber*. Measured with
two steps each holding an `<input>`: type `"ada@example.com"` into step one's field, press Next →
step two's differently-labelled input renders carrying `"ada@example.com"`. The same happens
through a `Field` + `Input` pair, and a `useState` counter sitting at 2 on step one reads 2 on step
two. This is silent, data-dependent (two `<Text>` steps look fine; two forms do not), and it leaks
one step's user input into another — the worst case being a wizard whose steps are structurally
similar, which is most of them.
**Fix:** key the panel on the active index — `<div className="wizard__content" key={wizard.activeStep}>`.

### 303 · Wizard — `onComplete` cannot be refused and re-fires indefinitely (med)

`next()` calls `setActiveStep(activeStep + 1)` and then `if (activeStep >= count - 1) onComplete?.()`
in the same call, with no check that the change was accepted. Measured with
`<Wizard step={s} onStepChange={n => setS(Math.min(n, steps.length - 1))} onComplete={submit}/>` on
the last step: the clamp keeps `activeStep` at `count - 1`, so `isComplete` never becomes true,
Finish is never disabled, and **three clicks produced three `submit` calls**. Refusing the change
outright behaves the same way. The component's own docblock (`Wizard.tsx:117`) tells callers to
"gate `onStepChange`/`onComplete` on your own checks", which is not possible today — and the
defensive-looking `Math.min` clamp is exactly what triggers it.
**Fix:** fire `onComplete` only when the resolved index actually advanced past `count - 1`.

### 304 · Wizard — `aria-*` and `data-*` compile and then vanish (med)

`Wizard` destructures its eleven props and spreads no rest onto the root. TypeScript exempts
hyphenated JSX attribute names from excess-property checking, so `aria-*` and `data-*` typecheck
while `id` and `ref` are correctly rejected (verified both ways with `tsc`). Measured:
`<Wizard steps={steps} aria-label="Checkout" data-testid="checkout"/>` renders a root whose entire
attribute list is `class="wizard"`. The flow therefore cannot be named for assistive tech, and
cannot be targeted by a test hook or an analytics selector, with nothing anywhere reporting the
loss. Same family as #9/#10 (types advertising props the runtime drops), reached by the opposite
route: here the type never promised them, the compiler just declined to object.
**Fix:** accept and spread `...rest` onto the root, or `Omit`-type the props so the compiler
rejects them.

### 305 · Wizard — a step change is silent and focus does not move (med)

The panel is a bare `<div class="wizard__content">` — measured attribute list: `class`, and nothing
else. No `role`, no `aria-live`, no `id`, not focusable, and no association with the header the way
`Tabs` associates a panel with its tab. Measured after clicking Next: the content swaps and focus
stays on the Next button, which sits *after* the panel in DOM order — so a screen-reader user gets
no announcement and has to navigate backwards to discover what changed. In the completed state no
element carries `aria-current` either (every marker reads done), so "where am I" has no answer.
**Fix:** give the panel an `id` plus `role="group"`/`aria-labelledby` pointing at the active step's
title, or move focus to it on change.
