# Theme contract — component layer

**`@batthewz/response-ui-css` owns the theme contract.** Every `--C-*` colour, `--R-SIZE-*` step, `--H1`–`--H6`, `--BodyText-*`, `--RADIUS-*`, `--SHADOW-*`, `--MOTION-*`, `--OVERLAY-*` and font token is defined there, and its contract is authoritative for all of them:

- installed: `node_modules/@batthewz/response-ui-css/docs/theme-contract.md`
- online: <https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md>

**Read that first.** A theme is written against it, and a theme that satisfies it works here with nothing further.

This page covers only what _this_ package adds on top: tokens that exist because components exist, and the React-side way to switch a theme on. Nothing below is required — omit all of it and every component still themes correctly from the base contract.

> Same rule as the base contract on example themes: `default` is the only theme the design system defines. `events`, `grimdark` and `tech` are worked examples that nothing imports, sit outside semver, and are safe to delete. Where they appear below they are illustrations, never an authority.

---

## Dashboard — trend & chart

For data-viz / dashboard UIs. All optional. Defined in [`src/tokens.css`](../src/tokens.css) — these are the component layer's own, and the css package has no knowledge of them.

**Trend** is aliased to status on `:root`, so it inherits your status colors automatically — you don't need to set it. Override only to decouple trend direction from semantic status.

| Token | Default (aliases) |
| --- | --- |
| `--C-TREND-UP` | `var(--C-STATUS-SUCCESS)` |
| `--C-TREND-UP-BG` | `var(--C-STATUS-SUCCESS-BG)` |
| `--C-TREND-DOWN` | `var(--C-STATUS-ERROR)` |
| `--C-TREND-DOWN-BG` | `var(--C-STATUS-ERROR-BG)` |

**Chart** is a 5-hue categorical palette for series colors. The first three alias the contract so a retuned theme carries the chart with it; the last two have no contract twin and are literal.

| Token | Default |
| --- | --- |
| `--C-CHART-1` | `var(--C-ACCENT)` |
| `--C-CHART-2` | `var(--C-STATUS-SUCCESS)` |
| `--C-CHART-3` | `var(--C-STATUS-WARNING)` |
| `--C-CHART-4` | `oklch(0.5413 0.2466 293.01)` (purple) |
| `--C-CHART-5` | `oklch(0.6896 0.1037 218.62)` (cyan) |

The aliasing stops at three **on purpose**: the palette's job is that five series stay tellable apart, and the base contract lets one theme give two roles the same value. The default theme sets `--C-STATUS-INFO` equal to `--C-ACCENT`, and the `tech` example sets `--C-ACCENT` equal to `--C-STATUS-SUCCESS` — so extending the aliases would render two series identically in a theme that is otherwise perfectly valid. A repo-side guard measures the separation across the default theme plus the worked examples and fails the build if any pair collapses. That is a regression corpus, not a proof: it cannot see your theme, which is why the rule below is written down rather than enforced.

If you define your own theme, the same rule applies to you: **overriding `--C-ACCENT` moves `--C-CHART-1`.** Two contract tokens pointed at the same colour put two series at OKLab distance **0.000** — measured, and exactly what `tech` does without its override. A dark theme inheriting the light `:root` ramp is the other common failure. Both are fixed the same way: override `--C-CHART-1..5` in your own theme, raising the whole ramp's lightness (~0.65–0.78) if it's dark.

The examples' own chart and media overrides are not in `src/tokens.css` — that file names no theme. They sit in an opt-in stylesheet, `@batthewz/response-ui-react-components/examples/theme-tuning`, which nothing imports for you and which only ever names `events`, `grimdark` and `tech`. Read it as a worked reference; a consumer theme must carry the equivalent block in its own file.

---

## Media

```
--MEDIA-CARD-HOVER-SCALE, --MEDIA-CARD-HOVER-LIFT
```

Used by `MediaCard`. `SCALE` is a unit-less number (e.g. `1.02`); `LIFT` is a length (e.g. `-0.125rem`). Also this package's own — the base contract has no component physics in it.

---

## Tailwind utility mapping

The base mapping — `bg-surface-*`, `text-fg-*`, `p-r1`..`p-r6`, `text-h1`..`text-h6` and the rest — is in the [css package's contract](https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md#tailwind-utility-mapping). This package adds:

| Token | Utility |
| --- | --- |
| `--C-TREND-UP` | `text-trend-up`, `bg-trend-up` |
| `--C-TREND-UP-BG` | `bg-trend-up-bg` |
| `--C-TREND-DOWN` | `text-trend-down`, `bg-trend-down` |
| `--C-TREND-DOWN-BG` | `bg-trend-down-bg` |
| `--C-CHART-1..5` | `bg-chart-1`..`bg-chart-5`, `text-chart-1`..`text-chart-5` |

When extending utilities (adding new colors, etc.), expose them via `@theme inline` so the classes are generated, then teach `cn()` about them with `createCn` so conflicting classes still collapse correctly. See [docs/extending.md](./extending.md).

---

## Authoring workflow

Steps 1–6 — copy the template, set the selector, customize, load fonts, import after the package CSS — are in the [css package's authoring workflow](https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md#authoring-workflow). Two steps belong to this package and are easy to miss:

1. **Override `--C-CHART-1..5`** if you moved `--C-ACCENT`, `--C-STATUS-SUCCESS` or `--C-STATUS-WARNING`, or if your theme is dark. See [Dashboard — trend & chart](#dashboard--trend--chart) — skipping this is how two series end up the same colour.
2. **Register the theme name with `useTheme`.** The base contract's `setAttribute("data-theme", …)` works, but this package's hook and `ThemeSwitcher` need the name in their list:

   ```tsx
   const APP_THEMES = ["default", "aurora"] as const; // module scope, not inline
   const { setTheme } = useTheme({ themes: APP_THEMES });
   setTheme("aurora");
   ```

---

## Base contract — where each section went

This page used to restate the base contract in full. It no longer does: two copies of one contract drifted in both directions, and one of them ended up advertising a CLI that had been deleted nine minor versions earlier. The headings below are kept so existing links still land somewhere useful, and each one says where the real text is.

### Surfaces (layered backgrounds)

The surface ramp runs **raised → recessed**, in the **same lightness direction in every theme**: `0` is the lightest of the four in a light theme and in a dark one, `3` the darkest in both. `--C-CANVAS` is not an end of the scale — it is the page floor and sits **between rungs 1 and 2**, so `0`–`1` are raised above the page (cards, dialogs, popovers, sidebars, input fills) and `2`–`3` are recessed into it (hover washes, chips, tracks, disabled fills). A rung is still not an elevation: two things on the same rung are meant to look alike, and separating them is the job of `--SHADOW-*` and `--C-BORDER-DEFAULT`. Full section: [css contract → Surfaces](https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md#surfaces-layered-backgrounds).

### The contrast pairing

Fill tokens are guaranteed to contrast only their _paired_ foreground (`--C-TEXT-ON-PRIMARY` on `--C-PRIMARY`, each `--C-STATUS-*` on its `-BG`) — **never a surface**. Ink drawn directly on `--C-SURFACE-*` must use a `--C-TEXT-*` token. Full section: [css contract → The contrast pairing](https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md#the-contrast-pairing).

### Motion

`--MOTION-DURATION-*`, `--MOTION-EASE-*`, `--MOTION-DISTANCE-*`, `--MOTION-STAGGER-DELAY`, `--MOTION-PARALLAX-RATE`, `--MOTION-SCALE-*` and the page-transition tokens are all base contract. Full section: [css contract → Motion](https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md#motion).
