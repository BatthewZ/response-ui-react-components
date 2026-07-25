# otpinput — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 238 · OTPInput — `onComplete` latches and then reports a stale code (high)

`completedRef` is a boolean. Once a complete code fires `onComplete`, the ref stays `true` and
every later commit that is *still complete* takes the `if (!completedRef.current)` false branch.
Measured on a 3-box control: type `123` → `onComplete("123")`. Correct the first digit to `9` →
`onValueChange("923")` fires, but `onComplete` has still only ever been called with `"123"`.
Re-pasting `5678` over a complete `1234` behaves identically. A verification screen whose submit
path is `onComplete` — the pattern the prop's name and signature invite — therefore deadlocks on a
code the user can see is correct; the only escape is to clear a box (unlatching the ref) and
retype. **Fix:** store the last-fired serialised value in the ref instead of a boolean, and fire
whenever a complete value differs from it.

### 239 · OTPInput — a multi-character value in one box loses all but the last character (med)

`handleChange` takes `filtered[filtered.length - 1]` unconditionally. Measured:
`fireEvent.change(box0, { value: "123456" })` on a six-box control yields
`["6","","","","",""]` and emits `"6"` — five of six digits dropped. `onPaste` spreads correctly,
but platform SMS autofill for the `autoComplete="one-time-code"` hint the component sets on box 0
delivers an *input* event, not a paste. **Caveat:** the autofill consequence is inferred, not
observed — `maxLength={1}` may truncate first on a real device (yielding `"1"` instead of `"6"`),
which is broken either way but by a different mechanism. Needs a device test.
**Fix:** when `filtered.length > 1`, spread across slots from `index` exactly as `handlePaste`
does.

### 240 · OTPInput — Delete and cut are silently ignored (med)

`handleChange` returns early when the filtered string is empty, and `handleKeyDown` implements
only Backspace / ArrowLeft / ArrowRight. Measured: with box 1 holding `"2"`, pressing
<kbd>Delete</kbd> or <kbd>Ctrl</kbd>+<kbd>X</kbd> leaves the box showing `"2"` and calls
`onValueChange` **zero** times — the controlled input simply re-renders the old character with no
feedback at all. Backspace is the only way to clear a box, which is not what any user assumes.
**Fix:** treat an empty filtered string as a clear of that slot rather than an early return.
