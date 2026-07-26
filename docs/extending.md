# Building your own components on top

This guide is for consumers who want to use `@batthewz/response-ui-react-components` as a
base and **extend it** — keep the components you like (Button, Card, Dialog…), and add
your own that share the same design-token system. A common case: a more dashboard-flavoured
library with charts, graphs, and data widgets.

This package depends on, and builds on:

- [`@batthewz/response-ui-css`](https://github.com/BatthewZ/response-ui-css) — the token /
  theme / responsive foundation.
- [`@batthewz/response-ui-tw-merge`](https://github.com/BatthewZ/response-ui-tw-merge) —
  the `cn()` / `tailwind-merge` config (also re-exported from this package).

You'll touch all three layers when you extend, so it helps to know which layer owns what.

---

## Recommended model: build *on top*, don't fork

Make your own package (or an `app/ui` folder) that **depends on** these packages,
**re-exports** what you keep, and **adds** your own components beside them:

```
your-dashboard-ui/
  package.json        → depends on @batthewz/response-ui-{css,react-components}
  src/
    index.ts          → re-export kept components + export your own
    cn.ts             → project-local cn() aware of your custom tokens
    tokens.css        → your domain tokens (chart colours, etc.)
    styles.css        → aggregates your component CSS + @source
    components/
      BarChart.tsx
      BarChart.css
```

```ts
// src/index.ts
export { Button, Card, Dialog, useTheme } from "@batthewz/response-ui-react-components";
export { BarChart } from "./components/BarChart";
```

Why on-top rather than a fork? You inherit upstream fixes and new components for free, you
keep a clean dependency direction, and you never maintain a merge. Fork only if you need to
change the *internals* of an existing component — and even then, prefer a wrapper that
composes the original and overrides via `className`.

---

## Setup

Install the runtime packages and Tailwind v4:

```bash
bun add @batthewz/response-ui-react-components @batthewz/response-ui-css \
  react react-dom @floating-ui/react lucide-react
bun add -D tailwindcss @tailwindcss/vite
```

The CSS import order is **foundation → package components → your tokens → your component
CSS**, and finally a `@source` so Tailwind generates the utilities you use:

```css
/* your app's CSS entry */
@import "@batthewz/response-ui-css";                       /* tokens, themes, scales, base */
@import "@batthewz/response-ui-react-components/styles";    /* kept components' CSS */
@import "./tokens.css";                                     /* your domain tokens */
@import "./styles.css";                                     /* your components' CSS */
```

Order matters: every later file reads `var(--…)` defined by the foundation, so the
foundation has to load first. The package's own component styles already register their
source internally, so kept components render with no extra setup.

---

## Writing a token-compliant component

Mirror the conventions this package follows. Co-locate a CSS file with each component,
style with tokens (never raw values), and compose class names through `cn()`:

```tsx
// src/components/BarChart.tsx
import { forwardRef } from "react";
import type { ComponentPropsWithRef } from "react";
import { cn } from "../cn";
import "./BarChart.css";

export interface BarChartProps extends ComponentPropsWithRef<"div"> {
  series: { label: string; value: number }[];
}

export const BarChart = forwardRef<HTMLDivElement, BarChartProps>(function BarChart(
  { series, className, ...props },
  ref
) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div ref={ref} className={cn("bar-chart", className)} {...props}>
      {series.map((s, i) => (
        <div
          key={s.label}
          className="bar-chart-bar"
          style={{
            height: `${(s.value / max) * 100}%`,
            // cycle the 5-hue palette this package already ships
            background: `var(--C-CHART-${(i % 5) + 1})`,
          }}
        />
      ))}
    </div>
  );
});
```

```css
/* src/components/BarChart.css */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: var(--R-SIZE-5);
  padding: var(--R-SIZE-3);
  background: var(--C-SURFACE-1);
  border: 1px solid var(--C-BORDER-DEFAULT);
  border-radius: var(--RADIUS-MD);
}
.bar-chart-bar {
  flex: 1;
  border-radius: var(--RADIUS-SM) var(--RADIUS-SM) 0 0;
}
```

Conventions worth keeping (the same ones this package enforces on itself):

- Spacing `p-r3 gap-r4`, not `p-4 gap-6`. Text `text-h2 text-body-2`, not `text-3xl`.
  Colour `bg-surface-1 text-fg-primary border-border-default`, not `bg-gray-100`.
- Always wrap `className` with `cn(...)` so consumer overrides merge cleanly.
- Components are `forwardRef`; type props as `ComponentPropsWithRef<"div">` (or the right
  element). Prefer semantic HTML over generic `<div>`.
- Honour the contrast contract: ink/borders on a surface use text tokens; filled chips are
  outlined in their `on-*` token.

---

## Generating utilities for *your* source

Aggregate your component CSS and register your own source so Tailwind emits the classes you
write. Keep the `@source` path **self-relative** — never point sideways into another
package's `node_modules`, which breaks under bun/pnpm isolated stores:

```css
/* src/styles.css */
@import "./components/BarChart.css";
/* …more components… */

@source "./**/*.{ts,tsx}"; /* relative to THIS file */
```

---

## Charts & dashboards specifically

This package already ships the dashboard vocabulary — once `.../styles` is imported you
have these without defining anything:

- **Chart palette:** `bg-chart-1` … `bg-chart-5` (and the raw `--C-CHART-1..5`), a 5-hue
  categorical set. `chart-1..3` alias `--C-ACCENT` / `--C-STATUS-SUCCESS` /
  `--C-STATUS-WARNING`, so they track your theme; `chart-4..5` are literal. For more than
  five series, cycle with modulo (`(i % 5) + 1`) as above, or add your own `--C-CHART-6…`
  tokens (see "Custom tokens" below).
- **Trend colours:** `text-trend-up` / `text-trend-down` (and `-bg` variants). These alias
  the theme's status colours by default, so they track every theme automatically.
- **Composable primitives:** `Sparkline`, `ProgressRing`, `Meter`, `DescriptionList`,
  `ActivityFeed` — build StatCards, KPI tiles, and dashboards by composing these with
  layout primitives (`Stack`, `Row`, `Container`) and `Card`.

For dark themes, raise chart-colour lightness (~0.65–0.78) so series stay legible — see the
optional dashboard tokens in [docs/theme-contract.md](./theme-contract.md). Because
`chart-1..3` alias the contract, retinting `--C-ACCENT` also moves `chart-1`: if that lands
it near another series, override the chart tokens for that theme as `grimdark` and `tech` do.

If you wire a charting library (Recharts, visx, D3…), feed it the resolved token values so
it stays themable, e.g. read `getComputedStyle(el).getPropertyValue("--C-CHART-1")`, or set
SVG `fill`/`stroke` to `var(--C-CHART-n)` directly.

---

## Custom tokens for your components

Domain tokens (extra chart hues, a brand colour, a widget-specific spacing) belong in
*your* layer, not the foundation. Adding one is two independent steps:

1. **Generate** the utility — define the value and expose it via `@theme inline` in your
   `tokens.css`. (Foundation mechanics: see the
   [`@batthewz/response-ui-css`](https://github.com/BatthewZ/response-ui-css) extending
   guide.)

   ```css
   /* src/tokens.css */
   :root {
     --C-CHART-6: oklch(0.62 0.16 320);
   }
   @theme inline {
     --color-chart-6: var(--C-CHART-6); /* makes bg-chart-6 / text-chart-6 exist */
   }
   ```

2. **Teach `cn()`** so it dedupes the new class. `createCn` is re-exported from this
   package:

   ```ts
   // src/cn.ts
   import { createCn } from "@batthewz/response-ui-react-components";

   export const cn = createCn({
     theme: { color: ["chart-6", "brand-primary"] },
   });
   ```

   `mergeExtension`, `tailwindMergeExtension`, and `twMerge` are exported too for power
   users. Details:
   [`@batthewz/response-ui-tw-merge`](https://github.com/BatthewZ/response-ui-tw-merge).

---

## Server Components (`"use client"`)

If your components are interactive (state, effects, event handlers, refs to DOM), add the
`"use client"` directive at the top of the file. Keep purely presentational components
(static markup, layout) free of it so they remain server-renderable. Don't read
`process.env` / `import.meta.env` in a Client Component, and don't put the directive on a
barrel/index file.

---

## Theming

Your components automatically respond to the active theme because they style with tokens.
To offer custom themes, write a theme CSS file against the contract, import it after
`@batthewz/response-ui-css`, then register the name:

```ts
import { useTheme } from "@batthewz/response-ui-react-components";

const { theme, setTheme } = useTheme({ themes: ["default", "aurora"] as const });
```

See [docs/theme-contract.md](./theme-contract.md) for the required/optional token schema,
including the optional dashboard (trend + chart) section.

---

## Checklist

- [ ] Built *on top* (depend + re-export), not forked
- [ ] CSS import order: foundation → package styles → your tokens → your styles
- [ ] Components `forwardRef`, semantic HTML, `cn()` around `className`
- [ ] Tokens not raw values; contrast contract honoured
- [ ] Your source registered with a self-relative `@source`
- [ ] Custom tokens both **generated** (`@theme inline`) and **registered** (`createCn`)
- [ ] `"use client"` on interactive components only; never on barrels
