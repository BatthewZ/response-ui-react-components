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
  The first provides tokens, themes, responsive scales, animations, base; the second provides per-component CSS (Accordion, Button, etc.) co-located with each `.tsx`. Order matters — per-component CSS reads `var(--…)` from the foundation. Components ship NO CSS-in-JS.
- Tailwind v4 must be in the consumer's build (e.g. `@tailwindcss/vite`).
- Peer deps: `react`, `react-dom`, `@floating-ui/react`, `lucide-react`. Regular dep: `@batthewz/response-ui-css` (auto-installed; the consumer still does the `@import` themselves so Tailwind v4 picks it up).

## RSC

`"use client"` is applied selectively to interactive modules; barrels and pure presentational components (Button, Text, layout) stay directive-neutral, so they're server-renderable in RSC frameworks (Next.js App Router, etc.) with no extra wiring. These are presentational Client Components — props serialize to the browser, so **never pass server-only secrets as props.**

## Public surface

Top-level barrel exports everything. The grouping below mirrors the source layout (`src/`).

### components/ui (50)

```
Accordion, Alert, AppShell, Avatar, AvatarGroup, AvatarUpload, Badge, Breadcrumbs,
Button, Calendar, RangeCalendar + type DateRange, Card, Carousel, CodeBlock, Collapsible, CommandPalette + type
CommandItem, ContextMenu, CopyButton, DataTable + type ColumnDef, Dialog, Drawer,
DropdownMenu, EmptyState + EmptyState{Title,Description,Icon,Actions}, ErrorBoundary,
FileUpload, Hero, HoverCard, IconButton, Kbd, MasonryGrid, MediaCard, Pagination,
Popover, Portal, ProgressBar, Rating, Skeleton, Spinner, Spotlight, StatCard, Stepper,
Swimlane, Table, Tabs, Text, ThemeSwitcher, Timeline, Toast + type ToastVariant,
ToastProvider, useToast, Tooltip, VirtualizedDataTable + type
VirtualizedDataTableProps, Wizard + useWizard + types
WizardProps/WizardStep/UseWizardOptions/UseWizardReturn
```

### components/form (22 + orchestration)

```
Checkbox, ColorPicker, Combobox, DatePicker, DateRangePicker, Field, FieldError, FormActions, Input,
Label, MultiSelect + type MultiSelectOption, NumberInput, OTPInput, Radio,
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
useDocumentTitle, useFloating + type Placement, useFocusTrap, useMediaQuery,
usePrefersReducedMotion, useRovingFocus,
useTheme + type Theme + type UseThemeOptions + type UseThemeReturn,
THEMES (= ["default","events","grimdark","tech"]), STORAGE_KEY,
useVirtualRows + type UseVirtualRowsParams + type UseVirtualRowsReturn
```

### util

```
cn, createCn, mergeExtension, twMerge, tailwindMergeExtension, mergeRefs, formatBytes,
date helpers: addDays, addMonths, buildMonthGrid, clampDate, formatDate,
getDateFieldOrder, getMonthLabel, getWeekdayNames, isAfter, isBefore, isSameDay,
parseDateInput, startOfDay, startOfMonth
```

## Patterns and conventions

### `cn()` — class composition

Always use `cn()` from this package, not raw `clsx` or `tailwind-merge`. The exported `twMerge` is pre-configured with `tailwindMergeExtension`, which knows about the design system's custom utilities (responsive `r1..r6` spacing, design-system `h1..h6` / `body-1..3` text, semantic color tokens). Without it, `cn("text-h1", "text-h2")` won't collapse correctly.

```ts
import { cn } from "@batthewz/response-ui-react-components";
const className = cn(
  "p-r3 bg-surface-1",
  customClass,
  isActive && "bg-primary",
);
```

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
// Default — one of "default" | "events" | "grimdark" | "tech"
const { theme, setTheme, themes } = useTheme();

// With custom themes — typed as the union of the supplied list
const { theme, setTheme } = useTheme({
  themes: ["default", "events", "grimdark", "tech", "aurora"] as const,
});
```

`themes[0]` is the fallback / "default" (no `data-theme` attribute when set; cleared from localStorage). All others write `data-theme="<name>"` and persist to `localStorage["theme"]`.

The hook is **optional** — a theme is applied by the `data-theme` attribute alone. `<html data-theme="grimdark">` (declarative, in a root layout / `index.html`) or `document.documentElement.setAttribute("data-theme", "grimdark")` both work with zero JS from this package. Use `useTheme` only when you need a reactive switcher (state + persistence + SSR-safe hydration). Scope: built-in themes use a `:root[data-theme="…"]` selector (matches `<html>` only); a theme authored with a **bare** `[data-theme="…"]` selector can be set on any element to re-skin just that subtree (tokens cascade to descendants).

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

Takes `onUpload(file): Promise<{ url: string }>`. Without it, just shows a local preview. With it, posts the file via the consumer's logic and updates the preview to the returned URL.

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

1. **Client-everything** — `pageSize` (+ optional `defaultSort`). Table sorts, slices, and derives pages from the full `data` array itself.
2. **Server-controlled** — `sort` + `onSortChange` and `page` + `totalPages` + `onPageChange`; no `pageSize`. Table renders the rows given and reports sort/page intent.
3. **Hybrid / server-paged (lazy-load)** — never enable uncontrolled sorting; use controlled `sort`. Accumulate fetched rows into `data` and use a footer slot sentinel to trigger the next load.

### `VirtualizedDataTable` — large datasets (10k+ rows)

Use instead of `DataTable` when you want continuous scrolling rather than pagination. Same `ColumnDef`/sorting contract (shared via `data-table-utils.ts`); windows rows via the `useVirtualRows` hook so only a small slice mounts. Requires a fixed `rowHeight` (content must fit — truncate overflow); `height` sets the scroll viewport. The `Table` root is the scroll container, so `stickyHeader` (default true) pins for free. Differs from `DataTable`: **no pagination**, **select-all spans the whole dataset**, and an optional `onEndReached` for infinite loading (accumulate into `data`, keep `sort` controlled when the server sorts).

### `useFloating` — Floating UI wrapper

Re-exports a configured `useFloating` hook from `@floating-ui/react` with sensible defaults (auto-update, flip, shift, offset). Used internally by `Popover` and `Tooltip`. Type `Placement` is also re-exported.

## Naming conventions for AI-generated code

- Use Tailwind utilities backed by the design system's tokens, not raw values:
  - Spacing: `p-r3 m-r2 gap-r4` not `p-4 m-2 gap-6`
  - Text: `text-h1 text-body-2` not `text-3xl text-sm`
  - Color: `bg-surface-1 text-fg-primary border-border-default` not `bg-gray-100 text-gray-900 border-gray-200`
  - Status: `bg-status-error-bg text-status-error` for error tints
  - Radius/shadow: `rounded-md shadow-sm` (resolves to design-system tokens)
- Always wrap classNames with `cn(...)` from this package.
- For polymorphic spacing in props, expose `r1..r6` as values: `<Stack gap="r3">`.
- Components are forwardRef. When composing, type props as `ComponentPropsWithRef<"div">` (or appropriate element).
- **Uniform card grids → `Grid`, not `Row wrap` or `MasonryGrid`.** `Grid columns={{ base: 1, md: 3 }}` gives equal-width columns and equal-height rows (cells share the row height, so footer buttons line up). `Row wrap` sizes children to content (uneven widths); `MasonryGrid` is CSS multi-column (uneven heights *by design* — reach for it only when you want Pinterest-style masonry). `Grid` cells are `minmax(0, 1fr)`, so long words wrap instead of overflowing.

## Don'ts for AI-generated code

- Don't import from deep paths in the main app's source — import from the root barrel: `import { Button } from "@batthewz/response-ui-react-components"`. Subpath imports work but are usually unnecessary.
- Don't use `clsx` or `twMerge` directly — always go through `cn()`.
- Don't reach into `node_modules/@batthewz/response-ui-css/src/...` from JS. CSS goes in CSS via `@import`.
- Don't write CSS-in-JS. The library's styling boundary is Tailwind utilities + design tokens.
- When a component paints marks directly on a surface, follow the **Contrast contract** in `response-ui-css/AGENTS.md` (Colour): use text tokens (`--C-TEXT-*`) for ink/lines/borders on `--C-SURFACE-*`, and outline filled chips in their `on-*` token. Don't use `--C-PRIMARY` / `--C-ACCENT` as a border/line/text colour on a surface — a theme may set them ≈ the surface.

## Testing

**Testing your app's code that consumes this package.** When you mock `@batthewz/response-ui-react-components`, mock the WHOLE module path **once** with every export your subject-under-test uses — vitest honors only the last `vi.mock` call per module path, so a second, partial mock silently wins and drops the rest:

```ts
vi.mock("@batthewz/response-ui-react-components", () => {
  const Button = ({ children, ...p }: any) => <button {...p}>{children}</button>;
  const Text = ({ children }: any) => <span>{children}</span>;
  return { Button, Text /* …all exports the SUT uses */ };
});
```
