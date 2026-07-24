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
| `Tabs.List`  | — (plus `div` props)                                      |
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

## Theme tokens

Unlike Button, Tabs uses **no Tailwind utilities at all** — the sliding indicator needs
real rules, so everything lives in `Tabs.css` and reads the contract variables directly.
Same contract either way: override these and Tabs re-tints with the rest of the app.

| Where                 | Override                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Tab label             | `--C-TEXT-SECONDARY` at rest · `--C-TEXT-PRIMARY` on hover · `--C-ACCENT` selected · `--C-TEXT-MUTED` disabled |
| Indicator             | `--C-ACCENT` (underline, pill) · `--C-SURFACE-0` (enclosed)                                      |
| Strip border          | `--C-BORDER-DEFAULT`                                                                              |
| Hover background      | `--C-SURFACE-1` — pill and enclosed only, so it can't obscure the underline indicator            |
| Enclosed selected tab | `--C-SURFACE-0` · `--C-BORDER-DEFAULT` · `--C-TEXT-PRIMARY`                                      |
| Pill selected label   | `--C-TEXT-ON-ACCENT`, falling back to `--C-TEXT-INVERSE`                                         |
| Focus outline         | `--C-BORDER-FOCUS` · `--RADIUS-SM`                                                                |
| Corners               | `--RADIUS-MD`                                                                                     |
| Spacing               | `--R-SIZE-5` `--R-SIZE-3` (tab padding) · `--R-SIZE-6` (pill inset)                              |
| Type                  | `--BodyText-2` · `--Semibold-Weight`                                                              |
| Motion                | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`, both dropped under `prefers-reduced-motion`   |

## Gotchas

- **Sub-components must be inside `<Tabs>`.** `Tabs.Tab` and `Tabs.Panel` read context
  and throw `"Tabs compound components must be used within <Tabs>"` if they can't find
  it. Wrapping them in your own component is fine; rendering them outside the root
  isn't.
- **A `Tab` with no matching `Panel` renders a dead tab** — it selects, and nothing
  appears. The `value` strings are the contract; nothing type-checks that they pair up.
- **`Tabs` omits the native `defaultValue`** from its `div` props, so the prop always
  means the tab value.
- **Panels mount eagerly.** Every `Tabs.Panel` child renders even when hidden — expensive
  panels should lazy-load their own contents.

## Accessibility

Roving focus: one tab is in the tab order at a time, and arrow keys move between them —
the standard tab-list pattern, so keyboard users don't have to tab through every tab to
reach the panel. `aria-selected`, `aria-controls`, and the `id` wiring between tab and
panel are generated from an internal `baseId`.

A `disabled` tab keeps its place in the strip so the set of options stays legible to
screen-reader users, but cannot be selected.

## Related

`Accordion` · `Stepper` · `Wizard` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
