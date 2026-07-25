# Library-wide — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 35 · Library-wide — focus-ring offset paints white on dark themes (med)

`ring-offset-*` reserves a gap between the element and its focus ring, filled with
`--tw-ring-offset-color`. **That variable is never set anywhere in this library** (grep for
`ring-offset-color`: zero hits), so it falls back to Tailwind's default `#fff`. On any dark
theme the focused element gets a white halo — a raw colour leaking into a system whose whole
premise is that every colour comes from a token.

Affected (`ring-offset-2`, visible gap):

| File | Line |
| --- | --- |
| `src/components/ui/Button.tsx` | 9 |
| `src/components/ui/IconButton.tsx` | 10 |
| `src/components/form/Checkbox.tsx` | 17 |
| `src/components/ui/AvatarUpload.tsx` | 220 |
| `src/components/ui/ErrorBoundary.tsx` | 31 |

Benign (`ring-offset-0` — no gap to paint): `Input.tsx:25`, `Select.tsx:25`, `Textarea.tsx:25`.

**Fix:** set `ring-offset-color` to the surrounding surface token once (base classes or a
shared focus utility) rather than patching five call sites. **Supersedes #25**, which logged
only the Checkbox instance.

**Docs note:** `button.md` and `icon-button.md` document the focus ring as fully themed and
do not mention this. Once the code is fixed the docs stay true; if it's deliberately left,
both pages need a gotcha. Verify the fix before amending the docs.

### 55-59 · Avatar — five medium findings (med)

- **#55 sticky `imgError`.** Reproduced: render `src="bad://one"` → `onError` → initials; then
  set a good `src` → still initials, until unmount. **Scenario:** an expired signed avatar URL
  404s once and the user's photo never returns for the life of the component.
  **Fix:** reset the flag on `src` change (render-phase prop-change reset, or derive from `src`).
- **#56 dropped `children`.** `<Avatar name="Ada Lovelace">child</Avatar>` compiles (verified,
  zero tsc errors) and renders only `AL`. **Fix:** `Omit<…, "children">`, as Skeleton and Spinner
  already do.
- **#57 presence by colour alone.** `<Avatar name="Ada Lovelace" status="offline" />` announces
  "Ada Lovelace, image" — presence is entirely absent to screen readers, and `offline` (grey) vs
  `away` (amber) is a weak visual discrimination. **Fix:** a visually hidden status word in the
  dot, or append it to the wrapper's label.
- **#58 unnamed `role="img"`.** `<Avatar src="/team/ada.jpg" />` renders `<span role="img">` with
  `aria-label` undefined and inner `alt=""` — AT announces an image it cannot describe. The label
  is also untrimmed, so `name="   "` yields `aria-label="   "`. **Fix:** drop the `role` (or set
  `aria-hidden`) when no name resolves; trim before use.
- **#59 `AvatarGroup size` stops at the group.** `<AvatarGroup size="lg">` around default
  children gives a 3rem `+N` chip beside 2.5rem circles, with overlap tuned for the larger size.
  **Fix:** clone children with the group's `size`, or derive chip/overlap from the children.

### 115 · The `asChild` escape hatch silently unwires the child (med · library-wide)

Four of the five overlay components ship an `asChild` prop, and **four independent agents found
the same defect without seeing each other's work.** Every one of them clones the trigger's props
*over* the child rather than composing them, so the child's own handlers never run — and in three
of the four, the child's `ref` is dropped too.

Measured lost sets (the child's handler is silently replaced, no warning, types unaffected):

| Component | Child props lost | Child `ref` |
| --- | --- | --- |
| `Popover` | `onClick` `onKeyDown` `onPointerDown` `onMouseDown` | **dropped** |
| `DropdownMenu` | `onClick` `onFocus` `onKeyDown` `onPointerDown` `onPointerEnter` `onMouseDown` | **dropped** |
| `HoverCard` | `onFocus` `onBlur` `onKeyDown` `onPointerDown` `onPointerEnter` `onMouseMove` `onMouseLeave` | **dropped** |
| `Tooltip` | same seven as HoverCard | merged correctly |

**There is no single lost set** — it is whatever that component's Floating UI hooks emit, which is
why the first drafts of the pages disagreed with each other. `className` is merged everywhere.

**Failure scenario:** `<DropdownMenu.Trigger asChild><Button onClick={track}>Actions</Button></DropdownMenu.Trigger>`
— the menu opens and `track` never fires. Analytics silently stop; nothing errors, nothing type-checks
wrong. **Fix:** pass the child's props into `getReferenceProps(children.props)` and merge
`children.props.ref` into the existing `mergeRefs` call. `Tooltip.tsx:66-74` already does the ref
half correctly and is the model.

### 112-114 · Three highs in the overlay set

- **#112 `Tooltip`** calls `getReferenceProps()` with no arguments, so a child's own
  `aria-describedby` is destroyed rather than merged. Measured on
  `<Tooltip content="…"><Input aria-describedby="password-rules"/></Tooltip>`: the attribute is
  `null` while closed and points at the tooltip while open. **The input's hint is never announced
  in either state.** A tooltip silently removing another element's accessibility wiring is worse
  than no tooltip. **Fix:** `getReferenceProps(children.props)`.
- **#113 `ContextMenu`** — the Trigger `<div>` sets no `tabIndex`, so it can never receive focus.
  The platform fires `contextmenu` for the **Menu key** and **Shift+F10**, but at whatever element
  has focus — `<body>` — and it does not bubble *down* to the trigger. Measured: dispatching
  `contextmenu` at `<body>` does not open the menu. **Keyboard access is zero, not degraded.**
  **Fix:** default `tabIndex={0}` plus a focus style — measured to also restore arrows and focus
  return.
- **#114 `menu-internals`** — `initialFocus={-1}` means a pointer-opened menu never moves focus in.
  Measured after a right-click open: `document.activeElement` is `BODY`; ArrowDown and typeahead
  both do nothing. **Note this is specific to the ContextMenu path** — `DropdownMenu`'s keyboard
  model was measured working end to end (arrows, Home/End, typeahead, Escape-returns-focus,
  Enter-activates), so its `role="menu"` is honestly earned. Same line, two outcomes, because the
  two components differ in where focus sits when the menu opens.

### 241-242 · library-wide — the form controls' own boundary and focus ring miss 3:1 (med ×2)

One class string, shared verbatim by `Input`, `Textarea`, `Select`, `NumberInput`, `SearchInput`
and `OTPInput` (and re-created by `TagInput` on its wrapper), carries both defects. Computed from
the shipped OKLCH values:

- **#241 — boundary.** `--C-BORDER-STRONG` on the `--C-SURFACE-0` fill: **1.47:1** default,
  **1.44:1** `events`, **1.41:1** `tech`, **1.79:1** `grimdark`. `--C-SURFACE-0` is also the base
  page surface, so on a default page that border is the *only* thing drawing the control.
  `OTPInput` is the worst case — six empty, unlabelled boxes whose entire visual existence is a
  1.4:1 hairline.
- **#242 — focus ring.** `focus:outline-none` removes the UA outline; the replacement
  `--C-BORDER-FOCUS` ring measures **3.68:1** default and **14.84:1** `tech` (both fine) but
  **2.72:1** `events` and **2.96:1** `grimdark` — under the 3:1 WCAG 1.4.11 / 2.4.11 floor with no
  native fallback left. Across six identical OTP boxes, a keyboard user in those themes has to
  hunt for the focused one.

Both are token-level, so they are **one fix, not six**: raise `--C-BORDER-STRONG` and
`--C-BORDER-FOCUS` per theme measured against `--C-SURFACE-0` (not against `--C-CANVAS`), or give
form controls a dedicated boundary token. Keeping a transparent `outline` would also preserve a
UA indicator under forced-colors. Ratios computed with the same OKLCH→sRGB converter as
#206-207/#215.
