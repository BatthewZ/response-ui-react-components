# theme-switcher — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 91 · ThemeSwitcher — a radiogroup with none of the radiogroup keyboard contract (med)

ThemeSwitcher.tsx:31-40 gives each option `role="radio"`, `aria-checked` and
`onClick` — no `tabIndex`, no `onKeyDown`. Every option is a natively focusable
`<button>`, so the group is **four tab stops** instead of one and arrow keys are inert.
A screen reader announces "Theme radio group, Default 1 of 4" and then Right-arrow moves
nothing: the widget advertises navigation it does not implement.
**Fix:** `src/hooks/use-roving-focus.ts` already exports `getRovingProps` — wire
`useRovingFocus({ orientation: "horizontal" })` and spread it onto each option, exactly as
`Rating` does. It is currently the hook's **only** consumer, which is worth a sweep of its
own.

### 92 · ThemeSwitcher — hard-bound to the built-in theme list, and mis-reports the active one (med)

ThemeSwitcher.tsx:20 calls `useTheme()` with no arguments, so it takes
`options?.themes ?? THEMES` (use-theme.ts:64), and its props type
(`Omit<ComponentPropsWithRef<"div">, "children">`, :7) offers no way to pass a list. An app
that registers `useTheme({ themes: ["default","grimdark","aurora"] })` and sets
`data-theme="aurora"` gets a switcher showing only the four built-ins — and its own
snapshot (use-theme.ts:17, `themes.includes(attr)`) rejects "aurora" and returns the
fallback, so **`aria-checked="true"` sits on "Default" while the page renders aurora**.
Inversely, an app shipping two themes still gets buttons for `events`/`tech` that navigate
to unstyled pages.
**Fix:** accept an optional `themes` prop and forward it to `useTheme`, so the switcher and
the app share one list.

### 93 · ThemeSwitcher — option labels are unreachable English (med)

`LABELS` (ThemeSwitcher.tsx:9) is module-private, rendered at :39, and `children` is
stripped from the props type at :7 — so the visible *and* accessible name of every radio is
unreachable from outside the file. A French-locale app renders "Default / Events /
Grimdark / Tech" with no prop, no context and no export to change it; the only remedy is
forking the component. Note the claim is precise about *option* text: the group's
`aria-label="Theme"` at :27 **is** overridable, because `{...props}` spreads after it.
**Fix:** accept `labels?: Partial<Record<Theme, string>>` (or a render prop) falling back
to the current map. Pattern: *hard-coded English in unreachable text*, with #39.
