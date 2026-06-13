# @batthewz/response-ui-react-components

React 19 component library for the response-ui design system. ~80 components, accessibility-first, zero CSS-in-JS — all styling comes from [`@batthewz/response-ui-css`](https://github.com/BatthewZ/response-ui-css/) (Tailwind v4 + design tokens). Router-agnostic via an injection adapter, headless auth gating.

> **Live demo:** [ai-website-starter.benmatthews-it.workers.dev/demo](https://ai-website-starter.benmatthews-it.workers.dev/demo) — every component, every theme, every responsive scale, in one place.

## Install

```bash
bun add @batthewz/response-ui-react-components @batthewz/response-ui-css \
  react react-dom @floating-ui/react lucide-react
bun add -D tailwindcss @tailwindcss/vite
```

## Use

Two CSS imports in your app's CSS entry — foundation (tokens, themes, responsive scales, animations) first, then per-component styles:

```css
/* src/app.css */
@import "@batthewz/response-ui-css";
@import "@batthewz/response-ui-react-components/styles";
```

Order matters: each per-component file reads `var(--…)` tokens defined by `response-ui-css`, so the foundation has to load first.

The `styles` import also registers this package's sources with Tailwind v4 (a self-relative `@source`), so the utility classes used inside the components are generated automatically — no manual `@source` workaround needed, regardless of package manager or `node_modules` layout (hoisted npm, bun's isolated store, pnpm).

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

## Theming

```tsx
import { useTheme } from "@batthewz/response-ui-react-components";

const { theme, setTheme, themes } = useTheme();
setTheme("grimdark"); // also: "events", "tech", "default"
```

Custom theme: write a CSS file matching the [theme contract](./docs/theme-contract.md), `@import` it after `@batthewz/response-ui-css`, then:

```tsx
const { setTheme } = useTheme({ themes: ["default", "aurora"] as const });
setTheme("aurora");
```

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

const AdapterLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function AdapterLink({ to, replace, children, ...rest }, ref) {
    return <RRLink ref={ref} to={to} replace={replace} {...rest}>{children}</RRLink>;
  },
);
const adapter = { Link: AdapterLink, usePathname: () => useLocation().pathname };

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

If you skip the provider, links fall back to plain `<a href>` — fine for static / non-SPA.

## Auth gating — headless `RequireAuth`

The package ships a router/auth-agnostic `RequireAuth` that takes a status string and renders accordingly:

```tsx
import { RequireAuth } from "@batthewz/response-ui-react-components";
import { Navigate } from "react-router-dom";
import { useSession } from "your-auth-library";

export function AuthGuard({ children }) {
  const { data: session, isPending } = useSession();
  const status = isPending ? "loading" : session ? "authenticated" : "unauthenticated";
  return (
    <RequireAuth status={status} unauthenticatedFallback={<Navigate to="/login" replace />}>
      {children}
    </RequireAuth>
  );
}
```

## Adding custom Tailwind tokens

If you add custom design tokens (e.g. `bg-brand-foo`), extend the package's `tailwind-merge` config so `cn()` knows how to merge them:

```ts
import { tailwindMergeExtension } from "@batthewz/response-ui-react-components";
import { extendTailwindMerge } from "tailwind-merge";

export const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      ...tailwindMergeExtension.theme,
      color: [...tailwindMergeExtension.theme.color, "brand-foo"],
    },
  },
});
```

## What ships

- **UI** (48): Accordion, Alert, AppShell, Avatar (+AvatarGroup), AvatarUpload, Badge, Breadcrumbs, Button, Calendar, Card, Carousel, CodeBlock, Collapsible, CommandPalette, ContextMenu, CopyButton, DataTable, Dialog, Drawer, DropdownMenu, EmptyState, ErrorBoundary, FileUpload, Hero, HoverCard, IconButton, Kbd, MasonryGrid, MediaCard, Pagination, Popover, Portal, ProgressBar, Rating, Skeleton, Spinner, Spotlight, StatCard, Stepper, Swimlane, Table, Tabs, Text, ThemeSwitcher, Timeline, Toast (+ToastProvider/useToast), Tooltip, VirtualizedDataTable
- **Form** (17): Checkbox, Combobox, DatePicker, Field, FieldError, FormActions, Input, Label, NumberInput, OTPInput, Radio, SearchInput, Select, Slider, Switch, TagInput, Textarea
- **Data display** (5): Sparkline, ProgressRing, Meter, DescriptionList, ActivityFeed
- **Layout** (6): Center, Container, Divider, Row, Spacer, Stack
- **Animation** (5): AnimatePresence, Parallax, ScrollReveal, Stagger, ViewTransition (+`useViewTransition`)
- **Guards** (1): RequireAuth (headless)
- **Router** (1): RouterAdapterProvider, useLink, usePathname
- **Hooks**: useActiveSection, useClickOutside, useControllableState, useDebounce, useDocumentTitle, useFloating, useFocusTrap, usePrefersReducedMotion, useRovingFocus, useTheme, useVirtualRows
- **Util**: `cn`, `createCn`, `mergeExtension`, `tailwindMergeExtension`, `twMerge`, `mergeRefs`, `formatBytes`, plus date helpers (`formatDate`, `parseDateInput`, `buildMonthGrid`, `addDays`, `addMonths`, …)

## RSC / Server Components

Interactive modules ship a `"use client"` directive, so the components work out of the box in React Server Component frameworks (Next.js App Router, etc.). Pure presentational components (Button, Text, the layout primitives) carry no directive and stay server-renderable — you can use them directly in server components.

**Security:** these are presentational Client Components — as with any client component, never pass server-only secrets as props (props are serialized to the browser). The components themselves access no server state or secrets (enforced by `bun run verify:directives`).

## DataTable wiring modes

`DataTable` supports three wiring modes — pick one and stick to it:

- **Client-everything** — pass `pageSize` (and optionally `defaultSort`). The table sorts, slices, and derives pages entirely on the client from the full `data` array. No `onSortChange` / `onPageChange` needed.
- **Server-controlled** — pass `sort` + `onSortChange` and `page` + `totalPages` + `onPageChange`, and omit `pageSize`. The table renders exactly the rows you give it and reports sort/page intent back to you; you do the sorting and paging server-side.
- **Hybrid / server-paged (lazy-load)** — never enable uncontrolled sorting here; use controlled `sort`. Accumulate fetched rows into the `data` array as the user pages, and render a footer sentinel (via the footer slot) to trigger the next load.

### Large datasets: `VirtualizedDataTable`

For tens of thousands of rows, reach for `VirtualizedDataTable` instead of paginating. It shares `DataTable`'s `ColumnDef` and sorting contract but **windows** the rows (via the `useVirtualRows` hook) so only a small visible slice is mounted in the DOM — scrolling stays smooth and memory flat. Pass a fixed `rowHeight` (cell content must fit it — truncate overflow) and a `height` for the scroll viewport; the sticky header is on by default. Differences from `DataTable`: there's no pagination, select-all toggles the **entire** dataset, and an optional `onEndReached` callback supports infinite loading (accumulate into `data`, keep `sort` controlled when the server sorts).

```tsx
<VirtualizedDataTable
  data={tenThousandRows}
  columns={columns}
  rowKey={(r) => r.id}
  rowHeight={44}
  height={480}
/>
```

## Subpath imports for tree-shaking

Once published, deep imports are supported:

```ts
import { Button } from "@batthewz/response-ui-react-components/components/ui/Button";
import { useDebounce } from "@batthewz/response-ui-react-components/hooks/use-debounce";
```

In dev (workspace links), import from the root barrel — both work.

## License

MIT.
