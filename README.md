# @batthewz/response-ui-react-components

React 19 component library for the response-ui design system. ~60 components, accessibility-first, zero CSS-in-JS — all styling comes from [`@batthewz/response-ui-css`](https://github.com/BatthewZ/response-ui-css/) (Tailwind v4 + design tokens). Router-agnostic via an injection adapter, headless auth gating.

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

- **UI** (36): Accordion, Alert, AppShell, Avatar, AvatarUpload, Badge, Breadcrumbs, Button, Card, Carousel, DataTable, Dialog, DropdownMenu, EmptyState, ErrorBoundary, FileUpload, Hero, IconButton, MasonryGrid, MediaCard, Pagination, Popover, Portal, ProgressBar, Skeleton, Spinner, Spotlight, StatCard, Swimlane, Table, Tabs, Text, ThemeSwitcher, Timeline, Toast (+ToastProvider/useToast), Tooltip
- **Form** (10): Checkbox, Field, FieldError, FormActions, Input, Label, Radio, SearchInput, Select, Textarea
- **Layout** (6): Center, Container, Divider, Row, Spacer, Stack
- **Animation** (5): AnimatePresence, Parallax, ScrollReveal, Stagger, ViewTransition (+`useViewTransition`)
- **Guards** (1): RequireAuth (headless)
- **Router** (1): RouterAdapterProvider, useLink, usePathname
- **Hooks**: useActiveSection, useClickOutside, useDebounce, useDocumentTitle, useFloating, useFocusTrap, usePrefersReducedMotion, useRovingFocus, useTheme
- **Util**: `cn`, `tailwindMergeExtension`, `twMerge`, `mergeRefs`, `formatBytes`

## Subpath imports for tree-shaking

Once published, deep imports are supported:

```ts
import { Button } from "@batthewz/response-ui-react-components/components/ui/Button";
import { useDebounce } from "@batthewz/response-ui-react-components/hooks/use-debounce";
```

In dev (workspace links), import from the root barrel — both work.

## License

MIT.
