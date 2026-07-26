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

| Prop        | Type                                           | Default                |
| ----------- | ---------------------------------------------- | ---------------------- |
| `themes`    | `readonly string[]`                            | the four shipped themes |
| `labels`    | `Partial<Record<string, string>>`              | English theme names    |
| `className` | `string`                                       | —                      |
| `ref`       | `Ref<HTMLDivElement>`                          | —                      |
| …rest       | `div` props, **except `children`**             | —                      |

That is the entire surface: those two plus
`Omit<ComponentPropsWithRef<"div">, "children">`. There is no `value`/`onChange` — the
selected theme is `<html data-theme>`, which `useTheme` owns. `themes` and `labels` are what
make the control reusable outside the shipped four and outside English; see
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

`ThemeSwitcher` is a thin view over the `useTheme` hook — it calls `useTheme({ themes })`
itself, passing whatever you gave it (the four shipped themes if you gave nothing), and
renders one `<button>` per entry in the returned `themes` array. The two
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

Both are props, and they compose:

- **`themes`** is handed straight to `useTheme`, so a theme you register in your own CSS is
  selectable *and* correctly reported. Without it the component knows only the four shipped
  themes, and a page sitting on `data-theme="aurora"` would make it highlight **Default** —
  where clicking that apparently-already-selected option really does clear the theme.
  Declare the array at **module scope**: the hook memoises its snapshot reader on the array's
  identity, so a fresh literal every render rebuilds that reader every render.
- **`labels`** replaces option text, keyed by theme id. Anything you leave out keeps its
  English default (`Default` / `Events` / `Grimdark` / `Tech`); a theme with no default and
  no entry is labelled by its own id, so `aurora` reads as `aurora` until you name it.

<!-- example:AppThemesAndLabels -->
```tsx
<ThemeSwitcher
  themes={APP_THEMES}
  labels={{ default: "Standard", grimdark: "Sombre", aurora: "Aurore" }}
  aria-label="Thème"
/>
```
<!-- /example -->

The group's accessible name is changed the same way it always was, because `{...props}` is
spread after the built-in attributes:

<!-- example:RenameTheGroup -->
```tsx
<ThemeSwitcher aria-label="Colour theme" />
```
<!-- /example -->

What the props cannot change is the *markup*: one `<button role="radio">` per theme, and no
`children`. When you need a different shape — a select, a menu, buttons with icons — drop to
the hook; the component is about a hundred lines, and `useTheme` types `theme` and `setTheme`
to the exact union you hand it. The two lines the fence trims are
`const APP_THEMES = ["default", "grimdark", "aurora"] as const;` at **module scope** and
`const { theme, setTheme } = useTheme({ themes: APP_THEMES });` at the top of the component:

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
| Option label type · weight   | `--BodyText-2` · `--Semibold-Weight`  |
| Option label at rest         | `--C-TEXT-SECONDARY`                  |
| Option label hovered / selected | `--C-TEXT-PRIMARY`                 |
| Hover wash                   | `--C-SURFACE-1`                       |
| Selected option              | `--C-SURFACE-0` · `--SHADOW-SM`       |
| Option padding               | `--R-SIZE-6` block · `--R-SIZE-4` inline |
| Focus ring                   | `--C-BORDER-FOCUS`                    |
| Transition                   | `--DURATION-FAST` · `--MOTION-EASE-SHIFT` |

The three surfaces stack on purpose: the track sits one step *into* the page
(`--C-SURFACE-2`), the hover wash lifts one step (`--C-SURFACE-1`), and the selected option
lands on `--C-SURFACE-0`, the most-elevated surface, plus `--SHADOW-SM` — so selection reads
as raised without needing a border or an accent colour. Of the padding, only the inline side
is responsive: `--R-SIZE-4` steps `0.75rem` → `1.25rem` at the 40rem breakpoint while
`--R-SIZE-6` holds at `0.25rem` block-wise, so the control widens on desktop and grows taller
only by the label's own type step.

Label type reads the same `--BodyText-2` / `--Semibold-Weight` pair [Tabs](tabs.md) does, so
it follows a theme's typography and steps up (`0.8125rem` → `0.875rem`, `500` → `600`) at the
40rem breakpoint. The track's `1px` border and its `0.125rem` padding and gap are literals off
the contract, and can only be changed with your own CSS.

## Gotchas

- **Persistence is write-only.** `setTheme` writes `localStorage["theme"]`; nothing reads it
  back. Without the head script in [Persistence is your job](#persistence-is-your-job) the
  user's theme is gone on the next load — this is the single most common way to ship this
  component broken.
- **Without `themes` it shows only the four themes shipped by `@batthewz/response-ui-css`.**
  Pass an app-defined theme through `themes` or the switcher cannot select it — and when the
  document carries a `data-theme` value the switcher was not told about, it reports the first
  theme as selected while the page renders the other one.
- **A theme with no `labels` entry is labelled by its id.** The four shipped themes have
  English defaults; anything else reads as its raw `data-theme` value until you name it.
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

**The keyboard model matches the role.** The group is a single tab stop held by the checked
option, `←`/`↑` and `→`/`↓` move to the previous and next theme and *select* it, `Home` and
`End` jump to the first and last, and both directions wrap. Selection and focus are one
state machine — the tab stop is always the checked option, so clicking one moves the tab stop
too, and `Tab` re-enters where you left off. The roving `tabIndex`, and the DOM focus move
that follows it, both come from the package's `useRovingFocus` hook — `setFocusedIndex` moves
focus with the tab stop when the group already holds focus, and leaves it alone when it does
not. The key handling is the component's own, because the hook's handler
moves focus *without* selecting, which for a radiogroup would leave the tab stop and the
checked option in different places (the same split [Rating](rating.md) settled on).

Keyboard focus draws a 2px `--C-BORDER-FOCUS` outline on `:focus-visible`, **inset**
(`outline-offset: -2px`) like the sibling segmented control [Tabs](tabs.md): the track pads
its options by only `0.125rem`, so an outset ring would sit on the group border instead of
on the segment that actually holds focus. It re-tints with the theme like every other focus
indicator in the library.

The resting label is `--C-TEXT-SECONDARY` at `0.8125rem` on `--C-SURFACE-2`. No guard in
this repo measures contrast pairs, so check that one against your own theme's values.

## Related

[Button](button.md) · [Tabs](tabs.md) · [Radio](radio.md) · [Switch](switch.md) ·
[Theme contract](../theme-contract.md) · [Extending components](../extending.md)
