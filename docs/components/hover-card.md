# HoverCard

A rich preview that opens when the pointer rests on something — the profile card behind a
username, the summary behind a commit hash. It anchors itself to the trigger, portals out of
any clipping ancestor, and waits out both the arrival and the departure so the card doesn't
flicker on a passing cursor. Hover-only by design, so nothing inside it can be information a
touch or keyboard user needs.

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

A HoverCard opens on hover and on nothing else. Touch users never open it; a mouse click
never opens it; keyboard users get it only if you pass `asChild` a focusable element, and even
then they cannot move focus **into** the card — see [Accessibility](#accessibility). So the
card is an accelerator, never a location: every fact inside it has to be reachable another
way, usually the page the trigger already links to. If something is only in the hover card, a
large share of your users will never see it.

That is also the line between the three floating primitives:

| Reach for      | When                                                             |
| -------------- | ---------------------------------------------------------------- |
| `Tooltip`      | A short string naming or clarifying a control. No interaction.    |
| **HoverCard**  | A **hover-only, optional** preview — a few lines, an avatar, a stat.  |
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
| `HoverCard.Trigger` | `<span>`, or its own child when `asChild`             | `asChild?` (+ all `span` props)                                                    |
| `HoverCard.Content` | `<div role="dialog">`, portalled into `<body>`        | all `div` props                                                                    |

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
Without it you get a `<span class="inline-flex w-fit">` around the children.

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

Prefer `asChild` with a link or a button. That `<span>` has no `tabIndex`, so it can never be
focused, which makes the card strictly mouse-only and leaves the `aria-expanded` it carries
sitting on an element with no role. `asChild` also needs exactly one **element**: a bare string
or more than one child falls back to the `<span>` wrapper silently, and a fragment is worse —
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
it. Both delays apply only to hover; focus, when it works at all, opens immediately.

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

There is no arrow, and neither it nor the 8px offset is exposed as a prop — the gap is all that
ties the card back to its trigger, so prefer a placement that keeps them visually adjacent. The
card is a fixed `w-72` (18rem); override it with a width in `className`. While it is mounted it
carries `data-state="open"` or `"closed"`, which is the hook to hang your own CSS on.

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
breakpoint. The trigger's own `inline-flex w-fit` reads no tokens at all.

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
  node outlives your `unhover` by about 300ms. Tests
  should wait for it to go, not assert immediately.
- **Client component.** The file carries `"use client"`; importing HoverCard opens a client
  boundary. The content inside it is rendered on the client, so nothing in the card is in the
  server HTML or visible to a crawler.

## Accessibility

Assume the card is invisible to most assistive technology and design so that nothing is lost.
What the code actually emits:

- **The trigger** gets `aria-expanded`, `aria-haspopup="dialog"`, and — while open —
  `aria-controls` pointing at the card's generated id.
- **The card** is a `<div role="dialog" tabindex="-1">` with no accessible name of its own.

Four consequences, in the order they'll bite you:

- **Nothing is announced when it opens.** The trigger is not `aria-describedby` the card, and
  the card is neither focused nor live. A keyboard user who focuses an `asChild` trigger is
  told a dialog exists — `aria-haspopup="dialog"` — and then never hears a word of it. If the
  information matters, it belongs in the page, not the card.
- **Focus cannot get into it.** The card is portalled to the end of `<body>` with no focus
  management and no tab guards, so Tab from the trigger goes to the next control on the page —
  and that blur closes the card. Interactive content inside a HoverCard (a "Follow" button, a
  link) is unreachable by keyboard. Put those actions on the page instead.
- **Name the card yourself.** `role="dialog"` without an accessible name is an automated-check
  failure and announces as an unnamed dialog. Rest props reach the element, so pass
  `aria-label` — every example on this page does.
- **The default trigger is a bare `<span>`.** It is not focusable, so the focus path is dead
  and the component is mouse-only; and `aria-expanded` is not a global ARIA attribute, so on a
  span with no role it is invalid markup that expresses nothing. Use `asChild` with a real
  link or button.

Both entry points are narrower than they look. Focus opens the card only when the browser
reports `:focus-visible` on the trigger — a keyboard tab, not a click or a tap — and the hover
interaction is mouse-only, so a touch pointer is ignored outright and a tap opens nothing.
Between them, that is the share of your users who will never see this card.

If you need a preview that keyboard and touch users can actually open, that is a [Popover](popover.md).

## Related

[Tooltip](tooltip.md) · [Popover](popover.md) · [DropdownMenu](dropdown-menu.md) · [ContextMenu](context-menu.md) · [Avatar](avatar.md) ·
[Portal](portal.md) · [Dialog](dialog.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
