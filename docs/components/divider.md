# Divider

A one-pixel rule that separates content and re-tints with your theme. Horizontal by
default — a real `<hr>` — or pass `orientation="vertical"` for an in-row separator.

<!-- example:Minimal -->
```tsx
<div>
  <p>Signed in as jordan@acme.com</p>
  <Divider />
  <p>Switch account or sign out.</p>
</div>
```
<!-- /example -->

| Prop          | Type                            | Default        |
| ------------- | ------------------------------- | -------------- |
| `orientation` | `"horizontal" \| "vertical"`    | `"horizontal"` |
| `className`   | `string`                        | —              |
| `ref`         | `Ref<HTMLElement>`              | —              |
| …rest         | props of `hr` (minus `orientation`) | —          |

Orientation switches the rendered element, not just the border edge: horizontal is an
`<hr>`, vertical is a `<div role="separator">`. That is why `ref` is typed
`HTMLElement` rather than `HTMLHRElement` — see [Gotchas](#gotchas).

## Vertical

<!-- example:Vertical -->
```tsx
<div className="flex items-center gap-r3">
  <span>Draft</span>
  <Divider orientation="vertical" />
  <span>Edited 5 minutes ago</span>
  <Divider orientation="vertical" />
  <span>3 collaborators</span>
</div>
```
<!-- /example -->

The vertical rule leans on `self-stretch`, so it only shows inside a flex or grid
container that gives the row a cross-axis height. Drop it into a plain block and it
collapses to a zero-height sliver.

## Spacing

Divider adds no margin or padding — the gap around it is a layout decision, so it
doesn't guess. Space it with the parent's `gap`, or put margin on the rule itself:

<!-- example:Spacing -->
```tsx
<div>
  <p>Notifications are on.</p>
  <Divider className="my-r4" />
  <p>You can mute them per channel.</p>
</div>
```
<!-- /example -->

## Theme tokens

Divider hard-codes no colour. Its single utility resolves to a contract variable, so
overriding one variable re-tints every rule in the app at runtime with no rebuild.

| Where      | Utility                | Override            |
| ---------- | ---------------------- | ------------------- |
| Rule colour | `border-border-default` | `--C-BORDER-DEFAULT` |

The line's **thickness** is not a token: `border-t` (horizontal) and `border-l`
(vertical) are Tailwind width utilities that stamp the default 1px edge, and Tailwind's
base layer supplies the `solid` style. Restyle thickness with `border-2` and friends
via `className` — it won't move with the responsive `r`-scale, because a rule's weight
shouldn't reflow at the breakpoint.

## Gotchas

- **A vertical Divider is invisible without a sized flex/grid parent.** `self-stretch`
  only stretches a flex or grid child, and only to a cross-axis height the row already
  has. In a plain `<div>` it renders nothing.
- **No built-in spacing.** The rule sits flush against its neighbours until you add
  `gap` on the parent or margin on the Divider. This is deliberate — see
  [Spacing](#spacing).
- **`ref` is typed `HTMLElement`,** not `HTMLHRElement` or `HTMLDivElement`, because the
  element depends on `orientation`. Narrow it at the call site if you need element-specific
  methods.
- **No per-component CSS, yet both package CSS imports are still required.** There is no
  `Divider.css` — Divider is styled entirely from utility classes, and only one of them,
  `border-border-default`, maps to a `@batthewz/response-ui-css` token
  (`--color-border-default` → `--C-BORDER-DEFAULT`); `border-t`, `border-l`, and
  `self-stretch` are plain Tailwind core. Both imports are needed not because of token
  resolution but because react-components' own `styles.css` registers
  `@source "../src/**/*.{ts,tsx}"`, which is what makes Tailwind emit Divider's utility
  classes in the consumer's build — response-ui-css declares no `@source` for this
  package.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Both orientations expose the `separator` role — the horizontal `<hr>` implicitly, the
vertical `<div>` explicitly, with `aria-orientation="vertical"`. Screen readers announce
a separator either way, so the visual break is also a semantic one.

It is a static separator, not a focusable or value-adjustable one, so there is no
keyboard interaction to wire up — correct for a plain visual divider.

## Related

`Stack` · `Spacer` · `Row` · `Container` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
