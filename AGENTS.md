# AGENTS — @batthewz/response-ui-react-components

Machine-readable reference for AI assistants working with this package. Concise, exact, opinionated.

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
- **Packaging: the single `exports` map points at `dist/` (`.js` + `.d.ts` + `.d.ts.map`), built by `vite build`.** Do NOT move entry points back to `src/*.ts` or stash a dist map inside `publishConfig` — overriding `main`/`types`/`exports` via `publishConfig` is a pnpm-only feature that npm/bun publish silently ignore (this shipped raw TSX to consumers up to 0.2.1). `src/` still ships in the tarball: the `@source` in `styles.css` and the declaration maps point into it. When consuming this package via a local link, run `bun run build` (or `vite build --watch`) so `dist/` tracks your edits.

## CSS layout

Per-component CSS is co-located with each `.tsx`: `src/components/ui/Accordion.tsx` ↔ `src/components/ui/Accordion.css`, `src/components/form/SearchInput.tsx` ↔ `src/components/form/SearchInput.css`, etc. The aggregator [`src/styles.css`](./src/styles.css) `@imports` all of them and is exposed as the `./styles` subpath export.

The aggregator also ends with `@source "../src/**/*.{ts,tsx}";` — a **self-relative** Tailwind v4 registration of this package's own sources, so consumers' builds generate the utility classes used inside the components under any node_modules layout (hoisted npm, bun's isolated store, pnpm). It must stay self-relative and must keep working from both `src/styles.css` (dev/linked) and the verbatim copy at `dist/styles.css` (published) — `../src` satisfies both because `src/` ships in the npm package. Don't move source scanning into `@batthewz/response-ui-css`; a sideways path from another package silently breaks under isolated stores.

Domain tokens (trend, chart, media-card/carousel/poster) live in [`src/tokens.css`](./src/tokens.css) (this package's extension of the universal css contract); the exported `cn` is built with `createCn` so it dedupes these utilities.

When adding a new component that needs CSS:
1. Create `MyComponent.css` next to `MyComponent.tsx`.
2. Add an `@import` line to [`src/styles.css`](./src/styles.css).
3. The CSS file is copied to `dist/` automatically by the `copyCssAssets` plugin in [`vite.config.ts`](./vite.config.ts).

Class-name convention: kebab-case rooted on the component name (e.g. `.accordion`, `.accordion-trigger`, `.accordion-content-inner`). Use `cn()` to apply, so consumer-passed `className` can merge cleanly.

## RSC

`"use client"` is applied selectively to interactive modules; barrels and pure presentational components (Button, Text, layout) stay directive-neutral so they remain server-renderable. `verify:directives` enforces both the dist mirroring (built `dist/` files carry the same directive as their `src/`) and a secret-free invariant (these are presentational Client Components — props serialize to the browser, so they access no server state/secrets).

## Public surface

Top-level barrel exports everything. The grouping below mirrors the source layout (`src/`).

### components/ui (47)

```
Accordion, Alert, AppShell, Avatar, AvatarGroup, AvatarUpload, Badge, Breadcrumbs,
Button, Calendar, Card, Carousel, CodeBlock, Collapsible, CommandPalette + type
CommandItem, ContextMenu, CopyButton, DataTable + type ColumnDef, Dialog, Drawer,
DropdownMenu, EmptyState + EmptyState{Title,Description,Icon,Actions}, ErrorBoundary,
FileUpload, Hero, HoverCard, IconButton, Kbd, MasonryGrid, MediaCard, Pagination,
Popover, Portal, ProgressBar, Rating, Skeleton, Spinner, Spotlight, StatCard, Stepper,
Swimlane, Table, Tabs, Text, ThemeSwitcher, Timeline, Toast + type ToastVariant,
ToastProvider, useToast, Tooltip
```

### components/form (17)

```
Checkbox, Combobox, DatePicker, Field, FieldError, FormActions, Input, Label,
NumberInput, OTPInput, Radio, SearchInput, Select, Slider, Switch, TagInput, Textarea
```

### components/data-display (5)

```
Sparkline, ProgressRing, Meter + type MeterProps, DescriptionList, ActivityFeed
```

Dashboard primitives, its own group alongside ui/form/layout so the category is
discoverable. Existing dashboard-ish components (StatCard, Timeline, Table, DataTable)
are NOT moved here — they stay in components/ui.

### components/layout (6)

```
Center, Container, Divider, Row, Spacer, Stack
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
useDocumentTitle, useFloating + type Placement, useFocusTrap,
usePrefersReducedMotion, useRovingFocus,
useTheme + type Theme + type UseThemeOptions + type UseThemeReturn,
THEMES (= ["default","events","grimdark","tech"]), STORAGE_KEY
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
const className = cn("p-r3 bg-surface-1", customClass, isActive && "bg-primary");
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

For power users who need to drive `extendTailwindMerge` themselves, `mergeExtension` and the raw frozen `tailwindMergeExtension` are also exported. See [`@batthewz/response-ui-tw-merge`](../response-ui-tw-merge/README.md) for full details.

### Router adapter — `RouterAdapterProvider` + `useLink` / `usePathname`

Components that render links (`AppShell.SidebarLink`, `Breadcrumbs.Item`) call `useLink()` to get a Link component, defaulting to plain `<a href>`. To use react-router-dom (or any other router), wrap once at the root:

```tsx
import { RouterAdapterProvider, type RouterLinkComponent, type RouterLinkProps } from "@batthewz/response-ui-react-components";
import { forwardRef } from "react";
import { Link as RRLink, useLocation } from "react-router-dom";

const AdapterLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function AdapterLink({ to, replace, children, ...rest }, ref) {
    return <RRLink ref={ref} to={to} replace={replace} {...rest}>{children}</RRLink>;
  },
);
const adapter = { Link: AdapterLink, usePathname: () => useLocation().pathname };

<RouterAdapterProvider value={adapter}>{/* app */}</RouterAdapterProvider>
```

`RouterLinkProps` shape: `{ to: string; replace?: boolean; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">`. `RouterLinkComponent` is a `ForwardRefExoticComponent` — implementations MUST use `forwardRef`.

### Headless `RequireAuth`

Knows nothing about your auth library or router. Takes a `status` prop:

```tsx
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

<RequireAuth
  status={status}
  redirect="/login"                  // optional, only used if no fallback
  loadingFallback={<MySpinner />}    // optional, defaults to centered Spinner
  unauthenticatedFallback={<Navigate to="/login" replace />}  // pass router-specific Navigate
>
  {children}
</RequireAuth>
```

App-side wrappers wire up the auth library:

```tsx
function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const status = isPending ? "loading" : session ? "authenticated" : "unauthenticated";
  return (
    <RequireAuth status={status} unauthenticatedFallback={<Navigate to="/login" replace />}>
      {children}
    </RequireAuth>
  );
}

// GuestGuard inverts: render children when *not* authenticated, redirect when authenticated.
function GuestGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const status = isPending ? "loading" : session ? "unauthenticated" : "authenticated";
  return (
    <RequireAuth status={status} unauthenticatedFallback={<Navigate to="/dashboard" replace />}>
      {children}
    </RequireAuth>
  );
}
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

## Don'ts for AI-generated code

- Don't import from deep paths in the main app's source — import from the root barrel: `import { Button } from "@batthewz/response-ui-react-components"`. Subpath imports work but are usually unnecessary.
- Don't use `clsx` or `twMerge` directly — always go through `cn()`.
- Don't import from `react-router-dom` inside a generic component you're contributing to this package — use `useLink()` / `usePathname()` from the router adapter.
- Don't reach into `node_modules/@batthewz/response-ui-css/src/...` from JS. CSS goes in CSS via `@import`.
- Don't write CSS-in-JS. The library's styling boundary is Tailwind utilities + design tokens.
- Don't add new public exports without also adding them to the relevant barrel (`components/ui/index.ts`, etc.) AND the root `src/index.ts`.

## File layout

```
src/
  index.ts                      <- main barrel
  components/
    animation/   form/   guards/ (RequireAuth)
    layout/      router/ (router-adapter)   ui/
  hooks/
    use-active-section.ts, use-click-outside.ts, use-debounce.ts,
    use-document-title.ts, use-floating.ts, use-focus-trap.ts,
    use-reduced-motion.ts, use-roving-focus.ts, use-theme.ts, index.ts
  util/
    style.ts (cn, twMerge, tailwindMergeExtension)
    merge-refs.ts, format.ts, index.ts
```

## Testing patterns

Tests live next to the components (`Foo.test.tsx`). Vitest + jsdom + @testing-library/react. When mocking the package in app-side tests, mock the WHOLE module path (`@batthewz/response-ui-react-components`) once with all needed exports — vitest only honors the last `vi.mock` call per module path.

```ts
vi.mock("@batthewz/response-ui-react-components", () => {
  const Button = ({ children, ...p }: any) => <button {...p}>{children}</button>;
  const Text = ({ children }: any) => <span>{children}</span>;
  return { Button, Text /* …all exports the SUT uses */ };
});
```

## Build

`vite build` (library mode, ESM-only, `preserveModules: true`, `vite-plugin-dts` for types). Externalised: react, react-dom, react/jsx-runtime, @floating-ui/*, lucide-react, clsx, tailwind-merge.

`bun pm pack` produces a publishable `.tgz`.
