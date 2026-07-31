# HoverCard

A rich preview that opens when the pointer rests on something — the profile card behind a
username, the summary behind a commit hash. It anchors itself to the trigger, portals out of
any clipping ancestor, and waits out both the arrival and the departure so the card doesn't
flicker on a passing cursor. Hover-first by design — keyboard focus opens it too, but touch
never does and focus cannot move *into* it — so nothing inside it can be information only it
holds.

<!-- example:Minimal -->
```tsx
<HoverCard>
  <HoverCard.Trigger asChild>
    <a href="/people/ada-lovelace">Ada Lovelace</a>
  </HoverCard.Trigger>
  <HoverCard.Content aria-label="About Ada Lovelace">
    <p>Mathematician. Published the first algorithm intended for a machine, in 1843.</p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

## Everything in here must exist somewhere else

A HoverCard opens on hover and on keyboard focus, and on nothing else. Touch users never open
it; a mouse click never opens it; keyboard users can open it — the default trigger is a real
`<button>` — but they cannot move focus **into** the card — see
[Accessibility](#accessibility). So the
card is an accelerator, never a location: every fact inside it has to be reachable another
way, usually the page the trigger already links to. If something is only in the hover card, a
large share of your users will never see it.

That is also the line between the three floating primitives:

| Reach for      | When                                                             |
| -------------- | ---------------------------------------------------------------- |
| `Tooltip`      | A short string naming or clarifying a control. No interaction.    |
| **HoverCard**  | A **hover/focus, optional** preview — a few lines, an avatar, a stat.  |
| `Popover`      | Anything a user must be able to open on purpose, or interact with. |

**Anatomy.** `HoverCard` is state and context only — it renders no DOM of its own, so
`Trigger` and `Content` can sit anywhere beneath it, in either order. `HoverCard.Trigger` is
the anchor the card measures itself against and the element the pointer has to reach.
`HoverCard.Content` renders into a Floating UI portal appended to `<body>`, so it escapes
`overflow: hidden` and every `z-index` on the way up — the same escape [Portal](portal.md)
gives you, with the positioning included. It is not in the DOM at all while closed.

| Part                | Renders                                              | Props                                                                              |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `HoverCard`         | nothing — a context provider                          | `open?` · `defaultOpen?` · `onOpenChange?` · `openDelay?` · `closeDelay?` · `placement?` · `children` |
| `HoverCard.Trigger` | `<button type="button">`, or its own child when `asChild` | `asChild?` (+ all `button` props)                                              |
| `HoverCard.Content` | `<div role="dialog">`, portalled into `<body>`        | `arrow?` · `classNames?` (+ all `div` props)                                        |

| Root prop      | Type                      | Default    |
| -------------- | ------------------------- | ---------- |
| `open`         | `boolean`                 | — _(uncontrolled)_ |
| `defaultOpen`  | `boolean`                 | `false`    |
| `onOpenChange` | `(open: boolean) => void` | —          |
| `openDelay`    | `number` (ms)             | `300`      |
| `closeDelay`   | `number` (ms)             | `150`      |
| `placement`    | `Placement`               | `"bottom"` |
| `children`     | `ReactNode`               | — _(required)_ |

The root takes no `className` and no `ref` — it renders nothing to put them on. Both sub-parts
throw `"HoverCard compound components must be used within <HoverCard>"` if they can't find the
provider, so wrapping them in components of your own is fine; rendering them loose is not.

<!-- example:ProfileCard -->
```tsx
<HoverCard>
  <HoverCard.Trigger asChild>
    <a href="/people/ada-lovelace" className="inline-flex items-center gap-r5">
      <Avatar name="Ada Lovelace" size="sm" aria-hidden="true" />
      Ada Lovelace
    </a>
  </HoverCard.Trigger>
  <HoverCard.Content aria-label="Ada Lovelace">
    <div className="flex items-center gap-r5">
      <Avatar name="Ada Lovelace" />
      <div>
        <p className="font-semibold">Ada Lovelace</p>
        <p className="text-fg-secondary">@ada · Analytical Engine</p>
      </div>
    </div>
    <p className="text-fg-secondary">
      Mathematician, London. 41 repositories, 12 followers.
    </p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

The avatar in the trigger is `aria-hidden` because the link's own text already names the
person — see [Avatar](avatar.md) on why it would otherwise announce twice.

## The trigger

With `asChild`, the trigger props are cloned onto **your** element and no wrapper is rendered.
Without it you get a `<button type="button" class="inline-flex w-fit text-left">` around the
children.

<!-- example:TextTrigger -->
```tsx
<HoverCard>
  <HoverCard.Trigger>4f21a9c</HoverCard.Trigger>
  <HoverCard.Content aria-label="Commit 4f21a9c">
    <p>Fix OKLCH rounding in the theme compiler</p>
    <p className="text-fg-secondary">Grace Hopper committed 3 days ago</p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

The default `<button>` is focusable, so keyboard focus opens the card and the
`aria-expanded` it carries sits on a real control. Reach for `asChild` when the trigger
should be a link — the usual case, since a hover card previews a destination — or an existing
[Button](button.md), rather than a plain unstyled one. `asChild` needs exactly one
**element**: a bare string
or more than one child falls back to the `<button>` wrapper silently, and a fragment is worse —
it is a valid element, so the props are cloned onto the fragment, React logs *"Invalid prop
supplied to React.Fragment"*, and nothing is registered as the anchor, so hover never opens the
card at all. `asChild` merges the trigger wiring into the child rather than overwriting it —
see [Gotchas](#gotchas).

## The two delays

The delays are the whole feel of the component, and they do different jobs.

`openDelay` (300ms) is an intent filter: a cursor crossing the trigger on its way elsewhere
should not fire a card. `closeDelay` (150ms) is the trip: it keeps the card alive while the
pointer travels the 8px gap from the trigger to the card. Alongside it, a safe-polygon
handler tracks the pointer across that gap, so a diagonal move toward the card counts as
staying — and once the pointer is **over** the card, the close timer is cancelled outright, so
the card stays open as long as you're in it and starts closing `closeDelay` after you leave
it. Both delays apply only to hover; focus opens immediately.

<!-- example:Delays -->
```tsx
<HoverCard openDelay={600} closeDelay={300}>
  <HoverCard.Trigger asChild>
    <a href="/people/grace-hopper">Grace Hopper</a>
  </HoverCard.Trigger>
  <HoverCard.Content aria-label="About Grace Hopper">
    <p>Rear Admiral, United States Navy. Built the first compiler.</p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

Each card times independently — there is no shared delay group — so moving along a row of
five hover-carded names pays the full `openDelay` five times.

## Positioning

`placement` is the preferred side and alignment, one of Floating UI's twelve
(`"top"`, `"bottom-start"`, `"right-end"`, …). It is a preference, not a promise: the card is
offset 8px from the trigger, flips to the opposite side when that side would overflow, and
shifts along the cross axis to stay 8px inside the viewport. Position is recomputed on scroll
and resize while open.

<!-- example:Placement -->
```tsx
<HoverCard placement="right-start">
  <HoverCard.Trigger asChild>
    <a href="/people/katherine-johnson">Katherine Johnson</a>
  </HoverCard.Trigger>
  <HoverCard.Content aria-label="About Katherine Johnson">
    <p>Orbital mechanics for Mercury-Redstone 3 and Apollo 11.</p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

The 8px offset is not exposed as a prop, so a placement that keeps card and trigger visually
adjacent still matters. The card is a fixed `w-72` (18rem); override it with a width in
`className`. While it is mounted it carries `data-state="open"` or `"closed"`, which is the hook
to hang your own CSS on.

## The arrow

`<HoverCard.Content arrow>` draws a pointer triangle on the card edge that faces the trigger.
It is **off by default** and is the one thing on this page that changes what is painted.

<!-- example:Arrow -->
```tsx
<HoverCard placement="top">
  <HoverCard.Trigger asChild>
    <a href="/people/alan-turing">Alan Turing</a>
  </HoverCard.Trigger>
  <HoverCard.Content arrow aria-label="About Alan Turing">
    <p>Mathematician. Formalised computation, and broke Enigma at Bletchley Park.</p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

- **It follows a flip.** The edge comes from the *resolved* placement, so a `top` card pushed to
  `bottom` moves its arrow with it. The element carries `data-side="top" | "right" | "bottom" |
  "left"` naming that edge, and `arrow()` keeps it centred on the trigger after `shift()` has run.
- **It takes the card's own paint.** `bg-inherit` and `border-inherit` follow whatever the card
  is painted with — including a `bg-*` or `border-*` you put on `className`, which wins from
  `@layer components`. There is deliberately no arrow variable: one that could be set without
  the card's own would let the two drift apart.
- **Resize it with `classNames.arrow`**, not with a token. The middleware measures the element,
  so `classNames={{ arrow: "size-r4" }}` stays correctly centred and correctly seated. Because
  the card ships no stylesheet, the arrow is utilities too — which makes this a *real*
  tailwind-merge conflict: your `size-*` replaces the default rather than layering over it. See
  [Slots](#slots).
- **It is `aria-hidden`,** so it changes nothing about the card's name or description.
- **Forced colours are fine.** Both `inherit`s resolve to whatever the substituted palette gave
  the card, so the arrow stays a continuation of the card outline.

## Slots

`className` addresses the element each part renders. `classNames` addresses the elements a part
renders *inside* itself — class strings only, and the keys are typed, so a misspelled one is a
compile error rather than a prop that does nothing.

| Part                | Slot    | Element                          | What it addresses                          |
| ------------------- | ------- | -------------------------------- | ------------------------------------------ |
| `HoverCard.Content` | `arrow` | the pointer `div`, `[data-side]` | the pointer triangle, present only under `arrow` |

```tsx
<HoverCard.Content arrow classNames={{ arrow: "size-r4" }} aria-label="About Alan Turing" />
```

**Deliberately not slots.** `HoverCard.Trigger` and `HoverCard.Content` are subcomponents, so
their own `className` already reaches them — a slot beside a subcomponent would be a second
writer for one element. And **there is no slot for the fade**: `useTransitionStyles` writes
`transition-duration` as an inline style, so a `duration-*` utility on the card, in a slot or
inlined from CSS is silently dead no matter where it is written. That tempo is
`--MOTION-DURATION-ENTER` / `--MOTION-DURATION-EXIT` and nothing else.

## Controlled

Pass `open` and the component is controlled for its whole life — the mode is locked on the
first render, so a later `undefined` will not hand control back. Hover and focus then only
*ask*, through `onOpenChange`; nothing moves until your state does. The example below holds
`const [open, setOpen] = useState(false)` above the JSX.

<!-- example:Controlled -->
```tsx
<HoverCard open={open} onOpenChange={setOpen}>
  <HoverCard.Trigger asChild>
    <a href="/deploys/4f21a9c">Production deploy</a>
  </HoverCard.Trigger>
  <HoverCard.Content aria-label="Production deploy 4f21a9c">
    <p>Deployed 20 minutes ago by Grace Hopper. 14 commits since the last release.</p>
  </HoverCard.Content>
</HoverCard>
```
<!-- /example -->

`defaultOpen` is the uncontrolled equivalent and is read once, on mount.

## Theme tokens

HoverCard has no CSS file. Every colour, corner, shadow and space on the card is a Tailwind
utility resolving through the token layer, so it re-tints with a theme change at runtime.

| Where          | Utility                 | Override             |
| -------------- | ----------------------- | -------------------- |
| Card surface   | `bg-surface-0`          | `--C-SURFACE-0`      |
| Card border    | `border-border-default` | `--C-BORDER-DEFAULT` |
| Corners        | `rounded-lg`            | `--RADIUS-LG`        |
| Lift           | `shadow-lg`             | `--SHADOW-LG`        |
| Padding        | `p-r4`                  | `--R-SIZE-4`         |

The padding is the only responsive value: `--R-SIZE-4` steps `0.75rem → 1.25rem` at the 40rem
breakpoint. The trigger's own `inline-flex w-fit text-left` reads no tokens at all.

One value sits **outside** the contract: the `w-72` width is a fixed 18rem. The open/close
fade is on it — an inline `opacity` transition whose duration comes from
`--MOTION-DURATION-ENTER` / `--MOTION-DURATION-EXIT` (150ms if no token layer is present), and
`0` under `prefers-reduced-motion: reduce`, which removes the fade and the delayed unmount
with it.

The card also sets no text colour and no type scale, so it inherits both — but it is portalled
to `<body>`, so it inherits from *there*, not from where it sits in your JSX. A `--C-TEXT-*`
override scoped to a wrapper `<div>` never reaches the card; scope those on `:root`, or set the
colour on the card itself with `className`. See the [theme contract](../theme-contract.md).

## Gotchas

- **`asChild` merges your child's props rather than overwriting them.** The child is cloned
  through `mergeProps`, so its own handlers **compose** with the trigger's (yours runs first,
  and can opt out with `preventDefault()`), its `ref` is merged, its `className` merges through
  `cn()`, and its `style` merges by key. Wrap a `<button ref={btnRef} onFocus={track}>` in an
  `asChild` trigger and both `btnRef.current` and `track` work. (Before this was fixed the
  clone dropped the ref and seven handlers without warning.)
- **Escape closes it, and the next twitch of the mouse reopens it.** Dismissal is a
  document-level keydown, so Escape works from anywhere while the card is open — but the
  pointer is still on the trigger, and any pointer movement over it re-opens the card after
  `openDelay`. Escape is a reprieve, not a dismissal. Move the pointer away.
- **A press outside closes it too.** A `pointerdown` anywhere outside both the trigger and the
  card dismisses it; a press *inside* the card does not, so text in there stays selectable.
- **`style` wins over the positioning.** Your `style` prop is spread after both the anchor
  coordinates and the fade, so a `top`, `left`, `transform` or `position` of your own breaks
  the anchoring, and an `opacity` of your own kills the transition. Use `className` for looks.
- **`className` merges last.** It runs through `cn()` after the defaults, so `w-96` replaces
  `w-72` and `bg-surface-1` replaces `bg-surface-0` rather than fighting them.
- **The card is absent, then it lingers.** Nothing is rendered while closed — you cannot query
  the content, and search-in-page never finds it. After closing it stays mounted for the exit
  fade (`--MOTION-DURATION-EXIT`, 150ms with no token layer), so with default delays the DOM
  node outlives your `unhover` by `closeDelay` plus the exit duration — about 300ms with no
  token layer. Tests should wait for it to go, not assert immediately.
- **Client component.** The file carries `"use client"`; importing HoverCard opens a client
  boundary. The content inside it is rendered on the client, so nothing in the card is in the
  server HTML or visible to a crawler.

## Accessibility

Design so that nothing is lost if the card is never seen. What the code actually emits:

- **The trigger** — a real `<button>` by default — carries an `id`, `aria-expanded`,
  `aria-haspopup="dialog"`, and — while open — `aria-controls` plus an `aria-describedby`
  pointing at the card, appended to any description it already had.
- **The card** is a `<div role="dialog" tabindex="-1">`, named by default via
  `aria-labelledby` pointing back at the trigger; an `aria-label` or `aria-labelledby` you
  pass wins over that default.

Three consequences, in the order they'll bite you:

- **Opening announces nothing.** The card is neither focused nor live, so the moment it opens
  is silent. Its contents are not lost — while open the card is the trigger's accessible
  *description*, so a screen reader re-reading the focused trigger gets the card's text — but
  descriptions are announced late, at reduced verbosity, or only on request. If the
  information matters, it belongs in the page, not the card.
- **Focus cannot get into it.** The card is portalled to the end of `<body>` with no focus
  management and no tab guards, so Tab from the trigger goes to the next control on the page —
  and that blur closes the card. Interactive content inside a HoverCard (a "Follow" button, a
  link) is unreachable by keyboard. Put those actions on the page instead.
- **The default name is the whole trigger.** `aria-labelledby` pointing at the trigger means
  the card announces under the trigger's full text — fine for a short name, noisy for a long
  one. Pass `aria-label` for a better name, as every example on this page does.

Both entry points are narrower than they look. Focus opens the card only when the browser
reports `:focus-visible` on the trigger — a keyboard tab, not a click or a tap — and the hover
interaction is mouse-only, so a touch pointer is ignored outright and a tap opens nothing.
Between them, that is the share of your users who will never see this card.

If you need a preview that keyboard and touch users can actually open, that is a [Popover](popover.md).

## Related

[Tooltip](tooltip.md) · [Popover](popover.md) · [DropdownMenu](dropdown-menu.md) · [ContextMenu](context-menu.md) · [Avatar](avatar.md) ·
[Portal](portal.md) · [Dialog](dialog.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
