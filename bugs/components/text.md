# text — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 53 · Text — `variant` and the element disagree about what a heading looks like (med)

`variantClassMap` maps `variant` to `text-h*`, which emit **only** `font-size` and
`line-height`. The heading *treatment* — `--HEADING-FONT`, `--HEADING-LETTER-SPACING`,
`--HEADING-TEXT-TRANSFORM`, `font-weight: 700` — lives in `@layer base` on the `h1`–`h6`
**element** selectors. So the look follows `as`, and the size follows `variant`.
**Failure scenario:** `<Text variant="h2" as="p">Quarterly revenue</Text>` under
`data-theme="events"` renders at `--H2` size but in Nunito at body weight — it does not match the
real `h2` beside it. Reverse: `<Text variant="body-1" as="h3">` gets Playfair + 700 at body size.
**Fix direction:** add the foundation's `.h1`–`.h6` classes to `variantClassMap` alongside
`text-h*`, so the heading treatment travels with `variant` rather than with the element.
