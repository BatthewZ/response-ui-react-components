# animate-presence — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 13 · AnimatePresence — caller `onAnimationEnd` disables unmount (med)

The prop type omits only `children`, so callers may pass `onAnimationEnd`. In the JSX
`{...rest}` is spread **after** `onAnimationEnd={handleAnimationEnd}`, so a caller handler
wins and the internal one is dropped — `setMounted(false)` never runs and the element stays
in the DOM permanently after `show` flips false. **Fix:** merge handlers (call
`rest.onAnimationEnd?.(e)` then internal), or omit it from accepted props.

### 14 · AnimatePresence — descendant `animationend` unmounts mid-exit (med)

`handleAnimationEnd` checks only `phase === "exit" && !show`, never `e.target ===
e.currentTarget`. Because `animationend` bubbles, any child animating during the exit window
bubbles up, satisfies the condition, and unmounts the whole subtree before the wrapper's own
fade-out finishes. **Fix:** guard on `e.currentTarget === e.target` and/or match the
animation name.
