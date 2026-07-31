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

`AppShell.Toggle`, `AppShell.Sidebar`, `AppShell.SidebarSection` and `AppShell.SidebarLink`
read the context and throw
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
| `AppShell.Sidebar`        | `<aside role="navigation" aria-label="Main navigation">`, wrapped on mobile in `<div role="dialog" aria-modal="true">` | `classNames?: { scrim?: string }` — see [Slots](#slots) (+ all `aside` props **except `role`**) |
| `AppShell.SidebarSection` | `<div>`, with a heading title above its children | `title?: string` · `titleAs?: "h2" \| "h3" \| "h4" \| "h5" \| "h6"` (default `"h2"`) · `classNames?: { groupHeader?: string }` — see [Slots](#slots) (+ all `div` props) |
| `AppShell.SidebarLink`    | the router adapter's `Link` — a plain `<a href>` by default | `to: string` · `icon?: LucideIcon` · `children` required · `classNames?: { itemIcon?, itemLabel? }` — see [Slots](#slots) (+ all `a` props **except `children`**; `href` is a compile error — see [Gotchas](#gotchas)) |
| `AppShell.Main`           | `<main>` — the page's main landmark; see [The main landmark](#the-main-landmark) | — (all `main` props)                |

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

The title is a **heading element** — `<h2>` by default, `titleAs` picks another level, exactly
as [Swimlane](swimlane.md)'s `titleAs` does. Set it to `"h3"` if your page already uses `h2`
for its own sections, so the sidebar does not interleave with them. The label still *looks*
the same at every level: `.app-shell-sidebar-section-title` pins `line-height` and
`font-family` back to the component's own, because the CSS package's `h1`–`h6` rules would
otherwise give an 11px uppercase label the theme's heading face and an `--H2-line-height` of
`4rem` (measured in Firefox: the row grows from 22px to 72px without the pin).

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

`collapsed` narrows the desktop sidebar from `16.25rem` to `4rem`, takes every link label and
every section heading off the screen, and centres the icons. Nothing else changes: the sidebar
is still in the layout, still scrollable, still the same `<aside>`. Both the labels and the
headings go with `sr-only`, not `display: none`, so they stay in the accessibility tree — see
[Accessibility](#accessibility).

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

Because the label is the only text a link has, a collapsed link is **visually** icon-only —
which is why `AppShell.SidebarLink` wraps itself in a [Tooltip](tooltip.md) carrying the same
`children` whenever `collapsed && !isMobile`. That tooltip is a sighted-hover affordance; the
name assistive tech reads comes from the label itself, which collapses to `sr-only` rather
than being removed (see [Accessibility](#accessibility)). A link with no `icon` collapses to a
row that looks empty but still announces.

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

**A controlled root writes no internal state at all**, and the mode is decided on the first
render and never revisited. `open` defined on that render makes the drawer controlled for
the shell's life — a later `undefined` reads as *closed*, not as a handover, so
`open={navOpen ?? undefined}` stays controlled — and a parent that ignores `onOpenChange`
genuinely pins the drawer shut. `open` `undefined` on the first render makes the drawer
uncontrolled for the shell's life, and an `open` supplied afterwards is ignored. `collapsed`
locks independently and by the same rule. See [Gotchas](#gotchas).

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
auto-close on route change never fires.

Matching is prefix-based: `to="/"` matches only the exact path `/`; anything else matches
when `pathname === to` **or** `pathname.startsWith(to + "/")`. So `/settings` stays active on
`/settings/profile`, and a parent and its child link are both active at once.

## The main landmark

`AppShell.Main` renders a real `<main>`, so a shell built from the parts above exposes
`banner`, `navigation` and `main` landmarks with nothing asked of you. Landmark navigation
reaches the content and a skip link has something to target — give it an `id` and a
`tabIndex={-1}` so the link can move focus there. (The `role="main"` in the example below is
redundant on a real `<main>` and only restates the element's own role; `id` and `tabIndex`
are the two that do work.)

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

## Slots

Eight of AppShell's nine regions are subcomponents, so their own `className` reaches them.
`classNames` covers the four elements those subcomponents build *inside* themselves, spread
across the three parts that render them.

| On                        | Slot          | Element                             | What it addresses                        |
| ------------------------- | ------------- | ----------------------------------- | ---------------------------------------- |
| `AppShell.Sidebar`        | `scrim`       | `div.app-shell-scrim`               | the dimming layer behind the mobile drawer |
| `AppShell.SidebarSection` | `groupHeader` | the `titleAs` heading               | rendered only when `title` is set          |
| `AppShell.SidebarLink`    | `itemIcon`    | the `icon` component's `<svg>`      | rendered only when `icon` is set           |
| `AppShell.SidebarLink`    | `itemLabel`   | `span.app-shell-sidebar-link-label` | the link's text                            |

```tsx
<AppShell.Sidebar classNames={{ scrim: "backdrop-blur-sm" }}>
  <AppShell.SidebarSection title="Workspace" classNames={{ groupHeader: "tracking-wide" }}>
    <AppShell.SidebarLink to="/projects" icon={Folder} classNames={{ itemIcon: "size-r3" }}>
      Projects
    </AppShell.SidebarLink>
  </AppShell.SidebarSection>
</AppShell.Sidebar>
```

**Three things worth knowing before you use them.**

`scrim` renders only on mobile and only while the drawer is open. The drawer surface itself
takes no slot: `Sidebar`'s own `className` already lands on it, in both the inline-rail and
the portaled-drawer branch.

`itemIcon` is handed to your icon **component** as its `className`, not written onto an
element — `icon` is a `LucideIcon`, a component reference. Lucide merges it with its own two
classes and emits the result, so what a slot buys here is a route where there was none.

`groupHeader` and `itemLabel` are **appended** to whatever the element already carries. In
the collapsed rail that includes `sr-only`, which is what keeps the group reachable by
heading navigation and the link with an accessible name — so a class of yours sits beside it
rather than replacing it. Passing a `block` or `not-sr-only` will reveal the text; that is
yours to want, not an accident of the merge.

## Theme tokens

AppShell uses **no Tailwind utilities** — every rule lives in `AppShell.css` and reads a
contract variable directly, the way [Tabs](tabs.md) and [ActivityFeed](activity-feed.md) do.
Override any of these and the chrome re-tints with the rest of the app, at runtime, with no
rebuild.

| Where                          | Override                                                        |
| ------------------------------ | --------------------------------------------------------------- |
| Page background behind content | `--C-CANVAS`                                                     |
| Navbar · sidebar · drawer fill | `--C-SURFACE-0`                                                  |
| Every hairline                 | `--C-BORDER-DEFAULT`                                             |
| Brand text                     | `--C-TEXT-PRIMARY` · `--Bold-Weight`                             |
| Toggle and link ink            | `--C-TEXT-SECONDARY` at rest · `--C-TEXT-PRIMARY` on hover       |
| Toggle and link hover wash     | `--C-SURFACE-2`                                                  |
| Active link                    | `--C-TEXT-PRIMARY` ink · `--C-ACCENT` as a 10% `color-mix` wash *and* a 1px inset edge |
| Section title                  | `--C-TEXT-MUTED` · `--Semibold-Weight`                           |
| Sidebar link type · weight     | `--BodyText-1` · `--Semibold-Weight`                             |
| Focus outline                  | `--C-BORDER-FOCUS`                                               |
| Drawer scrim                   | `--OVERLAY-SCRIM-COLOR`                                          |
| Drawer elevation               | `--SHADOW-LG`                                                    |
| Hover · scrim fade · drawer slide | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`             |
| Collapse width animation       | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`                |

The root paints `--C-CANVAS` — the page floor, not a surface rung. Navbar, sidebar and
drawer are rung-0 sheets standing on it, a lift of **1.05–1.16:1**, so the hairlines are
what actually bound the chrome; the fill only says it is raised.

The width transition and both drawer animations are dropped under
`prefers-reduced-motion: reduce`; the hover colour transitions are not.

**What is not on the contract.** The whole geometry is literals: the sidebar widths
(`16.25rem` expanded, `4rem` collapsed, `17.5rem` for the drawer), the corner radius
(`0.375rem`, not `--RADIUS-*`), the section-title type size (`0.6875rem` — a literal rather
than `--BodyText-3`, which it happens to equal in the `tech` theme and in no other), the
section title's `line-height: normal` and `font-family: inherit` (deliberate: they hold the
theme's heading face and `--H2-line-height` off the heading element the title now is), and the
stacking order (`10` navbar, `49` scrim, `50` drawer — the drawer ties with
[Tooltip](tooltip.md)'s layer).

The navbar height is the one geometry value with a handle on it. `.app-shell` declares
`--app-shell-navbar-height: 3.5rem`, and the navbar's own `height`, the sidebar's sticky
`top` and its `calc(100vh - …)` all read it — so **overriding that one property on
`.app-shell` moves all three together**. It is a component-internal local (lowercase, like
[ColorPicker](color-picker.md)'s `--hue`), not a contract variable, so it is not themed and no
other component reads it.

The `639px` breakpoint is genuinely written twice, and cannot be otherwise: once as
`MOBILE_VIEWPORT_QUERY` in `AppShell.tsx` and once as the stylesheet's `@media` block. A
media query cannot read a custom property, this package has no CSS build step, and neither
copy is removable — the stylesheet's block is what keeps the pre-hydration render from
showing the inline sidebar on a phone. Nothing automated checks that the two stay equal.
Both files say so; change one and you must change the other by hand.

**Measured contrast**, across the default theme and the three worked examples (`events`,
`tech`, `grimdark`):

- Resting link ink `--C-TEXT-SECONDARY` on `--C-SURFACE-0`: **5.76–7.56:1** — AA everywhere.
- Active link ink `--C-TEXT-PRIMARY` on its own wash: **15.44** default · **15.37** `events` ·
  **14.77** `tech` · **10.80** `grimdark` — the link you are on is now the most legible item
  in the sidebar, not the least. It previously inked `--C-ACCENT`, which measured 2.46 in
  `events` and 2.83 in `grimdark`, *below* a resting link.
- The active wash against the sidebar fill is **1.05–1.18:1**, i.e. no perceptible block of
  colour on its own — which is why the state is carried by the 1px inset `--C-ACCENT` edge
  rather than by the wash or the ink colour.
- Section titles in `--C-TEXT-MUTED`: **4.95** default · **4.85** `events` · **4.87** `tech` ·
  **5.23** `grimdark` against the sidebar's `--C-SURFACE-0`, clearing AA in every theme measured. They
  used to measure 2.10–2.59:1; `@batthewz/response-ui-css` **v0.10.0** retuned that token.
- `--C-BORDER-FOCUS` against `--C-SURFACE-0`: **3.68** default · **3.39** `events` ·
  **14.84** `tech` · **3.66** `grimdark`, clearing the 3:1 non-text floor in every theme measured.
  `events` and `grimdark` read 2.72 and 2.96 until **v0.10.1** — they had copied their
  *pre-retune* accent into the focus token, and that release corrected it.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

## Gotchas

- **The drawer ignores an outside-press that lands on a control naming it in `aria-controls`.**
  Outside-dismiss fires on `mousedown` while the toggle acts on the later `click`, so without
  this the toggle closed the drawer and immediately reopened it — it could be opened and never
  closed from its own button. The listener now stands down for any press inside
  `[aria-controls="<sidebar id>"]` and lets that control answer. The practical consequence is
  for **custom** toggles: point `aria-controls` at `AppShell.Sidebar`'s id and yours behaves
  like the built-in one; omit it and your button will fight the dismiss the same way. A press
  anywhere else — the scrim, the main content — still closes on `mousedown` as before.
- **`preventDefault()` in your `onClick` cancels the toggle.** `AppShell.Toggle` composes the
  handler you pass with its own: yours runs first, then the collapse/drawer flip, but only
  `if (!e.defaultPrevented)`. So `<AppShell.Toggle onClick={track}>` both tracks and toggles —
  analytics belong straight on the button — while `e.preventDefault()` is the deliberate
  escape hatch when you want the click without the state change. Only `type` is `Omit`ted
  from its props, so every other `<button>` prop is yours.
- **`SidebarLink`'s `href` is a compile error, not just an omission.** It is declared
  `href?: never`, so passing one — including through a spread object — fails to build. The
  destination is `to`, and the router adapter turns it into the `href`. `Omit` alone was not
  enough: a JSX spread performs no excess-property check, and `{...props}` lands *after* `to`
  on the adapter's `Link`, which renders `<a href={to} {...rest}>` — so a spread `href` used
  to win the destination outright and send the link somewhere else with `tsc` silent. It is
  also destructured out now, so it cannot reach the anchor from an untyped caller either.
- **The drawer's and the rail's modes each lock on the first render.** `open` and `collapsed`
  are decided independently at mount and never revisited. Controlled with no working
  `on*Change` means the toggle does nothing at all — there is no internal state left to fall
  back on, and nothing is thrown or logged. Uncontrolled at mount means a prop supplied later
  is ignored, so your state and the chrome drift apart in silence. Pass each prop from the
  first render or not at all; `open={x ?? undefined}` keeps whatever that render decided
  rather than flipping mid-life the way it used to.
- **The auto-close on navigation runs in an effect, one commit after the route change.** It no
  longer calls your `onOpenChange` during render — so no *"Cannot update a component while
  rendering a different component"* — at the cost of the drawer being open for one commit after
  the new route paints.
- **`open` and `collapsed` are each inert on the other side of 640px.** `defaultOpen` does
  nothing on desktop and `defaultCollapsed` does nothing on mobile; the toggle only ever
  writes to whichever one matches the current `isMobile`. Neither is reset when the viewport
  crosses the breakpoint: a drawer left open on a phone is still `open: true` at tablet
  width, where it is ignored, and it springs back open the moment the viewport narrows again.
- **Closing the mobile drawer unmounts it.** `AppShell.Sidebar` returns `null` when
  `isMobile && !open`, so nothing in the sidebar stays mounted: scroll position, an expanded
  submenu, a focused field inside it are all lost per open. The toggle drops its
  `aria-controls` while nothing carries that id, rather than pointing at a missing element.
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
`aria-controls` whenever that element is on screen, `aria-expanded` tracking the right flag per
breakpoint, and a state-aware
`aria-label` on the toggle. The mobile drawer traps focus (measured: opening it moves focus
to the first link inside, `Escape` closes it and returns focus to the toggle) and the Lucide
icons render `aria-hidden="true"`, so nothing announces the glyphs.

A collapsed rail keeps its link names. The label `<span>` is taken off the screen with
`sr-only` rather than `display: none`, so it stays in the accessibility tree: measured with
the same engine Testing Library uses, the name is `"Dashboard"` both expanded and collapsed.
This matters because the icon beside it is `aria-hidden`, so the label is the *only* name
source — hiding it outright left the rail a list of unnamed links. Note the [Tooltip](tooltip.md)
wrapper is not what saves this: it contributes `aria-describedby`, a *description*, and only
while open. A `SidebarLink` with no `children` still has no name.

Section titles are headings. `AppShell.SidebarSection` renders `title` as an `<h2>` (or
whatever `titleAs` names), so heading navigation reaches the groups, and the collapsed rail
takes the heading off the screen with `sr-only` rather than `display: none` — the same trade
as the link label, and for the same reason: a `display: none` heading is out of the
accessibility tree, so hiding it would have undone the point of making it one.

One gap you have to close yourself:

- **The drawer is a `dialog` wrapping the `navigation`.** On mobile the portal renders
  `<div role="dialog" aria-modal="true" aria-label="Main navigation">` around the
  `<aside role="navigation">` that carries the sidebar's id and your props, so `aria-modal`
  sits on a role that defines it. Nothing marks the rest of the page `inert`
  or `aria-hidden`, so a screen-reader user can still browse the content behind the scrim
  while the DOM focus trap pulls Tab focus back — the two disagree. If you need a true modal
  drawer, reach for [Drawer](drawer.md).

Section headings paint `--C-TEXT-MUTED` on the sidebar's `--C-SURFACE-0`. This page used to
put that at 2.10–2.59:1; re-measured against the shipped `@batthewz/response-ui-css` v0.10.0
it is **4.95 default / 4.85 events / 4.87 tech / 5.23 grimdark**, so it clears 4.5:1 in every
theme measured. The old figures predate that palette retune.

Two more things worth knowing: the active link is marked with `aria-current="page"`, so its
state is *not* colour-only for assistive tech — and for sighted users the accent now draws a
1px inset edge rather than tinting the letters, so the state survives independently of how
the ink and the wash happen to contrast in a given theme. And
focus is `:focus-visible` only on the toggle and on links, drawn as a 2px outline —
`outline-offset: 2px` on the toggle, `-2px` on links so a link's ring is drawn inside its
own box rather than out into the sidebar's `overflow-x: hidden` edge.

## Related

[CommandPalette](command-palette.md) · [Drawer](drawer.md) · [Breadcrumbs](breadcrumbs.md) ·
[Tooltip](tooltip.md) · [Portal](portal.md) · [ThemeSwitcher](theme-switcher.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
