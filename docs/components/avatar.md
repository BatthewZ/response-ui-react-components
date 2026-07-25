# Avatar

A person, in a circle. Give it a `src` and it renders the photo; give it a `name` and it
falls back to their initials — and it falls back on its own the moment the image fails to
load, so a dead URL degrades instead of leaving a hole. Five fixed sizes, an optional
presence dot, and a companion `AvatarGroup` for stacked rosters.

<!-- example:Minimal -->
```tsx
<Avatar name="Ada Lovelace" />
```
<!-- /example -->

| Prop        | Type                                          | Default |
| ----------- | --------------------------------------------- | ------- |
| `src`       | `string \| null`                              | —       |
| `alt`       | `string`                                      | —       |
| `name`      | `string`                                      | —       |
| `size`      | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`        | `"md"`  |
| `status`    | `"online" \| "offline" \| "away"`             | —       |
| `className` | `string`                                      | —       |
| `ref`       | `Ref<HTMLSpanElement>`                        | —       |
| …rest       | props of `span`                               | —       |

Every prop is optional — `<Avatar />` compiles, and renders an empty circle with no
accessible name. See [Gotchas](#gotchas).

## The fallback chain

Three states, decided in this order on every render:

1. **Photo** — `src` is truthy *and* no load error has been seen. Rendered as an
   `object-cover` `<img>` filling the circle.
2. **Initials** — otherwise, if `name` is a non-empty, non-whitespace string.
3. **Empty circle** — otherwise. The tinted circle still renders at full size, so layout
   never shifts between the three states.

<!-- example:WithPhoto -->
```tsx
<Avatar src="https://cdn.example.com/avatars/ada-lovelace.jpg" name="Ada Lovelace" />
```
<!-- /example -->

That URL has to actually resolve. A `src` that 404s — a placeholder host like the one above,
an expired signed URL, a blocked CDN — fires `onError`, and the avatar drops to the initials
and stays there, so rendered anywhere without that host this example shows `AL` rather than a
photo. See [Gotchas](#gotchas).

`alt` is not just the image's alt text: it is the avatar's accessible name, used whether or
not there is an image, and it takes precedence over `name`. Pass `name` alone and it does
both jobs — labels the avatar and generates the initials.

**Initials are the first letter of the first two words**, upper-cased. Not first-and-last:
`"Ada Byron King Lovelace"` gives `AB`, and `"Katherine Grace Johnson"` gives `KG`. A
single-word name gives a single letter. Leading, trailing, and repeated whitespace is
collapsed first, so a name that is empty or all whitespace produces no initials at all. The
letter is taken by UTF-16 code unit, so a word starting with an astral character — most emoji,
some CJK extension characters — yields a lone surrogate rather than the glyph; accents and
common CJK are fine (`"josé álvarez"` → `JÁ`, `"李 明"` → `李明`).

<!-- example:Initials -->
```tsx
<Avatar name="Cher" />
<Avatar name="Grace Hopper" />
<Avatar name="Ada Byron King Lovelace" />
```
<!-- /example -->

**A load error is sticky.** `onError` latches into component state and nothing clears it —
changing `src` afterwards will not bring the photo back. See [Gotchas](#gotchas).

## Size

<!-- example:Sizes -->
```tsx
<Avatar name="Ada Lovelace" size="xs" />
<Avatar name="Ada Lovelace" size="sm" />
<Avatar name="Ada Lovelace" size="md" />
<Avatar name="Ada Lovelace" size="lg" />
<Avatar name="Ada Lovelace" size="xl" />
```
<!-- /example -->

| Size | Class      | Box             | Status dot |
| ---- | ---------- | --------------- | ---------- |
| `xs` | `size-6`   | 1.5rem / 24px   | 0.5rem     |
| `sm` | `size-8`   | 2rem / 32px     | 0.5rem     |
| `md` | `size-10`  | 2.5rem / 40px   | 0.625rem   |
| `lg` | `size-12`  | 3rem / 48px     | 0.75rem    |
| `xl` | `size-16`  | 4rem / 64px     | 0.75rem    |

`sm` is exactly the 2rem marker column of [ActivityFeed](activity-feed.md), which is why an
avatar lands flush on that component's connector rail. The initials step with the box too:
`xs` is a fixed `0.625rem`, and `sm` through `xl` climb the body type scale into `text-h3`.

## Presence

`status` adds a dot to the bottom-right corner — `online` (success), `away` (warning),
`offline` (a neutral surface tint). The dot is decoration only: it has no label and is not
announced, so pair it with text wherever presence carries meaning.

<!-- example:Status -->
```tsx
<span className="inline-flex items-center gap-r5">
  <Avatar name="Ada Lovelace" status="online" aria-hidden="true" />
  <span>Ada Lovelace — online</span>
</span>
<span className="inline-flex items-center gap-r5">
  <Avatar name="Grace Hopper" status="away" aria-hidden="true" />
  <span>Grace Hopper — away</span>
</span>
<span className="inline-flex items-center gap-r5">
  <Avatar name="Katherine Johnson" status="offline" aria-hidden="true" />
  <span>Katherine Johnson — offline</span>
</span>
```
<!-- /example -->

## AvatarGroup

`AvatarGroup` is a separate export from the same module — a `<div>` that overlaps its
children into a stack and collapses the tail into a `+N` chip. Avatars are the expected
children, but it does not check: it wraps whatever you give it in a ringed `<span>`.

| Prop        | Type                                    | Default        |
| ----------- | --------------------------------------- | -------------- |
| `max`       | `number`                                | — (show all)   |
| `size`      | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`  | `"md"`         |
| `children`  | `ReactNode`                             | —              |
| `className` | `string`                                | —              |
| `ref`       | `Ref<HTMLDivElement>`                   | —              |
| …rest       | props of `div`                          | —              |

<!-- example:Group -->
```tsx
<AvatarGroup max={3}>
  <Avatar name="Ada Lovelace" />
  <Avatar name="Grace Hopper" />
  <Avatar name="Katherine Johnson" />
  <Avatar name="Barbara Liskov" />
  <Avatar name="Alan Turing" />
</AvatarGroup>
```
<!-- /example -->

The chip appears only when there are more children than `max`, and counts the difference —
five children with `max={3}` render three avatars and `+2`. Omit `max` and everything renders
with no chip.

The group's `size` sets the overlap distance and the `+N` chip's dimensions — it does **not**
reach the children. Set it in both places or the chip won't match the stack:

<!-- example:GroupSizing -->
```tsx
<AvatarGroup max={2} size="sm">
  <Avatar name="Ada Lovelace" size="sm" />
  <Avatar name="Grace Hopper" size="sm" />
  <Avatar name="Katherine Johnson" size="sm" />
</AvatarGroup>
```
<!-- /example -->

## Theme tokens

Avatar has no CSS file. Every rule is a Tailwind utility, so the whole component — fill, ink,
type, corners, presence colours — resolves through the token layer and re-tints with a theme
change at runtime.

| Where                        | Utility                                             | Override                                                     |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Fallback circle fill         | `bg-surface-2`                                      | `--C-SURFACE-2`                                              |
| Initials · `+N` ink          | `text-fg-secondary`                                 | `--C-TEXT-SECONDARY`                                         |
| Initials · `+N` weight       | `font-semibold`                                     | `--Semibold-Weight`                                          |
| Initials · `+N` type (`sm`–`xl`) | `text-body-3` `text-body-2` `text-body-1` `text-h3` | `--BodyText-3` `--BodyText-2` `--BodyText-1` `--H3`      |
| Circle corners               | `rounded-full`                                      | `--RADIUS-FULL`                                              |
| Presence — online · away     | `bg-status-success` `bg-status-warning`             | `--C-STATUS-SUCCESS` `--C-STATUS-WARNING`                    |
| Presence — offline · `+N` chip | `bg-surface-3`                                    | `--C-SURFACE-3`                                              |
| Ring behind dot and stack    | `ring-surface-0`                                    | `--C-SURFACE-0`                                              |

Geometry is deliberately **not** on the responsive `r`-scale: the box sizes, the dot sizes and
the group overlap are fixed Tailwind spacing, so an avatar is the same diameter on mobile and
desktop. Its initials type is not — `--BodyText-*` and `--H3` both step up at the 40rem
breakpoint, and `--Semibold-Weight` steps `500 → 600` alongside them, so the letters grow *and*
thicken inside a circle that doesn't. One value is off the contract altogether: the `xs`
initials size is a hard-coded `0.625rem` rather than a type token, so that size alone neither
re-scales nor responds to a theme's typography.

The ring around the presence dot and around each stacked avatar is hard-coded to
`--C-SURFACE-0`. That is correct on the topmost surface and wrong anywhere else — see
[Gotchas](#gotchas).

## Gotchas

- **A failed image is remembered forever.** The error flag is component state set once by the
  `<img>`'s `onError` and never reset, so a later `src` pointing at a working image renders
  nothing but the initials. If your URLs expire or get retried, force a remount with
  `<Avatar key={src} src={src} … />`.
- **Initials take the first two words, not the first and last.** Middle names win over
  surnames. Pre-compute the string yourself and pass it as `name` if you need `AL` from
  `"Ada Byron King Lovelace"`.
- **`alt` overrides `name` for the label but never for the initials.**
  `<Avatar name="Ada Lovelace" alt="Repository owner" />` renders `AL` inside a circle
  announced as "Repository owner".
- **An avatar reaches an unnamed `role="img"` three ways.** `<Avatar />` with neither `alt` nor
  `name` is the obvious one. `name="   "` is the second: the trim only feeds `getInitials`, so
  the label is the raw string and `aria-label="   "` names nothing. `alt=""` is the third — the
  label is `alt ?? name`, so an empty `alt` beats a real `name` and you get `aria-label=""` on a
  circle that is still visibly showing initials. Always pass a non-empty `alt` or `name` —
  including when you pass only a `src`.
- **`children` compiles and is then thrown away.** `AvatarProps` spreads
  `ComponentPropsWithRef<"span">` without omitting `children`, so
  `<Avatar name="Ada Lovelace">anything</Avatar>` typechecks clean and renders `AL`: the
  wrapper's own JSX children beat the spread. [Skeleton](skeleton.md) and
  [Spinner](spinner.md) do omit it and reject the same code at compile time; Avatar is the odd
  one out. Compose around an Avatar, never inside it.
- **The presence dot is silent.** `status` changes a colour and nothing else — no label, no
  `title`, no ARIA. `offline` and `away` are also a grey/amber pair, which is a hard
  discrimination for some readers. Put the state in text.
- **`AvatarGroup`'s `size` stops at the group.** Children keep whatever `size` they were
  given, so `<AvatarGroup size="lg">` around default `md` avatars produces a `+N` chip that is
  visibly larger than the stack.
- **The stack ring assumes a `surface-0` background.** The 2px ring that separates overlapping
  avatars, and the one around the presence dot, always paint `--C-SURFACE-0`. On a `surface-1`
  card, a `surface-2` panel, or a `bg-primary` band it reads as a pale halo rather than a cut-out.
- **`className` merges last.** It is passed through `cn()` after the size class, so a `size-*`
  utility in `className` overrides the `size` prop — that is how [AvatarUpload](avatar-upload.md) stretches an
  avatar to fill its own frame.
- **Client component.** The image-error latch is `useState`, so the file carries `"use client"`.
  Dropping an Avatar into an RSC tree opens a client boundary at that point.

## Accessibility

The wrapper is a `<span role="img">` whose accessible name is `alt ?? name`. The initials are
rendered in an `aria-hidden` span, so screen readers never spell out "A, L" — they read the
name. The `<img>` also carries an `alt` of the same string, but `role="img"` makes its subtree
presentational, so the label is announced once.

- **It is never decorative by default.** Placed next to a visible name — the common case in a
  comment header or a table cell — it announces that name a second time. There is no
  `decorative` prop, but rest props are spread after the defaults, so
  `<Avatar name="Ada Lovelace" aria-hidden="true" />` (or your own `role`/`aria-label`) wins.
  The presence example above does exactly this.
- **An unlabelled avatar is worse than a hidden one.** With no `alt` and no `name` the
  `role="img"` remains, so assistive tech announces an image it cannot describe.
- **`AvatarGroup` has no group semantics.** It is a plain `<div>` — no list role, no label, no
  count. The `+2` chip is real text and does get read, but the names it stands in for are gone
  from the accessibility tree entirely. Add your own `aria-label` to the group, or a
  visually-hidden summary, when the roster matters.

## Related

[AvatarUpload](avatar-upload.md) · [ActivityFeed](activity-feed.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
