# Tabs

Animated tab bar with roving focus and an indicator that slides between tabs.
Three looks — `underline`, `pill`, `enclosed`.

<!-- example:Minimal -->
```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="usage">Usage</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">How the component works.</Tabs.Panel>
  <Tabs.Panel value="usage">How to wire it up.</Tabs.Panel>
</Tabs>
```
<!-- /example -->

**Anatomy.** `Tabs` owns the selection state. `Tabs.List` is the tab strip and the
positioning context for the sliding indicator. Every `Tabs.Tab` needs a `value`, and
each one needs a `Tabs.Panel` with the **same** `value` — that string is the only thing
binding them.

| Part         | Props                                                    |
| ------------ | -------------------------------------------------------- |
| `Tabs`       | `defaultValue` · `value?` · `onValueChange?` · `variant?` |
| `Tabs.List`  | `classNames?` — see [Slots](#slots) (plus `div` props)    |
| `Tabs.Tab`   | `value` · `disabled?`                                     |
| `Tabs.Panel` | `value`                                                   |

All four also accept the props of the element they render, so `className`, `id`, and
`aria-*` pass through.

## Controlled vs uncontrolled

Uncontrolled is the default — `defaultValue` picks the initial tab and `Tabs` tracks
the rest. To drive it yourself, add `value` and `onValueChange`:

<!-- example:Controlled -->
```tsx
<Tabs defaultValue="overview" value={tab} onValueChange={setTab}>
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="usage">Usage</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Selected: {tab}</Tabs.Panel>
  <Tabs.Panel value="usage">Selected: {tab}</Tabs.Panel>
</Tabs>
```
<!-- /example -->

**`defaultValue` is required either way.** It is not `defaultValue`-or-`value` as in
some libraries — the root always needs it, and controlling the component adds `value`
on top rather than replacing it.

**The mode is settled on the first render and never revisited.** `value` defined on that
render makes the tabs controlled for the instance's life; `value` `undefined` on it makes
them uncontrolled for the instance's life. A later `undefined` on a controlled root falls
back to `defaultValue` rather than switching mode, so `value={tab ?? undefined}` stays
controlled — and a `value` that first appears after mount is ignored. See
[Gotchas](#gotchas).

## Variants

`underline` (default), `pill`, and `enclosed` change the strip's look. The indicator
animates between tabs in all three.

<!-- example:Enclosed -->
```tsx
<Tabs defaultValue="a" variant="enclosed">
  <Tabs.List>
    <Tabs.Tab value="a">First</Tabs.Tab>
    <Tabs.Tab value="b">Second</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="a">First panel.</Tabs.Panel>
  <Tabs.Panel value="b">Second panel.</Tabs.Panel>
</Tabs>
```
<!-- /example -->

## Disabled tabs

<!-- example:DisabledTab -->
```tsx
<Tabs defaultValue="a">
  <Tabs.List>
    <Tabs.Tab value="a">Available</Tabs.Tab>
    <Tabs.Tab value="b" disabled>
      Coming soon
    </Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="a">Available panel.</Tabs.Panel>
  <Tabs.Panel value="b">Never reachable by click.</Tabs.Panel>
</Tabs>
```
<!-- /example -->

## Slots

Every part of Tabs is a subcomponent with its own `className`, except one: the marker that
slides under the active tab. `Tabs.List` reaches it through `classNames`. Class strings only,
and the key is typed, so a misspelled one is a compile error rather than a prop that does
nothing.

| Slot        | Element                | What it addresses                                       |
| ----------- | ---------------------- | ------------------------------------------------------- |
| `indicator` | `span.tabs-indicator`  | the sliding marker, beside its `--underline`/`--pill`/`--enclosed` modifier |

```tsx
<Tabs.List classNames={{ indicator: "rounded-none" }}>…</Tabs.List>
```

The marker's `transform` and `width` are measured from the active tab and written as inline
style on every layout pass, so a class here changes how it looks and never where it is.

## Theme tokens

Tabs paints in Tailwind utilities written in `Tabs.tsx`, each resolving to a contract
variable. `Tabs.css` keeps two things and says why at source: **the strip's own box**, whose
`overflow-x: auto` is what `probe:cascade-layer` reads three scrollbar control rows off, and
which the three edge-fade `mask-image` rules paint on; and **`all: unset` on the tab**, which
has to come first in its rule and has to lose to a class you pass. Override a variable and
Tabs re-tints with the rest of the app — and because the utilities sit in `@layer utilities`,
a `className` or `classNames` of your own beats every one of them.

| Where                 | Utility                                                                       | Override                                                                                        |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tab label             | `text-fg-secondary` · `hover:not-disabled:text-fg-primary` · `text-accent` · `disabled:text-fg-muted` | `--C-TEXT-SECONDARY` at rest · `--C-TEXT-PRIMARY` on hover · `--C-ACCENT` selected · `--C-TEXT-MUTED` disabled |
| Indicator             | `bg-accent` (underline, pill) · `bg-surface-0` (enclosed)                     | `--C-ACCENT` · `--C-SURFACE-0`                                                                   |
| Strip border          | `border-border-default`                                                       | `--C-BORDER-DEFAULT`                                                                              |
| Hover background      | `hover:not-disabled:bg-surface-2` — pill and enclosed only, so it can't obscure the underline indicator | `--C-SURFACE-2`                                         |
| Enclosed selected tab | `bg-surface-0` · `border-border-default` · `text-fg-primary`                  | `--C-SURFACE-0` · `--C-BORDER-DEFAULT` · `--C-TEXT-PRIMARY`                                      |
| Pill selected label   | `text-[var(--C-TEXT-ON-ACCENT,var(--C-TEXT-INVERSE))]`                        | `--C-TEXT-ON-ACCENT`, falling back to `--C-TEXT-INVERSE`                                         |
| Focus outline         | `focus-visible:outline-border-focus` · `focus-visible:rounded-sm`             | `--C-BORDER-FOCUS` · `--RADIUS-SM`                                                                |
| Corners               | `rounded-md`                                                                  | `--RADIUS-MD`                                                                                     |
| Spacing               | `py-r5` · `px-r3` (tab padding) · `pt-r3` (panel)                             | `--R-SIZE-5` · `--R-SIZE-3`                                                                       |
| Type                  | `text-body-2` · `font-semibold`                                               | `--BodyText-2` · `--BodyText-2-line-height` · `--Semibold-Weight`                                 |
| Motion                | `duration-[var(--MOTION-DURATION-SHIFT)]` · `ease-[var(--MOTION-EASE-SHIFT)]`, both dropped under `prefers-reduced-motion` | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`     |
| Pill indicator inset  | `top-r6` · `bottom-r6`                                                        | `--R-SIZE-6`                                                                                      |
| Enclosed tab corners  | `rounded-t-md`                                                                | `--RADIUS-MD`                                                                                     |

The BEM class names (`.tabs-tab`, `.tabs-indicator--pill`, …) are all still emitted, and
those the two surviving rules do not use are now **declaration-free markers**, so a consumer
stylesheet, devtools and the Astro/Rails consumers of `response-ui-css` still have one name
per part.

**`hover:` compiles to `@media (hover: hover) { &:hover }`**, so the hover tints no longer
paint on a coarse pointer. That matches the rest of the package.

The hover wash is on the recessed side of the ramp on purpose. The `enclosed` selected tab
claims `--C-SURFACE-0`, the raised rung, so an unselected tab's hover has to sit at rung 2 to
read as *not* selected; a raised hover would say the opposite.

## Gotchas

- **The tab strip's scrollbar is the app's, not the component's.** `Tabs.css` used to shrink it
  to a 3px hairline and hide the thumb until hover; those rules are gone. `response-ui-css`
  styles `*::-webkit-scrollbar*` universally and unlayered, so from `@layer components` none of
  them could win in any state, and keeping them would have meant `!important` on a
  pseudo-element — which no consumer stylesheet, and not even an inline `style`, can beat. The
  overflow cue is the mask gradient that fades the strip's edges, which is unchanged. Restyle the
  scrollbar app-wide from your own CSS if you want it narrower.
- **Sub-components must be inside `<Tabs>`.** `Tabs.Tab` and `Tabs.Panel` read context
  and throw `"Tabs compound components must be used within <Tabs>"` if they can't find
  it. Wrapping them in your own component is fine; rendering them outside the root
  isn't.
- **A `Tab` with no matching `Panel` renders a dead tab** — it selects, and nothing
  appears. The `value` strings are the contract; nothing type-checks that they pair up.
- **`Tabs` omits the native `defaultValue`** from its `div` props, so the prop always
  means the tab value.
- **Selecting the tab you are already on calls nothing.** `onValueChange` reports *changes*
  of selection, not presses: click the active tab, or arrow back onto it, and the handler
  does not fire. If you were using it as a "the user pressed a tab" signal — a refetch, an
  analytics event, a scroll-to-top — that call is gone, with nothing to mark its absence.
  Put the side effect on the tab's own `onClick`, which composes with the selection rather
  than replacing it.
- **The controlled/uncontrolled mode is fixed at mount, and both directions fail quietly.**
  A `<Tabs value={tab}>` with no `onValueChange`, or a handler that ignores the value, is
  frozen — clicking a tab selects nothing, because there is no internal state to fall back
  on. A `<Tabs>` that mounts without `value` ignores one supplied later, so a tab driven
  from an async source never takes. Pass `value` from the first render or not at all;
  `value={tab ?? undefined}` keeps whatever the first render decided.
- **Panels do not mount eagerly.** A `Tabs.Panel` renders only while it is active or animating
  out; otherwise it returns `null`. So panel state is discarded when you switch away — hoist
  anything that must survive a tab change, and expect a panel's effects to re-run on return.

## Accessibility

Roving focus: one tab is in the tab order at a time, and arrow keys move between them —
the standard tab-list pattern, so keyboard users don't have to tab through every tab to
reach the panel. `aria-selected`, `aria-controls`, and the `id` wiring between tab and
panel are generated from an internal `baseId`.

A `disabled` tab keeps its place in the strip so the set of options stays legible to
screen-reader users, but cannot be selected.

## Related

[Accordion](accordion.md) · [Stepper](stepper.md) · [Wizard](wizard.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
