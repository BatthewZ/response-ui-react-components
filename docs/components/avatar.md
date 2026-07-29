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
| `statusLabel`| `string` — text for `status` in the accessible name | `"Online"` / `"Offline"` / `"Away"` |
| `className` | `string`                                      | —       |
| `ref`       | `Ref<HTMLSpanElement>`                        | —       |
| …rest       | props of `span` minus `children`              | —       |

Every prop is optional — `<Avatar />` compiles, and renders an empty circle with no `role` and
no accessible name. See [Gotchas](#gotchas).

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
letter is taken per Unicode code point, not per UTF-16 code unit, so a word starting with an
astral character — an emoji, a CJK extension character — yields the whole glyph rather than a
lone surrogate; accents and CJK work as expected (`"josé álvarez"` → `JÁ`, `"李 明"` → `李明`).

<!-- example:Initials -->
```tsx
<Avatar name="Cher" />
<Avatar name="Grace Hopper" />
<Avatar name="Ada Byron King Lovelace" />
```
<!-- /example -->

**A load error is remembered per URL.** The failing `src` is what gets recorded, so pointing
`src` at a different — or repaired — URL renders the photo again.

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
`xs` and `sm` share `text-body-3`, and `md` through `xl` climb the body type scale into
`text-h3`.

## Presence

`status` adds a dot to the bottom-right corner — `online` (success), `away` (warning),
`offline` (`--C-BORDER-STRONG`, the contract's contrast-carrying neutral — not a surface
rung). The dot element itself is unlabelled, but `status` folds
a label into the avatar's accessible name — `"Ada Lovelace, Online"` — and `statusLabel`
replaces the English default. On screen the dot is still only a colour, so pair it with
visible text wherever presence carries meaning.

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

The group's `size` sets the overlap distance, the `+N` chip's dimensions, **and** its Avatar
children: a child with no explicit `size` inherits the group's, and one with its own keeps
it. Setting it in both places, as below, is harmless:

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
| Fallback circle · `+N` chip fill | `bg-surface-2`                                  | `--C-SURFACE-2`                                              |
| Initials · `+N` ink          | `text-fg-secondary`                                 | `--C-TEXT-SECONDARY`                                         |
| Initials · `+N` weight       | `font-semibold`                                     | `--Semibold-Weight`                                          |
| Initials · `+N` type (`xs`–`xl`) | `text-body-3` `text-body-2` `text-body-1` `text-h3` | `--BodyText-3` `--BodyText-2` `--BodyText-1` `--H3`      |
| Circle corners               | `rounded-full`                                      | `--RADIUS-FULL`                                              |
| Presence — online · away     | `bg-status-success` `bg-status-warning`             | `--C-STATUS-SUCCESS` `--C-STATUS-WARNING`                    |
| Presence — offline           | `bg-border-strong`                                  | `--C-BORDER-STRONG`                                          |
| Ring behind dot and stack    | `ring-surface-0`                                    | `--C-SURFACE-0`                                              |

Geometry is deliberately **not** on the responsive `r`-scale: the box sizes, the dot sizes and
the group overlap are fixed Tailwind spacing, so an avatar is the same diameter on mobile and
desktop. Its initials type is not — `--BodyText-*` and `--H3` both step up at the 40rem
breakpoint, and `--Semibold-Weight` steps `500 → 600` alongside them, so the letters grow *and*
thicken inside a circle that doesn't. Every size reads a type token, `xs` included — it shares
`text-body-3` with `sm` rather than pinning a literal.

The ring around the presence dot and around each stacked avatar is hard-coded to
`--C-SURFACE-0`, the raised-sheet rung. That is correct on a rung-0 backdrop and wrong
anywhere else — including the page itself, which paints `--C-CANVAS` and is not a rung —
see [Gotchas](#gotchas).

The offline dot is `--C-BORDER-STRONG`, not a surface rung. A rung is defined by its place
in the ramp, not by contrast against anything, so a dot painted from one is not guaranteed
to be visible; `--C-BORDER-STRONG` is the contract's contrast-carrying neutral and reads in
every theme the way its `success` / `warning` siblings do.

## Gotchas

- **A failed image is remembered until the `src` changes.** The component records *which* URL
  failed, so the same URL keeps showing initials while a new one is retried. Re-serving the
  same URL after a fix needs a cache-busting query or a remount.
- **Initials take the first two words, not the first and last.** Middle names win over
  surnames. Pre-compute the string yourself and pass it as `name` if you need `AL` from
  `"Ada Byron King Lovelace"`.
- **`alt` overrides `name` for the label but never for the initials.**
  `<Avatar name="Ada Lovelace" alt="Repository owner" />` renders `AL` inside a circle
  announced as "Repository owner".
- **An avatar with nothing to announce drops its `role` instead of keeping an empty one.**
  `<Avatar />`, `name="   "` and `alt=""` (an empty `alt` still beats a real `name`, the same
  way it marks an `<img>` decorative) all produce a plain `<span>` with no `role="img"` and no
  `aria-label`, rather than a nameless image — unless `status` is set, whose label alone can
  still name it. That is the better failure, not a substitute for
  a name: pass a non-empty `alt` or `name` whenever the avatar carries meaning.
- **`children` is a compile error, as it is on Skeleton and Spinner.** `AvatarProps` omits it
  from `ComponentPropsWithRef<"span">`, so `<Avatar name="Ada Lovelace">anything</Avatar>`
  fails to typecheck instead of typechecking and then silently dropping what you passed —
  the same guard [Skeleton](skeleton.md) and [Spinner](spinner.md) carry. Compose around an
  Avatar, never inside it.
- **The presence dot is announced through the name, not the dot.** `status` appends its label
  to the avatar's accessible name (`"Ada Lovelace, Online"`); `statusLabel` replaces the English
  default. The dot element stays unlabelled — it has to be, because ARIA makes the children of
  `role="img"` presentational. On screen it is still only a colour, and `offline` and `away` are
  a grey/amber pair that is a hard discrimination for some readers, so put the state in visible
  text as well wherever it matters.
- **`AvatarGroup`'s `size` reaches its Avatar children.** A child with an explicit `size` keeps
  it; one without inherits the group's. Anything that is not a direct `Avatar` element is left
  alone — wrap your avatars in a component of your own and they size themselves again, so pass
  `size` explicitly there.
- **The stack ring assumes a rung-0 sheet.** The 2px ring that separates overlapping avatars,
  and the one around the presence dot, always paint `--C-SURFACE-0`. That is a clean cut-out on
  a [Card](card.md), a [Dialog](dialog.md), a [Drawer](drawer.md) or a menu — all rung 0 — and a
  pale halo on a nested `surface-1` panel, on a recessed `surface-2`/`surface-3` fill, or on a
  `bg-primary` band. The page is not an exception you can design around either: `--C-CANVAS` is
  the page floor and sits between rungs 1 and 2, so an avatar dropped straight onto the page
  gets a ring **1.05–1.16:1** off its backdrop in every theme. The dot's ring sits on an inner
  element `className` cannot reach, so there is no override path.
- **`className` merges last.** It is passed through `cn()` after the size class, so a `size-*`
  utility in `className` overrides the `size` prop — that is how [AvatarUpload](avatar-upload.md) stretches an
  avatar to fill its own frame.
- **Client component.** The image-error latch is `useState`, so the file carries `"use client"`.
  Dropping an Avatar into an RSC tree opens a client boundary at that point.

## Accessibility

The wrapper is a `<span role="img">` whose accessible name is `alt ?? name`, with the
`status` label appended when there is one. The initials are
rendered in an `aria-hidden` span, so screen readers never spell out "A, L" — they read the
name. The `<img>` also carries an `alt` of the same string, but `role="img"` makes its subtree
presentational, so the label is announced once.

- **It is never decorative by default.** Placed next to a visible name — the common case in a
  comment header or a table cell — it announces that name a second time. There is no
  `decorative` prop, but rest props are spread after the defaults, so
  `<Avatar name="Ada Lovelace" aria-hidden="true" />` (or your own `role`/`aria-label`) wins.
  The presence example above does exactly this.
- **An unnamed avatar is hidden rather than nameless.** With no `alt`, no `name` and no
  `status` the `role="img"` is dropped, so assistive tech does not announce an image it cannot
  describe.
- **`AvatarGroup` has no group semantics.** It is a plain `<div>` — no list role, no label, no
  count. The `+2` chip is real text and does get read, but the names it stands in for are gone
  from the accessibility tree entirely. Add your own `aria-label` to the group, or a
  visually-hidden summary, when the roster matters.

## Related

[AvatarUpload](avatar-upload.md) · [ActivityFeed](activity-feed.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
