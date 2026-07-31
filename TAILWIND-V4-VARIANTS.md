# Tailwind v4 variant reference — working notes for the CSS→utility survey

**Repo-only.** Not in `package.json` `files[]`, so it does not ship to npm. It is scaffolding for the
"can this stylesheet be deleted?" investigation, not documentation of this package's API.

**This table is a fetched summary of <https://tailwindcss.com/docs/hover-focus-and-other-states>, and
it is not the authority.** The authority is the compiler. Before writing any class string into a
component on the strength of a row below, run it through
`bun run scripts/probe-utility-exists.mjs 'the-class'` — that compiles against this repo's real
Tailwind (4.3.3) *and* `response-ui-css`, so it also answers whether a token-backed name like
`ease-shift` or `duration-shift` resolves, which the upstream docs cannot tell you. Two names on this
page have already been measured wrong against this repo by assumption: `--motion-*` tokens are in no
Tailwind namespace, so `ease-shift` and `duration-motion-duration-shift` both MISS while
`ease-(--MOTION-EASE-SHIFT)` and `duration-(--MOTION-DURATION-SHIFT)` both compile.

## Existence is not the question the survey is asking

A variant existing says nothing about whether the conversion is correct. Every candidate still has to
survive the test in `AGENTS.md` §"Decision: what stays in CSS" — in particular question 3, *would
landing in `@layer utilities` invert something?* The utility lands **above** `@layer components`, so:

- a base declaration that a modifier in the component layer must beat now wins instead
  (`.skeleton { height: 1em }` vs `.skeleton--circular { height: auto }`);
- a `> *` rule converted to `*:` starts beating the child component's own component-layer CSS;
- a blanket reset (`all: unset`) stops being first-in-rule and is sorted by Tailwind instead.

Variant-scoped utilities are safe against their own base utility on **specificity**, not order —
measured: `data-[state=open]:grid-rows-[1fr]` emits as
`.data-\[state\=open\]\:grid-rows-\[1fr\][data-state="open"]`, 0,2,0 against the base's 0,1,0.

## Pseudo-classes

| Variant | CSS |
| --- | --- |
| `hover:` | `@media (hover: hover) { &:hover }` |
| `focus:` / `focus-within:` / `focus-visible:` | `&:focus` / `&:focus-within` / `&:focus-visible` |
| `active:` `visited:` `target:` | `&:active` / `&:visited` / `&:target` |
| `first:` `last:` `only:` | `&:first-child` / `&:last-child` / `&:only-child` |
| `odd:` `even:` | `&:nth-child(odd)` / `&:nth-child(even)` |
| `first-of-type:` `last-of-type:` `only-of-type:` | `&:first-of-type` etc. |
| `nth-3:` `nth-[3n+1]:` | `&:nth-child(…)` |
| `nth-last-3:` `nth-of-type-4:` `nth-last-of-type-6:` | corresponding `:nth-*` |
| `empty:` | `&:empty` |
| `disabled:` `enabled:` | `&:disabled` / `&:enabled` |
| `checked:` `indeterminate:` `default:` | `&:checked` etc. |
| `required:` `optional:` | `&:required` / `&:optional` |
| `valid:` `invalid:` `user-valid:` `user-invalid:` | `&:valid` etc. |
| `in-range:` `out-of-range:` | `&:in-range` / `&:out-of-range` |
| `placeholder-shown:` | `&:placeholder-shown` |
| `autofill:` `read-only:` | `&:autofill` / `&:read-only` |
| `open:` | `&:is([open], :popover-open, :open)` |
| `inert:` | `&:is([inert], [inert] *)` |

## Pseudo-elements

`before:` `after:` `first-letter:` `first-line:` `marker:` (`&::marker, & *::marker`) `selection:`
`file:` (`&::file-selector-button`) `backdrop:` `placeholder:` `details-content:`

## Media & feature queries

| Variant | CSS |
| --- | --- |
| `sm: md: lg: xl: 2xl:` | `@media (width >= 40/48/64/80/96rem)` |
| `max-sm:` … `max-2xl:` | `@media (width < …)` |
| `min-[900px]:` / `max-[900px]:` | arbitrary width |
| `dark:` | `@media (prefers-color-scheme: dark)` |
| `motion-safe:` / `motion-reduce:` | `@media (prefers-reduced-motion: no-preference / reduce)` |
| `contrast-more:` / `contrast-less:` | `@media (prefers-contrast: more / less)` |
| `forced-colors:` / `not-forced-colors:` | `@media (forced-colors: active)` / its negation |
| `inverted-colors:` | `@media (inverted-colors: inverted)` |
| `pointer-fine/coarse/none:`, `any-pointer-*:` | `@media (pointer: …)` / `(any-pointer: …)` |
| `portrait:` / `landscape:` | `@media (orientation: …)` |
| `noscript:` | `@media (scripting: none)` |
| `print:` | `@media print` |
| `supports-[display:grid]:` / `not-supports-[…]:` | `@supports (…)` |
| `starting:` | `@starting-style` |

Container queries: `@3xs: @2xs: @xs: @sm: @md: @lg: @xl: @2xl: … @7xl:` → `@container (width >= …)`,
with `@max-*` counterparts and `@min-[500px]:` / `@max-[500px]:` arbitrary forms.

## Structural & relational

| Variant | CSS |
| --- | --- |
| `*:` | `:is(& > *)` — direct children |
| `**:` | `:is(& *)` — all descendants |
| `not-focus:` / `not-[…]:` | `&:not(…)` |
| `in-focus:` / `in-[…]:` | `:where(…) &` — **any ancestor**, no `.group` class needed |
| `has-[img]:` / `has-[:focus]:` | `&:has(…)` |
| `group-hover:` etc., named `group/item` + `group-hover/item:` | `&:is(:where(.group) … *)` |
| `peer-checked:` etc., named `peer/draft` + `peer-checked/draft:` | `&:is(:where(.peer) … ~ *)` |
| `group-has-[a]:` / `peer-has-checked:` | group/peer composed with `:has()` |
| `group-[.is-published]:` / `peer-[:nth-of-type(3)_&]:` | arbitrary group/peer selector |

## Attribute

`aria-busy: aria-checked: aria-disabled: aria-expanded: aria-hidden: aria-pressed: aria-readonly:
aria-required: aria-selected:` → `&[aria-…="true"]`; arbitrary `aria-[sort=ascending]:`, plus
`group-aria-[…]:` / `peer-aria-[…]:`.

`data-active:` → `&[data-active]`; `data-[size=large]:` → `&[data-size="large"]`.

`rtl:` → `&:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)`; `ltr:` the mirror.

## Arbitrary variants

`[&.is-dragging]:cursor-grabbing`, `[&_p]:mt-4` (underscore = space), `[&::before]:content-['*']`,
`[@media(hover:hover)]:text-red-500`, `[@supports(display:grid)]:grid`. Stackable in any order:
`dark:md:hover:bg-…`, `hover:not-focus:bg-…`.

## What has no variant at all

There is no variant for a **block**, which is why `@keyframes` is the one genuinely immovable thing
in this package (8 blocks across 5 files). An `@media` *inside* a keyframe step, a `@property`
registration, and a bare `:root` custom-property definition are the same shape: a utility sets
properties on an element, and these have no element.
