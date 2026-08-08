# @batthewz/response-ui-react-components

**~80 accessibility-first React 19 components you re-skin from ~1 page of CSS — without touching a single component.**

Every visual decision — colour, spacing, type, radii, shadows, motion — comes from a framework-agnostic [CSS token contract](https://github.com/BatthewZ/response-ui-css), not from the components. Flip one attribute and the whole app re-skins, at runtime, with no rebuild:

```tsx
// The whole idea: same components, your theme, zero component edits.
<html data-theme="aurora">
  {" "}
  {/* "aurora" is yours — one CSS file, ~30 custom properties */}
  <Button variant="primary">Continue</Button>
</html>
```

> **See it live:** [ai-website-starter.benmatthews-it.workers.dev/demo](https://ai-website-starter.benmatthews-it.workers.dev/demo) — every component, several themes, every responsive scale, in one place. The theme switcher is the whole pitch: same components, one-file theme swaps, live.

_Also: zero CSS-in-JS, router-agnostic, headless where it counts, RSC-friendly._

**Jump to:** [Install](#install) · [Components](#components) · [Theming](#theming--reskinning-the-whole-library) · [Forms](#forms--headless-useform)

## Why this over another React component library?

The headline reason is **reskinnability**. In most libraries the look is welded to the components — a large JS theme object (MUI, Chakra), per-component source you fork and own forever (shadcn/ui), or a styled-components runtime. Re-skinning means editing components, wrangling a theme config, or a rebuild. Here the look lives _outside_ the components, in a framework-agnostic CSS token contract — and everything below follows from that one decision:

- **Re-skin the entire library from ~1 page of CSS.** Override ~30 custom properties and every component re-tunes at once. Flip `data-theme` and the whole app changes _at runtime_: no rebuild, no JS theme object, no component edits. The design system defines exactly one theme, `default`; **yours is not a second-class citizen next to some built-in set, because there isn't one.**
- **The same theme re-skins more than React.** The design language is pure CSS, so one theme file restyles your React components _and_ your Astro / Rails / Phoenix / plain-HTML pages. One source of truth for the brand, not one per framework.
- **Responsive tokens, not breakpoint soup.** `text-h2`, `gap-r3`, `p-r4` each carry both breakpoints — and headings/body carry their paired line-height and weight step-ups too. You stop hand-writing `sm:` variants and `leading-*`.
- **Zero CSS-in-JS, zero runtime styling cost.** Styling is co-located plain CSS that self-registers with Tailwind v4. Nothing computes styles at render time; presentational primitives carry no `"use client"` and stay server-renderable.
- **Headless where it matters.** Router-agnostic links, auth gating that takes a status string, and a Standard-Schema form layer with no validator lock-in.
- **Breadth _and_ correctness.** ~80 components — including [DataTable] (three wiring modes), [VirtualizedDataTable], [CommandPalette], [Wizard] — with accessibility and a contrast contract baked in, not bolted on.
- **Lighter on AI tokens.** Terse token syntax plus a shipped [`AGENTS.md`](./AGENTS.md) mean agents read and generate far less to style a screen.

Want only the design language, no React? It ships standalone as [`@batthewz/response-ui-css`](https://github.com/BatthewZ/response-ui-css) — pure CSS, zero JS, usable from any framework.

**A good fit if** you want one brand applied consistently across an app — and ideally across non-React stacks too — expressed in tokens (`p-r3`, `bg-surface-1`, `text-h2`); if you think your project (or sections of it) will need to be reskinned, rethemed or rebranded at some point; or if your product serves many clients or stakeholders who each want their own styling.

**Probably not for you if:**

- **You aren't on Tailwind v4.** Its `@theme inline` and utility layer are the substrate the whole system is built on, Preflight included — this is not a drop-in for a CSS-modules or styled-components codebase.
- **You aren't on React 19.** `react` and `react-dom` `^19` are peer dependencies, alongside `@floating-ui/react` and `lucide-react`.
- **You want to own a private copy of each component's source** (the shadcn model). The source ships and is readable, but the intended extension point is tokens and composition, not forking.
- **You need a settled 1.0.** Until 1.0.0, breaking changes bump the **minor** version — [CHANGELOG.md](./CHANGELOG.md) records them in full.

## Install

```bash
bun add @batthewz/response-ui-react-components @batthewz/response-ui-css \
  react react-dom @floating-ui/react lucide-react
bun add -D tailwindcss @tailwindcss/vite
```

Two CSS imports in your app's CSS entry — foundation (tokens, the `default` theme, responsive scales, animations) first, then per-component styles:

```css
/* src/app.css */
@import "@batthewz/response-ui-css";
@import "@batthewz/response-ui-react-components/styles";
```

Order matters: each per-component file reads `var(--…)` tokens defined by `response-ui-css`, so the foundation has to load first.

Then render something:

```tsx
import { Button, Card, Stack } from "@batthewz/response-ui-react-components";

export function Hello() {
  return (
    <Card>
      <Stack gap="r3">
        <h2 className="text-h3">Hello</h2>
        <Button variant="primary">Continue</Button>
      </Stack>
    </Card>
  );
}
```

**You should see** a card on a themed surface — rounded corners, a border, a shadow, padding that grows at the 40rem breakpoint — with the heading on the type scale and the button filled in the theme's accent colour. Now set `data-theme` on your `<html>` (or any ancestor element) and everything inside re-skins at once, with no other change. That's the whole model; [full theming below](#theming--reskinning-the-whole-library).

**If it doesn't look right:**

- _Buttons, inputs and headings render with the browser's own chrome_ → Tailwind's Preflight isn't loading. **Import `tailwindcss` whole, not just `tailwindcss/utilities`.** These components depend on Preflight and do not restate it: it is what makes a `<button>` a blank rectangle inheriting the page's font, and what gives every element `box-sizing: border-box` and no margin. `@import "@batthewz/response-ui-css"` pulls in `tailwindcss` whole, so the pairing above already satisfies this; it only bites if you wire Tailwind up yourself.
- _Colours and spacing do nothing_ → the two `@import`s aren't in a CSS file Tailwind actually processes, or they're in the wrong order.

You do **not** need a manual `@source` entry. The `styles` import registers this package's sources with Tailwind v4 (a self-relative `@source`), so the utility classes used inside the components are generated automatically, regardless of package manager or `node_modules` layout (hoisted npm, bun's isolated store, pnpm).

## Components

**[Browse all 91 component pages →](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/README.md)**

One page per component: a compiled example, its props, the theme tokens it reads, and its sharp edges. Every code block on those pages is extracted from a real module that `bun run typecheck` compiles, so nothing there can drift from the source. Hooks that belong to a component (`useToast`, `useWizard`, `useVirtualRows`, `useViewTransition`) are documented on that component's page.

**UI** (51) — [Accordion] · [Alert] · [AppShell] · [Avatar] (+AvatarGroup) · [AvatarUpload] · [Badge] · [Breadcrumbs] · [Button] · [Calendar] · [RangeCalendar] · [Card] · [Carousel] · [CodeBlock] · [Collapsible] · [CommandPalette] · [ContextMenu] · [CopyButton] · [DataTable] · [Dialog] (+DialogHeader, DialogBody) · [Drawer] · [DropdownMenu] · [EmptyState] · [ErrorBoundary] · [FileUpload] · [Hero] · [HoverCard] · [IconButton] · [Kbd] · [Markdown] · [MasonryGrid] · [MediaCard] · [Pagination] · [Popover] · [Portal] · [ProgressBar] · [Rating] · [Skeleton] · [Spinner] · [Spotlight] · [StatCard] · [Stepper] · [Swimlane] · [Table] · [Tabs] · [Text] · [ThemeSwitcher] · [Timeline] · [Toast] (+ToastProvider, useToast) · [Tooltip] · [VirtualizedDataTable] · [Wizard] (+`useWizard`)

**Form** (22) — [Checkbox] · [ColorPicker] · [Combobox] · [DatePicker] · [DateRangePicker] · [Field] · [FieldError] · [FormActions] · [Input] · [Label] · [MultiSelect] · [NumberInput] · [OTPInput] · [Radio] · [RangeSlider] · [Repeater] · [SearchInput] · [Select] · [Slider] · [Switch] · [TagInput] · [Textarea]

**Data display** (5) — [Sparkline] · [ProgressRing] · [Meter] · [DescriptionList] · [ActivityFeed]

**Layout** (7) — [Center] · [Container] · [Divider] · [Grid] · [Row] · [Spacer] · [Stack]

**Animation** (5) — [AnimatePresence] · [Parallax] · [ScrollReveal] · [Stagger] · [ViewTransition] (+`useViewTransition`)

**Guards** (1) — [RequireAuth] (headless)

**Form orchestration** (headless) — `useForm`, `FormProvider`, `useFormContext`, `useFieldState`, `useFormState`, `useFieldArray`: Standard Schema validation, a unified `field()` accessor, `useSyncExternalStore`-backed reactivity. [Jump to the walkthrough](#forms--headless-useform).

**Router** — `RouterAdapterProvider`, `useLink`, `usePathname`. [Jump to the setup](#router-adapter--wire-your-router-once).

**Hooks** — `useActiveSection`, `useClickOutside`, `useControllableState`, `useDebounce`, `useDocumentTitle`, `useFloating`, `useFocusTrap`, `useLightDismiss`, `useMediaQuery`, `usePanelTransition` (the two-beat panel swap behind [Tabs] and [Wizard]), `usePrefersReducedMotion`, `useRovingFocus`, `useTheme`, `useVirtualRows`

**Util** — `cn`, `createCn`, `mergeExtension`, `tailwindMergeExtension`, `twMerge`, `mergeRefs`, `mergeProps`, `composeEventHandlers`, `formatBytes`, `SlotClassNames` (the type behind components' `classNames` prop), plus date helpers (`formatDate`, `parseDateInput`, `buildMonthGrid`, `addDays`, `addMonths`, `toISODate`, `getMonthNames`, …)

**Types** — most components deliberately do _not_ export a props type; compose with `ComponentPropsWithRef<typeof X>`. What is exported: the generic components' props (`TableProps`, `DataTableProps`, `VirtualizedDataTableProps`, `AvatarUploadProps` / `AvatarUploadResult`, `WizardProps`, `MeterProps`, `RequireAuthProps`), the shapes you hand to or receive from callbacks (`ColumnDef`, `SortState`, `CommandPaletteItem`, `MultiSelectItem`, `RangeSliderValue`, `RepeaterItem`, `DateRange`, `FileUploadLabels`, `FileUploadRejection`, `ToastVariant`, `Placement`, `AuthStatus`, `ExampleTheme`, `WizardStep`, `Hsv` / `Rgb`), the form kit's types (`FormApi`, `FieldBindings`, `FieldSnapshot`, `FieldArrayItem`, `UseFormOptions`, and friends), the router adapter's (`RouterAdapterValue`, `RouterLinkComponent`, `RouterLinkProps`), and the exported hooks' option/return types (`UseControllableStateParams` / `UseControllableStateReturn`, `UsePanelTransitionOptions` / `UsePanelTransitionReturn` (+`PanelTransitionPhase`), `UseThemeOptions` / `UseThemeReturn`, `UseVirtualRowsParams` / `UseVirtualRowsReturn`, `UseWizardOptions` / `UseWizardReturn`)

## Theming & reskinning the whole library

Every component renders with `var(--…)` tokens defined by `response-ui-css` — none of them hard-code a colour, size, or font. So **reskinning is editing the foundation, never the components.** A theme is just one CSS file overriding the documented custom properties under a `data-theme` selector.

**You don't need the `useTheme` hook — or any library JS — to apply a theme.** Switching is just setting a `data-theme` attribute, so the simplest path is to set it declaratively on the root element:

```tsx
// a Next.js root layout, your index.html, your top-level App — wherever <html> lives
<html data-theme="aurora">
```

Reach for `useTheme` only when you want a theme _switcher_: it reads that same attribute reactively (`useSyncExternalStore` over a `MutationObserver` — it keeps no React state of its own) and gives you a typed `setTheme` and the theme list.

```tsx
import { useTheme } from "@batthewz/response-ui-react-components";

// Declare your themes at module scope — the hook memoises on the array's identity.
const APP_THEMES = ["default", "aurora", "midnight"] as const;

const { theme, setTheme, themes } = useTheme({ themes: APP_THEMES });
setTheme("aurora"); // `setTheme` is typed to YOUR themes — the library ships no list
```

It's pure convenience over the attribute — `document.documentElement.setAttribute("data-theme", "aurora")` does the same thing.

Called with no arguments the hook is registry-free: `theme` is whatever `data-theme` actually says, `setTheme` takes any string, and `themes` reports `["default"]`. Register a list when you want `setTheme` typed and unknown values folded to your default.

**Persistence is not included.** `setTheme` _writes_ `localStorage["theme"]` (and clears it for the default theme), but nothing in this package ever reads that key back — so the user's choice is silently discarded on reload. Restoring it before the first paint needs a blocking inline `<script>` in your document `<head>`, which this package does not ship; see [ThemeSwitcher](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/theme-switcher.md#persistence-is-your-job) for the snippet.

> **Scope a theme to a subtree.** A theme authored with a `:root[data-theme="…"]` selector — the convention, and what the worked examples use — only matches `<html>`. Use a _bare_ `[data-theme="aurora"]` selector instead and you can drop `data-theme="aurora"` on **any** element — a single panel, a dark island in a light page — and only that subtree re-skins, because the tokens cascade to its descendants.

### Write your own theme

Copy the template, override the contract in ~1 page of CSS, `@import` it _after_ the foundation, then register its name with the hook:

```css
/* src/app.css */
@import "@batthewz/response-ui-css";
@import "./themes/aurora.css"; /* your ~1 page of token overrides */
@import "@batthewz/response-ui-react-components/styles";
```

```tsx
const APP_THEMES = ["default", "aurora"] as const; // module scope
const { setTheme } = useTheme({ themes: APP_THEMES });
setTheme("aurora");
```

Two things your theme file owns that the foundation cannot do for you:

- **Its fonts.** The foundation's main entry loads only the two families the `default` theme names. Put your `@import url(...)` lines at the **top of your app's CSS entry**, above everything — not inside the theme file, where CSS's "`@import` must come first" rule silently drops them (correct palette, wrong typeface).
- **Its chart ramp, if it is dark or reuses a colour.** `--C-CHART-1..3` alias `--C-ACCENT` / `--C-STATUS-SUCCESS` / `--C-STATUS-WARNING` so a retuned theme carries the chart with it — but a dark theme needs the whole ramp lifted to ~0.65–0.78 lightness, and a theme that points two of those tokens at the _same_ colour collapses two series into one (measured: OKLab distance 0.000). Override `--C-CHART-1..5` in your own file. [`examples/theme-tuning`](src/examples/example-theme-tuning.css) shows it done.

### Theming docs

- **[Theme contract — component layer](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/theme-contract.md)** — only what _this_ package adds on top of the foundation's contract: the trend/chart ramp, [MediaCard]'s hover physics, and the [`useTheme` registration step](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/theme-contract.md#authoring-workflow). Every base token is documented upstream, not mirrored here.
- **[Extending](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/extending.md)** — add your own tokens, responsive/theme-aware values, register sources with Tailwind.
- **[ThemeSwitcher](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/theme-switcher.md)** — the switcher component, and the traps around registering themes.

The foundation package's own copies are the upstream source of truth: [theme contract](https://github.com/BatthewZ/response-ui-css/blob/main/docs/theme-contract.md), [extending](https://github.com/BatthewZ/response-ui-css/blob/main/docs/extending.md), [theme template](https://github.com/BatthewZ/response-ui-css/blob/main/src/_theme-template.css), [README](https://github.com/BatthewZ/response-ui-css#readme).

### The example themes

`events`, `grimdark` and `tech` are worked examples of the theme contract, living at `@batthewz/response-ui-css/examples/themes/<name>`. **Nothing imports them and nothing depends on them** — the foundation's main entry does not load them, and this package's `styles` entry point names no theme at all; the only file that does is the opt-in `examples/theme-tuning` stylesheet, which nothing imports (`scripts/verify-example-themes.mjs` fails the build if a theme name reaches the styles entry). They sit outside semver. Read them, copy from them, or ignore them.

To run a demo on one, opt in explicitly:

```css
@import "@batthewz/response-ui-css/examples/themes/grimdark-fonts"; /* fonts must be first */
@import "@batthewz/response-ui-css";
@import "@batthewz/response-ui-css/examples/themes/grimdark";
@import "@batthewz/response-ui-react-components/styles";
@import "@batthewz/response-ui-react-components/examples/theme-tuning"; /* their chart ramps */
```

`EXAMPLE_THEMES` (and the type `ExampleTheme`) export those three names plus `default` for demos, docs sites and this repo's dev gallery. Nothing in the library reads it — it is sample data, not a default.

## Forms — headless `useForm`

A store-backed, dependency-free form layer for the form controls. Validation is via [**Standard Schema**](https://github.com/standard-schema/standard-schema), so bring any conforming validator (Zod, Valibot, ArkType, …) — no runtime dependency is added. A single `field(name)` accessor binds both native inputs and the library's controlled components ([Combobox], [TagInput], [Slider], [Select], …) — no register-vs-Controller split.

```tsx
import {
  FormProvider,
  Field,
  FieldError,
  Input,
  Label,
  useForm,
} from "@batthewz/response-ui-react-components";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

export function SignIn() {
  const form = useForm({
    defaultValues: { email: "", password: "" },
    schema,
    mode: "onBlur", // onSubmit | onBlur | onChange | onTouched | all
    onSubmit: async (values, { setError }) => {
      const res = await api.signIn(values);
      if (!res.ok) setError("password", "Wrong email or password"); // server error
    },
  });

  return (
    <FormProvider form={form}>
      <form {...form.props}>
        <Field name="email">
          <Label>Email</Label>
          <Input type="email" {...form.field("email")} />
          <FieldError />
        </Field>
        <Field name="password">
          <Label>Password</Label>
          <Input type="password" {...form.field("password")} />
          <FieldError />
        </Field>
        <Button type="submit">Sign in</Button>
      </form>
    </FormProvider>
  );
}
```

`<Field name="x">` auto-wires that field's error into context; `<FieldError />` with no children renders it (with `role="alert"` + `aria-describedby`), and the bound input reflects `aria-invalid`. Manual/server errors set via `setError` always win and survive a validation pass; schema errors surface only once a field is touched/dirty or the form has been submitted — so errors never flash at a field the user hasn't reached.

For non-string values, annotate the bind: `form.field<string[]>("tags")`. `checked`-based controls ([Checkbox], [Switch]) are wired via `watch`/`setValue` instead of `field()`:

```tsx
<Switch
  checked={Boolean(form.watch("subscribe"))}
  onCheckedChange={(v) => form.setValue("subscribe", v)}
/>
```

`useFieldArray` drives dynamic lists with stable keys (`id` survives reorders):

```tsx
const { fields, append, remove } = useFieldArray({ form, name: "items" });
fields.map((item) => (
  <Field key={item.id} name={`${item.name}.label`}>
    <Input {...form.field(`${item.name}.label`)} />
  </Field>
));
```

The component calling `useForm` re-renders on any change. For render isolation, `useFieldState(form, name)` and `useFormState(form)` subscribe to a single field slice / form-level flags only. Other knobs: `reValidateMode`, `criteriaMode`, `trigger`, `reset`/`resetField`, `focusFirstError`, and a reactive external `values` prop that re-seeds the form when its identity changes. [Repeater] renders a bound array field as rows; [FormActions] is the footer row.

## Router adapter — wire your router once

Components like `AppShell.SidebarLink` and `Breadcrumbs.Item` render navigational links. Wrap your app once at the root with the adapter:

```tsx
import {
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
} from "@batthewz/response-ui-react-components";
import { forwardRef } from "react";
import { BrowserRouter, Link as RRLink, useLocation } from "react-router-dom";

const AdapterLink: RouterLinkComponent = forwardRef<
  HTMLAnchorElement,
  RouterLinkProps
>(function AdapterLink({ to, replace, children, ...rest }, ref) {
  return (
    <RRLink ref={ref} to={to} replace={replace} {...rest}>
      {children}
    </RRLink>
  );
});
const adapter = {
  Link: AdapterLink,
  usePathname: () => useLocation().pathname,
};

export function App() {
  return (
    <BrowserRouter>
      <RouterAdapterProvider value={adapter}>
        {/* your routes */}
      </RouterAdapterProvider>
    </BrowserRouter>
  );
}
```

If you skip the provider, links fall back to plain `<a href>` — fine for static / non-SPA. `useLink` resolves the adapter's link component inside your own components.

## Auth gating — headless `RequireAuth`

The package ships a router/auth-agnostic [RequireAuth] that takes a status string and renders accordingly:

```tsx
import { RequireAuth } from "@batthewz/response-ui-react-components";
import { Navigate } from "react-router-dom";
import { useSession } from "your-auth-library";

export function AuthGuard({ children }) {
  const { data: session, isPending } = useSession();
  const status = isPending
    ? "loading"
    : session
      ? "authenticated"
      : "unauthenticated";
  return (
    <RequireAuth
      status={status}
      unauthenticatedFallback={<Navigate to="/login" replace />}
    >
      {children}
    </RequireAuth>
  );
}
```

## Data tables

[DataTable] has three wiring modes — pick one and stick to it:

- **Client-everything** — pass `pageSize` (and optionally `defaultSort` / `defaultPage`, which seed the uncontrolled sort and page on mount). The table sorts, slices, and derives pages entirely on the client from the full `data` array.
- **Server-controlled** — pass `sort` + `onSortChange` and `page` + `totalPages` + `onPageChange`, and omit `pageSize`. The table renders exactly the rows you give it and reports sort/page intent back to you.
- **Hybrid / server-paged (lazy-load)** — never enable uncontrolled sorting here; use controlled `sort`. Accumulate fetched rows into `data` as the user pages, and render a footer sentinel to trigger the next load.

For tens of thousands of rows, reach for [VirtualizedDataTable] instead of paginating. It shares [DataTable]'s `ColumnDef` and sorting contract but **windows** the rows (via `useVirtualRows`) so only a small visible slice is mounted — scrolling stays smooth and memory flat:

```tsx
<VirtualizedDataTable
  data={tenThousandRows}
  columns={columns}
  rowKey={(r) => r.id}
  rowHeight={48}
  height={480}
/>
```

Pass a fixed `rowHeight` (cell content must fit it) and a `height` for the scroll viewport. It has no pagination, select-all toggles the **entire** dataset, and `onEndReached` supports infinite loading.

Expandable rows, selection, loading and empty states, density, the slot hatches and the per-mode gotchas are all on the component pages: **[DataTable]** · **[VirtualizedDataTable]**.

## Composing props and handlers

A plain `{...props}` spread **replaces** an event handler rather than adding to it, so a component that sets `onClick` and then spreads caller props silently drops one of the two. `composeEventHandlers` runs both — the caller's first, so it can opt out of the component's behaviour with `preventDefault()`:

```tsx
<button onClick={composeEventHandlers(props.onClick, () => setOpen(true))} />
```

Pass `{ checkDefaultPrevented: false }` for events the DOM will not let you cancel (`animationend`, `transitionend`, `pointerleave`) — React still marks its synthetic event as prevented there, and honouring it would invent an opt-out that drops the behaviour again.

`mergeProps(a, b)` does the same for a whole prop object, which is what you want when handing props to a cloned `asChild` child: `on*` handlers compose, `className` merges through `cn`, `style` merges by key, `ref` merges through `mergeRefs`, and a `b` value of `undefined` no longer clobbers a defined `a`.

## Adding custom Tailwind tokens

If you add custom design tokens (e.g. `bg-brand-foo`), build a project-local `cn` with `createCn` so it merges both the built-in tokens and yours:

```ts
// app/cn.ts
import { createCn } from "@batthewz/response-ui-react-components";

export const cn = createCn({
  theme: {
    color: ["brand-foo", "brand-accent"],
    spacing: ["xtra-tight"],
  },
});
```

Then import `cn` from `app/cn` everywhere instead of from the package directly. `createCn` **concatenates** your arrays onto the built-ins, so customising one key (e.g. `color`) can't accidentally wipe awareness of the others (`spacing`, `text`) — the way a manual spread could. For power users, `mergeExtension` and the raw frozen `tailwindMergeExtension` are also exported. See [extending](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/extending.md).

## Building your own components

Want to use this library as a base — keep the components you like and add your own that share the design tokens (charts, dashboards, domain widgets)? Because you style new components with the same tokens, they **inherit every theme for free**: a component built on `bg-surface-1` / `text-fg-primary` / `p-r3` re-skins alongside the built-ins when you flip `data-theme`, with no extra wiring. See [extending](https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/extending.md) for the build-on-top model, the token-compliant component pattern, custom tokens, and the shipped dashboard vocabulary (`bg-chart-*`, `text-trend-*`, [Sparkline], [Meter], …).

The conventions that keep extensions on-theme and consistent are machine-encoded in [AGENTS.md](./AGENTS.md) — token-only styling (never raw `p-4` / `bg-gray-100`), `cn()` composition, `forwardRef` + semantic HTML, the contrast contract, and a "don'ts" list. Point your AI assistant at it and generated components follow the same patterns the library applies to itself.

## RSC / Server Components

Interactive modules ship a `"use client"` directive, so the components work out of the box in React Server Component frameworks (Next.js App Router, etc.). Pure presentational components ([Button], [Text], the layout primitives) carry no directive and stay server-renderable — you can use them directly in server components.

**Security:** these are presentational Client Components — as with any client component, never pass server-only secrets as props (props are serialized to the browser). The components themselves access no server state or secrets (enforced by `bun run verify:directives`).

## Subpath imports for tree-shaking

Deep imports are supported, so you can pull in a single component or hook without going through the barrel:

```ts
import { Button } from "@batthewz/response-ui-react-components/components/ui/Button";
import { useDebounce } from "@batthewz/response-ui-react-components/hooks/use-debounce";
```

Importing from the root barrel works too — both resolve to the same tree-shakeable modules.

## License

MIT.

<!-- Component doc links. Regenerate from docs/components/*.md if a page is added or renamed. -->

[Accordion]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/accordion.md
[ActivityFeed]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/activity-feed.md
[Alert]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/alert.md
[AnimatePresence]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/animate-presence.md
[AppShell]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/app-shell.md
[AvatarUpload]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/avatar-upload.md
[Avatar]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/avatar.md
[Badge]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/badge.md
[Breadcrumbs]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/breadcrumbs.md
[Button]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/button.md
[Calendar]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/calendar.md
[Card]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/card.md
[Carousel]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/carousel.md
[Center]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/center.md
[Checkbox]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/checkbox.md
[CodeBlock]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/code-block.md
[Collapsible]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/collapsible.md
[ColorPicker]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/color-picker.md
[Combobox]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/combobox.md
[CommandPalette]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/command-palette.md
[Container]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/container.md
[ContextMenu]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/context-menu.md
[CopyButton]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/copy-button.md
[DataTable]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/data-table.md
[DatePicker]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/date-picker.md
[DateRangePicker]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/date-range-picker.md
[DescriptionList]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/description-list.md
[Dialog]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/dialog.md
[Divider]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/divider.md
[Drawer]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/drawer.md
[DropdownMenu]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/dropdown-menu.md
[EmptyState]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/empty-state.md
[ErrorBoundary]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/error-boundary.md
[FieldError]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/field-error.md
[Field]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/field.md
[FileUpload]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/file-upload.md
[FormActions]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/form-actions.md
[Grid]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/grid.md
[Hero]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/hero.md
[HoverCard]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/hover-card.md
[IconButton]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/icon-button.md
[Input]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/input.md
[Kbd]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/kbd.md
[Label]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/label.md
[Markdown]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/markdown.md
[MasonryGrid]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/masonry-grid.md
[MediaCard]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/media-card.md
[Meter]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/meter.md
[MultiSelect]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/multi-select.md
[NumberInput]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/number-input.md
[OTPInput]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/otpinput.md
[Pagination]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/pagination.md
[Parallax]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/parallax.md
[Popover]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/popover.md
[Portal]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/portal.md
[ProgressBar]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/progress-bar.md
[ProgressRing]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/progress-ring.md
[Radio]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/radio.md
[RangeCalendar]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/range-calendar.md
[RangeSlider]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/range-slider.md
[Rating]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/rating.md
[Repeater]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/repeater.md
[RequireAuth]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/require-auth.md
[Row]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/row.md
[ScrollReveal]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/scroll-reveal.md
[SearchInput]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/search-input.md
[Select]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/select.md
[Skeleton]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/skeleton.md
[Slider]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/slider.md
[Spacer]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/spacer.md
[Sparkline]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/sparkline.md
[Spinner]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/spinner.md
[Spotlight]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/spotlight.md
[Stack]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/stack.md
[Stagger]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/stagger.md
[StatCard]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/stat-card.md
[Stepper]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/stepper.md
[Swimlane]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/swimlane.md
[Switch]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/switch.md
[Table]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/table.md
[Tabs]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/tabs.md
[TagInput]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/tag-input.md
[Text]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/text.md
[Textarea]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/textarea.md
[ThemeSwitcher]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/theme-switcher.md
[Timeline]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/timeline.md
[Toast]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/toast.md
[Tooltip]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/tooltip.md
[ViewTransition]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/view-transition.md
[VirtualizedDataTable]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/virtualized-data-table.md
[Wizard]: https://github.com/BatthewZ/response-ui-react-components/blob/main/docs/components/wizard.md
