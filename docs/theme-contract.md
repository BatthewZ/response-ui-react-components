# Theme contract

A theme is a CSS rule that overrides design-system tokens under a `data-theme` selector. The contract below is the authoritative list — any custom theme MUST define the **required** variables; **optional** ones inherit from `:root` if omitted.

> Selector convention: `:root[data-theme="<name>"]`. The `default` theme IS `:root` itself (no override layer); switching to `default` removes the `data-theme` attribute.

---

## Required

### Color scheme

```css
color-scheme: light | dark;
```

Drives form-control colors, default scrollbar appearance, etc. Set this — don't omit it.

### Brand colors

| Variable | Notes |
| --- | --- |
| `--C-CANVAS` | Page background |
| `--C-PRIMARY` | Brand primary fill |
| `--C-PRIMARY-HOVER` | Primary hover state |
| `--C-PRIMARY-ACTIVE` | Primary pressed state |
| `--C-SECONDARY` | Secondary fill |
| `--C-SECONDARY-HOVER` | Secondary hover state |
| `--C-ACCENT` | Brand accent (e.g. links, focus indicators) |
| `--C-ACCENT-HOVER` | Accent hover state |

All colors are OKLCH. Use OKLCH in your custom theme.

### Surfaces (layered backgrounds)

| Variable | Use |
| --- | --- |
| `--C-SURFACE-0` | Most foreground / most-elevated (usually on top of a popover scrim) |
| `--C-SURFACE-1` | Cards, navbar |
| `--C-SURFACE-2` | Slightly deeper containers |
| `--C-SURFACE-3` | Deepest container, often used for inputs/recessed regions |

For light themes these typically run from white → light gray. For dark themes, dark → slightly lighter shades.

### Text

| Variable | Use |
| --- | --- |
| `--C-TEXT-PRIMARY` | Default body text |
| `--C-TEXT-SECONDARY` | De-emphasized text (captions, helpers) |
| `--C-TEXT-MUTED` | Most-muted (placeholders, hints) |
| `--C-TEXT-INVERSE` | Text on a dark surface in a light theme (and vice versa) |
| `--C-TEXT-ON-PRIMARY` | Text drawn on `--C-PRIMARY` fill |
| `--C-TEXT-ON-ACCENT` | Text drawn on `--C-ACCENT` fill |

### Borders

| Variable | Use |
| --- | --- |
| `--C-BORDER-DEFAULT` | Default border (cards, inputs) |
| `--C-BORDER-STRONG` | Higher-contrast border |
| `--C-BORDER-FOCUS` | Focus ring color |

### Status

Each status has a foreground color and a tinted background:

| Foreground | Background |
| --- | --- |
| `--C-STATUS-ERROR` | `--C-STATUS-ERROR-BG` |
| `--C-STATUS-SUCCESS` | `--C-STATUS-SUCCESS-BG` |
| `--C-STATUS-WARNING` | `--C-STATUS-WARNING-BG` |
| `--C-STATUS-INFO` | `--C-STATUS-INFO-BG` |

### The contrast pairing

A few of the colour tokens above are meant to be used **together**: a fill with the text
that sits on it, and each status colour with its tinted background.

| Draw this… | …on this |
| --- | --- |
| `--C-TEXT-ON-PRIMARY` | `--C-PRIMARY` |
| `--C-TEXT-ON-ACCENT` | `--C-ACCENT` |
| `--C-STATUS-*` (foreground) | `--C-STATUS-*-BG` |

**The intention.** Each pair is designed to read against *itself* — the `on-*` text is
chosen to be legible on its own fill, and the components use these pairings for their
defaults. That is the whole of it. It is a **convention, not a measured ratio**: this file
names the pairings, never a number, and says nothing about a fill set against a `surface-*`,
against `--C-CANVAS`, or over an image. (It is also why a focus ring earns its keep — a fill
is only reliably distinct from its *paired text*, not from whatever surface it happens to
sit on.)

**You can do whatever you like.** Re-tint any token; the pairing is a default, not a rule
the system enforces. Two things to keep in mind if you stray from it: when you redefine a
pair, move both so they still read against each other; and when you put a fill token
somewhere other than under its paired text — on a surface, over a photo — the pairing says
nothing about that, so check the contrast yourself.

### Typography

| Variable | Notes |
| --- | --- |
| `--DEFAULT-FONT` | Body font-family |
| `--DEFAULT-MONO-FONT` | Monospace font-family |
| `--HEADING-FONT` | Heading font-family (often = `--DEFAULT-FONT`) |
| `--HEADING-LETTER-SPACING` | `normal` or a `<length>` like `0.06em` |
| `--HEADING-TEXT-TRANSFORM` | `none` / `uppercase` / `lowercase` |

If you use a font that's not already loaded by `@batthewz/response-ui-css`, import the font-face yourself before your theme CSS.

---

## Optional (inherit from `:root` if omitted)

Override only what you want to change.

### Radius

```
--RADIUS-SM, --RADIUS-MD, --RADIUS-LG, --RADIUS-XL, --RADIUS-FULL
```

Defaults: `0.25rem / 0.5rem / 0.75rem / 1rem / 9999px`. Map to `rounded-sm`, `rounded-md`, etc. via `@theme inline`.

### Shadows

```
--SHADOW-SM, --SHADOW-MD, --SHADOW-LG
```

Map to `shadow-sm`, `shadow-md`, `shadow-lg`. For dark themes you'll often want deeper, less-blurry shadows.

### Typography scales

Each has both a base value and a `@media (width >= 40rem)` override (these scale up at 640px). If you override them, override at both breakpoints in the same media-query structure as `responsive/text.css`.

`--H*`, `--BodyText-*` and `--R-SIZE-*` all share one numbering rule: **`1` is always the most significant value; a higher number never carries a larger value.** Hold that direction when you re-theme — inverting it is what makes an `h6` outshout an `h1`.

The rule is a direction, not a strict ordering: equal neighbours are allowed, and one ships. Above `40rem` the default scale sets both `--H5` and `--H6` to `1.25rem`, so at that breakpoint an `h5` and an `h6` are the same size and are told apart by weight alone (`700` against `600`). Below it the H scale descends strictly, as `--BodyText-*` and `--R-SIZE-*` do at both breakpoints.

```
--H1, --H1-line-height        (down through H6)
--BodyText-1, --BodyText-1-line-height  (down through BodyText-3)
--Bold-Weight, --Semibold-Weight
```

### Responsive spacing scale

```
--R-SIZE-1, --R-SIZE-2, --R-SIZE-3, --R-SIZE-4, --R-SIZE-5, --R-SIZE-6
```

Maps to `p-r1`, `m-r1`, `gap-r1`, etc. Has a base + `@media (width >= 40rem)` step-up. `--R-SIZE-1` is the largest gap, `--R-SIZE-6` the tightest.

### Motion

```
--MOTION-DURATION-{ENTER,EXIT,SHIFT,PAGE}
--MOTION-EASE-{PAGE,ENTER,EXIT,SHIFT,BOUNCE}
--MOTION-DISTANCE-{SM,MD,LG}
--MOTION-STAGGER-DELAY
--MOTION-PARALLAX-RATE
--MOTION-SCALE-{HOVER,PRESS}
--MOTION-PAGE-TRANSITION-IN, --MOTION-PAGE-TRANSITION-OUT  (names of @keyframes you define)
--MOTION-PAGE-NEW-ANIMATION-FILL-MODE, --MOTION-PAGE-OLD-ANIMATION-FILL-MODE
```

If you set `--MOTION-PAGE-TRANSITION-IN` / `OUT`, you also need to define the named `@keyframes` in your theme file.

### Transitions

```
--DURATION-FAST, --DURATION-NORMAL, --DURATION-SLOW
```

Map to `duration-fast`, `duration-normal`, `duration-slow`.

### Overlay

```
--OVERLAY-SCRIM-COLOR
--OVERLAY-GRADIENT-START, --OVERLAY-GRADIENT-END
--OVERLAY-BLUR, --OVERLAY-BLUR-HEAVY
```

Used by Spotlight, Carousel overlays, modal scrims.

### Media

```
--MEDIA-CARD-HOVER-SCALE, --MEDIA-CARD-HOVER-LIFT
```

Used by `MediaCard`. `SCALE` is a unit-less number (e.g. `1.02`); `LIFT` is a length (e.g. `-0.125rem`).

### Dashboard — trend & chart

For data-viz / dashboard UIs. All optional.

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

The aliasing stops at three **on purpose**: the palette's job is that five series stay tellable apart, and this contract lets one theme give two roles the same value. The default theme sets `--C-STATUS-INFO` equal to `--C-ACCENT`, and `tech` sets `--C-ACCENT` equal to `--C-STATUS-SUCCESS` — so extending the aliases would render two series identically in a shipped theme. A repo-side guard measures the separation in all four themes and fails the build if any pair collapses.

If you define your own theme, the same rule applies to you: **overriding `--C-ACCENT` moves `--C-CHART-1`.** If that puts it near chart-3, chart-4 or chart-5, override the chart tokens too. For dark themes raise the whole ramp's lightness (~0.65–0.78) so series stay legible — `grimdark` and `tech` do exactly this and therefore override all five.

---

## Tailwind utility mapping

`@theme inline` blocks expose tokens to Tailwind utilities. The mapping follows a `--SCREAMING-CASE-FOR-TOKEN` → `lowercase-kebab-for-utility` convention with one wrinkle: `--C-TEXT-*` → `text-fg-*`.

| Token | Utility |
| --- | --- |
| `--C-CANVAS` | `bg-canvas` |
| `--C-PRIMARY` (and `-HOVER`, `-ACTIVE`) | `bg-primary`, `bg-primary-hover`, `bg-primary-active` (also `text-`, `border-`, `ring-`) |
| `--C-SECONDARY` (and `-HOVER`) | `bg-secondary`, `bg-secondary-hover` |
| `--C-ACCENT` (and `-HOVER`) | `bg-accent`, `bg-accent-hover` |
| `--C-SURFACE-0..3` | `bg-surface-0`, `bg-surface-1`, `bg-surface-2`, `bg-surface-3` |
| `--C-TEXT-PRIMARY` | `text-fg-primary` |
| `--C-TEXT-SECONDARY` | `text-fg-secondary` |
| `--C-TEXT-MUTED` | `text-fg-muted` |
| `--C-TEXT-INVERSE` | `text-fg-inverse` |
| `--C-TEXT-ON-PRIMARY` | `text-fg-on-primary` |
| `--C-TEXT-ON-ACCENT` | `text-fg-on-accent` |
| `--C-BORDER-DEFAULT` | `border-border-default`, `ring-border-default` |
| `--C-BORDER-STRONG` | `border-border-strong` |
| `--C-BORDER-FOCUS` | `border-border-focus`, `ring-border-focus` |
| `--C-STATUS-ERROR` | `text-status-error`, `bg-status-error` |
| `--C-STATUS-ERROR-BG` | `bg-status-error-bg` |
| (same for SUCCESS, WARNING, INFO) | |
| `--C-TREND-UP` _(optional)_ | `text-trend-up`, `bg-trend-up` |
| `--C-TREND-UP-BG` _(optional)_ | `bg-trend-up-bg` |
| `--C-TREND-DOWN` _(optional)_ | `text-trend-down`, `bg-trend-down` |
| `--C-TREND-DOWN-BG` _(optional)_ | `bg-trend-down-bg` |
| `--C-CHART-1..5` _(optional)_ | `bg-chart-1`..`bg-chart-5`, `text-chart-1`..`text-chart-5` |
| `--R-SIZE-1..6` | `p-r1`..`p-r6`, `m-r1`..`m-r6`, `gap-r1`..`gap-r6` (works with all spacing utilities) |
| `--H1..H6` | `text-h1`..`text-h6` |
| `--BodyText-1..3` | `text-body-1`, `text-body-2`, `text-body-3` |
| `--RADIUS-SM..XL` | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` |
| `--RADIUS-FULL` | `rounded-full` |
| `--SHADOW-SM..LG` | `shadow-sm`, `shadow-md`, `shadow-lg` |
| `--MOTION-DURATION-ENTER` | `duration-enter` |
| `--MOTION-EASE-ENTER` | `ease-enter` |
| `--DURATION-FAST` | `duration-fast` |

When extending utilities (adding new colors, etc.), expose them via `@theme inline` so the classes are generated, then teach `cn()` about them with `createCn` so conflicting classes still collapse correctly. See [docs/extending.md](./extending.md).

---

## Authoring workflow

1. Copy the template:
   ```bash
   cp node_modules/@batthewz/response-ui-css/src/_theme-template.css ./src/themes/aurora.css
   ```
2. Change the selector to `:root[data-theme="aurora"]`.
3. Customize the required variables. Leave optionals commented out — uncomment only those you actually want to override.
4. Import after the main package CSS:
   ```css
   @import "@batthewz/response-ui-css";
   @import "./themes/aurora.css";
   ```
5. Register the theme name with `useTheme`:
   ```tsx
   const { setTheme } = useTheme({ themes: ["default", "aurora"] as const });
   setTheme("aurora");
   ```

Or generate from JSON:

```bash
bunx @batthewz/response-ui-css theme-from-json my-theme.json --name aurora > src/themes/aurora.css
```

Input shape:

```json
{
  "name": "aurora",
  "colorScheme": "dark",
  "vars": {
    "--C-CANVAS": "oklch(0.18 0.04 270)",
    "--C-PRIMARY": "oklch(0.6 0.15 220)",
    "...": "..."
  }
}
```
