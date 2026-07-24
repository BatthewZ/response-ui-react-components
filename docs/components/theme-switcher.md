# ThemeSwitcher

The segmented control that flips `data-theme` on `<html>` — the switch behind the
library's "one attribute reskins everything" claim. Drop it in a navbar and the four
shipped themes are one click apart, with no state, no provider, and nothing to wire.
Remembering the choice is the one thing it doesn't do: it writes `localStorage["theme"]` and
never reads it back, so without a restore script of your own the theme resets on reload.

<!-- example:Minimal -->
```tsx
<ThemeSwitcher />
```
<!-- /example -->

| Prop        | Type                                           | Default |
| ----------- | ---------------------------------------------- | ------- |
| `className` | `string`                                       | —       |
| `ref`       | `Ref<HTMLDivElement>`                          | —       |
| …rest       | `div` props, **except `children`**             | —       |

That is the entire surface: `Omit<ComponentPropsWithRef<"div">, "children">`. There is no
`themes` prop, no `labels` prop, no `value`/`onChange`. The theme list and its four English
labels are module constants inside `ThemeSwitcher.tsx` — see
[Custom themes and other languages](#custom-themes-and-other-languages).

<!-- example:InANavbar -->
```tsx
<header className="flex items-center justify-between gap-r4 rounded-lg bg-surface-1 px-r4 py-r5">
  <span className="text-h6">Response UI</span>
  <ThemeSwitcher />
</header>
```
<!-- /example -->

## How it switches

`ThemeSwitcher` is a thin view over the `useTheme` hook — it calls `useTheme()` itself, with
no arguments, and renders one `<button>` per entry in the returned `themes` array. The two
are both public exports of the package, and the split of responsibilities is worth knowing
before you mix them:

| Concern                                             | Owner                        |
| --------------------------------------------------- | ---------------------------- |
| Option markup, `role`/`aria-checked`, active styling | `ThemeSwitcher`              |
| Reading the current theme                            | `useTheme` (from the DOM)    |
| Writing / removing the `data-theme` attribute        | `useTheme`'s `setTheme`      |
| Writing `localStorage["theme"]`                      | `useTheme`'s `setTheme`      |
| Reading that key back on load                        | **nobody — see below**       |

`useTheme` keeps **no React state** for the theme. It reads `<html data-theme>` through
`useSyncExternalStore`, subscribed to a `MutationObserver` watching that element's
attributes. The DOM attribute is the single source of truth, and everything re-reads it on
change — so a `ThemeSwitcher`, a second `ThemeSwitcher`, your own
`document.documentElement.setAttribute("data-theme", …)` call, and any `useTheme()` caller
all stay in sync with no shared context. Every fence on this page is the `return` JSX of a
compiled example, so the hook calls above it are trimmed off — here `theme` is a plain
`const { theme } = useTheme()` in the same component, and nothing connects it to the
neighbouring `ThemeSwitcher` but the attribute:

<!-- example:WithLiveReadout -->
```tsx
<div className="flex items-center gap-r5">
  <ThemeSwitcher />
  <span className="text-body-3 text-fg-secondary">Active theme: {theme}</span>
</div>
```
<!-- /example -->

Selecting the first theme (`default`) **removes** the attribute instead of writing
`data-theme="default"`, because the default theme is `:root` itself — see the
[theme contract](../theme-contract.md).

## Persistence is your job

`setTheme` writes the chosen theme to `localStorage["theme"]`, and clears the key when you
pick `default`. **Nothing in this package ever reads that key back.** There is no
initialisation effect, no provider, no bootstrap — the only thing in this package that ever
sets the attribute is a `setTheme` call.

So with `ThemeSwitcher` alone: pick Grimdark, reload, and you are on Default again. The
choice is not flashed-then-restored, it is silently discarded.

The missing half is a blocking, inline `<script>` in the document `<head>`, placed above
your stylesheet so the attribute exists before the first paint:

<!-- example:RestoreThemeBeforeFirstPaint -->
```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
  }}
/>
```
<!-- /example -->

It lives outside the component because only your document shell can run code that early —
in a Next.js `app/layout.tsx` `<head>`, or in `index.html` for Vite. It must be **inline
and synchronous**: a `<script src>`, a `defer`/`async` script, or the same logic in a React
`useEffect` all run after the first paint, which is exactly what produces a visible flash of
the default theme before the real one lands. The key name is also exported as
`STORAGE_KEY` if you would rather generate the script than hard-code `"theme"`.

## Server rendering

Both `ThemeSwitcher.tsx` and `use-theme.ts` are `"use client"`, so this needs a client
boundary in an RSC tree. On the server `document` is undefined: `setTheme` returns early and
does nothing, and `useSyncExternalStore`'s server snapshot returns `themes[0]` — so the HTML
always ships with **Default** checked, whatever the user picked. React reuses that server
snapshot for the hydration render and re-reads the store straight after, so the markup
matches and the checked option corrects itself a beat later. With the head script above the
*page* is already correctly themed by then; only the switcher's own checkmark catches up.

## Custom themes and other languages

Two hard limits, both flowing from the same line — `ThemeSwitcher` calls `useTheme()` with
no options, so it always gets the four shipped themes:

- **The theme list is fixed.** A theme you register elsewhere with
  `useTheme({ themes: [...] })` is invisible to it. Worse, when the page *is* on that theme,
  the switcher's own `useTheme()` doesn't recognise the attribute value and falls back to
  the first entry — so it highlights **Default** while an `aurora` page renders around it,
  and clicking that apparently-already-selected Default really does clear the theme.
- **The labels are hard-coded English.** `Default` / `Events` / `Grimdark` / `Tech` come
  from a module-private map, and `children` is omitted from the props, so there is no way to
  translate or rename an option from outside the component.

The group's accessible name is the one string you *can* change, because `{...props}` is
spread after the built-in attributes:

<!-- example:RenameTheGroup -->
```tsx
<ThemeSwitcher aria-label="Colour theme" />
```
<!-- /example -->

When either limit bites, drop to the hook — the component is about twenty lines, and
`useTheme` types `theme` and `setTheme` to the exact union you hand it. The two lines the
fence trims are `const APP_THEMES = ["default", "grimdark", "aurora"] as const;` at **module
scope** and `const { theme, setTheme } = useTheme({ themes: APP_THEMES });` at the top of the
component:

<!-- example:CustomSwitcher -->
```tsx
<div role="group" aria-label="Theme">
  <Button
    type="button"
    size="sm"
    variant={theme === "default" ? "primary" : "ghost"}
    aria-pressed={theme === "default"}
    onClick={() => setTheme("default")}
  >
    System
  </Button>
  <Button
    type="button"
    size="sm"
    variant={theme === "grimdark" ? "primary" : "ghost"}
    aria-pressed={theme === "grimdark"}
    onClick={() => setTheme("grimdark")}
  >
    Grimdark
  </Button>
  <Button
    type="button"
    size="sm"
    variant={theme === "aurora" ? "primary" : "ghost"}
    aria-pressed={theme === "aurora"}
    onClick={() => setTheme("aurora")}
  >
    Aurora
  </Button>
</div>
```
<!-- /example -->

Module scope for `APP_THEMES` is not stylistic. The hook memoises its snapshot reader on the
array's identity, so an inline `useTheme({ themes: ["default", "aurora"] as const })` — a
fresh reference every render — rebuilds that reader on every render instead.

## Theme tokens

The component uses **no Tailwind utilities**; its `.tsx` carries only three BEM class names
and every rule lives in `ThemeSwitcher.css`, reading contract variables directly. The
control that changes your theme is itself fully themed by that theme.

| Where                        | Override                              |
| ---------------------------- | ------------------------------------- |
| Track fill · track border    | `--C-SURFACE-2` · `--C-BORDER-DEFAULT` |
| Track corners · option corners | `--RADIUS-LG` · `--RADIUS-MD`       |
| Option label at rest         | `--C-TEXT-SECONDARY`                  |
| Option label hovered / selected | `--C-TEXT-PRIMARY`                 |
| Hover wash                   | `--C-SURFACE-1`                       |
| Selected option              | `--C-SURFACE-0` · `--SHADOW-SM`       |
| Option padding               | `--R-SIZE-6` block · `--R-SIZE-4` inline |
| Transition                   | `--DURATION-FAST` · `--MOTION-EASE-SHIFT` |

The three surfaces stack on purpose: the track sits one step *into* the page
(`--C-SURFACE-2`), the hover wash lifts one step (`--C-SURFACE-1`), and the selected option
lands on `--C-SURFACE-0`, the most-elevated surface, plus `--SHADOW-SM` — so selection reads
as raised without needing a border or an accent colour. Only the inline padding is
responsive: `--R-SIZE-4` steps `0.75rem` → `1.25rem` at the 40rem breakpoint while
`--R-SIZE-6` holds at `0.25rem` on both sides, so the control widens on desktop but never
gets taller.

Four values are **not** on the contract. The label's `font-size` (`0.8125rem`) and
`font-weight` (`500`) are hard literals rather than `--BodyText-2` / `--Semibold-Weight`.
`0.8125rem` is exactly what `--BodyText-2` resolves to at base, so the literal freezes today's
value: label type neither follows a theme's typography nor steps up to `0.875rem` at the 40rem
breakpoint the way [Tabs](tabs.md) labels do, which read that very pair. The track's `1px` border and its `0.125rem` padding and gap are
literals too, and can only be changed with your own CSS.

## Gotchas

- **Persistence is write-only.** `setTheme` writes `localStorage["theme"]`; nothing reads it
  back. Without the head script in [Persistence is your job](#persistence-is-your-job) the
  user's theme is gone on the next load — this is the single most common way to ship this
  component broken.
- **It only ever shows the four themes shipped by `@batthewz/response-ui-css`.** It cannot
  select an app-defined theme, and when the document carries a `data-theme` value it doesn't
  know, it reports the first theme as selected while the page renders the other one.
- **Labels are unreachable.** No `labels` prop, no `children` — the English strings cannot
  be translated or shortened. `aria-label` on the group is the only overridable text.
- **`children` is a type error, not a silent drop.** The props `Omit` it, so
  `<ThemeSwitcher>…</ThemeSwitcher>` won't compile — better than dropping it at runtime, but
  it also means the option row is not composable.
- **Don't override `role`.** `{...props}` spreads last, so `role="group"` *will* replace
  `radiogroup` on the container — but the options keep `role="radio"`, which ARIA requires
  to be owned by a radiogroup. You would trade one broken pattern for a worse one.
- **Needs the package stylesheet.** The rules ship in `ThemeSwitcher.css` via the package's
  `styles` entry; without that import the control is four unstyled buttons in a row.

## Accessibility

The container is `role="radiogroup"` with `aria-label="Theme"`; each option is a
`<button type="button">` with `role="radio"` and `aria-checked`. Selection is carried by
that ARIA state and by a visible text label, not by colour alone — so the "status by colour"
trap the library falls into elsewhere is avoided here.

**The keyboard model does not match the role, though.** A radiogroup is expected to be a
single tab stop, with arrow keys moving between and selecting options. `ThemeSwitcher`
implements none of that — no `tabIndex`, no `onKeyDown` — so all four options are separate
tab stops and arrow keys do nothing. A screen reader announces "Theme, radio group,
Default, 1 of 4" and then the interaction that announcement promises isn't there. It is a
row of buttons wearing a radiogroup role. The library has the pieces to do it properly:
[Tabs](tabs.md) implements roving focus, and the package exports a `useRovingFocus` hook.

`ThemeSwitcher.css` defines no `:focus-visible` rule and removes no outline, so keyboard
focus falls back to the browser's default ring. It is visible, but it is one of only two
focus indicators in the library that neither match the others nor re-tint from
`--C-BORDER-FOCUS` — the other being `Collapsible`'s trigger `<button>`, which has no focus
styling in its `.tsx` or its `.css` either.

The resting label is `--C-TEXT-SECONDARY` at `0.8125rem` on `--C-SURFACE-2`. No guard in
this repo measures contrast pairs, so check that one against your own theme's values.

## Related

[Button](button.md) · [Tabs](tabs.md) · [Radio](radio.md) · [Switch](switch.md) ·
[Theme contract](../theme-contract.md) · [Extending components](../extending.md)
