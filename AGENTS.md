# AGENTS — @batthewz/response-ui-react-components

Machine-readable reference for AI assistants **using** this package — its public surface, usage patterns, and conventions for code that consumes it. Concise, exact, opinionated.

> Working **on** this package itself (build, packaging, CSS/RSC internals, adding exports)? That guidance lives in [CONTRIBUTING.md](./CONTRIBUTING.md) — repo-only, not shipped in the npm package.

## Hard requirements

- React 19+. Heavy use of `forwardRef`, `useSyncExternalStore`, dialog `<dialog>`.
- Consumer must add **two** CSS imports, in this order, in their app CSS:
  ```css
  @import "@batthewz/response-ui-css";
  @import "@batthewz/response-ui-react-components/styles";
  ```
  The first provides tokens, the `default` theme, responsive scales, animations, base; the second provides per-component CSS (Accordion, Button, etc.) co-located with each `.tsx`. Order matters — per-component CSS reads `var(--…)` from the foundation. Components ship NO CSS-in-JS.
- Tailwind v4 must be in the consumer's build (e.g. `@tailwindcss/vite`).
- Peer deps: `react`, `react-dom`, `@floating-ui/react`, `lucide-react`. Regular dep: `@batthewz/response-ui-css` (auto-installed; the consumer still does the `@import` themselves so Tailwind v4 picks it up).

## RSC

`"use client"` is applied selectively to interactive modules; barrels and pure presentational components (Button, Text, layout) stay directive-neutral, so they're server-renderable in RSC frameworks (Next.js App Router, etc.) with no extra wiring.

**A directive-neutral component must not dot into a `"use client"` one.** Under RSC a client module is replaced by a reference proxy, and `Table.Head` from a server module throws "You cannot dot into a client module from a server component" — at render time, and only when the rendered content happens to reach that branch. Import the part by its own name instead (`Table.tsx` exports `TableHead`, `TableRow`, `TableHeaderCell`, `TableBody`, `TableCell` for exactly this). No gate catches this. These are presentational Client Components — props serialize to the browser, so **never pass server-only secrets as props.**

## Public surface

Top-level barrel exports everything. The grouping below mirrors the source layout (`src/`).

### components/ui (51)

```
Accordion, Alert, AppShell, Avatar, AvatarGroup, AvatarUpload + types
AvatarUploadProps/AvatarUploadResult, Badge, Breadcrumbs,
Button, Calendar, RangeCalendar + type DateRange, Card, Carousel, CodeBlock, Collapsible,
CommandPalette + CommandPalette.Item + types CommandPaletteItem/CommandPaletteRenderArgs,
ContextMenu, CopyButton, DataTable + type DataTableProps + type ColumnDef + type SortState,
Dialog + DialogHeader + DialogBody, Drawer,
DropdownMenu, EmptyState + EmptyState{Title,Description,Icon,Actions}, ErrorBoundary,
FileUpload, Hero, HoverCard, IconButton, Kbd, Markdown + type MarkdownProps, MasonryGrid,
MediaCard, Pagination,
Popover, Portal, ProgressBar, Rating, Skeleton, Spinner, Spotlight, StatCard, Stepper,
Swimlane, Table + type TableProps, Tabs, Text, ThemeSwitcher, Timeline, Toast + type ToastVariant,
ToastProvider, useToast, Tooltip, VirtualizedDataTable + type
VirtualizedDataTableProps, Wizard + useWizard + types
WizardProps/WizardStep/UseWizardOptions/UseWizardReturn
```

### components/form (22 + orchestration)

```
Checkbox, ColorPicker, Combobox, DatePicker, DateRangePicker, Field, FieldError, FormActions, Input,
Label, MultiSelect + MultiSelect.{Content,Item,ItemIndicator,Empty,Tag,TagRemove} + types
MultiSelectItem/MultiSelectRenderArgs, NumberInput, OTPInput, Radio,
RangeSlider + type RangeSliderValue, Repeater + type RepeaterItem, SearchInput, Select,
Slider, Switch, TagInput, Textarea
```

Plus dependency-free `color` helpers backing `ColorPicker` (`hexToRgb`, `rgbToHex`,
`rgbToHsv`, `hsvToRgb`, `hsvToHex`, `hexToHsv`, `normalizeHex` + types `Rgb`/`Hsv`).

Headless form orchestration (from `components/form/use-form.tsx`, `form-store.ts`, `standard-schema.ts`):

```
useForm, useFieldArray, useFieldState, useFormState, useFormContext, FormProvider,
type FieldBindings, type SubmitHelpers, type UseFormOptions, type FormApi,
type FieldArrayItem, type UseFieldArrayReturn,
type FieldSnapshot, type FormStateSnapshot, type ValidationMode, type ReValidateMode,
type StandardSchemaV1, type InferInput, type InferOutput
```

### components/data-display (5)

```
Sparkline, ProgressRing, Meter + type MeterProps, DescriptionList, ActivityFeed
```

Dashboard primitives, its own group alongside ui/form/layout so the category is
discoverable. Existing dashboard-ish components (StatCard, Timeline, Table, DataTable)
are NOT moved here — they stay in components/ui.

### components/layout (7)

```
Center, Container, Divider, Grid, Row, Spacer, Stack
```

### components/animation (5)

```
AnimatePresence, Parallax, ScrollReveal, Stagger, ViewTransition, useViewTransition
```

### components/guards

```
RequireAuth, type AuthStatus, type RequireAuthProps
```

### components/router

```
RouterAdapterProvider, useLink, usePathname,
type RouterAdapterValue, type RouterLinkComponent, type RouterLinkProps
```

### hooks

```
useActiveSection, useClickOutside, useControllableState + type
UseControllableStateParams + type UseControllableStateReturn, useDebounce,
useDocumentTitle, useFloating + type Placement, useFocusTrap, useLightDismiss,
useMediaQuery,
usePanelTransition + type UsePanelTransitionOptions + type UsePanelTransitionReturn
  + type PanelTransitionPhase (the two-beat panel swap Tabs and Wizard both drive:
  the outgoing panel leaves, then the incoming one mounts and arrives),
usePrefersReducedMotion, useRovingFocus,
useTheme + type UseThemeOptions + type UseThemeReturn, STORAGE_KEY,
EXAMPLE_THEMES + type ExampleTheme (sample data for demos — NOT a default,
  nothing in the library reads it; see src/examples/example-themes.ts),
useVirtualRows + type UseVirtualRowsParams + type UseVirtualRowsReturn
```

### util

```
cn, createCn, mergeExtension, twMerge, tailwindMergeExtension, mergeRefs,
mergeProps, composeEventHandlers, formatBytes, type SlotClassNames,
date helpers: addDays, addMonths, buildMonthGrid, clampDate, formatDate,
getDateFieldOrder, getMonthLabel, getMonthNames, getWeekdayNames, isAfter, isBefore,
isSameDay, parseDateInput, startOfDay, startOfMonth, toISODate
```

`mergeProps` / `composeEventHandlers` are the house answer to "a caller passed
the same prop I set". Never spread `{...props}` over a handler the component
also sets — compose it. The caller runs first and may `preventDefault()` to skip
the component's behaviour, except on non-cancelable events, where you must pass
`{ checkDefaultPrevented: false }`.

## Patterns and conventions

### `cn()` — class composition

Always use `cn()` from this package, not raw `clsx` or `tailwind-merge`. The exported `twMerge` is pre-configured with `tailwindMergeExtension`, which knows about the design system's custom utilities (responsive `r1..r6` spacing, design-system `h1..h6` / `body-1..3` text, semantic color tokens). Without it, `cn("text-h1", "text-h2")` won't collapse correctly.

```ts
import { cn } from "@batthewz/response-ui-react-components";
const className = cn(
  "p-r3 bg-surface-0",
  customClass,
  isActive && "bg-primary",
);
```

### `classNames` — overriding a component's internals

`className` addresses the element a component renders. Where a component renders internals a
`className` cannot reach, it takes a **`classNames`** object of class strings, keyed by slot:

```tsx
<StatCard.Trend value={12.5} direction="up" classNames={{ trendIcon: "size-r3" }} />
```

- **The keys are typed per component**, so an unknown one is a compile error rather than a prop
  that silently does nothing. `SlotClassNames<S>` is exported if you want to name the object:
  `const cx: SlotClassNames<"trendIcon"> = { trendIcon: "size-r3" }`.
- **There is no `root` key** — `className` is the root.
- **Class strings only.** Where a component needs to let you reach an internal with handlers or
  `aria-*`, it exposes a named `<thing>Props` bag instead (`CodeBlock`'s `copyButtonProps`,
  `Table`'s `tableProps`, `Swimlane`'s `viewAllProps`). Those merge your `className` after the
  library's base class, same as a slot.
- **Slot classes win**, for the same reason `className` does: the base class is in
  `@layer components` and yours is a utility. Not because of the merge order — `cn()` keeps both,
  since tailwind-merge only collapses two conflicting *utilities*.
- **Not every internal has a slot, deliberately.** An element whose class *is* a mechanism (an
  `sr-only` twin, a clipping shim) is left unreachable on purpose; a component's doc page says
  which and why under its **Slots** heading. Where the override is a *value* rather than a choice
  of utilities, the route is a custom property instead — e.g. `--sparkline-color`.

#### Writing one: the `slot:(…)` annotation and `verify:slot-annotations`

Every `className` JSX attribute in production `src/` must be one of two things, and
`bun run verify:slot-annotations` (in `prepublishOnly`) fails the build on anything else:

- **reachable** — the attribute's initialiser mentions `className` or `classNames?.`, i.e. a
  caller's value can arrive here; **or**
- **annotated** — a comment recording that it deliberately cannot:

```tsx
<span
  // slot:(a) the accessible twin of the ticking figure. A slot here hands a caller
  // the one class that keeps the real value out of the visual flow.
  className="sr-only"
>
```

Three letters settle an unreachable element, and the test they share is *does the consumer's need
have a route somewhere other than this attribute*:

| | Means | The route |
| --- | --- | --- |
| `slot:(a) <reason>` | not a gap — the class **is** the mechanism | none is owed |
| `slot:(b) <reason>` | the override is a *value*, not a choice of utilities | a custom property |
| `slot:(e) <reason>` | the element is loop-generated or lives in a subtree replaced wholesale, so what a caller wants is different **content** | a `render*` prop |

`(c)` slot, `(d)` compound and `(f)` just-`className` are **not** accepted here, because each one
ends in a `className` merge — at this attribute or at a subcomponent's — so a settled one is
*reachable* and needs no comment. An empty reason fails the pattern; so does a letter outside
`a`–`f`, and both fail by name rather than reading as an oversight.

Three things the gate cannot do, because an unstated blind spot is where the next bug lives:

- **It matches a name at the attribute; it does not follow data flow.** Hoist the merge into a
  local (`const cls = cn("x", className)` then `className={cls}`) and it reports a false alarm.
  The fix is to write the house form, not to widen the check: the one shape that fails *silently*
  is a local literally named `className`, and every widening buys more of those.
- **The annotation must BEGIN A LINE.** A trailing `/* … */` after another attribute, or a comment
  above the element instead of inside its opening tag, is invisible to
  `ts.getLeadingCommentRanges` and the site fails as unannotated.
- **It cannot see the props-getter form** — `className: "…"` or `className: cn(…)` inside an
  object literal is not a JSX attribute. The run names those sites; they need hand-triage.

### Controlled vs uncontrolled — the mode locks on the FIRST render

Every controllable component in this package (`useControllableState` and the components that
wrap it — `Accordion`, `Tabs`, `Popover`, `AppShell`'s `open`/`collapsed`, `DataTable`'s
`sort`/`page`, the pickers, `Wizard`, …) decides controlled-ness **once, on mount**, and never
revisits it. Two rules follow, and both failures are silent:

- **Never write `value={x ?? undefined}`.** On a component that mounted controlled, a later
  `undefined` is read as *empty* (`[]` / `false` / `defaultValue` / `null`), not as a handover
  to internal state — so the value collapses instead of falling back. Write `x ?? []`,
  `x ?? false`, `x ?? null` — whatever "empty" means for that prop.
- **Decide at mount.** If a component mounts without the prop (an async value that has not
  arrived yet), it is uncontrolled for its whole life and the prop you start passing later is
  **ignored**. Pass a defined initial value from the first render, or remount with a changing
  `key` when the source arrives.
- **Controlled means you must wire the handler.** A controlled component writes no state of its
  own, so a missing or no-op `on*Change` leaves the control inert — the trigger clicks and
  nothing happens, with nothing thrown or logged.

`useControllableState` also refuses to notify when the resolved value equals the current one.
Equality is `Object.is` by default, so `onChange` counts changes, not interactions — do not use
one as a proxy for the other. Pass `isEqual` when the value is rebuilt on every commit (a
`Date`, a range, a tuple), where reference equality would let an unchanged value re-emit.

### `Omit`ted props are declared `never` — and that is load-bearing

Where this package removes a prop from a component's type, it declares it `?: never` and
destructures it out, rather than relying on `Omit` alone. `Omit` is erased at runtime and a JSX
spread performs **no excess-property check**, so `{...bag}` used to deliver the very key the
type omitted with `tsc` silent. Do not "fix" a resulting compile error by casting or by
spreading through `any` — delete the key, or destructure it out before spreading. Current
`never` props: `Switch.onChange`, `Rating.onChange`, `Calendar`/`RangeCalendar`/`CalendarBase`
`.onChange`, `DateRangePicker.color`, `AppShell.SidebarLink.href` (the destination is `to`).
`verify:omit-discipline` is the gate that keeps this true.

### Custom utilities — extending the merge config

If a consumer adds new design tokens, the ergonomic path is `createCn`:

```ts
import { createCn } from "@batthewz/response-ui-react-components";

// app/cn.ts
export const cn = createCn({
  theme: {
    color: ["brand-primary", "brand-accent"],
    spacing: ["xtra-tight"],
  },
});
```

`createCn` concatenates user theme arrays onto the built-in arrays, so customising one key (e.g. `color`) can't accidentally wipe awareness of other built-ins (`spacing`, `text`) — the way the older spread pattern could. Non-theme `tailwind-merge` config (`classGroups`, `conflictingClassGroups`, `cacheSize`) passes through.

For power users who need to drive `extendTailwindMerge` themselves, `mergeExtension` and the raw frozen `tailwindMergeExtension` are also exported. See [`@batthewz/response-ui-tw-merge`](https://github.com/BatthewZ/response-ui-tw-merge) for full details.

### Router adapter — `RouterAdapterProvider` + `useLink` / `usePathname`

Components that render links (`AppShell.SidebarLink`, `Breadcrumbs.Item`) call `useLink()` to get a Link component, defaulting to plain `<a href>`. To use react-router-dom (or any other router), wrap once at the root:

```tsx
import {
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
} from "@batthewz/response-ui-react-components";
import { forwardRef } from "react";
import { Link as RRLink, useLocation } from "react-router-dom";

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

<RouterAdapterProvider value={adapter}>{/* app */}</RouterAdapterProvider>;
```

`RouterLinkProps` shape: `{ to: string; replace?: boolean; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">`. `RouterLinkComponent` is a `ForwardRefExoticComponent` — implementations MUST use `forwardRef`.

### Headless `RequireAuth`

Knows nothing about your auth library or router. Takes a `status` prop:

```tsx
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

<RequireAuth
  status={status}
  redirect="/login" // optional, only used if no fallback
  loadingFallback={<MySpinner />} // optional, defaults to centered Spinner
  unauthenticatedFallback={<Navigate to="/login" replace />} // pass router-specific Navigate
>
  {children}
</RequireAuth>;
```

App-side wrappers wire up the auth library:

```tsx
function AuthGuard({ children }: { children: ReactNode }) {
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

// GuestGuard inverts: render children when *not* authenticated, redirect when authenticated.
function GuestGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const status = isPending
    ? "loading"
    : session
      ? "unauthenticated"
      : "authenticated";
  return (
    <RequireAuth
      status={status}
      unauthenticatedFallback={<Navigate to="/dashboard" replace />}
    >
      {children}
    </RequireAuth>
  );
}
```

### Form orchestration — headless `useForm`

Store-backed, dependency-free form layer. Design points an AI should not violate:

- **Validation = Standard Schema.** `useForm` takes `schema?: StandardSchemaV1<unknown, T>` and validates against the _interface_ (`~standard.validate`). Consumers bring Zod/Valibot/ArkType — do NOT add a validator as a runtime dependency. Schema output (post-coercion) is what `onSubmit` receives.
- **One unified `field(name)` accessor — no register-vs-Controller split.** `form.field(name)` returns `{ name, value, onChange, onBlur, ref, "aria-invalid", disabled }`, spreadable onto a native input OR a controlled component (`Combobox`, `TagInput`, `Slider`, `Select`, …). `onChange` accepts either a raw value or a DOM `ChangeEvent` (it extracts `.value`, or `.checked` for checkboxes). For non-string values annotate the generic: `field<string[]>("tags")`. `checked`-based controls (`Checkbox`, `Switch`) are bound via `watch`/`setValue`, not `field()`.
- **Store + `useSyncExternalStore`.** `FormStore` (in `form-store.ts`) is framework-agnostic (no React imports) and owns values/errors/touched/dirty + Standard Schema validation. `useForm` re-renders its caller on every change (subscribes to a monotonic `version`). `useFieldState(form, name)` / `useFormState(form)` are opt-in render isolation — they subscribe to a per-field / form-level snapshot that's reference-stable when unchanged. `FormProvider` exposes the `FormApi` via context; `useFormContext()` returns it or `null`.
- **Error surfacing rules (do not change the precedence):** manual/server errors (`setError`) always win and survive a validation pass; schema errors surface for a field only once `submitCount > 0` OR the field is touched OR dirty — so errors never flash at fields the user hasn't reached. `setValue` clears that field's manual error. `Field name="x"` wires the surfaced error into `FieldContext`; `<FieldError />` with no children renders it.
- **`useFieldArray({ form, name })`** — `append/prepend/insert/remove/move/swap/update/replace`, plus `fields` whose `id` is a stable key surviving reorders (use as React `key`, not the index).
- **Validation modes:** `mode` (`onSubmit` | `onBlur` | `onChange` | `onTouched` | `all`, default `onSubmit`), `reValidateMode` (`onChange` | `onBlur`, default `onChange`, applies after first submit), `criteriaMode` (`firstError` | `all`, default `firstError`). `shouldFocusError` (default true) focuses the first invalid field after a failed submit.

```tsx
const form = useForm({ defaultValues, schema, mode: "onBlur", onSubmit });
<FormProvider form={form}>
  <form {...form.props}>
    <Field name="email">
      <Input {...form.field("email")} />
      <FieldError />
    </Field>
  </form>
</FormProvider>;
```

### `useTheme` — typed multi-theme

```ts
// The normal path — `setTheme` is typed to the union you supply.
// Declare the array at MODULE SCOPE: the snapshot reader memoises on its identity.
const APP_THEMES = ["default", "aurora", "midnight"] as const;
const { theme, setTheme, themes } = useTheme({ themes: APP_THEMES });

// No arguments — registry-free. `theme` is whatever data-theme actually says
// ("default" when unset), `setTheme` takes any string, `themes` is ["default"].
const { theme } = useTheme();
```

**This package has no theme list.** `default` is the only theme name the design system defines; `EXAMPLE_THEMES` is sample data for demos and nothing reads it. Never wire it in as a default — `scripts/verify-example-themes.mjs` fails the build on any example theme name in library code or shipped CSS.

`themes[0]` is the fallback / "default" (no `data-theme` attribute when set; `localStorage["theme"]` removed). All others write `data-theme="<name>"` and write `localStorage["theme"]`. That write is **one-way**: nothing in this package reads the key back, so the choice is discarded on reload unless the consumer restores it from a blocking inline `<script>` in `<head>` (not shipped here).

Registering a list is a **registry**: a `data-theme` value outside it folds to `themes[0]`. That is a mis-report, not a crash — it is why the no-argument form does not filter at all (#92).

The hook is **optional** — a theme is applied by the `data-theme` attribute alone. `<html data-theme="aurora">` (declarative, in a root layout / `index.html`) or `document.documentElement.setAttribute("data-theme", "aurora")` both work with zero JS from this package. Use `useTheme` only when you need a reactive switcher — it holds no React state, just `useSyncExternalStore` over `<html data-theme>` (server snapshot: `themes[0]`, so SSR always ships the default), plus the one-way `localStorage` write above. Scope: a theme using a `:root[data-theme="…"]` selector (the convention, and what the worked examples use) matches `<html>` only; a theme authored with a **bare** `[data-theme="…"]` selector can be set on any element to re-skin just that subtree (tokens cascade to descendants).

### `useViewTransition` — adapter for any router's navigate

```tsx
import { useViewTransition } from "@batthewz/response-ui-react-components";
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
const transition = useViewTransition(navigate); // wraps navigate in document.startViewTransition
transition("/dashboard");
```

The `<ViewTransition name="hero">` component is unrelated — it just sets `view-transition-name` on a `<div>`.

### `AvatarUpload` — presentational by default

Takes `onUpload(file): Promise<{ url: string }>`. With it, posts the file via the consumer's logic and updates the preview to the returned URL. Without it, the component stays in local-preview mode: the picked file is shown immediately from an object URL, revoked only once the DOM has stopped pointing at it — when the preview is replaced or the component unmounts.

```tsx
<AvatarUpload
  src={user.image}
  name={user.name}
  size="xl"
  accept={["image/jpeg", "image/png"]}
  maxSize={2 * 1024 * 1024}
  onUpload={async (file) => {
    const res = await api.put("/avatar", file);
    return { url: res.url };
  }}
  onUploadComplete={(r) => toast(`Uploaded: ${r.url}`)}
  onUploadError={(e) => toast(e.message, { variant: "error" })}
/>
```

### `DataTable` — three wiring modes

Pick one, don't mix:

1. **Client-everything** — `pageSize` (+ optional `defaultSort` / `defaultPage` seeds). Table sorts, slices, and derives pages from the full `data` array itself.
2. **Server-controlled** — `sort` + `onSortChange` and `page` + `totalPages` + `onPageChange`; no `pageSize`. Table renders the rows given and reports sort/page intent.
3. **Hybrid / server-paged (lazy-load)** — never enable uncontrolled sorting; use controlled `sort`. Accumulate fetched rows into `data` and use a footer slot sentinel to trigger the next load.

### `VirtualizedDataTable` — large datasets (10k+ rows)

Use instead of `DataTable` when you want continuous scrolling rather than pagination. Same `ColumnDef`/sorting contract (shared via `data-table-utils.ts`); windows rows via the `useVirtualRows` hook so only a small slice mounts. Requires a fixed `rowHeight` (content must fit — truncate overflow); `height` sets the scroll viewport. The `Table` root is the scroll container, so `stickyHeader` (default true) pins for free. Differs from `DataTable`: **no pagination**, **select-all spans the whole dataset**, and an optional `onEndReached` for infinite loading (accumulate into `data`, keep `sort` controlled when the server sorts).

### `useFloating` — Floating UI wrapper

Re-exports a configured `useFloating` hook from `@floating-ui/react` with sensible defaults (auto-update, flip, shift, offset), plus `arrow` when the config carries an `arrowRef`. Used internally by `Popover`, `HoverCard`, `Tooltip`, both menus, `Combobox`, `MultiSelect`, `ColorPicker`, `DatePicker` and `DateRangePicker`. Type `Placement` is also re-exported.

**`arrowRef` positions an element you render.** The three surfaces that render one — `Popover.Content`, `HoverCard.Content`, `Tooltip` — do it behind an opt-in `arrow` prop, default off, and style it from the panel's own `background-color`/`border` via `inherit` rather than an arrow-specific variable. The geometry lives once in `floatingArrowProps` (`src/hooks/use-floating.ts`): it turns the *resolved* placement plus `middlewareData.arrow` into a `data-side` and the inline offsets, so a flip carries the arrow across. The menus are deliberately excluded — `ContextMenu` positions against a 0×0 virtual reference at the cursor and shares one hook with `DropdownMenu`, so an arrow there would point at nothing.

## Naming conventions for AI-generated code

- Every design-system scale is numbered **descending**: **`1` is always the most significant value; a higher number never carries a larger value.** `r1` is the biggest gap and `r6` the tightest; likewise `h1` > `h6` and `body-1` > `body-3`. (Non-strict at one point: `--H5` and `--H6` are both `1.25rem` above `40rem`, separated by weight rather than size.)
- Use Tailwind utilities backed by the design system's tokens, not raw values:
  - Spacing: `p-r3 m-r2 gap-r4` not `p-4 m-2 gap-6`
  - Text: `text-h1 text-body-2` not `text-3xl text-sm`
  - Color: `bg-surface-0 text-fg-primary border-border-default` not `bg-gray-100 text-gray-900 border-gray-200`
  - Status: `bg-status-error-bg text-status-error` for error tints
  - Radius/shadow: `rounded-md shadow-sm` (resolves to design-system tokens)
- Always wrap class strings with `cn(...)` from this package. Class *strings* — `classNames` is a
  prop name (see the section above), and `cn()` on that object reads it as clsx's conditional form
  and emits the slot keys themselves as classes.
- For polymorphic spacing in props, expose `r1..r6` as values: `<Stack gap="r3">`.
- Components are forwardRef, with four generic exceptions — `DataTable`, `VirtualizedDataTable`, `Repeater` and `AvatarUpload` are plain function components, because `forwardRef` erases a type parameter. **Being a plain function component is what *allows* React 19's `ref` prop, not what delivers it: the props type still has to carry `ref`, and on three of the four it does not.**
  - **`AvatarUpload` takes `ref`.** Its props intersect `Omit<ComponentPropsWithRef<"div">, "children">`, it destructures `ref` and spreads the rest onto its root, and the docblock above it says why (`grep -n 'A plain generic function component' src/components/ui/AvatarUpload.tsx`). This is the shape to copy when you write a generic component here.
  - **`DataTable`, `VirtualizedDataTable` and `Repeater` do not.** Each props type is closed — `className?: string` and named props only, no `ref`, no `ComponentProps` intersection — and none of the three destructures a rest bag (`grep -rn '\.\.\.rest\|\.\.\.props' src/components/ui/DataTable.tsx src/components/ui/VirtualizedDataTable.tsx src/components/form/Repeater.tsx` returns nothing). So `<Repeater ref={…}>` is a **compile error**, and so are `<DataTable ref>` and `<VirtualizedDataTable ref>`. Read the types by name rather than by line — they have all grown: `grep -n 'type DataTableProps\|type VirtualizedDataTableProps\|type RepeaterProps' src/components/ui/DataTable.tsx src/components/ui/VirtualizedDataTable.tsx src/components/form/Repeater.tsx`.
  - Closing that gap is a recorded follow-up in `docs/project-docs/cascade-and-slots.md` §11, deliberately not folded into Phase 3. **Do not add `ref` to the three in passing** — it is public API surface on three components and wants its own change.
  - When *writing* one of these, intersect `ComponentPropsWithRef<"div">` (or the appropriate element) as `AvatarUpload` does; that intersection is the whole mechanism. When *composing* with the existing three, reach their roots through `className`, and their inner components through the `<thing>Props` hatches (`tableProps`, `paginationProps`, `itemActionProps`, `addButtonProps`).
- **Uniform card grids → `Grid`, not `Row wrap` or `MasonryGrid`.** `Grid columns={{ base: 1, md: 3 }}` gives equal-width columns and equal-height rows (cells share the row height, so footer buttons line up). `Row wrap` sizes children to content (uneven widths); `MasonryGrid` is CSS multi-column (uneven heights *by design* — reach for it only when you want Pinterest-style masonry). `Grid` cells are `minmax(0, 1fr)`, so long words wrap instead of overflowing. **Both take a bounded `columns` union** — `Grid` 1–6, `MasonryGrid` 1–4 — and neither ships a stylesheet: the count resolves to `grid-cols-*` / `columns-*` utilities from a written-out lookup table, because Tailwind scans source text and generates nothing for a template literal. Adding a count means adding its literal class strings to that table, not a CSS rule.

## This package's CSS is in `@layer components`, so `className` wins

**Every component's stylesheet is layered.** All 44 per-component imports in `src/styles.css`
carry `layer(components)`, and Tailwind orders `@layer components` **below** `@layer utilities`.
The consequence is the headline capability of this library:

```tsx
<StatCard className="flex-row items-center border-0 bg-surface-2">…</StatCard>
```

A caller's utility beats the component's own rule **at any specificity**, on every component,
whether or not it has a sibling `.css`. So does a consumer's own unlayered stylesheet, without
needing to be ordered after ours. Before this, a utility touching any property a component
stylesheet already set was silently inert — the class landed in the DOM, changed nothing, and
reported no error — and the documented workaround was the important modifier (`p-r1!`). **Do not
write that workaround into new code or new docs.** If you find a page still recommending it, the
page is wrong.

`src/tokens.css` is deliberately **not** layered: it carries `@theme inline`, which registers
utilities and belongs in Tailwind's own `theme` layer. `bun run probe:cascade-layer` is the only
instrument in the repo that can see the *effect* of any of this — `vitest` stubs CSS to `""` and
jsdom applies no stylesheets, so every other gate is blind to the cascade.

**Two guards keep the arrangement itself true, and both are in `prepublishOnly`:**

- **`bun run verify:css-layering`** — every `@import "./components/*.css"` carries
  `layer(components)`, `tokens.css` carries none, and an import it cannot classify fails the run
  rather than being skipped. **The probe cannot do this job**: it re-derives the import list from
  `src/styles.css`, strips whatever `layer()` is written there, and adds its own — so deleting
  `layer(components)` from a real import leaves the probe green along with every other gate, and
  silently reverts this whole section for that one component.
- **`bun run verify:no-css-imports`** — no `.ts`/`.tsx` imports a `.css`. A stylesheet reached
  through the JS graph is injected **unlayered** by the bundler, where it out-ranks
  `@layer components`. `src/styles.css` is the only place layering is decided; if a component needs
  new CSS, register it there.

Three things a `className` still cannot beat, so nobody reads a leftover as drift:

- **Anything written as an inline `style`.** `ScrollReveal`'s `delay` and floating-surface fade
  durations are inline; an inline declaration beats every class at every layer. That is a
  different defect with a different fix, not a layering question. Check the emitted `style`
  rather than assuming — and note that an inline *default* is the version of this worth hunting,
  because it makes the override unreachable for every caller rather than only the one who asked
  for it. `Skeleton` used to carry one (`width = "100%"`) and no longer does: both its axes are
  now `className`, `w-full` in the class list where `cn` can collapse it, height left to
  `.skeleton { height: 1em }` in `@layer components` where `h-*` out-ranks it.
- **Unlayered rules in `@batthewz/response-ui-css`.** The foundation is unlayered almost
  everywhere, so `.mono-font`, the `.fade-*` entrance classes and the universal
  `*::-webkit-scrollbar*` rules out-rank everything this package writes. Where that mattered we
  stopped colliding rather than shouting louder — `Timeline` emits no `.fade-*` class, `Stagger`
  writes its delay inline, `Tabs` deleted its scrollbar rules.
- **The two `!important` declarations below.**

## When a narrowly-scoped `!important` is legitimate here, and when it is not

This package contains exactly **two** `!important` declarations, and the count is the point —
`grep -rn '!important;' src --include=*.css` should return exactly these two lines (the bare
`!important` grep also matches the comments explaining them). Both were argued for individually:

- `ScrollReveal.css` — `opacity: 1` under `@media (scripting: none)`.
- `Hero.css` — `animation-name: none` on a stagger item inside a still-hidden reveal.

**A carve-out and an `!important` are different exceptions, and only one creates a second
precedence regime.** Leaving a file unlayered re-introduces the three interacting axes Phase 1
collapsed (unlayered-vs-layered, specificity, source order); that was refused everywhere, for
focus rings included. An `!important` inside `@layer components` keeps one regime and raises one
declaration within it.

**What it costs, measured, so nobody thinks it is mild.** Important declarations reverse the layer
order. An `!important` in `@layer components` beats an `!important` in `@layer utilities`, beats a
consumer's **unlayered `!important`**, and beats a consumer's inline `style` normal declaration.
The only consumer route left is inline `style` **with** `!important` — and for a pseudo-element
target, not even that exists. It is not "the consumer has to shout louder"; it is "the consumer is
out of options."

**The admission test.** A declaration may take `!important` only if **both** hold:

1. It guarantees a **visibility or timing invariant**, not a design decision. "Content is not
   permanently invisible" and "an entrance does not play while its content is hidden" qualify. "The
   scrollbar is a 3px hairline" does not — that is an appearance, and `Tabs.css`'s three scrollbar
   declarations were **deleted** rather than defended for exactly that reason.
2. It is gated behind a condition a consumer would not be styling into — `scripting: none`, a
   transient state removed once and never restored.

And it must carry a comment saying **why this one and not the next one**. Without that sentence
the next reader reads the leftover as licence, tidies it away, or copies it.

**Focus rings are not on this list.** They are not carved out and are not `!important` — see
below. The one focus-shaped fix Phase 1 needed was `not-forced-colors:` on
`focusOutlineResetControl` (`src/util/focus.ts`), which needs no `!important` at all: it stops the
two rules competing instead of ranking one over the other. That is the preferred shape of fix
everywhere, and it is why there are two `!important`s rather than five.

## Decision: focus rings are layered, and a consumer's reset may win

**Status: in effect.** Focus rings are in `@layer components` with the rest of this package's CSS.
**They are not carved out, and are not `!important`.** A consumer's unlayered
`*:focus { outline: none }` therefore beats our focus ring at any specificity.

That is deliberate. Writing a global focus reset is an opt-out of focus visibility, and the design
system does not fight it with a precedence trick — one cascade regime with no exceptions is worth
more than 29 declarations defended by being unlayered. The alternative would leave the package
shipping two precedence rules, which the next reader would eventually "tidy" without knowing why the
exception existed.

**The scope of this decision is narrow, and the boundary matters:**

- ✔ **Covered:** a *consumer-authored* reset out-ranking a ring we ship.
- ✘ **Not covered:** *our own* utilities out-ranking *our own* CSS. `@layer components` sits below
  `@layer utilities`, so a `focus:outline-none` utility on an element whose `.css` file paints a
  replacement outline would delete it. `Radio.css`'s `forced-colors` outline was the live case —
  WCAG 2.4.7, caused entirely in-package, and nobody accepted it. **Fixed, not accepted:**
  `focusOutlineResetControl` is now `not-forced-colors:focus:outline-none`, so the reset stands
  down in the one mode where the outline is the only affordance left. That closed the same gap for
  the six other controls sharing the recipe (`Input`, `Select`, `Textarea`, `OTPInput`, `Combobox`,
  `ColorPicker`), which had no forced-colours indicator at all — announced here because it is a
  behaviour change nobody asked for alongside the one that was.

Both cases measure identically (`2px → 0px`). The mechanism is what separates them, so check which
side authored the winning rule before concluding anything is accepted.

`bun run probe:cascade-layer` records the accepted case as a pinned `expectAfter` row with the
decision text attached. **`verify:focus-affordance` cannot see any of this** — it checks source
pairing, so it stays green while a replacement outline stops painting. It *was* taught the
`not-forced-colors` variant, because without that entry it stopped recognising the reset at all
and silently dropped all seven `focusRingControl` sites out of its coverage: measured, 18 covered
controls fell to 11 while the script still printed OK. Widening a guard's vocabulary is how a
guard goes blind rather than red — make it fail on purpose after every such change.

## Decision: what stays in CSS, what becomes a utility, and how to tell which you are looking at

**Status: in effect.** The rule is: **when you touch a component for another reason, prefer
utilities.** There is no sweep, no lane and no completion criterion — **a component still carrying a
stylesheet is not unfinished work**, and the end state is a documented hybrid, not zero CSS.
`src/util/focus.ts` is the utility-side counterpart to the `:focus-visible` rules in component CSS
and says so in its own docblock; that pairing is this package's established, gated pattern rather
than a compromise.

**Why a convention and not a project.** Every override capability already shipped — component CSS in
`@layer components` (above) and per-slot `classNames`. Converting the rest is on the order of a
thousand mechanical edits that delete a handful of stylesheets and buy **consistency only**. The
cost/benefit is measured once, with its method, in `docs/project-docs/cascade-and-slots.md` §2b and §6 (repo-only,
not in the npm package); take the figures from there rather than re-deriving them beside this
paragraph.

### What stays

| Stays in CSS when | Why no utility can take it | Live instance |
| --- | --- | --- |
| It is a **`@keyframes` block** | A utility sets properties on an element; there is no variant for a block. The only genuinely immovable thing in the package. | **8 blocks in 5 files** (`Sparkline` ×2, `AppShell` ×2, `CommandPalette` ×2, `ProgressBar`, `Skeleton`) — `grep -rn '^@keyframes' src --include=*.css`. Anchor the `^`: `Timeline.css` says the word in a comment. |
| A **modifier in the same layer must out-rank it** | The utility lands in `@layer utilities`, *above* `@layer components` — so the base declaration starts beating the modifier that qualifies it. This is the subtlest one and the one a bulk conversion destroys. | `.skeleton { height: 1em }` against `.skeleton--circular { height: auto }`. As `h-[1em]` in the class list, every circle collapses to 1em. `grep -n 'height' src/components/ui/Skeleton.css` — the file states it at source. |
| It must **beat an unlayered foundation rule** | `@batthewz/response-ui-css` is unlayered almost everywhere, and `@layer utilities` loses to unlayered too — so no *ordinary* utility can replace `ScrollReveal`'s `opacity: 1`. **State the reason as reach, not as impossibility:** `noscript:opacity-100!` **does** win (measured — an important declaration beats a non-important one across the author origin whatever the layer) and would delete the file. It is rejected because a utility reaches only the elements React renders, while the rule reaches every `.scroll-reveal-hidden` in the document including markup an Astro/Rails consumer hand-authors — and the declaration exists to make a *visibility* invariant unconditional. Narrowing that is not worth 35 lines. | The package's **two** `!important` declarations, and no others — `grep -rn '!important;' src --include=*.css` (the `;` is load-bearing: drop it and the count reads 10, because five files discuss `!important` in prose). They are governed by the admission test above. `Hero.css`'s is the other, and it is also why that file stays: `@layer utilities` loses to unlayered too, so converting would not even preserve the ranking the `!important` exists to win. Reach first for *stopping* the collision: `Timeline` stopped emitting the foundation's entrance class, `Stagger`'s stylesheet went entirely, `Tabs` deleted three scrollbar declarations. |
| The subject is **an element this package does not render** | A utility has to be put *on* something — and where the element is content the **consumer** supplies, converting also inverts who wins: a descendant utility emits at 0,1,1 in `@layer utilities`, *after* the child's own 0,1,0 `size-*`, so the rule stops losing to the caller and starts beating them. | `Hero.css`'s two `.stagger-item` rules — that markup is hand-authored by the consumer (`grep -n 'THE CONSUMER PICKS THE ENTRANCE' src/components/ui/Hero.css`). Then the three svg rules that style the caller's own icon node: `menu-internals.css`'s `.menu-item-icon > svg` (the only reason that file survives at all), `Stepper.css`'s `.stepper-indicator svg`, and `EmptyState.css`'s `.empty-state__icon svg` — `grep -rn 'icon svg\|icon > svg' src --include=*.css`. **`VirtualizedDataTable.css` used to be cited here and the citation was wrong:** that component renders those cells itself through `<Table.Cell>` / `<Table.HeaderCell>`, both of which merge a `className`, and it populates `Table`'s `tableProps` hatch too — so nothing in the file was blocked by this question, and the file is now deleted. *Rendering an element through a subcomponent that forwards `className` is still rendering it.* |
| The value's **read site is not a property** | A value consumed by a `calc()`, or inside another custom property's definition, has no property for a utility to set. **The discriminator is what property the read sits in, not whether the value contains arithmetic** — `--progress-bar-fill-end` was a `color-mix()` read inside `background-image`, which *is* a property, so a utility took the whole declaration and the token was deleted. | `grep -rn -- '--_stepper-gap\|--calendar-col-gap\|--calendar-month-gap' src` — `--calendar-col-gap` is never applied as a `column-gap` at all; its only read is inside `--calendar-month-width`'s `calc()`. `--_activity-feed-dot-size: var(--_activity-feed-aside-width)` is the same shape in one line. **`Timeline` is the shape at scale:** *seven* of fourteen private `--_timeline-*` properties are read only from inside another custom property, forming one six-deep chain (`dot-size → marker-radius → line-offset → gutter → rail-x → left/right`). Count them by the discriminator this row states — *the property the read sits in* — not by the presence of `calc()`, which inflates the figure to ten. A prior survey said nine, which is neither. |
| The utility form is **N variant-scoped classes, not one** | A judgement call, not an impossibility. Convert it only deliberately, with the cost written down. | The Timeline density axis: `--_timeline-card-padding` / `--_timeline-item-gap`, 3 definitions each selected by `[data-density]` and 1 read each, so the utility form is six `in-[[data-density=…]]:` classes rather than one baseline utility. `grep -rn -- '--_timeline-card-padding\|--_timeline-item-gap' src` |
| The file is a **layout contract read as a whole** | Legibility is the property being bought. `Timeline.css`'s six-deep derivation chain would not survive being spread across six class strings. Also a judgement call — label it as one. | Measured **once**, with its method, in `docs/project-docs/cascade-and-slots.md` §2b. Do not measure it a second time; two measurements of one file is how a document ends up disagreeing with itself. |
| It is a **shorthand `inherit`** a caller must out-rank | The only utility form is an arbitrary property, and Tailwind sorts those after every *bare* named utility at the same specificity — so the declaration stops losing to the `classNames` slot it was written to lose to and starts beating it. The longhand escape does not exist: `border-inherit` is `border-color: inherit` only, and cannot carry an inherited width and style. (The `[data-side]` rules that trim such an arrow are **not** the blocker — a variant utility emits later *and* out-ranks it at 0,2,0.) | `Tooltip.css` and `Popover.css`, whose `.tooltip-arrow` / `.popover-arrow` both read `border: inherit`, and whose own docblocks say `classNames.arrow` exists to out-rank them — `grep -rn 'border: inherit' src --include=*.css`. Both files survive on this rule alone. |
| The subject is a **UA pseudo-element** | `-webkit-appearance: none` loses its prefix (`appearance-none` emits the unprefixed property only), and a `box-shadow` there resolves through five `@property`-registered variables where the hand-written form has one. Neither consequence is measurable in this repo — and on a slider thumb the `box-shadow` **is** the focus affordance. Putting the state variant on the wrong side (`[&::-webkit-slider-thumb]:focus-visible:…`) compiles to a selector that never matches. | `grep -rn 'slider-thumb\|range-thumb\|search-cancel-button' src --include=*.css` — `Slider`, `RangeSlider`, `ColorPicker`'s hue rail and `SearchInput`. Four files, three of them focus-guard-covered controls. |

**Class names outlive their declarations.** When a rule's declarations become utilities, the BEM class
stays as a declaration-free marker — it costs nothing, and it keeps one name per component for
consumer stylesheets, devtools and Astro/Rails consumers of `response-ui-css`. Comment it at the site
as a marker or the next reader deletes a class that styles nothing (`Grid.tsx`, `MasonryGrid.tsx`
both carry that comment). Two consequences: a class a `querySelector` finds is a **behavioural**
marker — append to it, never replace it; and a retained marker contaminates any single-build A/B of
old stylesheet versus new utilities, because the new markup still matches the deleted selector.

### The test

Ask these in order, of one declaration:

1. **Is there an element this component renders that the class could go on?** No → stays.
2. **Does the declaration have a property a utility can set** — is the read site a property, rather
   than a `calc()` or another custom property's value? No → stays.
3. **Would landing in `@layer utilities` invert something?** A modifier it must lose to, or an
   unlayered foundation rule it must beat? Yes → stays.
4. **Is the utility form one class or N variant-scoped ones?** N → convert only with the cost stated.
5. **Does the declaration depend on being first in its rule, or on a source-order contract with
   another rule?** A blanket reset, or a pair of rules whose correctness comes from one being
   written after the other at deliberately equal specificity (`Timeline.css`'s two `:has()`
   rules), has no class-list form at all — a class list cannot express "these two, in this order".
   Yes → **stays**, or must be enumerated against Preflight rather than transposed.

**Preflight is assumed, and never restated.** Both packages `@import "tailwindcss"` whole, and this
package's README states the requirement, so Tailwind's base reset is a dependency rather than a
coincidence. (The foundation has not adopted the same rule and still restates the heading margins;
that is its call, not a licence to restate anything here.) A declaration that only repeats it is
**deleted, not converted**: `box-sizing` anywhere,
`margin`/`padding` on any element, `border`/`background`/`font`/`color` on a `<button>` or `<input>`,
`vertical-align` on an `svg`, `border-collapse` on a `<table>`. What Preflight does *not* cover is
exactly what the resets here exist for — the UA's `text-align: center` and `cursor` on a button
(which is why `Tabs`, `Pagination`, `Switch` and `CalendarBase` open with `all: unset`), `appearance`
on anything that is not a button, and every UA pseudo-element (`*` does not reach them, so a thumb
still needs its own `box-sizing`). Check the claim against
`node_modules/tailwindcss/preflight.css`, not memory.

Survive all five and it is a straight transposition to a utility. **Leftover CSS is not a backlog:** a
file that *has* been converted keeps a header comment naming why each surviving rule cannot move; a
file nobody has touched has no such comment, and that is the expected state rather than drift.

### The falsifier, and it is not soft

The last package-wide pass motivated by consistency shipped a **1.31:1** focus ring on
`<Button variant="danger">` — a focus indicator's floor is 3:1 (`grep -n '1.31:1' src/util/focus.ts`).
Collapsing eight hand-rolled focus recipes into one flattened a distinction nobody had enumerated: the
ring's contrast had been measured against surfaces and never against a control's own fill. `typecheck`,
`lint`, every test and every `verify:*` were green throughout, because no gate here can see a contrast
ratio or a pixel. `memory/traps.md` §D–§F (repo-only) carries it in full.

So "prefer utilities" is exercised **one component at a time, for a reason other than tidiness**. A
consistency argument is precisely the argument that produced that ring — and when you do convert,
enumerate what the declarations you are collapsing actually differed *on* before deciding the
difference was drift.

## Don'ts for AI-generated code

- Don't import from deep paths in the main app's source — import from the root barrel: `import { Button } from "@batthewz/response-ui-react-components"`. Subpath imports work but are usually unnecessary.
- Don't use `clsx` or `twMerge` directly — always go through `cn()`.
- Don't reach into `node_modules/@batthewz/response-ui-css/src/...` from JS. CSS goes in CSS via `@import`.
- Don't write CSS-in-JS. The library's styling boundary is Tailwind utilities + design tokens — with the enumerated exceptions under *Decision: what stays in CSS…* above, which are the only places a stylesheet is still the right answer.
- When a component paints marks directly on a surface, follow the **Contrast contract** in `response-ui-css/AGENTS.md` (Colour): use text tokens (`--C-TEXT-*`) for ink/lines/borders on `--C-SURFACE-*`, and outline filled chips in their `on-*` token. Don't use `--C-PRIMARY` / `--C-ACCENT` as a border/line/text colour on a surface — a theme may set them ≈ the surface.
- **Don't name an example theme.** `events`, `grimdark` and `tech` are sample code. Never put one in a selector, a type, a default value, a config list, or a test fixture — invent a name (`aurora`, `midnight`) instead. If a rule really needs to vary per theme, express it as a token the consumer also controls, so their theme gets the same deal. `bun run verify:example-themes` fails the build on violations; `src/examples/` is the only exception. The one legitimate use is a demo that has explicitly imported the example CSS — then import `EXAMPLE_THEMES`.

## Testing

**Testing your app's code that consumes this package.** When you mock `@batthewz/response-ui-react-components`, mock the WHOLE module path **once** with every export your subject-under-test uses — vitest honors only the last `vi.mock` call per module path, so a second, partial mock silently wins and drops the rest:

```ts
vi.mock("@batthewz/response-ui-react-components", () => {
  const Button = ({ children, ...p }: any) => <button {...p}>{children}</button>;
  const Text = ({ children }: any) => <span>{children}</span>;
  return { Button, Text /* …all exports the SUT uses */ };
});
```
