# hover-card — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 122 · HoverCard — an unnamed dialog with no path from its trigger (med)

HoverCard.tsx:96 calls `useRole(context, { role: "dialog" })`. floating-ui's `useRole`
emits `aria-labelledby` on the floating element only when `ariaRole === "menu"`, and
`aria-describedby` on the reference only for `tooltip`/`label` — so neither is emitted
here. Probed on an open card: `role="dialog"`, `aria-label: null`,
`aria-labelledby: null`; trigger `aria-describedby: null`. `HoverCard.Content` (:180) is
also the only overlay in this set with no `FloatingFocusManager`. Keyboard-focusing the
trigger announces "collapsed/expanded" and nothing more; the card is an unnamed dialog
appended to the end of `<body>`.
**Scope narrowed from the row:** the contents are not unreachable — in browse mode a user
can still walk to the end of the document and read them. What is missing is a *name* and
any *path* from the trigger.
**Fix:** derive or accept a label for the dialog, or drop `role="dialog"` and wire the card
as `aria-describedby` on the trigger. Distinct from #132 (low), where the default `<span>`
trigger is not focusable at all.
