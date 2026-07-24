# AppShell

The whole application chrome in one component: a sticky navbar, a sidebar that collapses
to an icon rail on desktop and becomes a focus-trapped drawer on phones, and a content
area — laid out with CSS grid and wired together through one context, so a single
`AppShell.Toggle` does the right thing at both sizes without you writing a breakpoint.

<!-- example:Minimal -->
```tsx
<AppShell>
  <AppShell.Navbar>
    <AppShell.Toggle />
    <AppShell.Brand>Acme Analytics</AppShell.Brand>
    <AppShell.NavbarActions>
      <Avatar name="Ada Lovelace" size="sm" />
    </AppShell.NavbarActions>
  </AppShell.Navbar>
  <AppShell.Sidebar>
    <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
      Dashboard
    </AppShell.SidebarLink>
    <AppShell.SidebarLink to="/reports" icon={BarChart3}>
      Reports
    </AppShell.SidebarLink>
    <AppShell.SidebarLink to="/settings" icon={Settings}>
      Settings
    </AppShell.SidebarLink>
  </AppShell.Sidebar>
  <AppShell.Main>
    <h1>Dashboard</h1>
  </AppShell.Main>
</AppShell>
```
<!-- /example -->

**Anatomy.** `AppShell` is the `<div class="app-shell">` grid and the only stateful part:
it owns `open` (the mobile drawer) and `collapsed` (the desktop rail), and publishes both
plus an `isMobile` flag and a generated `sidebarId` on a context. `AppShell.Navbar` spans
the full width in row 1; `AppShell.Sidebar` takes column 1 of row 2 and `AppShell.Main`
column 2. Each of those three sets its own `grid-column`/`grid-row`, so **source order
inside `<AppShell>` doesn't affect the layout** — but any child that isn't one of them
falls outside the three slots and gets auto-placed, so keep providers and overlays outside
the root.

`AppShell.Toggle`, `AppShell.Sidebar` and `AppShell.SidebarLink` read the context and throw
`"AppShell compound components must be used within <AppShell>"` outside it. `Navbar`,
`Brand`, `NavbarActions` and `Main` read nothing and never throw — they are pre-styled
boxes you can wrap freely.

| Part                      | Renders                                       | Props                                                                             |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `AppShell`                | `<div>` (CSS grid, `min-height: 100vh`)       | state props below (+ all `div` props); `children` required                        |
| `AppShell.Navbar`         | `<header role="banner">`, sticky, `3.5rem` tall | — (all `header` props)                                                            |
| `AppShell.Brand`          | `<div>`                                       | — (all `div` props)                                                               |
| `AppShell.NavbarActions`  | `<div>` with `margin-left: auto`              | — (all `div` props)                                                               |
| `AppShell.Toggle`         | `<button type="button">`                      | — (all `button` props **except `type`**)                                          |
| `AppShell.Sidebar`        | `<aside role="navigation" aria-label="Main navigation">` | — (all `aside` props **except `role`**)                                |
| `AppShell.SidebarSection` | `<div>`, with a `<div>` title above its children | `title?: string` (+ all `div` props)                                           |
| `AppShell.SidebarLink`    | the router adapter's `Link` — a plain `<a href>` by default | `to: string` · `icon?: LucideIcon` · `children` required (+ all `a` props **except `href`** and `children`) |
| `AppShell.Main`           | `<div>` — **not** `<main>`; see [The main landmark](#the-main-landmark) | — (all `div` props)                          |

`className`, `id`, `ref`, `data-*` and `aria-*` pass through on every part, and each merges
your `className` with its own through `cn`.

### Root props

| Prop                | Type                            | Default    |
| ------------------- | ------------------------------- | ---------- |
| `defaultOpen`       | `boolean`                       | `false`    |
| `open`              | `boolean`                       | —          |
| `onOpenChange`      | `(open: boolean) => void`       | —          |
| `defaultCollapsed`  | `boolean`                       | `false`    |
| `collapsed`         | `boolean`                       | —          |
| `onCollapsedChange` | `(collapsed: boolean) => void`  | —          |
| `children`          | `ReactNode`                     | required   |
| …rest               | props of `div` (minus `children`) | —        |

Both pairs are independently controllable: pass `open`/`collapsed` to drive that one flag
yourself, leave it off to let the root keep the state. `open` only matters below 640px and
`collapsed` only at or above it — see [One toggle, two behaviours](#one-toggle-two-behaviours).

## One toggle, two behaviours

The root subscribes to `matchMedia("(max-width: 639px)")` in an effect and puts the result
on the context as `isMobile`. That single flag re-purposes everything:

| | Desktop (≥640px) | Mobile (≤639px) |
| --- | --- | --- |
| `AppShell.Toggle` drives | `collapsed` | `open` |
| Toggle icon | `PanelLeftClose` / `PanelLeft` | `Menu` |
| Toggle `aria-label` | "Collapse sidebar" / "Expand sidebar" | "Close navigation" / "Open navigation" |
| `AppShell.Sidebar` renders | an inline `<aside>` in grid column 1 | a [Portal](portal.md) at `document.body` — scrim + fixed drawer — or **nothing at all** when closed |
| Dismissal | — | outside `mousedown`/`touchstart`, `Escape` |

`isMobile` starts `false`, because the effect can only run after the first paint. So the
first client render — and any server render — always produces the desktop markup, and the
`@media (max-width: 639px)` block in `AppShell.css` hides the inline sidebar until the
effect catches up. Server and first client render agree, so there is no hydration mismatch
and no flash of a wrongly placed sidebar.

## Sections

`AppShell.SidebarSection` groups links under an optional `title`. Consecutive sections get a
`--C-BORDER-DEFAULT` rule with `1rem` of space above and below it, drawn by a `+` sibling
selector — so the rule appears between sections, never above the first one:

<!-- example:SidebarSections -->
```tsx
<AppShell>
  <AppShell.Navbar>
    <AppShell.Toggle />
    <AppShell.Brand>Acme Analytics</AppShell.Brand>
  </AppShell.Navbar>
  <AppShell.Sidebar>
    <AppShell.SidebarSection title="Workspace">
      <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
        Dashboard
      </AppShell.SidebarLink>
      <AppShell.SidebarLink to="/reports" icon={BarChart3}>
        Reports
      </AppShell.SidebarLink>
    </AppShell.SidebarSection>
    <AppShell.SidebarSection title="Account">
      <AppShell.SidebarLink to="/team" icon={Users}>
        Team
      </AppShell.SidebarLink>
      <AppShell.SidebarLink to="/billing" icon={CreditCard}>
        Billing
      </AppShell.SidebarLink>
      <AppShell.SidebarLink to="/support" icon={LifeBuoy}>
        Support
      </AppShell.SidebarLink>
    </AppShell.SidebarSection>
  </AppShell.Sidebar>
  <AppShell.Main>
    <h1>Dashboard</h1>
  </AppShell.Main>
</AppShell>
```
<!-- /example -->

## The collapsed rail

`collapsed` narrows the desktop sidebar from `16.25rem` to `4rem`, hides every link label
and every section title, and centres the icons. Nothing else changes: the sidebar is still
in the layout, still scrollable, still the same `<aside>`.

<!-- example:CollapsedByDefault -->
```tsx
<AppShell defaultCollapsed>
  <AppShell.Navbar>
    <AppShell.Toggle />
    <AppShell.Brand>Acme Analytics</AppShell.Brand>
  </AppShell.Navbar>
  <AppShell.Sidebar>
    <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
      Dashboard
    </AppShell.SidebarLink>
    <AppShell.SidebarLink to="/reports" icon={BarChart3}>
      Reports
    </AppShell.SidebarLink>
    <AppShell.SidebarLink to="/settings" icon={Settings}>
      Settings
    </AppShell.SidebarLink>
  </AppShell.Sidebar>
  <AppShell.Main>
    <h1>Dashboard</h1>
  </AppShell.Main>
</AppShell>
```
<!-- /example -->

Because the label is the only text a link has, a collapsed link is **icon-only** — which is
why `AppShell.SidebarLink` wraps itself in a [Tooltip](tooltip.md) carrying the same
`children` whenever `collapsed && !isMobile`. That tooltip is a hover/focus affordance, not
an accessible name; read [Accessibility](#accessibility) before you ship a rail. A link with
no `icon` collapses to an empty row.

## Controlling the drawer

Pass `open` and `onOpenChange` to drive the mobile drawer from your own state — useful when
something other than the toggle has to open it, or when you need to close it from inside the
content. In the fence below `navOpen` is a `useState<boolean>` in the surrounding component:

<!-- example:ControlledDrawer -->
```tsx
<AppShell open={navOpen} onOpenChange={setNavOpen}>
  <AppShell.Navbar>
    <AppShell.Toggle />
    <AppShell.Brand>Acme Analytics</AppShell.Brand>
  </AppShell.Navbar>
  <AppShell.Sidebar>
    <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
      Dashboard
    </AppShell.SidebarLink>
    <AppShell.SidebarLink to="/reports" icon={BarChart3}>
      Reports
    </AppShell.SidebarLink>
  </AppShell.Sidebar>
  <AppShell.Main>
    <button type="button" onClick={() => setNavOpen(false)}>
      Close navigation
    </button>
  </AppShell.Main>
</AppShell>
```
<!-- /example -->

The root keeps writing its own internal state even while controlled, but reads
`open ?? internal` — so the prop always wins on the next render and a parent that ignores
`onOpenChange` genuinely pins the drawer shut.

## Routing

`AppShell.SidebarLink` does not hard-code an `<a href>`. It calls `useLink()` for the
component to render and `usePathname()` for the current location — both from the same
router adapter [Breadcrumbs](breadcrumbs.md) uses. Install it once and three things start
working at the same time: client-side navigation, `aria-current="page"` on the matching
link, and the mobile drawer closing itself when the route changes.

<!-- example:WithRouterAdapter -->
```tsx
<RouterAdapterProvider value={{ Link: AppLink, usePathname: useAppPathname }}>
  <AppShell>
    <AppShell.Navbar>
      <AppShell.Toggle />
      <AppShell.Brand>Acme Analytics</AppShell.Brand>
    </AppShell.Navbar>
    <AppShell.Sidebar>
      <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
        Dashboard
      </AppShell.SidebarLink>
      <AppShell.SidebarLink to="/reports" icon={BarChart3}>
        Reports
      </AppShell.SidebarLink>
    </AppShell.Sidebar>
    <AppShell.Main>
      <h1>Reports</h1>
    </AppShell.Main>
  </AppShell>
</RouterAdapterProvider>
```
<!-- /example -->

`AppLink` above is your router's own `Link` (react-router's, Next's, TanStack's) wrapped to
take `to`/`replace`; `useAppPathname` is your router's location hook. **Both halves matter.**
With no provider the adapter falls back to a plain `<a href>` and to
`window.location.pathname`, which is read at render time and never notifies anyone it
changed — so in an SPA nothing re-renders on navigation, `aria-current` goes stale, and the
render-phase auto-close never fires.

Matching is prefix-based: `to="/"` matches only the exact path `/`; anything else matches
when `pathname === to` **or** `pathname.startsWith(to + "/")`. So `/settings` stays active on
`/settings/profile`, and a parent and its child link are both active at once.

## The main landmark

`AppShell.Main` renders a `<div>`. It has no `<main>` element and sets no `role`, so a shell
built from the parts above exposes a `banner` and a `navigation` landmark and **no main
landmark** — landmark navigation can't jump to the content, and there is no target for a
skip link. Rest props reach the element, so add both yourself:

<!-- example:MainLandmark -->
```tsx
<AppShell>
  <AppShell.Navbar>
    <a className="sr-only focus:not-sr-only" href="#content">
      Skip to content
    </a>
    <AppShell.Toggle />
    <AppShell.Brand>Acme Analytics</AppShell.Brand>
  </AppShell.Navbar>
  <AppShell.Sidebar>
    <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
      Dashboard
    </AppShell.SidebarLink>
  </AppShell.Sidebar>
  <AppShell.Main id="content" role="main" tabIndex={-1}>
    <h1>Dashboard</h1>
  </AppShell.Main>
</AppShell>
```
<!-- /example -->

## Theme tokens

AppShell uses **no Tailwind utilities** — every rule lives in `AppShell.css` and reads a
contract variable directly, the way [Tabs](tabs.md) and [ActivityFeed](activity-feed.md) do.
Override any of these and the chrome re-tints with the rest of the app, at runtime, with no
rebuild.

| Where                          | Override                                                        |
| ------------------------------ | --------------------------------------------------------------- |
| Page background behind content | `--C-SURFACE-1`                                                  |
| Navbar · sidebar · drawer fill | `--C-SURFACE-0`                                                  |
| Every hairline                 | `--C-BORDER-DEFAULT`                                             |
| Brand text                     | `--C-TEXT-PRIMARY`                                               |
| Toggle and link ink            | `--C-TEXT-SECONDARY` at rest · `--C-TEXT-PRIMARY` on hover       |
| Toggle and link hover wash     | `--C-SURFACE-2`                                                  |
| Active link                    | `--C-ACCENT` — as the ink, and as a 10% `color-mix` wash behind it |
| Section title                  | `--C-TEXT-MUTED`                                                 |
| Focus outline                  | `--C-BORDER-FOCUS`                                               |
| Drawer scrim                   | `--OVERLAY-SCRIM-COLOR`                                          |
| Drawer elevation               | `--SHADOW-LG`                                                    |
| Hover · scrim fade · drawer slide | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`             |
| Collapse width animation       | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`                |

The width transition and both drawer animations are dropped under
`prefers-reduced-motion: reduce`; the hover colour transitions are not.

**What is not on the contract.** The whole geometry is literals: the navbar height
(`3.5rem`, written three times — the navbar's own `height`, the sidebar's sticky `top`, and
its `calc(100vh - 3.5rem)`), the sidebar widths (`16.25rem` expanded, `4rem` collapsed,
`17.5rem` for the drawer), the corner radius (`0.375rem`, not `--RADIUS-*`), the link and
section-title type sizes, and the stacking order (`10` navbar, `49` scrim, `50` drawer —
the drawer ties with [Tooltip](tooltip.md)'s layer). The `639px` breakpoint is written
twice, once in `AppShell.tsx`'s `matchMedia` and once in the stylesheet's `@media` block.
Restyle the navbar's height in your own CSS and the sidebar's `top` and `height` do **not**
follow.

**Measured contrast**, across the four shipped themes (`default`, `events`, `tech`,
`grimdark`):

- Resting link ink `--C-TEXT-SECONDARY` on `--C-SURFACE-0`: **5.76–7.56:1** — AA everywhere.
- Active link ink `--C-ACCENT` on its own wash: **4.50** default · **2.46** `events` ·
  **12.55** `tech` · **2.83** `grimdark`. In `events` and `grimdark` the link you are on is
  *less* legible than the ones you are not — see [Accessibility](#accessibility).
- The active wash against the sidebar fill: **1.05–1.18:1**, i.e. no perceptible block of
  colour; the state is carried by the ink.
- Section titles in `--C-TEXT-MUTED`: **2.10–2.59:1** — under AA on every theme, the
  library-wide behaviour of that token.
- `--C-BORDER-FOCUS` against `--C-SURFACE-0`: **3.68** default · **2.72** `events` ·
  **14.84** `tech` · **2.96** `grimdark`, so the focus outline is under the 3:1 non-text
  floor in two themes.

## Gotchas

- **On mobile the toggle opens the drawer but cannot close it.** The drawer's
  outside-dismiss listener fires on `mousedown`, which closes it, and then the toggle's own
  `click` — a separate, later event — flips it straight back open. Measured: after the
  second tap the drawer is still mounted and `onOpenChange` has been called `false` then
  `true`. `Escape` and a tap on the scrim both close it correctly; the button does not.
- **`AppShell.Toggle` lets you delete its behaviour with `onClick`.** Only `type` is
  `Omit`ted from its props, and `{...props}` is spread *after* `onClick={handleClick}`, so
  `<AppShell.Toggle onClick={track}>` typechecks and then replaces the handler outright —
  measured: your callback runs, the drawer never opens. Put analytics on a wrapper, not on
  the toggle.
- **A controlled `AppShell` logs a React warning when you navigate.** The auto-close on route
  change is a render-phase state adjustment, and the setter it uses also calls your
  `onOpenChange` — so React reports *"Cannot update a component while rendering a different
  component"* when the drawer is open at navigation time. Uncontrolled shells are unaffected.
- **`open` and `collapsed` are each inert on the other side of 640px.** `defaultOpen` does
  nothing on desktop and `defaultCollapsed` does nothing on mobile; the toggle only ever
  writes to whichever one matches the current `isMobile`. Neither is reset when the viewport
  crosses the breakpoint: a drawer left open on a phone is still `open: true` at tablet
  width, where it is ignored, and it springs back open the moment the viewport narrows again.
- **Closing the mobile drawer unmounts it.** `AppShell.Sidebar` returns `null` when
  `isMobile && !open`, so nothing in the sidebar stays mounted: scroll position, an expanded
  submenu, a focused field inside it are all lost per open, and the toggle's `aria-controls`
  points at an id that is not in the document.
- **Every part is placed explicitly in the grid.** Rendering a provider, a toast portal or a
  stray `<div>` as a direct child of `<AppShell>` doesn't overlap anything — it is auto-placed
  outside the three slots, which is rarely what you meant. Wrap the shell instead.
- **`AppShell.Sidebar` fixes its own `role`.** `role` is `Omit`ted from its props, so the
  `<aside>` is always `role="navigation"`. Its `aria-label` *is* overridable, and you need to
  override it if the page has more than one nav or isn't in English.
- **Client component.** `AppShell.tsx` opens with `"use client"` — the `matchMedia`
  subscription and the two state pairs require it — so a server component can render it, but
  it becomes a client boundary. The router adapter it reads is a client module too and has to
  sit above it, so in an RSC app the provider is the thing you place, not the shell.

## Accessibility

The landmark and state wiring on the chrome itself is solid: `<header role="banner">`, an
`<aside role="navigation" aria-label="Main navigation">` whose `id` the toggle names in
`aria-controls`, `aria-expanded` tracking the right flag per breakpoint, and a state-aware
`aria-label` on the toggle. The mobile drawer traps focus (measured: opening it moves focus
to the first link inside, `Escape` closes it and returns focus to the toggle) and the Lucide
icons render `aria-hidden="true"`, so nothing announces the glyphs.

Four gaps you have to close yourself:

- **A collapsed rail is a list of unnamed links.** The label is a `<span>` the collapsed rule
  sets to `display: none`, and the icon is `aria-hidden` — so the link has **no accessible
  name at all**. Measured with the same engine Testing Library uses: expanded, the name is
  `"Dashboard"`; collapsed, it is `""`. The [Tooltip](tooltip.md) wrapper does not fix this —
  it contributes `aria-describedby`, a *description*, and only while the tooltip is open. If
  you ship the rail, put an `aria-label` on each `SidebarLink` (rest props reach the anchor).
- **There is no `main` landmark.** See [The main landmark](#the-main-landmark) — the fix is
  `role="main"` on `AppShell.Main`, plus an `id` and `tabIndex={-1}` if you want a skip link
  to land there.
- **`aria-modal` on the drawer does nothing.** The mobile `<aside>` carries
  `aria-modal="true"`, but that attribute is only defined for `dialog` and `alertdialog`
  roles, and this element is `role="navigation"`. Nothing marks the rest of the page `inert`
  or `aria-hidden`, so a screen-reader user can still browse the content behind the scrim
  while the DOM focus trap pulls Tab focus back — the two disagree. If you need a true modal
  drawer, reach for [Drawer](drawer.md).
- **Section titles are `<div>`s.** They are styled like headings and read like headings, but
  they are not headings, so heading navigation skips them and the groups are unlabelled to
  anyone navigating that way. They are also `--C-TEXT-MUTED` (2.10–2.59:1) and are hidden
  outright in the collapsed rail, which leaves the divider rule with nothing explaining it.

Two more things worth knowing: the active link is marked with `aria-current="page"`, so its
state is *not* colour-only for assistive tech — but for sighted users the accent ink is the
whole signal, and in `events` (2.46:1) and `grimdark` (2.83:1) that ink is below AA. And
focus is `:focus-visible` only on the toggle and on links, drawn as a 2px outline —
`outline-offset: 2px` on the toggle, `-2px` on links so a link's ring is drawn inside its
own box rather than out into the sidebar's `overflow-x: hidden` edge.

## Related

`CommandPalette` · [Drawer](drawer.md) · [Breadcrumbs](breadcrumbs.md) ·
[Tooltip](tooltip.md) · [Portal](portal.md) · [ThemeSwitcher](theme-switcher.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
