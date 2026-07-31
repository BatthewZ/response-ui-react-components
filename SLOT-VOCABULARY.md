# Slot vocabulary — frozen

Closes `PLAN-overridability.md` §10 (**▲ ONE-WAY DOOR**) and the §9 blocker *"sequence+tabular and
layout+media are not [settled], and Phase 3 cannot start for those two until they are."*

**Status: frozen, with four owner decisions folded in and two items still open.**

| # | Decision | Where it lands |
| --- | --- | --- |
| 1 | **`MultiSelect` becomes a compound** — `.Content`/`.Item`/`.ItemIndicator`/`.Empty`/`.Tag`/`.TagRemove`. Taken **against** this document's recommendation of (c). | §7.1, §8.1, §10.1, §11 |
| 2 | **`Breadcrumbs.Separator` → `.Divider`.** | §1.5a, §6, §7.4, §8.5 |
| 3 | **`DropdownMenu.Label`/`ContextMenu.Label` → `.GroupHeader`**, class `menu-group-header`. | §6, §7.3, §8.8 |
| 4 | **`arrowRef` is covered** — the arrow element is rendered and positioned. | §3, §3.3, §4, §6, §7.3 |

Decisions 1 and 4 each reverse a ruling this document argued for. **Neither argument has been
deleted**: both are kept where they were made, marked resolved-against, with the reason (plan §13,
`memory/README.md` §20). Nothing in the body is superseded — a lane can read top-to-bottom.

**Still open (§14.2):** `MultiSelectOption` vs `CommandItem`, and — new, as a direct consequence of
decision 1 — whether `CommandPalette` follows `MultiSelect` into (d).

**Greenfield, verified:**

```
grep -rn classNames src/components | wc -l      # 0
```

Nothing here can break a consumer today. Everything here is permanent the moment Phase 3 ships.

**This document does not depend on Phase 1 being done, and does not license starting Phase 3.**
§0 constraint 2 stands: `classNames` is an invalid API until `@layer components` lands. A frozen
vocabulary is a precondition for fan-out, not a substitute for the precondition Phase 1 owns.

**Scope of this pass:** read-only. No `.css`, `.tsx` or `.ts` file was edited.

---

## 0. How to read this document

- **Every number carries the command or the `file:line` that reproduces it.** A bare number here is
  a defect here.
- **Names, not counts.** Where the plan counted, this document enumerates
  (`memory/README.md` §5).
- **§15 is the important section.** Eleven claims in the plan did not survive re-measurement, and
  three of them would change what a lane builds. Read §15 before §11.
- Where the plan and the source disagree, the source wins and the disagreement is recorded rather
  than smoothed over.

---

## 1. The naming rules

A lane agent needs no judgement to apply these.

### 1.1 Casing: **camelCase**

`itemIcon`, `itemIndicator`, `groupHeader`, `tagRemove`. Single-word names (`control`, `panel`,
`icon`, `item`, `track`, `fill`) are identical in camelCase and lowercase, so **the plan is not
actually inconsistent** — §10 writes `itemIndicator` (two words, camel) and §4a/§4b write
`control`/`panel`/`icon` (one word each). There is nothing to reconcile; there is only a convention
to state. It is camelCase.

Class-name literals stay **kebab-case** (`multiselect-control`, `command-palette-group-header`).
Slot keys and class names are different namespaces and do not have to match in casing — only in
stem.

### 1.2 Singular, with one stated exception

A slot name is **singular**. A **plural** name denotes a container whose children the consumer
supplies, and is legal only when the singular of the same stem is not also a slot on the same
component.

Legal today: `actions` (`empty-state__actions` `EmptyState.tsx:119`,
`file-upload__preview-actions` `FileUpload.tsx:709`, `app-shell-navbar-actions`
`AppShell.tsx:174`) — no component has an `action` slot. `action` (`media-card__action`
`MediaCard.tsx:126`) — MediaCard has no `actions` slot. Both are legal; neither collides.

Illegal today: `titles` (`swimlane__titles` `Swimlane.tsx:52`) — plural of a stem that *is* a slot
(`title`, `Swimlane.tsx:53`). Renamed to `titleGroup` (§1.6).

### 1.3 A slot on a repeated element

Three separate questions, three separate answers:

| Question | Answer |
| --- | --- |
| The element **is** the repeated unit | slot `item`; the class stays on every instance |
| The element is **inside** the repeated unit | prefix `item`: `itemIcon`, `itemIndicator`, `itemRemove` |
| The consumer wants different **content** inside the unit, not a different class | not a slot — a render prop (§5 (e)) |

A slot on a repeated element **applies to every instance**. That is documented in the slots table,
not encoded in the name. §5's `CalendarBase` precedent already uses this category
("3 applied-to-every-instance"), so it is established, not invented.

**One documented override.** Where a component's *public prop vocabulary* already names the
repeated unit, the slot uses that word instead of `item`. `TagInput` gets `tag`/`tagRemove`, not
`item`/`itemRemove`, because `TagRejection` (`TagInput.tsx:23`), `maxTags` (`:59`) and `validateTag`
(`:60`) already spend the word. This is §10's own reasoning for banning `chip`, applied
consistently.

### 1.4 No `classNames.root`, no `$` prefix

§4a. `className` is the root, full stop — two writers for one element is `CLAUDE.md` rule 3. The
keys are already in their own namespace, so a sigil buys nothing.

### 1.5 The same name for the same concept across families

This is the rule §10 exists to enforce. §6 is the frozen cross-family table. A family table may:

- **use a name from §6** — mandatory wherever the concept is in §6, and a synonym is a defect; or
- **use a family-owned name** for a concept that exists in exactly one family and nowhere else
  (`hue`, `hex`, `pickerCell`, `sortIcon`, `connector`, `overflow`). Family-owned names are marked
  as such in §7 and are the lane's to choose — **but the moment a second family needs the same
  concept, the name is promoted to §6 and both families use it.** That promotion is what stops the
  §10 failure recurring one family at a time.

Adding a row to §6 — i.e. declaring a concept cross-family — is an owner decision, not a lane's.

### 1.5a §10's `Content`-or-`panel` rule generalises

§10 states it for one pair: *"A component gets `Content` the subcomponent **or** `panel` the slot,
never both."* **The rule is general and must be read that way**, or a lane will hand `EmptyState` an
`icon` slot beside the `EmptyState.Icon` that already ships.

> **A component gets `X` the subcomponent or `x` the slot for a given element — never both.** The
> subcomponent's own `className` already reaches it, so a slot would be a second writer for one
> element (`CLAUDE.md` rule 3).

Live consequences, verified: no `icon` slot on `EmptyState` (`EmptyState.tsx:62`, `EmptyState.Icon`)
or `StatCard` (`StatCard.tsx:259`, `StatCard.Icon`); no `panel` slot on `Tabs` (`Tabs.Panel`); no
`track` slot on `Carousel` (`Carousel.Track`); no `divider` slot on `DropdownMenu`/`ContextMenu`
(`.Divider`) or `Breadcrumbs` (`.Divider`, renamed from `.Separator` — decision 2, §8.5); no `item`
slot on Accordion, Timeline, ActivityFeed, Carousel, Breadcrumbs, MasonryGrid (`.Item`) or Stepper
(`.Step`); no `value`/`label` slot on `ProgressBar` (`.Value`/`.Label`); no `groupHeader` slot on
`DropdownMenu`/`ContextMenu` (`.GroupHeader`, renamed from `.Label` — decision 3, §8.8).

**And, from decision 1:** no `panel`, `item`, `itemIndicator`, `empty`, `tag` or `tagRemove` slot on
`MultiSelect` — `.Content`, `.Item`, `.ItemIndicator`, `.Empty`, `.Tag` and `.TagRemove` ship
(§10.1). Those six keys are **removed** from §7.1, not annotated: a slot table that still lists them
is the two-writers defect this rule exists to prevent.

### 1.6 Deriving a name

In priority order:

1. **A class-name stem already in the source, used by ≥2 components.** (`control`, `input`, `item`,
   `list`, `icon`, `panel`, `empty`, `title`, `description`, `fill`, `track`, `thumb`, `indicator`,
   `body`, `header`, `footer`, `overlay`, `value`, `preset`.)
2. **A stem already in the source once, where no competitor exists.** (`viewport`, `loading`,
   `connector`, `scrim`, `groupHeader`.)
3. **A stem already spent by this package's *token* names.** (`gutter`, from
   `--_activity-feed-gutter` and the `--_timeline-…-gutter` derivation chain, §4c.)
4. **Only then invent** — and record the invention in §6 with its reason. Exactly **one** name
   here is invented: `titleGroup`.

### 1.7 A slot is not the default answer

§6 Phase 3: *"A lane that 'fixes' a non-gap costs more than one that misses a real one, because the
fix lands in public API."* Run §5's triage first. A bare static class on an element no caller
`className` can reach, whose value a consumer would not vary, is **(a) and correct as it stands** —
see §11 for the eleven elements ruled (a) in this pass.

---

## 2. The families

**Derivation.** `src/components/*` gives seven directories; §9's hard-dependency clusters cut across
three of them (`CalendarBase`+`Calendar`+`RangeCalendar` in `ui/` with `DatePicker`+`DateRangePicker`
in `form/`; `ActivityFeed` in `data-display/` with the `ui/` sequence components; `DescriptionList`
in `data-display/` with `ui/Table`). Directories alone therefore cannot be the lane unit. Families
are directories cut by cluster and by shared class-name stem.

```
find src/components -maxdepth 2 -name '*.tsx' ! -name '*.test.tsx' ! -name '*.examples.tsx' | wc -l
# 95        — reproduces §2c exactly: 281 total − 96 test − 90 examples
find src/components -name '*.tsx' | wc -l           # 281
find src/components -name '*.test.tsx' | wc -l      #  96
find src/components -name '*.examples.tsx' | wc -l  #  90
# modules with a sibling .css: 46          (reproduces §2c)
```

**Ten families, partitioning all 95 modules.** §9 names four of them; the last three it does not
name at all (§15.1).

| # | Family | §9's name | Modules | n |
| --- | --- | --- | --- | --- |
| 1 | **form** | `form` — §9 "settled" | `form/`: Checkbox, ColorPicker, Combobox, Field, FieldError, FormActions, Input, Label, MultiSelect, NumberInput, OTPInput, Radio, RangeSlider, Repeater, SearchInput, Select, Slider, Switch, TagInput, Textarea, use-form · `ui/`: FileUpload | 22 |
| 2 | **date** | *(§9 cluster 1, folded into "form")* | `ui/`: CalendarBase, Calendar, RangeCalendar · `form/`: DatePicker, DateRangePicker (+ `form/date-picker-internals.ts`) | 5 |
| 3 | **overlay** | `overlay` — §9 "settled" | `ui/`: Dialog, Drawer, Popover, HoverCard, Tooltip, DropdownMenu, ContextMenu, menu-internals, CommandPalette, Toast, ToastContext, Portal (+ `ui/floating-motion.ts`) | 12 |
| 4 | **sequence** | `sequence` — **unsettled** | `ui/`: Accordion, Collapsible, Tabs, Stepper, Wizard, Breadcrumbs, Pagination, Timeline, Carousel, Swimlane · `data-display/`: ActivityFeed | 11 |
| 5 | **tabular** | `tabular` — **unsettled** | `ui/`: Table, DataTable, VirtualizedDataTable · `data-display/`: DescriptionList (+ `ui/data-table-utils.ts`) | 4 |
| 6 | **layout** | `layout` — **unsettled** | `layout/`: Center, Container, Divider, Grid, Row, Spacer, Stack · `ui/`: MasonryGrid, AppShell, Card | 10 |
| 7 | **media** | `media` — **unsettled** | `ui/`: Hero, Spotlight, MediaCard, Avatar (+ `AvatarGroup`, same file), AvatarUpload, Skeleton · `animation/`: AnimatePresence, Parallax, ScrollReveal, Stagger, ViewTransition | 11 |
| 8 | **status** | *(unnamed by §9)* | `ui/`: ProgressBar, Rating, StatCard, EmptyState, Alert, Spinner · `data-display/`: ProgressRing, Meter, Sparkline | 9 |
| 9 | **primitive** | *(unnamed by §9)* | `ui/`: Button, IconButton, Badge, Kbd, Text, CodeBlock, CopyButton, ThemeSwitcher | 8 |
| 10 | **non-visual** | *(unnamed by §9)* | `ui/`: ErrorBoundary · `guards/`: RequireAuth · `router/`: router-adapter | 3 |

`22+5+12+11+4+10+11+9+8+3 = 95`.

**Why `date` is its own family and not part of `form`.** Its entire vocabulary is `calendar-*`
(17 class names, §7.2) and shares nothing with the form control stems. §9's cluster 1 correctly
forces all five modules into **one lane**; that is a lane constraint, not a vocabulary one. Both
statements hold: one lane, two vocabularies.

**Family 10 has no slot surface at all** and needs no table: `ErrorBoundary`, `RequireAuth` and
`router-adapter` render no element carrying a class literal.

---

## 3. The ban list — every reason re-verified at source

§10's list, each reason checked. **Three reasons did not survive** and are corrected in place; the
bans still stand, with the corrected scope.

| Banned | §10's reason | Verified? | Verdict |
| --- | --- | --- | --- |
| `root` | §4a — `className` is the root | ✔ | **Stands.** §4a rule 1, unchanged. |
| `wrapper`, `container`, `outer`, `box` | the four names lanes would invent for `control` | ✔ | **Stands.** Live instances a lane would name this way: `table-wrapper` (`Table.tsx:93`), `combobox-input-wrap` (`Combobox.tsx:295`), the three bare `className="relative"` boxes (`Select.tsx:30`, `NumberInput.tsx:170`, `DatePicker.tsx:285`), `TagInput.tsx:378`'s classless `<div>`. |
| `box` — carve-out | permitted for `OTPInput`'s N entry boxes | ✔ | **Stands.** `OTPInput.tsx:209-238` — `Array.from({length}, …)` generating N `<input>`, each with a bare `cn(…)` at `:225` and **no `className` parameter**, so no override path. |
| `content` | reserved as a compound subcomponent name — `Combobox.Content` ships | ✔ for the rule, ✘ for the anchor | **Stands.** The `Object.assign` block is `Combobox.tsx:538-543`, `Content:` on `:540` — the plan's `537-542`/`:539` is **off by one** (§15.11). Ten components ship `.Content`: Combobox, Popover, HoverCard, DropdownMenu, ContextMenu, Accordion, Collapsible, MediaCard, Hero, Spotlight. **`MultiSelect.Content` makes eleven** (decision 1, §10.1). |
| **`label`** | 30 distinct `*Label` props; collides with the exported `Label` | ✔ **30 reproduces exactly** | **Stands.** See §3.1. |
| `chip` | `TagInput`'s vocabulary is already "tag" | ✔ | **Stands**, and the reason is stronger than stated: `TagRejection` (`TagInput.tsx:23`), `maxTags` (`:59`), `validateTag` (`:60`), `removeAnnouncement(tag, count)` (`:70`). See §3.2 for a doc-side wrinkle. |
| `adornment`, `prefix`/`suffix` | MUI vocabulary; these elements are `icon` + `affordance` here | ⚠ partly | **Stands, reason corrected.** `icon` is real (§6). **`affordance` is prose, not vocabulary**: `grep -rn affordance src/components \| grep -v '\.test\.\|\.examples\.' \| wc -l` → **9**, every one a comment or docblock (`MultiSelect.tsx:283`, `FileUpload.tsx:31`, `SearchInput.css:32`, `Combobox.css:22`, `Radio.css:35`, `ColorPicker.css:95,97`, `Popover.css:23`, `MediaCard.css:17`), and `grep -rnE 'affordance[a-zA-Z]*\?:\|"[a-z-]*affordance' src/components` → **0**, so it is never a class name or a prop name. The elements §10 means are `combobox-toggle` (a `<button>`, `Combobox.tsx:341-347`) and `search-input__clear` (`SearchInput.tsx:120`); the frozen names are `toggle` and `clear` (§6). **`affordance` is added to the ban list** (§3.6) — it is the package's word for *what an element is for*, not for any element. |
| `announcer` | `sr-only role="status"` regions; exposing invites dropping `sr-only`; **(a)** | ✔ **exact** | **Stands.** `TagInput.tsx:471`, `Repeater.tsx:308`. Two more of the same shape found and ruled (a) the same way: `CommandPalette.tsx:411`, `AvatarUpload.tsx:331`, plus `Toast.tsx:185`, `StatCard.tsx:150`, `Rating.tsx:237`, `Skeleton.tsx:48`, `FileUpload.tsx:801`, `Table.tsx:290`. |
| `arrow` | **"No such element is rendered."** | ✘ **false**, and **decision 4 falsifies it a second way** | **Ban narrowed, not upheld.** `arrow` is banned as a name for a *direction control* (Carousel/Pagination — the frozen names are `prev`/`next`/`first`/`last`) and is **granted to the floating-surface pointer element** that decision 4 makes real. See §3.3 and §4. |
| `backdrop`/`scrim` | `::backdrop` takes no class; **(b) token** | ✘ **false for `scrim`** | **`backdrop` stands; `scrim` is unbanned** — see §3.4. |
| `header`/`footer`/`closeButton` | `Dialog`/`Drawer` render `{children}` only | ✔ for the premise, ✘ for the scope | **Scope corrected to the overlay family** — see §3.5. |

### 3.1 The `label` re-check — 30 reproduces, and the method matters

```
grep -rhoE '^\s+[a-z][a-zA-Z]*Label\?:' src/components | sort -u | wc -l      # 30
```

**30, exactly as §10 states.** It is also 30 with test and example files excluded, so the figure is
not inflated by fixtures:

```
for f in $(grep -rlE '^\s+[a-z][a-zA-Z]*Label\?:' src/components \
           | grep -v '\.test\.\|\.examples\.'); do \
  grep -hoE '^\s+[a-z][a-zA-Z]*Label\?:' "$f"; done | sort -u | wc -l          # 30
```

**Method, stated because the number depends on it:** distinct *prop names* matching an **optional**
camelCase `*Label` declaration at the start of an indented line, deduped across 27 files. Named in
full: `addLabel`, `areaLabel`, `backLabel`, `brightnessLabel`, `charLabel`, `clearLabel`,
`copiedLabel`, `dismissLabel`, `finishLabel`, `hexLabel`, `hueLabel`, `listLabel`, `loadingLabel`,
`maxLabel`, `minLabel`, `moveDownLabel`, `moveUpLabel`, `nextLabel`, `panelLabel`, `prevLabel`,
`removeFileLabel`, `removeLabel`, `rowLabel`, `saturationLabel`, `searchLabel`, `sortLabel`,
`statusLabel`, `todayLabel`, `toggleLabel`, `viewAllLabel`.

**What the method excludes, and why the ban is stronger than 30 suggests:** it misses required
(non-optional) and bare `label` declarations. There are three more, all meaning *accessible name* or
*display text*: `MultiSelect.tsx:29` (`MultiSelectOption.label`), `CalendarBase.tsx:147`,
`CommandPalette.tsx:22` (`CommandItem.label`). And the exported component collides directly:
`src/components/form/index.ts:48` → `export { Label } from "./Label";`.

**`label` is banned as a slot name in every family.** Existing class names using the stem
(`progress-bar__label` `ProgressBar.tsx:146`, `stat-card__label` `StatCard.tsx:172`,
`dropdown-menu-label` `menu-internals.tsx:408`, `app-shell-sidebar-link-label` `AppShell.tsx:401`,
`command-palette-option-label` `CommandPalette.tsx:367`, `calendar-label` `CalendarBase.tsx:657`)
keep their class names under §12's retention rule, but **none of them gets a slot named `label`.**
Their slots are `value`, `title`, `groupHeader`, `itemLabel` and `title` respectively — see §6.

### 3.2 `chip` — the ban stands, but the docs disagree with the code

`MultiSelect`'s **class names** say tag (`multiselect-tag` `MultiSelect.tsx:299`,
`multiselect-tag__remove` `:307`). Its **doc** says chip throughout:

```
grep -c chip docs/components/multi-select.md        # 21   (lines containing it)
grep -o chip docs/components/multi-select.md | wc -l  # 23 (occurrences)
```

Quote whichever you like, never mixed. Sites include `:3` ("a chip-filled control"), `:5`, `:64`,
`:74`, `:136`, `:179`, `:248`, `:333`, `:342`, `:345`, `:367-372`, `:397`, `:404-406`, `:418`. So
the package already ships two words for one thing, in prose. The slot vocabulary is `tag`, and this
is not a licence to reopen the name.

**Decision 1 moves this out of Phase 5.** It was a doc item while the mismatch was prose-against-a-
class; `MultiSelect.Tag` (§10.1) makes it prose-against-an-exported-component, which is worse, so it
belongs to the Phase 3 lane that ships the subcomponent.

### 3.3 `arrow` — §10's stated reason was false, and decision 4 removes the replacement's scope

§10: *"No such element is rendered."* **Refuted.** `Carousel.tsx:180` and `:199` render

```tsx
className="carousel-arrow carousel-arrow--prev"   // :180
className="carousel-arrow carousel-arrow--next"   // :199
```

and `Carousel.css` defines `.carousel-arrow`, `.carousel-arrow--prev`, `.carousel-arrow--next`.

**What was actually true** was narrower and stated at source: no *floating surface* rendered an
arrow. `use-floating.ts:29` adds the middleware only when given an `arrowRef`
(`…(arrowRef ? [arrow({ element: arrowRef })] : [])`), and `docs/components/popover.md:85` says
*"`Popover` passes none, so there is no arrow element and nothing to position."*

**This document's ruling was: `arrow` stays banned on a new reason** — it names a *glyph*, not a
role, and the element it would name has two roles a consumer wants to address separately.

**Resolved-against, in part, by decision 4.** The owner ruled that `arrowRef` is *covered*: the
arrow element is rendered and positioned (§4). The premise "no such element is rendered on a
floating surface" is therefore not merely false about `Carousel` — it is now false about the
surfaces §10 was actually talking about, and a ban list saying otherwise would contradict the
decision.

**Final ruling, and it is a narrowing rather than an un-ban:**

| Element | `arrow` legal? | Frozen name |
| --- | --- | --- |
| a stepping control (`carousel-arrow--prev/--next` `Carousel.tsx:180,199`; `pagination__nav` ×4) | **No** — one glyph, four roles (§8.4) | `prev`, `next`, `first`, `last` |
| the pointer triangle on a floating surface (decision 4) | **Yes** | `arrow` (§6, overlay-family-owned) |

The surviving half of the original reason is what draws the line: a name that describes a *glyph*
cannot serve elements whose *roles* differ, and `prev`/`next`/`first`/`last` are four roles. The
floating pointer is one role, and "arrow" is its name in floating-ui, in every peer library, and in
this package's own hook parameter (`arrowRef`). `Carousel.css`'s class names are retained per §12;
only the slot key is frozen here.

§10's `arrowRef` note is confirmed and unchanged: `use-floating.ts:17,23,29`, exported via
`src/hooks/index.ts:10`, documented at `docs/components/popover.md:85`. Public API, not dead code —
and after decision 4, public API that does something.

### 3.4 `scrim` — unbanned. A real element exists and has no override path

§10: *"`::backdrop` takes no class. **(b) token** — `--OVERLAY-SCRIM-COLOR` exists in
`response-ui-css/src/tokens/overlay.css:2`."* The token is confirmed exact (`:2` is
`--OVERLAY-SCRIM-COLOR: oklch(0 0 0 / 0.5);`). The **reason is true only for `Dialog`/`Drawer`**,
which use a native `<dialog>` and its `::backdrop` (`Dialog.tsx:62-69`, `Drawer.tsx:63`).

`AppShell` renders a **real element**:

```tsx
<div className="app-shell-scrim" aria-hidden="true" />     // AppShell.tsx:275
```

styled by `AppShell.css:219-…` and `:291`. It has no override path of any kind.

**Ruling.** `backdrop` stays banned (nothing can carry it). **`scrim` is the frozen name for a
dimming layer that is a real element**, and `AppShell` gets `classNames.scrim` — **(c)**. The `(b)`
token ruling applies to `::backdrop` only.

### 3.5 `header`/`footer` — banned in the overlay family only, not package-wide

The premise is confirmed: `Dialog` (`Dialog.tsx:62-69`) and `Drawer` (`Drawer.tsx:63`) render
`{children}` inside the `<dialog>` with no chrome of their own, so there is no header, footer or
close button to name.

But **six live elements outside that family** carry the stems, all rendered by the component:
`calendar-header` (`CalendarBase.tsx:648`), `calendar-footer` (`:673`), `code-block-header`
(`CodeBlock.tsx:69`), `swimlane__header` (`Swimlane.tsx:51`), `wizard__footer`
(`Wizard.tsx:233`), `command-palette-group-header` (`CommandPalette.tsx:438`).

**Ruling.** `header` and `footer` are **frozen names, legal outside the overlay family**, and
**banned inside it** — in `Dialog`/`Drawer` they would name structure the consumer supplies.
`closeButton` stays banned everywhere: no component renders one (`Toast`'s dismiss is an
`IconButton` named by `dismissLabel`, `Toast.tsx:195`; the frozen name is `dismiss`).

### 3.6 New bans found in this pass

Each is a name a lane would plausibly invent, or a live synonym that must lose.

| Banned | Because | Use instead |
| --- | --- | --- |
| `separator` | `Breadcrumbs.Separator` (`Breadcrumbs.tsx:210`) and `DropdownMenu.Divider`/`ContextMenu.Divider` (`DropdownMenu.tsx:105`, `ContextMenu.tsx:136`) were **two shipped words for one concept**, and `Divider` is also a top-level export (`src/components/layout/Divider.tsx`). Two-to-one plus a top-level component settled it. **§8's proposed class name `menu-separator` is wrong** and would make it three. **Decision 2 removes the last shipped instance**: `Breadcrumbs.Separator` → `.Divider` (§8.5). The word is now banned everywhere with nothing left using it. | `divider` |
| `option` | `command-palette-option*` (5 classes, `CommandPalette.tsx:352-369`) against six `-item` classes elsewhere. `role="option"` is an ARIA role, not an element identity. | `item` |
| `aside`, `node` | `activity-feed-aside` (`ActivityFeed.tsx:70`) and `timeline-node` (`Timeline.tsx:183`) are two names for one concept — the fixed track holding the marker. `aside` is an HTML element name; `node` is DOM jargon. | `gutter` (reserved; §11 rules both instances **(a)**, so no component takes the slot yet) |
| `subtitle` | `swimlane__subtitle` (`Swimlane.tsx:54`) against `stepper-description` (`Stepper.tsx:184`) and `empty-state__description` (`EmptyState.tsx:101`). One concept: secondary text under the title. | `description` |
| `titles` | Plural of a stem that is itself a slot on the same component (`swimlane__titles` `Swimlane.tsx:52` beside `swimlane__title` `:53`). Violates §1.2. | `titleGroup` |
| `inner` | `accordion-content-inner` (`Accordion.tsx:283`), `collapsible-content-inner` (`Collapsible.tsx:141`), `data-table-expanded-inner` (`DataTable.tsx:590`). Same failure mode as the banned `outer`. Both Accordion/Collapsible instances are ruled **(a)** in §11, so nothing needs the name. | — |
| `nav` | `pagination__nav` on **four** structurally distinct controls (`Pagination.tsx:120, 133, 186, 199`), and `<nav>` is a landmark element. One class, four roles. | `first`/`prev`/`next`/`last` |
| `affordance` | §10 offers it as the *replacement* for `adornment`/`prefix`/`suffix`, but it is not an element name in this package — 9 production occurrences, all prose, 0 as a class or prop (§3). It names *what an element is for*, so every control has one and it identifies nothing. | `toggle`, `clear`, `chevron`, `icon` — whichever the element actually is |
| `slot` | `progress-ring__slot` (`ProgressRing.tsx:80`) is the only use, and §4a bans `slots` as a *prop* name for the same reason: it means content slots in react-aria and component substitution in MUI. A slot key called `slot` is unreadable. | `center` (§7.8) |
| `slots`, `slotProps` | §4a — `slots` means content slots in react-aria and component substitution in MUI; a general `slotProps` invites wiring `onClick` into internals. | `classNames` + a named `<thing>Props` hatch (§13) |
| `check`, `checkmark` | `multiselect-item__check` (`MultiSelect.tsx:409`) names the glyph, not the role; the element is present whether or not the glyph is (§8.1). Unchanged by decision 1 — the element becomes the subcomponent `MultiSelect.ItemIndicator`, so the concept keeps its one word and only the mechanism changes. | `itemIndicator` — as a slot key **or** as the `.ItemIndicator` subcomponent name |
| `star` | `rating-star*` (`Rating.tsx:73-76`) — glyph-named, and `Rating` is not necessarily stars. All ruled **(a)** in §11. | — (concept is `item` + `fill` if ever needed) |

---

## 4. `arrowRef` — **decision 4: covered.** The anatomy, so Phase 3 does not re-decide

§10 framed the choice as *"cover it or document it as unsupported"*, and this document declined to
make it. **The owner chose cover.** What follows is the whole specification; a lane implements it
without reopening anything.

**The defect being closed, at source.** `use-floating.ts:17` declares `arrowRef?: React.RefObject<Element>`,
`:23` destructures it, `:29` adds floating-ui's `arrow` middleware behind it. `useFloating` is
exported (`src/hooks/index.ts:10`) and the option is documented (`docs/components/popover.md:85`).
No component in this package passes one:

```
grep -rn arrowRef src | grep -v '\.test\.'      # 3 — all in src/hooks/use-floating.ts (:17, :23, :29)
```

So a consumer can switch on a middleware that positions an element nothing renders.

### 4.1 Which components gain an arrow, and which do not

Nine modules call `useFloating` (`grep -rn 'useFloating({' src/components` → `Combobox.tsx:147`,
`MultiSelect.tsx:135`, `DateRangePicker.tsx:222`, `DatePicker.tsx:189`, `ColorPicker.tsx:153`,
`menu-internals.tsx:176`, `Popover.tsx:91`, `Tooltip.tsx:51`, `HoverCard.tsx:87`). They do **not**
all get an arrow.

| Component | Arrow? | Reason, at source |
| --- | --- | --- |
| `Popover` | **yes** | The surface `arrowRef` was written for; `docs/components/popover.md:85` is the sentence decision 4 falsifies. |
| `HoverCard` | **yes** | Same anatomy — `HoverCard.tsx:87` config, `:239` content — and a hover surface points at what it describes. |
| `Tooltip` | **yes** | Its whole job is to point at the trigger. Note it renders **one** element today (`Tooltip.tsx:114-125`), so this is the change that gives it a second (§11, §7.3). |
| `DropdownMenu`, `ContextMenu` | **no** | They share `menu-internals.tsx:176`, one hook for two components, and `ContextMenu.tsx:101-105` sets a **virtual reference**: `getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0)`. An arrow pointing at a 0×0 rect under the cursor points at nothing. One shared surface cannot be arrowed for one of its two consumers without a prop that lies for the other. |
| `Combobox`, `MultiSelect`, `ColorPicker`, `DatePicker`, `DateRangePicker` | **no** | An attached listbox/panel is not a pointer; none of them has ever had one, and adding one is a design change with no request behind it. (`Select` is not on the list at all — it renders a native `<select>`, `Select.tsx:31`, and calls `useFloating` never.) |

**Adding a component to this list later is cheap; renaming is not.** The slot key (`arrow`) and the
class stem (`<component>-arrow`) are frozen here, so anything that gains an arrow afterwards
inherits both without a second decision.

### 4.2 The anatomy

- **Opt-in prop `arrow?: boolean`, default `false`,** on `Popover.Content`, `HoverCard.Content` and
  `Tooltip`. Verified free: `grep -rn arrow src/components/ui/{Popover,HoverCard,Tooltip}.tsx` →
  **0** matches, so the prop name collides with nothing. Default-on would change every existing
  consumer's rendering, which is a visual breaking change for a feature nobody has asked for yet;
  default-off makes the whole decision additive.
- **The component owns the ref**, creates it with `useRef`, passes it to `useFloating({ arrowRef })`,
  and renders the element as the **last child of the floating element** — the element carrying
  `popover-content` (`Popover.tsx:208`), `HoverCard.Content`'s utility `cn()`
  (`HoverCard.tsx:239-242`) and `tooltip` (`Tooltip.tsx:116`).
- **Position** comes from what the hook already returns — `useFloating` returns floating-ui's own
  object (`use-floating.ts:32-38`), so `middlewareData.arrow.{x,y}` and the resolved `placement` are
  already on it. Nothing new is exported. The static side is the standard opposite-of-placement map;
  the lane writes it once, in one file, not three.
- **Class names** (kept per §12): `popover-arrow` and `tooltip-arrow`, matching the stems in
  `Popover.css` and `Tooltip.css`. **`HoverCard` gets no BEM class** — it has no stylesheet at all
  (`ls src/components/ui | grep -i hover` → `.tsx`, `.test.tsx`, `.examples.tsx` only) and
  `HoverCard.Content` is styled by utilities in `cn()` (`HoverCard.tsx:239-242`). Its arrow is
  utilities too. That is the component's existing convention, not an exception being invented here.
- **Appearance is inherited, not tokenised.** `background-color: inherit` and `border-color: inherit`
  — as declarations in `Popover.css`/`Tooltip.css`, as `bg-inherit border-inherit` utilities on
  `HoverCard` — make the arrow follow whatever the panel's background and border are, including a
  consumer's `bg-*`/`border-*` utility on `className`, which after Phase 1 wins from
  `@layer components`. **Do not invent `--popover-arrow-color`**: it would be a second writer for a
  value the panel already publishes, and a caller could set one without the other (§4a's
  expose-the-pair rule, pointed at the same failure).
- **Size and shape are a slot, not a token.** floating-ui's `arrow` middleware *measures* the ref
  element, so a consumer class that changes its size stays correctly positioned — which is exactly
  the discriminator §5 uses: a class can participate here, unlike `Rating`'s clipped fill (§11).

### 4.3 The slot

`classNames.arrow` on `Popover`, `HoverCard` and `Tooltip`. **§1.5a does not block it** — the rule
is per element, and no `.Arrow` subcomponent is proposed; `Popover.Content` the subcomponent and
`classNames.arrow` the slot address two different elements.

`Tooltip` is the one worth stating explicitly: §11 rules it **§4b root — `className` → the one
element it renders**, and §15.5 argues a one-key `classNames` object on a one-element component is
worse than `className`. Neither is disturbed. After decision 4 `Tooltip` renders **two** elements
when `arrow` is on, so it takes `className` (the bubble, §4b) **plus** `classNames.arrow`. The §15.5
argument was against a `classNames` object *instead of* `className`, not beside it.

### 4.4 The doc that has to change

`docs/components/popover.md:85` currently reads *"`Popover` passes none, so there is no arrow element
and nothing to position."* That is a **false cannot** the moment decision 4 ships — the worst
doc-rot shape (`memory/README.md` §21), because it steers a consumer away from something that works.
The rewrite belongs to the Phase 3 lane that implements the arrow, in the same commit: the sentence
becomes the `arrow` prop's documentation, and `tooltip.md` and `hover-card.md` gain the same.

---

## 5. Token or slot — the ruling, per contested case

§4a's test: **is the override a *value* (→ token) or *which utilities apply* (→ slot)?** Plus two
sub-rules, both of which this package **already implements correctly in three components** — the
mechanism is the leading-underscore convention (`memory/affordances.md`: "a custom property with no
leading underscore" is public; underscore means internal).

| Sub-rule | Verified implementation |
| --- | --- |
| **Expose the pair, not the fill** | `Timeline.css:82-84` — `--timeline-highlight-fill` + `-ink` + `-border`, all public. `ActivityFeed.css:38-39` — `-fill` + `-ink`. `Stepper.css:31` — `--stepper-progress-color`, with the contrast-contract note at `:11` and `:167-168`. |
| **Keep the non-colour part private** | `Timeline.css:46` — `--_timeline-highlight-ring: 2px`, **underscored**, with the reason stated at `Timeline.css:357` (*"See `--_timeline-highlight-ring` for why that width is not overridable"*) and again in prose at `Timeline.tsx:154-158`: *"It is deliberately not a custom property: it cannot be overridden away."* Same shape at `ActivityFeed.css:26` and `Stepper.css:19` (`--_stepper-active-line-width`, `calc(× 1.5)`). |

**Consequence for the vocabulary.** These two sub-rules are why several visually prominent elements
get **no slot at all**:

| Contested case | Ruling | Evidence |
| --- | --- | --- |
| Timeline / ActivityFeed marker (`timeline-dot` `Timeline.tsx:184`, `activity-feed-dot` `ActivityFeed.tsx:71`) | **(b) token, no slot** | The pair is already public and the ring width already private. A `dot` slot hands a caller the ability to set the fill and drop the ring — reintroducing exactly the colour-only defect the ring exists to prevent (`Timeline.tsx:152-158`, `ActivityFeed.tsx:39-45`). §4a sub-rule 2 is decisive. |
| Timeline / ActivityFeed marker track (`timeline-node`, `activity-feed-aside`) | **(a)** | A fixed grid track the rail's origin is measured from — `ActivityFeed.tsx:46-48`: *"the 2rem marker column is a fixed grid track that the connector's origin is measured from, and growing the marker would move the rail."* Changing it is not an override, it is a broken rail. Name reserved as `gutter`, granted to nobody. |
| Stepper current-step ring | **(b) token, no slot** | `--stepper-progress-color` public (`Stepper.css:31`), `--_stepper-active-line-width` private (`:19`). Identical shape, identical ruling. |
| Sparkline geometry / colour (`sparkline-line` `Sparkline.tsx:174`, `-area` `:169`, `-bar` `:137`, `-point` `:151`) | **(a) + (b), no slots** | `Sparkline.css:6-8` documents the route already: `--sparkline-color: currentColor` (`:13`) means *"`text-chart-1`, `text-trend-up` — no per-instance CSS needed"* on the root, which `className` already reaches. Four unreachable literals, zero gaps. |
| ProgressRing colour (`progress-ring__indicator--{accent,success,warning,error}` `ProgressRing.css:30-42`) | **(a)** | Driven by the `color` prop, not by a class a consumer writes. `indicator` and `track` still get slots for *geometry* (§7.8). |
| `--numberinput-stepper` (`NumberInput.tsx:171`, from module constant `CHEVRON_SIZE` `:44`) | **neither — §4d defect** | §4d's test: *"if the inline value's inputs do not include a prop, it is not a per-instance derivation."* `CHEVRON_SIZE` is a module constant. Fix per §4d (move the default to CSS or write the padding as a utility); do **not** promote it to a public token, and do not give it a slot. |
| Skeleton geometry (`Skeleton.tsx:34` default `width = "100%"`, `:44` `style={{ width, height, ...style }}`) | **slot-adjacent — §4d defect, fix first** | `<Skeleton className="w-20" />` silently loses today. §4d's fix (`w-full` + an `h-*` map) makes the root's `className` the route. **No slot; the root is enough.** |
| ProgressBar fill colour (`ProgressBar.css:35-37` declares `--progress-bar-fill`/`-fill-end` **on `.progress-bar__fill`**) | **(b) token, after the §4d move** | A consumer theme at `:root` loses permanently while the declaration sits on the child. Move to `.progress-bar` (§4d), then it is a working pair. `fill` still gets a slot for *geometry* (§7.8) — the two are not alternatives. |
| Sparkline `--sparkline-color` (`Sparkline.css:13`, declared on `.sparkline`) | **(b), same §4d move** | Root-level, so it is already reachable from `className`'s element; `docs/components/sparkline.md:133-134` documents the limitation — evidence somebody noticed, not evidence it is right (`memory/README.md` §16). |
| Fade tempo on floating surfaces | **(b) only, and only `--MOTION-DURATION-*`** | `floating-motion.ts:11-13` at source: `useTransitionStyles` writes `transition-duration` **inline**, so *"the value cannot be supplied from CSS while that hook owns it."* A `duration-*` utility in `className`, in a slot, or inlined from CSS is **silently dead**. Three importers, confirmed exact: `Popover.tsx:29`, `HoverCard.tsx:31`, `menu-internals.tsx:29`. **No slot may promise fade timing.** |
| Overlay z-index (`Popover.css:17`=40, `DropdownMenu.css:18`=40, `Tooltip.css:11`=50, `ToastContext.tsx:212`=`z-50`, `HoverCard` sets nothing) | **neither — out of scope (§11)** | Needs one `--OVERLAY-Z-*` scale in `response-ui-css`. A `panel` slot lets a caller pass `z-…`, which is a workaround, not the fix. Do not present the slot as closing this. |

---

## 6. The frozen cross-family concept table

**One row per concept. One name per row. The same name in every family.** A family table may only
use these names.

| Concept | Frozen name | Derived from (`file:line`) |
| --- | --- | --- |
| outermost element | *(no slot — `className`)* | §4a |
| the framing/layout box around a control and its affordances | `control` | `multiselect-control` `MultiSelect.tsx:268` |
| the focusable entry element | `input` | `multiselect-input` `:337` · `combobox-input` `Combobox.tsx:301` · `search-input__input` `SearchInput.tsx:112` · `command-palette-input` `CommandPalette.tsx:393` · `range-slider__input` `RangeSlider.tsx:222,240` |
| the floating or revealed surface | `panel` | `colorpicker-panel` `ColorPicker.tsx:289` · `tabs-panel` `Tabs.tsx:346` — **only where `.Content` does not ship** (§10). `multiselect-content` (`MultiSelect.tsx:370`) was a `panel` and is now `MultiSelect.Content` (decision 1) |
| a repeated unit in a list | `item` | `accordion-item` `Accordion.tsx:158` · `combobox-item` `Combobox.tsx:474` · `carousel-item` `Carousel.tsx:362` · `timeline-item` `Timeline.tsx:203` · `activity-feed-item` `ActivityFeed.tsx:66`. `multiselect-item` (`MultiSelect.tsx:400`) is now `MultiSelect.Item` (decision 1) — the **word** is unchanged, which is the point of §1.5 |
| the container of repeated units | `list` | `tabs-list` `Tabs.tsx:208` · `pagination__list` `Pagination.tsx:112` · `command-palette-list` `CommandPalette.tsx:420` · `breadcrumbs__list` `Breadcrumbs.tsx:150` · `file-upload__preview-list` `FileUpload.tsx:686` |
| a leading glyph on a non-repeated element | `icon` | `search-input__icon` `SearchInput.tsx:96` · `empty-state__icon` `EmptyState.tsx:62` · `file-upload__icon` `FileUpload.tsx:754` · `stat-card__icon` `StatCard.tsx:259` · `timeline-icon` `Timeline.tsx:184` |
| a leading glyph inside a repeated item | `itemIcon` | `dropdown-menu-item-icon` `menu-internals.tsx:368` · `command-palette-option-icon` `CommandPalette.tsx:363` (§8.1) |
| a selection indicator inside a repeated item | `itemIndicator` | `multiselect-item__check` `MultiSelect.tsx:409` (§8.1) — shipped as the subcomponent `MultiSelect.ItemIndicator` (decision 1); **reserved as a slot key, granted to no component** |
| the primary text of a repeated item | `itemLabel` | `command-palette-option-label` `CommandPalette.tsx:367` · `app-shell-sidebar-link-label` `AppShell.tsx:401` |
| the removal control on a repeated item | `itemRemove` | `multiselect-tag__remove` `MultiSelect.tsx:307` (→ `tagRemove` under §1.3, and shipped as `MultiSelect.TagRemove` under decision 1) · `file-upload__media-grid-remove` `FileUpload.tsx:306` |
| a pressable disclosure control | `toggle` | `combobox-toggle` — a real `<button>`, `Combobox.tsx:341-347` · `app-shell-toggle` `AppShell.tsx:199` |
| a decorative direction glyph | `chevron` | `accordion-chevron` `Accordion.tsx:239`. `multiselect-toggle` (`MultiSelect.tsx:357`) is a `<span aria-hidden="true">` and is **misnamed today** — its slot is `chevron` (§8.3) |
| the "nothing matched" row | `empty` | `combobox-empty` `Combobox.tsx:507` (`.Empty` ships) · `multiselect-empty` `MultiSelect.tsx:380` (`.Empty` ships, decision 1) · `command-palette-empty` `CommandPalette.tsx:446` — **the only remaining `empty` slot** |
| the "loading" row | `loading` | `combobox-loading` `Combobox.tsx:418` |
| the clearing control | `clear` | `search-input__clear` `SearchInput.tsx:120` · `file-upload__preview-clear` `FileUpload.tsx:724` |
| the dismiss control | `dismiss` | `Toast.tsx:195` (`dismissLabel`, `Toast.tsx:118`) |
| primary text | `title` | `carousel-title` `Carousel.tsx:170` · `stepper-title` `Stepper.tsx:182` · `swimlane__title` `Swimlane.tsx:53` · `timeline-title` `Timeline.tsx:188` · `empty-state__title` `EmptyState.tsx:87` |
| secondary text under the title | `description` | `stepper-description` `Stepper.tsx:184` · `empty-state__description` `EmptyState.tsx:101` |
| a grouping box for title + description | `titleGroup` | **invented** (§1.6 rule 4) — replaces `swimlane__titles` `Swimlane.tsx:52` |
| a group heading inside a list | `groupHeader` | `command-palette-group-header` `CommandPalette.tsx:438` · `app-shell-sidebar-section-title` `AppShell.tsx:344` · `menu-group-header` `menu-internals.tsx:408`, shipped as `.GroupHeader` (decision 3, §8.8) |
| a rule between siblings | `divider` | `dropdown-menu-divider` `menu-internals.tsx:388` · `DropdownMenu.Divider` `DropdownMenu.tsx:105` · `ContextMenu.Divider` `ContextMenu.tsx:136` · `Breadcrumbs.Divider` (renamed from `.Separator` `Breadcrumbs.tsx:210`, decision 2) · the top-level `Divider` export `src/components/layout/Divider.tsx` |
| step back one | `prev` | `carousel-arrow--prev` `Carousel.tsx:180` · `Pagination.tsx:129-136` |
| step forward one | `next` | `carousel-arrow--next` `Carousel.tsx:199` · `Pagination.tsx:182-189` |
| jump to the start | `first` | `Pagination.tsx:116-123` |
| jump to the end | `last` | `Pagination.tsx:195-202` |
| the clipping scrollport | `viewport` | `carousel-viewport` `Carousel.tsx:176` |
| the unfilled groove of a progress/range control | `track` | `progress-ring__track` `ProgressRing.tsx:56` · `range-slider__track` `RangeSlider.tsx:218` |
| the filled portion | `fill` | `progress-bar__fill` `ProgressBar.tsx:126` · `range-slider__fill` `RangeSlider.tsx:219` |
| the draggable handle | `thumb` | `switch-thumb` `Switch.tsx:77` · `colorpicker-sv__thumb` `ColorPicker.tsx:341` |
| the position/progress marker | `indicator` | `tabs-indicator` `Tabs.tsx:215` · `stepper-indicator` `Stepper.tsx:169,176` · `progress-ring__indicator` `ProgressRing.tsx:64` |
| the line joining markers | `connector` | `stepper-connector` `Stepper.tsx:187` |
| the fixed track holding a marker | `gutter` | tokens `--_activity-feed-gutter`, `--_timeline-…-gutter` (§4c). **Reserved; granted to no component** (§5) |
| the marker itself | `dot` | `timeline-dot`, `activity-feed-dot`. **Reserved; granted to no component** (§5) |
| the content region below a header | `body` | `swimlane__body` `Swimlane.tsx:62` · `timeline-body` `Timeline.tsx:189` · `activity-feed-body` `ActivityFeed.tsx:80` |
| a date or time stamp | `timestamp` | `activity-feed-timestamp` `ActivityFeed.tsx:78` · `timeline-date` `Timeline.tsx:187`. **Two existing stems for one concept** (`timestamp`, `date`); `timestamp` wins because `Timeline`'s `date` prop takes a `ReactNode`, not a date |
| a clipping frame that shapes media | `frame` | `Avatar.tsx:116` (the `overflow-hidden rounded-full` disc) |
| the header region | `header` | `calendar-header` `CalendarBase.tsx:648` · `code-block-header` `CodeBlock.tsx:69` · `swimlane__header` `Swimlane.tsx:51` — **banned in the overlay family** (§3.5) |
| the footer region | `footer` | `calendar-footer` `CalendarBase.tsx:673` · `wizard__footer` `Wizard.tsx:233` — **banned in the overlay family** |
| a darkening layer over a sibling | `overlay` | `hero__overlay` `Hero.tsx:59` · `media-card__overlay` `MediaCard.tsx:75` |
| a dimming layer behind a modal, as a real element | `scrim` | `app-shell-scrim` `AppShell.tsx:275` (§3.4) |
| the pointer triangle on a floating surface | `arrow` | **new element** — decision 4 (§4). Overlay-family-owned (§7.3); `Popover`, `HoverCard`, `Tooltip` only. Off the ban list for this element and this element only (§3.3) |
| a value readout | `value` | `progress-bar__value` `ProgressBar.tsx:158` · `colorpicker-trigger__value` `ColorPicker.tsx:272` · `stat-card__value` `StatCard.tsx:156` |
| an action cluster the consumer fills | `actions` | `empty-state__actions` `EmptyState.tsx:119` · `file-upload__preview-actions` `FileUpload.tsx:709` |
| one preset choice in a palette | `preset` | `colorpicker-preset` `ColorPicker.tsx:408` |
| N homogeneous entry boxes | `box` | `OTPInput.tsx:225` — §10's sole `box` carve-out |
| a tag/chip | `tag` | `multiselect-tag` `MultiSelect.tsx:299` — shipped as `MultiSelect.Tag` (decision 1); the **slot** survives on `TagInput` (§1.3 override: TagInput's public vocabulary already spends the word) |
| the search affordance region | `search` | `command-palette-search` `CommandPalette.tsx:388` |
| a keyboard-shortcut hint | `shortcut` | `command-palette-option-shortcut` `CommandPalette.tsx:369` → `itemShortcut` under §1.3 |
| a thumbnail | `thumb`² | `file-upload__preview-thumb` `FileUpload.tsx:365` |
| plain non-link text where a link would otherwise sit | `text` | `file-upload__text` `FileUpload.tsx:760,762` · `breadcrumbs__text` `Breadcrumbs.tsx:181` — **promoted from family-owned on its second family** (§7.4) |
| a hint / help line | `hint` | `file-upload__hint` `FileUpload.tsx:704,770` |
| an error message line | `error` | `file-upload__error` `FileUpload.tsx:738,777` |
| a success message line | `success` | `file-upload__success` `FileUpload.tsx:745,784` |
| a swatch of colour | `swatch` | `colorpicker-swatch` `ColorPicker.tsx:268,369` |
| a saturation/value plane | `plane` | `colorpicker-sv` `ColorPicker.tsx:303` (see §7.1 note) |
| a hue strip | `hue` | `colorpicker-hue` `ColorPicker.tsx:354` |
| a cell in a grid of cells | `cell` | `calendar-cell` `CalendarBase.tsx:596` · `table-cell` `Table.tsx:344` |
| a row of cells | `row` | `calendar-week` `CalendarBase.tsx:565` · `table-row` `Table.tsx:193` |
| a caption above a sub-grid | `caption` | `calendar-month-caption` `CalendarBase.tsx:541` |

² **`thumb` carries two meanings and this is the one place §1.5 is knowingly bent.** `switch-thumb`
(a draggable handle) and `file-upload__preview-thumb` (a thumbnail image) are unrelated concepts
sharing an English word. They never co-occur in one component, so no `classNames` object can be
ambiguous, and renaming either would fight the universal name for the part it describes
(`::-webkit-slider-thumb` on one side, "thumbnail" on the other). **Recorded as a knowing exception,
not an oversight** — a lane must not "fix" it into `handle`/`thumbnail`.

---

## 7. Per-family slot tables

Notation: **every-instance** = the element is loop-generated; the slot's class lands on **all**
instances. **(a)** = ruled not-a-gap in §11 and therefore deliberately given no slot.

### 7.1 Family 1 — form ✔ (§9 "settled"; re-derived here because the plan never wrote it down)

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| layout box | `control` | MultiSelect, TagInput, ColorPicker¹, Select, NumberInput, SearchInput¹ | `MultiSelect.tsx:268` · `TagInput.tsx:379-387` · `Select.tsx:30` · `NumberInput.tsx:170` |
| focusable entry element | `input` | MultiSelect, Combobox, SearchInput, RangeSlider, Select, NumberInput, TagInput | `MultiSelect.tsx:337` · `Combobox.tsx:301` · `SearchInput.tsx:112` · `RangeSlider.tsx:222,240` (every-instance, 2) · `Select.tsx:55` · `NumberInput.tsx:196` |
| floating surface | `panel` | ColorPicker | `ColorPicker.tsx:289` — Combobox and **MultiSelect** get none: `.Content` ships on both (§10.1) |
| repeated unit | `item` | Repeater | `Repeater.tsx:230` (every-instance) — **MultiSelect** gets none: `.Item` ships |
| tag | `tag` | TagInput | `TagInput.tsx:409` → via `badgeProps` hatch (§13) — **MultiSelect** gets none: `.Tag` ships |
| tag removal | `tagRemove` | TagInput | `TagInput.tsx:422` (every-instance) — **MultiSelect** gets none: `.TagRemove` ships |
| tag container | `list` | MultiSelect | `MultiSelect.tsx:297` — a singleton container with no content to author, so it stays a slot |
| decorative chevron | `chevron` | MultiSelect, Select, NumberInput | `MultiSelect.tsx:357` · `Select.tsx:66` · `NumberInput.tsx:198-230` |
| pressable disclosure | `toggle` | Combobox | `Combobox.tsx:347` |
| "nothing matched" | *(no slot in this family)* | — | `Combobox.Empty` and `MultiSelect.Empty` both ship; `MultiSelect.tsx:380` is the element decision 1 moves |
| "loading" | `loading` | Combobox | `Combobox.tsx:418` |
| clear control | `clear` | SearchInput, FileUpload | `SearchInput.tsx:120` · `FileUpload.tsx:724` |
| leading glyph | `icon` | SearchInput, FileUpload | `SearchInput.tsx:96` · `FileUpload.tsx:754` |
| trigger | `trigger` | ColorPicker | `ColorPicker.tsx:250` — the only form component whose trigger is not a subcomponent |
| value readout | `value` | ColorPicker | `ColorPicker.tsx:272` |
| swatch | `swatch` | ColorPicker | `ColorPicker.tsx:268` and `:369` (every-instance over 2 sites) |
| saturation/value plane | `plane` | ColorPicker | `ColorPicker.tsx:303` |
| plane handle | `thumb` | ColorPicker, Switch | `ColorPicker.tsx:341` · `Switch.tsx:77` |
| hue strip | `hue` | ColorPicker | `ColorPicker.tsx:354` |
| hex field | `hex` | ColorPicker | `ColorPicker.tsx:381` |
| preset row | `presets` | ColorPicker | `ColorPicker.tsx:403` |
| one preset | `preset` | ColorPicker | `ColorPicker.tsx:408` (every-instance) |
| entry box | `box` | OTPInput | `OTPInput.tsx:225` (every-instance) |
| track | `track` | RangeSlider | `RangeSlider.tsx:218` |
| fill | `fill` | RangeSlider | `RangeSlider.tsx:219` |
| dropzone preview region | `preview` | FileUpload | `FileUpload.tsx:648` |
| preview container | `list` | FileUpload | `FileUpload.tsx:668` (media grid), `:686` (rows) |
| action cluster | `actions` | FileUpload | `FileUpload.tsx:709` |
| replace control | `replace` | FileUpload | `FileUpload.tsx:712` |
| hint line | `hint` | FileUpload | `FileUpload.tsx:704,770` |
| error line | `error` | FileUpload | `FileUpload.tsx:738,777` |
| success line | `success` | FileUpload | `FileUpload.tsx:745,784` |
| dropzone prompt text | `text` | FileUpload | `FileUpload.tsx:760,762` · emphasis span `:764` → `textEmphasis` |
| row fields region | `fields` | Repeater | `Repeater.tsx:235` (every-instance) |
| row controls region | `itemActions` | Repeater | `Repeater.tsx:255` (every-instance) |
| live region | **(a)** | TagInput, Repeater, FileUpload | `TagInput.tsx:471` · `Repeater.tsx:308` · `FileUpload.tsx:801` — §10 `announcer` ban |
| grouping row in the panel | **(a)** | ColorPicker | `ColorPicker.tsx:367` — see §11 |

¹ `SearchInput`'s layout box **is** its outermost element (`SearchInput.tsx:93`,
`cn("search-input", className)`), so `className` already covers it and it takes **no `control`
slot**. `ColorPicker`'s root (`:260`) likewise; its `control` row is `:367`, ruled (a).

**`MultiSelect`'s six subcomponents** (decision 1, specified in §10.1) — listed here because a lane
reads this table, and because each one is the reason a slot key above is absent:

| Subcomponent | Element (`file:line`) | The slot it replaces |
| --- | --- | --- |
| `MultiSelect.Content` | `MultiSelect.tsx:370` | `panel` |
| `MultiSelect.Item` | `:400` (every-instance) | `item` |
| `MultiSelect.ItemIndicator` | `:409` (every-instance) | `itemIndicator` |
| `MultiSelect.Empty` | `:380` | `empty` |
| `MultiSelect.Tag` | `:299` (every-instance) | `tag` |
| `MultiSelect.TagRemove` | `:307` (every-instance) | `tagRemove` |

`MultiSelect` keeps **four slots** — `control` (`:268`), `list` (`:297`), `input` (`:337`) and
`chevron` (`:357`). Why those four are not subcomponents is §10.1's discriminator: a subcomponent
exists where the consumer needs to supply *content*; a slot where they only need to change *class*.

**34 slot names**, method: distinct keys in the table above, excluding the **(a)** rows and the row
that now names no component. (It was 36 before decision 1: `itemIndicator` and `empty` lost their
last holder in this family; `panel`, `item`, `tag` and `tagRemove` each kept one.) Named rather than
counted, all cross-family names from §6 except these nine, which are **family-owned** (§1.5) and
would be promoted to §6 the moment a second family needs them: `plane`, `hue`, `hex`, `presets`,
`replace`, `fields`, `preview`, `textEmphasis`, `itemActions`. (`text` was family-owned here until
family 4 needed it; it is now a §6 name — see §7.4.)

### 7.2 Family 2 — date

Anatomy is `CalendarBase`'s; `Calendar`, `RangeCalendar`, `DatePicker` and `DateRangePicker` all
consume it (§9 cluster 1 — **one lane**).

**Method for the counts below:** distinct elements in `CalendarBase.tsx` carrying a class literal =
**15 non-root** (plus the root at `:637`). Distinct *class names* = **17**, because `:657` carries
two (`calendar-label calendar-label-button`). §5's "15 internals" reproduces on the **element**
reading only (§15.4).

| Concept | Slot | Element (`file:line`) | Rendered |
| --- | --- | --- | --- |
| header region | `header` | `:648` | once |
| the month/year label button | `labelButton` | `:657` (2 classes, 1 element) | once |
| the months container | `months` | `:668` | once |
| footer region | `footer` | `:673` | once |
| the "today" control | `todayButton` | `:674` | once |
| the month/year picker grid | `pickerGrid` | `:213` | once per picker view |
| one month/year picker cell | `pickerCell` | `:222` | **every-instance** · `querySelectorAll` target `:174` — **append, never replace** |
| one month grid | `month` | `:539` | **every-instance** (`monthCount`, `:273`) |
| a month caption | `caption` | `:541` | **every-instance, and conditional** (`monthCount > 1`) |
| the day grid | `grid` | `:548` | **every-instance** |
| the weekday header row | `weekdays` | `:551` | **every-instance** |
| one weekday header cell | `weekday` | `:557` | **every-instance** |
| one week row | `row` | `:565` | **every-instance** |
| one day cell | `cell` | `:596` | **every-instance** (42/month, `src/util/date.ts:75-81`) |
| the day button | `day` | `:603` | **every-instance** · `querySelector` target `:366` (and `:348` on `[data-day]`) — **append, never replace** |
| **plus** different *content* per day | `renderDay` **(e)** | — | §5, unchanged |

**16 slots + `renderDay`.** Not §5's "6 slots + 3 applied-to-every-instance + `renderDay`" — that
leaves six elements with no route at all (§15.4).

**Family-owned** (§1.5), i.e. not in §6: `labelButton`, `months`, `todayButton`, `pickerGrid`,
`pickerCell`, `month`, `grid`, `weekdays`, `weekday`, `day`. The rest (`header`, `footer`, `caption`,
`row`, `cell`) are §6 names.

**Two hard constraints, confirmed exact.** `.calendar-picker-cell` (`:174`), `.calendar-day`
(`:366`) and `[data-day]` (`:348`) are `querySelector` targets driving focus management. They are
behavioural markers: a slot **appends**, never replaces. And `Calendar.css` has no owning component
— confirmed: `grep -rn 'Calendar.css' src/` returns only `src/styles.css:22` and a *comment* at
`CalendarBase.tsx:638`. Rename to `CalendarBase.css` in the same lane.

`DatePicker` and `DateRangePicker` additionally need §4b applied: `DatePicker.tsx:280` is
`<div className={className}>` — raw, no `cn()`, no base class. Their positioning box
(`DatePicker.tsx:285`, `className="relative"`) takes `control`; the icon cluster (`:321`) takes
`actions`.

### 7.3 Family 3 — overlay ✔ (§9 "settled"; re-derived here)

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| the floating surface | *(subcomponent `.Content`)* | Popover, HoverCard, DropdownMenu, ContextMenu | `Popover.tsx:208` · `HoverCard.tsx:239` · `menu-internals.tsx:288` — **no `panel` slot** (§10) |
| the trigger | *(subcomponent `.Trigger`)* | Popover, HoverCard, DropdownMenu, ContextMenu | `Popover.tsx:175` · `HoverCard.tsx:197` · `DropdownMenu.tsx:90` · `ContextMenu.tsx:81` |
| a menu row | *(subcomponent `.Item`)* | DropdownMenu, ContextMenu | `menu-internals.tsx:346` |
| leading glyph in a menu row | `itemIcon` | DropdownMenu, ContextMenu | `menu-internals.tsx:368` — **the only one of the five menu literals with no override path** (§8.2) |
| a rule between rows | *(subcomponent `.Divider`)* | DropdownMenu, ContextMenu | `menu-internals.tsx:388` |
| a group heading | *(subcomponent `.GroupHeader`)* | DropdownMenu, ContextMenu | `menu-internals.tsx:408` — renamed from `.Label` and class renamed `menu-group-header` (decision 3, §8.8) |
| the bubble | *(root — `className`)* | Tooltip | `Tooltip.tsx:116` — §11, refutes (d) |
| the pointer triangle | `arrow` | Popover, HoverCard, Tooltip | **new element** (decision 4, §4). Rendered only when the `arrow` prop is set; classes `popover-arrow`, `tooltip-arrow`, and utilities on HoverCard, which has no stylesheet |
| the search region | `search` | CommandPalette | `CommandPalette.tsx:388` |
| the query input | `input` | CommandPalette | `:393` |
| the results container | `list` | CommandPalette | `:420` |
| a group | `group` | CommandPalette | `:436` (every-instance) |
| a group heading | `groupHeader` | CommandPalette | `:438` (every-instance) |
| a result row | `item` | CommandPalette | `:352` (every-instance) |
| a row's glyph | `itemIcon` | CommandPalette | `:363` (every-instance) |
| a row's text | `itemLabel` | CommandPalette | `:367` (every-instance) |
| a row's shortcut | `itemShortcut` | CommandPalette | `:369` (every-instance) |
| "nothing matched" | `empty` | CommandPalette | `:446` |
| **plus** different *content* per row | `renderItem` **(e)** | CommandPalette | replaces the private closure at `:338` |
| dismiss control | `dismiss` | Toast | `Toast.tsx:195` |
| leading glyph | `icon` | Toast | `Toast.tsx:183` — prop is `statusIcon` (`Toast.tsx:110-117`), **not** `icon` (§15.3) |
| body region | `body` | Toast | `Toast.tsx:184` |
| title | `title` | Toast | `Toast.tsx:186` |
| the toast stack | `list` | ToastProvider | `ToastContext.tsx:212` |
| live region | **(a)** | Toast, CommandPalette | `Toast.tsx:185` · `CommandPalette.tsx:411` |
| the modal backdrop | **(b)** `--OVERLAY-SCRIM-COLOR` | Dialog, Drawer | `::backdrop` takes no class (§3.4) |
| header/footer/close | **banned** | Dialog, Drawer | both render `{children}` only (§3.5) |

`Dialog` and `Drawer` therefore take **zero slots** — `className` on the `<dialog>` is the whole
API, which is what they already have (`Dialog.tsx:62-69`, `Drawer.tsx:63`). That is triage **(a)**
for the family's two largest surfaces, and it is correct.

**`CommandPalette`'s eleven rows above are provisional in one respect only.** Decision 1 removed the
reason this document used to rule out a compound here (§10.2), and the question is now an open owner
item (§14.2). If the owner takes (d), `search`/`input`/`list`/`group`/`groupHeader`/`item`/
`itemIcon`/`itemLabel`/`itemShortcut`/`empty` do **not** all ship as slots — `.Content`, `.Item` and
`.Empty` replace three of them under §1.5a, exactly as they did for `MultiSelect`. **The names do not
change either way**; only the mechanism does. A lane must not start `CommandPalette` before §14.2 is
closed.

**Family-owned** (§1.5) in this family: `group`, and — new with decision 4 — `arrow`. (`search`,
`itemShortcut`, `input`, `list`, `item`, `itemIcon`, `itemLabel`, `groupHeader`, `empty`, `icon`,
`body`, `title` and `dismiss` are all §6 names.)

### 7.4 Family 4 — sequence ▲ **newly settled**

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| repeated unit | *(subcomponent `.Item`)* | Accordion, Timeline, ActivityFeed, Carousel, Breadcrumbs | `Accordion.tsx:158` · `Timeline.tsx:203,220` · `ActivityFeed.tsx:66` · `Carousel.tsx:362` · `Breadcrumbs.tsx:171` |
| repeated unit | *(subcomponent `.Step`)* | Stepper | `Stepper.tsx:160` — shipped as `Stepper.Step`; **no `item` slot** |
| the disclosure control | *(subcomponent `.Trigger`)* | Accordion, Collapsible | `Accordion.tsx:232` · `Collapsible.tsx:100` |
| the revealed region | *(subcomponent `.Content`)* | Accordion, Collapsible | `Accordion.tsx:280` · `Collapsible.tsx:138` |
| the tab strip | *(subcomponent `.List`)* | Tabs | `Tabs.tsx:208` |
| one tab | *(subcomponent `.Tab`)* | Tabs | `Tabs.tsx:295` |
| the panel | *(subcomponent `.Panel`)* | Tabs | `Tabs.tsx:346` — `.Panel` ships, so **no `panel` slot** |
| the active-position marker | `indicator` | Tabs, Stepper | `Tabs.tsx:215` · `Stepper.tsx:169,176` |
| the semantic heading wrapper | `heading` | Accordion | `Accordion.tsx:224` — a `<Heading>` **around** the trigger button, not the text |
| the trigger's text span | `triggerText` | Accordion | `Accordion.tsx:237` |
| decorative chevron | `chevron` | Accordion | `Accordion.tsx:239` |
| the line joining markers | `connector` | Stepper | `Stepper.tsx:187` |
| a step's text block | `itemBody` | Stepper | `Stepper.tsx:181` — **not `content`**: `stepper-content` is a text block, not a revealed region (§8.6) |
| primary text | `title` | Stepper, Timeline, Carousel, Swimlane | `Stepper.tsx:182` · `Timeline.tsx:188` · `Carousel.tsx:170` · `Swimlane.tsx:53` |
| secondary text | `description` | Stepper, Swimlane | `Stepper.tsx:184` · `Swimlane.tsx:54` (renamed from `subtitle`, §3.6) |
| screen-reader status word | **(a)** — and the strongest case in the family | Stepper | `Stepper.tsx:178`. `Stepper.css:136-142` hand-rolls the visually-hidden clip in **CSS** rather than using the `sr-only` utility, so after Phase 1 a consumer utility in a slot would out-rank it and reveal the text. §10's `announcer` reason applies with extra force. |
| the date/timestamp | `timestamp` | Timeline, ActivityFeed | `Timeline.tsx:187` · `ActivityFeed.tsx:78` |
| the card | `card` *(family-owned)* | Timeline | `Timeline.tsx:186` |
| body region | `body` | Timeline, ActivityFeed, Swimlane | `Timeline.tsx:189` · `ActivityFeed.tsx:80` · `Swimlane.tsx:62` |
| the marker track | **(a)** `gutter` reserved | Timeline, ActivityFeed | `Timeline.tsx:183` · `ActivityFeed.tsx:70` (§5) |
| the marker | **(b)** `dot` reserved | Timeline, ActivityFeed | `Timeline.tsx:184` · `ActivityFeed.tsx:71` (§5) |
| the leading glyph | `icon` | Timeline, ActivityFeed | `Timeline.tsx:184` (the `icon`-prop branch) |
| the sentence row | `sentence` | ActivityFeed | `ActivityFeed.tsx:74` |
| its three spans | `actor`, `action`, `target` | ActivityFeed | `:75`, `:76`, `:77` |
| header region | `header` | Swimlane | `Swimlane.tsx:51` |
| title + description group | `titleGroup` | Swimlane | `Swimlane.tsx:52` (renamed from `titles`, §1.2) |
| the "view all" link | **(a)** — hatch already | Swimlane | `Swimlane.tsx:57` merges `viewAllProps?.className` (§13) |
| the scrollport | `viewport` | Carousel | `Carousel.tsx:176` |
| the moving rail | *(subcomponent `.Track`)* | Carousel | `Carousel.tsx:338` |
| step back one | `prev` | Carousel, Pagination | `Carousel.tsx:180` · `Pagination.tsx:133` |
| step forward one | `next` | Carousel, Pagination | `Carousel.tsx:199` · `Pagination.tsx:186` |
| jump to start | `first` | Pagination | `Pagination.tsx:120` |
| jump to end | `last` | Pagination | `Pagination.tsx:199` |
| the page list | `list` | Pagination, Breadcrumbs | `Pagination.tsx:112` · `Breadcrumbs.tsx:150` |
| one page button | `page` | Pagination | `Pagination.tsx:154` (every-instance) |
| the gap marker | `ellipsis` | Pagination, Breadcrumbs | `Pagination.tsx:145` · `Breadcrumbs.tsx:107` |
| the "n of m" text | `info` | Pagination | `Pagination.tsx:173` |
| the current crumb | `current` | Breadcrumbs | `Breadcrumbs.tsx:173` |
| a crumb link | `link` | Breadcrumbs | `Breadcrumbs.tsx:177` |
| a non-link crumb | `text` | Breadcrumbs | `Breadcrumbs.tsx:181` |
| the crumb rule | *(subcomponent `.Divider`)* | Breadcrumbs | `Breadcrumbs.tsx:199`, exported at `:210` — **renamed from `.Separator`** (decision 2, §8.5). The subcomponent and the slot vocabulary now use one word |
| the step content region | `body` | Wizard | `Wizard.tsx:228` |
| the button row | `footer` | Wizard | `Wizard.tsx:233` |
| the clipping inner box | **(a)** | Accordion, Collapsible | `Accordion.tsx:283` · `Collapsible.tsx:141` — see §11 |

**Family-owned** (§1.5): `heading`, `triggerText`, `itemBody`, `card`, `sentence`, `actor`, `action`,
`target`, `page`, `ellipsis`, `info`, `current`, `link`. Everything else in the table is a §6 name or
a shipped subcomponent.

**One promotion, applying §1.5's own rule to this document.** `text` is needed by two families —
`file-upload__text` (`FileUpload.tsx:760,762`, family 1) and `breadcrumbs__text`
(`Breadcrumbs.tsx:181`, family 4). It is therefore **promoted to §6**, not family-owned in either.
Recorded because the rule's whole value is that it fires on the second use, and this is the second
use.

### 7.5 Family 5 — tabular ▲ **newly settled**

`Table` is already fully compound (`Table.tsx:355-360`: `Head`, `Body`, `Row`, `HeaderCell`,
`Cell`), so almost nothing here is a slot. The family's problem is **props hatches**, not slots
(§13).

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| the scrollport | *(root — `className`)* | Table | `Table.tsx:93` (`table-wrapper`) |
| the `<table>` | *(hatch `tableProps`)* | Table | `Table.tsx:98` merges `tableClassName` (`:87`) |
| the five structural elements | *(subcomponents)* | Table | `:117`, `:146`, `:193`, `:307`, `:344` |
| the sort control | `sortButton` | Table.HeaderCell | `Table.tsx:286` — bare literal, no route |
| the sort glyph | `sortIcon` | Table.HeaderCell | `Table.tsx:253` — template-built, no route |
| the sort action's sr-only text | **(a)** | Table.HeaderCell | `Table.tsx:290` |
| the expanded-row cell | `expandedCell` | DataTable | `DataTable.tsx:584` |
| the expanded-row region | `expandedBody` | DataTable | `DataTable.tsx:587,591` |
| the expanded-row clipper | **(a)** | DataTable | `DataTable.tsx:590` (`…-inner`, §3.6) |
| the expand toggle | `expandToggle` | DataTable | `DataTable.tsx:425` |
| the virtual spacer rows | **(a)** | VirtualizedDataTable | `:344`, `:382` — `aria-hidden` height shims |
| the virtual scrollport | *(hatch `tableProps`)* | VirtualizedDataTable | `:333` hardcodes `className`, `:334` hardcodes `style` (§13) |
| term / detail | *(subcomponents `.Term`/`.Detail`)* | DescriptionList | `DescriptionList.tsx:47,66` |

**Family-owned** (§1.5): `sortButton`, `sortIcon`, `expandedCell`, `expandedBody`, `expandToggle`.

**`DataTable` and `VirtualizedDataTable` get no slots of their own beyond the four above** — their
defect is that `DataTableProps` and `VirtualizedDataTableProps` have **no `className` at all**
(verified: `sed -n '32,122p' src/components/ui/DataTable.tsx | grep -E 'className|ComponentProps'`
→ no match; same for `VirtualizedDataTable.tsx:22-143`). §4b first, hatches second (§13).

### 7.6 Family 6 — layout ▲ **newly settled**

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| the eight AppShell regions | *(subcomponents)* | AppShell | `Navbar` `:158` · `Brand` `:166` · `NavbarActions` `:174` · `Toggle` `:199` · `Sidebar` `:304` · `SidebarSection` `:336` · `SidebarLink` `:391` · `Main` `:423` |
| the dimming layer | `scrim` | AppShell | `AppShell.tsx:275` — **(c)**, §3.4 |
| the mobile sidebar surface | `panel` | AppShell | `AppShell.tsx:286` |
| a section heading | `groupHeader` | AppShell.SidebarSection | `AppShell.tsx:344` |
| a link's glyph | `itemIcon` | AppShell.SidebarLink | `AppShell.tsx:396` — **handed to a component, not an element** (§15.2) |
| a link's text | `itemLabel` | AppShell.SidebarLink | `AppShell.tsx:401` |
| a masonry cell | *(subcomponent `.Item`)* | MasonryGrid | `MasonryGrid.tsx:143,154` |
| everything in `layout/` and `Card` | **(a)** — no internals | Center, Container, Divider, Grid, Row, Spacer, Stack, Card | single-element components; `className` is the whole surface |

**`Grid` and `MasonryGrid` take no new slots.** Their work is Phase 2 (column-scale deletion,
bounded `columns` union) and it is already specified.

### 7.7 Family 7 — media ▲ **newly settled**

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| the background / image / content trio | *(subcomponents)* | Hero, Spotlight, MediaCard | `Hero.tsx:101,125` · `Spotlight.tsx:123,150` · `MediaCard.tsx:75,93` |
| the darkening layer | `overlay` | Hero | `Hero.tsx:59` — `hero__overlay`, no route today; `MediaCard.Overlay` ships as a subcomponent |
| the image's aspect box | `frame`… **no** → *(root — §4b)* | MediaCard.Image | `MediaCard.tsx:52` — **the container is the outermost element the subcomponent renders**, so §4b gives it `className`; the `<img>` (`:56`) moves to an `imgProps` hatch matching Spotlight (§13) |
| the `<img>` | *(hatch `imgProps`)* | MediaCard.Image, Spotlight.Image | `MediaCard.tsx:56` · `Spotlight.tsx:111` |
| the parallax wrapper | **(a)** | Hero, Spotlight | `Hero.tsx:91` · `Spotlight.tsx:115` — `size-full` on a positioning shim |
| the badge slot | *(subcomponent `.Badge`)* | MediaCard | `MediaCard.tsx:110` — utilities only, no BEM class |
| the clipping disc | `frame` | Avatar | `Avatar.tsx:115-119` — **verified: this is the `overflow-hidden rounded-full` frame, not the initials.** The initials `<span>` (`:130`) carries **no class at all**, so there is no `initials` element and no slot for one |
| the avatar image | `image` | Avatar | `Avatar.tsx:127` |
| the status pip | `status` *(family-owned)* | Avatar | `Avatar.tsx:135` |
| the overlap ring | `itemRing` *(family-owned)* | AvatarGroup | `Avatar.tsx:181` (every-instance) |
| the overflow count | `overflow` *(family-owned)* | AvatarGroup | `Avatar.tsx:187` |
| the inner Avatar | *(hatch `avatarProps`)* | AvatarUpload | `AvatarUpload.tsx:267` (§13) |
| the camera badge | `badge` | AvatarUpload | `AvatarUpload.tsx:278` |
| the busy spinner | `spinner` | AvatarUpload | `AvatarUpload.tsx:288` |
| the focus ring shim | **(a)** | AvatarUpload | `AvatarUpload.tsx:296` |
| the error bubble | `error` | AvatarUpload | `AvatarUpload.tsx:308` |
| the file input | **(a)** | AvatarUpload | `AvatarUpload.tsx:323` (`sr-only`) |
| live region | **(a)** | AvatarUpload | `AvatarUpload.tsx:331` |
| Skeleton | **no slots** | Skeleton | one element; §4d geometry fix makes `className` the route (§5) |
| `animation/` (5 modules) | **no slots** | AnimatePresence, Parallax, ScrollReveal, Stagger, ViewTransition | wrappers that set one class or one property; `className` is the surface |

### 7.8 Family 8 — status

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| the filled portion | `fill` | ProgressBar | `ProgressBar.tsx:126` |
| label / value | *(subcomponents `.Label`/`.Value`)* | ProgressBar | `:146`, `:158` |
| the SVG | `svg` | ProgressRing | `ProgressRing.tsx:54` |
| the unfilled groove | `track` | ProgressRing | `:56` |
| the progress arc | `indicator` | ProgressRing | `:64` |
| the centre content box | `panel`… **no** → `center` | ProgressRing | `:80` (`progress-ring__slot`) — **`slot` is banned** (§4a); frozen name `center` |
| the star row | **(a)** | Rating | `Rating.tsx:73-76`, `:220` — see §11 |
| value / label / trend / icon / sparkline | *(subcomponents)* | StatCard | `:156`, `:172`, `:235`, `:259`, `:285` |
| the trend glyph | `trendIcon` | StatCard.Trend | `StatCard.tsx:215` |
| the sparkline box | *(hatch `sparklineProps`)* | StatCard.Sparkline | `:285-288` (§13) |
| icon / title / description / actions | *(subcomponents)* | EmptyState | `:62`, `:87`, `:101`, `:119` |
| leading glyph | `icon` | Alert | `Alert.tsx:98` |
| live region | **(a)** | Alert, StatCard, Rating, Skeleton | `Alert.tsx:97` · `StatCard.tsx:150` · `Rating.tsx:237` · `Skeleton.tsx:48` |
| Sparkline internals | **(a)+(b)** | Sparkline | `:137`, `:151`, `:169`, `:174` — §5 |
| Meter, Spinner | **no slots** | — | utilities-only, `className` is the surface |

### 7.9 Family 9 — primitive

| Concept | Slot | Components | Element (`file:line`) |
| --- | --- | --- | --- |
| header region | `header` | CodeBlock | `CodeBlock.tsx:69` |
| filename | `filename` | CodeBlock | `:70` |
| language tag | `language` | CodeBlock | `:71` |
| the copy button | *(hatch `copyButtonProps`)* | CodeBlock | `:76` — **the reference implementation** (§13) |
| the `<pre>` | `pre` | CodeBlock | `:85` |
| the `<code>` | `code` | CodeBlock | `:92` |
| one line | `line` | CodeBlock | `:95` (every-instance) |
| one theme button | `option` → **`item`** | ThemeSwitcher | `ThemeSwitcher.tsx:115` (every-instance) — `option` is banned (§3.6) |
| Button, IconButton, Badge, Kbd, Text, CopyButton | **no slots** | — | single-element; `className` is the surface |

---

## 8. Cross-family rulings

### 8.1 ▲ `itemIcon` + `itemIndicator` — §10's two-concept reading is **confirmed**, and its prescription is **refined**

The three usages §10 names, verified at source:

| Site | What it is |
| --- | --- |
| `menu-internals.tsx:368` | `` <span className={`${classPrefix}-item-icon`}>{icon}</span> `` — wraps the `icon` prop (`:306`, `icon?: React.ReactNode`). Content-driven, present only when the caller passes one. |
| `MultiSelect.tsx:409` | `<span className="multiselect-item__check" aria-hidden="true">{isSelected && <Check size={14}/>}</span>` — the **span always renders**, reserving the column; only the glyph is conditional on `isSelected`. State-driven, never caller-supplied, always `aria-hidden`. |
| `SearchInput.tsx:96` | `className="search-input__icon"` on a lucide component inside the control. Content-free, decorative, **not inside a repeated item**. |

**The two-concept reading is right.** The discriminators are structural, not stylistic: one is
*caller content* and appears/disappears with it; the other is *component state*, always present,
always `aria-hidden`, and reserves layout so the row does not reflow on selection. No single name
can serve both without one of them lying.

**Two corrections to §10's prescription.**

1. **`Toast` does not use `icon`.** Its public prop is `statusIcon` (`Toast.tsx:110-117`,
   destructured `:129`); `icon` is a *local variable* at `Toast.tsx:141`, and the wrapping `<span>`
   (`:183`) carries `firstLineClasses` — inline utilities, no class name, no slot today. §10's
   "SearchInput/`Toast` use `icon`" is right about SearchInput and wrong about Toast (§15.3).
2. **`SearchInput`'s glyph is not an *item* icon**, so renaming it `itemIcon` would be wrong.
   §10's literal instruction — "fix the pair as `itemIcon` + `itemIndicator`" — mis-names it.

**The ruling.** There are **two concepts and one naming rule**, which together produce three keys:

| | Frozen name | Where |
| --- | --- | --- |
| leading glyph, non-repeated element | **`icon`** | SearchInput `:96`, FileUpload `:754`, EmptyState `:62`, StatCard `:259`, Alert `:98`, Toast `:183`, Timeline `:184` |
| leading glyph, inside a repeated item | **`itemIcon`** | menu-internals `:368`, CommandPalette `:363`, AppShell.SidebarLink `:396` |
| selection indicator, inside a repeated item | **`itemIndicator`** | MultiSelect `:409` — after decision 1 the *mechanism* is the subcomponent `MultiSelect.ItemIndicator`, not a slot key. The two-concept ruling is untouched: one concept, one word, and the word is unchanged |

`icon` and `itemIcon` are **not two words for one thing** — they are one stem plus §1.3's
repeated-element prefix, applied mechanically. §10's "three words for two things" hazard is avoided,
because the third key is generated by a rule rather than chosen by a lane. **A fourth spelling
(`option-icon`, `link-icon`, `check`) is banned** (§3.6).

**A fourth usage §10 missed:** `command-palette-option-icon` (`CommandPalette.tsx:363`) — a fifth
word for the same concept. It becomes `itemIcon`. `app-shell-sidebar-link-icon`
(`AppShell.tsx:396`) is a sixth; it becomes `itemIcon` too, with the §15.2 caveat that the target is
a *component*, so the class is handed over as a prop and the caller's component decides.

### 8.2 The five menu literals, and the one with no route

`menu-internals.tsx` emits five template-concatenated class names. §8's line numbers reproduce
**exactly**: `:288` (`-content`), `:346` (`-item`), `:368` (`-item-icon`), `:388` (`-divider`),
`:408` (`-label`). Four are `cn(\`${classPrefix}-x\`, className)`; **`:368` is a bare template
string with no `cn()` and no `className` parameter** — confirmed, and it is therefore the only one
of the five that is a genuine gap. It is the `itemIcon` slot.

`classPrefix` is confirmed to be a generalisation with one value (`DropdownMenu.tsx` and
`ContextMenu.tsx` both set `"dropdown-menu"`) and already violated: `ContextMenu.tsx:81` hardcodes
`"context-menu-trigger"`, and `grep -rn 'context-menu' src --include=*.css` returns **nothing** —
no CSS file defines it. Meanwhile `grep -rln 'dropdown-menu' src --include=*.css` returns only
`DropdownMenu.css`. Both §8 claims hold.

### 8.3 `toggle` vs `chevron` — two concepts, and one class is misnamed today

| Site | Element | Ruling |
| --- | --- | --- |
| `Combobox.tsx:341-347` | a real `<button type="button" aria-label aria-expanded aria-controls>` | **`toggle`** — a pressable disclosure control |
| `AppShell.tsx:199` | a `<button>` | **`toggle`** |
| `MultiSelect.tsx:357` | `<span className="multiselect-toggle" aria-hidden="true"><ChevronDown/></span>` | **`chevron`** — decorative. The class name is misleading and the slot must not repeat the mistake |
| `Accordion.tsx:239` | a decorative glyph inside the trigger | **`chevron`** |
| `Select.tsx:66`, `NumberInput.tsx:198-230`, `DatePicker.tsx:321` | `pointer-events-none` glyphs | **`chevron`** |

A pressable control and an `aria-hidden` glyph are different concepts with different consequences
(one is a tab stop). One name for both would be the §10 failure in miniature.

### 8.4 `arrow` / `nav` → `prev`, `next`, `first`, `last`

Carousel calls them arrows (`Carousel.tsx:180,199`, one class + two modifiers). Pagination calls
them nav and puts the **same** class on four structurally different controls:

| `Pagination.tsx` | `aria-label` | Slot |
| --- | --- | --- |
| `:116-123` | `"First page"` | `first` |
| `:129-136` | `"Previous page"` | `prev` |
| `:182-189` | `"Next page"` | `next` |
| `:195-202` | `"Last page"` | `last` |

Four roles cannot share one key — a consumer hiding the edge jumps but not the steps has no route
under `nav`. Four names, all already implied by the components' own `aria-label`s and by Carousel's
`--prev`/`--next` modifiers. Nothing invented.

### 8.5 `divider`, not `separator` — and §8's `menu-separator` is wrong

Shipped when this was written: `Breadcrumbs.Separator` (`Breadcrumbs.tsx:210`),
`DropdownMenu.Divider` (`DropdownMenu.tsx:105`), `ContextMenu.Divider` (`ContextMenu.tsx:136`), and
the top-level `Divider` component (`src/components/layout/Divider.tsx`). Three to one in favour of
`divider`, including the standalone export.

**Ruling: the frozen name is `divider`.** §8's proposal to name the static menu class
`menu-separator` is refuted — it would introduce a third word and disagree with the subcomponent
that renders it. The static name is **`menu-divider`**, which is also what the class is called
today (`menu-internals.tsx:388`), so the rename costs nothing.

**Decision 2: `Breadcrumbs.Separator` → `Breadcrumbs.Divider`.** This document escalated the rename
as a breaking change and an owner call; the owner took it. `Breadcrumbs.tsx:210` is the
`Object.assign` key, `:199` the element, and `:62` the `child.type === BreadcrumbsSeparator` scan —
the caller-rendered per-gap override — so the rename touches the identity check as well as the
export, and the internal component name (`BreadcrumbsSeparator`) moves with it or the file ships one
word in the export and another in the source.

The *slot vocabulary* is unaffected either way: a `.Divider` subcomponent ships, so Breadcrumbs
takes no `divider` slot (§1.5a). What the decision buys is that the package now spends **one** word
on this concept at every level — subcomponent, slot key, class name (`menu-divider`) and top-level
export.

### 8.6 `content` means two different things, and only one keeps the word

| Site | What it is | Ruling |
| --- | --- | --- |
| `Accordion.tsx:280`, `Collapsible.tsx:138`, `menu-internals.tsx:288`, `Popover.tsx:208`, `HoverCard.tsx:239`, `Combobox.tsx:405` | the revealed/floating region | **subcomponent `.Content`** — ships in all six; no slot (§10) |
| `MultiSelect.tsx:370`, `ColorPicker.tsx:289` | the floating region, no subcomponent | **slot `panel`** |
| `Stepper.tsx:181` (`stepper-content`) | the **title + description text block** of one step | **slot `itemBody`** — not a revealed region, not a floating surface. Keeping `content` here would make the word mean three things. |
| `Wizard.tsx:228` (`wizard__content`) | the current step's region | **slot `body`** — consistent with `swimlane__body`, `timeline-body` |
| `MediaCard.tsx:93`, `Hero.tsx:125`, `Spotlight.tsx:150` | overlay text region | **subcomponent `.Content`** — all three ship |
| `CodeBlock.tsx:92` (`code-block-code`) | the `<code>` element | **slot `code`** |

### 8.7 `track` also means two things, and both keep it

`carousel-track` (`Carousel.tsx:338`) is the moving rail of items; `progress-ring__track`
(`ProgressRing.tsx:56`) and `range-slider__track` (`RangeSlider.tsx:218`) are the unfilled groove.
**No conflict arises**, because Carousel's is the shipped subcomponent `Carousel.Track` and
therefore takes no slot (§10). `track` the **slot** has exactly one meaning: the groove. Recorded so
a lane does not "harmonise" them.

### 8.8 ▲ `GroupHeader`, not `Label` — decision 3

`DropdownMenu.Label` (`DropdownMenu.tsx:106`) and `ContextMenu.Label` (`ContextMenu.tsx:137`) both
point at `MenuLabel` (`menu-internals.tsx:401`), which renders `` `${classPrefix}-label` `` at
`:408`. §8 already proposed renaming that class `menu-group-header`, matching
`command-palette-group-header` (`CommandPalette.tsx:438`) — and §15.8 recorded the residue: the
subcomponent would then be named after a word its class no longer contains.

**The owner closed it: the subcomponent is `.GroupHeader`, the class is `menu-group-header`, and the
exported type moves with them** (`MenuLabelProps` `menu-internals.tsx:399` → `MenuGroupHeaderProps`;
`MenuLabel` `:401` → `MenuGroupHeader`; the two `Object.assign` keys at `DropdownMenu.tsx:106` and
`ContextMenu.tsx:137`).

**`label` is unaffected as a *slot* name — it stays hard-banned in every family** (§3.1: 30 distinct
`*Label` props, plus three bare/required ones, plus the exported `Label` component at
`form/index.ts:48`). Decision 3 does not relax that ban; it removes the last place the word survived
as an *element identity*, which is what made the ban look inconsistent from the outside. `*Label`
props keep the word for its one legitimate meaning — an accessible name or display string — and
`itemLabel` (§6) keeps it as a prefix-generated key for the primary text *of a repeated item*, which
is a different concept from a heading *above a group of them*.

---

## 9. Casing and the `verify:slot-annotations` contract

§8's future gate asserts *"a literal annotated `(c)` has a corresponding slot, and a slot is merged
with `cn()`."* Two consequences for the vocabulary:

1. **Every element in §7 must carry its triage letter as a source annotation**, including the
   **(a)** rows. §7 item 3 as written ("every element carrying a class literal is reachable")
   cannot be satisfied while §6 Phase 3 also says a bare static class on an unreachable element is
   not a defect. Those two sentences contradict each other (§15.9); the annotation is what
   reconciles them, and §8 already assumes it.
2. **Slot keys must be statically visible.** `menu-internals`'s five template literals and
   `Table.tsx:253`'s `` `table-header-cell__sort-icon--${modifier}` `` must become static strings
   before the gate can see them.

---

## 10. Compound subcomponents

Every name below is checked against §10's rule: **a component gets `Content` the subcomponent or
`panel` the slot, never both** — read generally, per element (§1.5a).

**One (d): `MultiSelect`.** The owner took it (decision 1), against this document's recommendation
of (c). Of the other five on §5's list, **four verdicts stand** — `ColorPicker`, `Tooltip`,
`Repeater` and `FileUpload`, the last two with half of their reasoning refined — and **one loses
its reason outright and is re-opened as an owner item**: `CommandPalette` (§14.2). Decision 1 killed
a premise two of the five shared. §10.2 does that work; do not read an original reason as still
load-bearing where a replacement is given.

| Candidate | Disposition | Reasoning |
| --- | --- | --- |
| `MultiSelect` | **(d) — taken** | §10.1. The `CLAUDE.md` rule 3 objection was not waived; it is engineered around. |
| `ColorPicker` | **(c)** — stands, on its own evidence | A consumer could compose a picker with no hue strip. Hue is unrecoverable from a greyscale hex (`memory/state.md:33-36`: *"Hue is unrecoverable from `#000000`"*), so a legal composition would be a broken instrument. Nothing in decision 1 touches this: it is a correctness argument about *what a composition can express*, not about who writes the data. §10.2 sharpens it. |
| `CommandPalette` | **reason dead; re-opened as an owner item (§14.2)** | Was rejected for the same required-data-prop reason decision 1 overruled. §10.2. |
| `Tooltip` | **§4b root** — stands, untouched | Tooltip renders **one** element (`Tooltip.tsx:114-125`); the trigger is the caller's own node, cloned. §4b's answer is `className` → that one element. A compound rewrite breaks `<Tooltip content="…">` for zero new capability. (Decision 4 gives it a *second* element — an arrow — which is a slot, not a subcomponent; §4.3.) |
| `Repeater` | **(c) + the shipped render prop** — stands, **reason refined** | §10.2. |
| `FileUpload` | **(e)** — stands, on the second of its two reasons | Two of the three preview components are loop-generated (`FileUpload.tsx:669` `mediaFiles.map`, `:687` `otherFiles.map`), and the third (`:654`) is selected by internal MIME + count logic the consumer cannot predict. **The unpredictable-dispatch half is what carries it** — a flat compound surface would be a window onto three element trees that may not render. §5 offers "(d) … **or** take `renderPreview`/`renderFile`"; the second still wins. |

**Consequence for the one-way door.** This document previously concluded that the door on
*subcomponent names* could stay shut. **It is open.** Decisions 1, 2 and 3 all name or rename
permanent public API, and §10 says those names are permanent the moment Phase 3 ships. The surface
frozen here is therefore slot keys, hatch prop names **and** the subcomponent names in §10.1.

### 10.1 ▲ `MultiSelect` as a compound — and how it keeps one writer for the option list

**The objection, kept, and what happened to it.** This document recommended (c) on this reasoning:

> `options` is a required data prop (`MultiSelect.tsx:34`, `options: MultiSelectOption[]`). A
> compound that keeps `options` has **two writers for one list** — `CLAUDE.md` rule 3. Dropping
> `options` breaks every consumer. And `docs/components/multi-select.md:45` states the absence as
> design intent. `bugs/ARCHIVE.md` #498 calls the compound rewrite *"an owner's API decision and a
> breaking change"*.

**Resolved against, on the API question only.** The owner ruled (d). The rule 3 objection is *not*
waived by that ruling and does not evaporate: it is a constraint the design has to satisfy. What
follows is how.

#### The proving sibling does not prove what §5 says it proves

§5 nominates `Combobox.Input`/`.Content`/`.Item`/`.Empty` as `MultiSelect`'s proving sibling, and
§10 records that `Combobox.Content` ships. Both are true. But `Combobox` has **no required data
prop at all**:

```
sed -n '93,106p' src/components/form/Combobox.tsx
```

`ComboboxRootProps` (`Combobox.tsx:93-106`) is eleven optional props plus
`children: React.ReactNode` (`:105`). Its options exist only as `Combobox.Item` children, which
register themselves into `itemDataRef` (`:59`) as `{ value, disabled, node, label? }` (`:71-77`).
It is also **filter-agnostic by design** — its own docblock contrasts it with `MultiSelect` as
*"free-form, filter-agnostic, single value"* against *"a closed set of `options`"*
(`MultiSelect.tsx:77-79`).

**So the sibling proves that a listbox compound is achievable; it does not prove that one can
coexist with a required data prop, because it has never had one.** Say so plainly — a lane reading
§5 will otherwise copy `Combobox` and discover the difference at the point where filtering,
`labelOf` and `maxItems` need a list nobody has supplied yet.

#### What `options` is actually load-bearing for

Four things, all measured at source, and none of them is "rendering the rows":

| Mechanism | Site | Needs |
| --- | --- | --- |
| the filter | `MultiSelect.tsx:162-167` — `options.filter(o => o.label.toLowerCase().includes(q))` | every option's label as a **string**, whether or not it is currently rendered |
| chip labels | `:168-172` `labelOf` map, read at `:300` and in the remove button's `aria-label` at `:306` | the label of a **selected** value whose row may be filtered out of the DOM entirely |
| keyboard commit | `:239` — `filtered[activeIndex]` | a stable index over the *filtered* list |
| the cap | `:160` `atMax`, applied at `:386` | a count of selectable options, not of rendered nodes |

A children-only compound has none of these until its children have mounted, and the chip case never
gets them: a selected option that the current query filters out has no mounted child to ask.

#### The three shapes, and the trade-off of each

| | Shape | Trade-off |
| --- | --- | --- |
| **A** | `options` becomes optional when children are present | Two code paths for one list, and the type cannot express "exactly one of these". This is the `CLAUDE.md` rule 3 violation in full: a consumer who passes both gets a silent winner, and every internal that reads the list (`filtered`, `labelOf`, `atMax`) needs a branch. It is also an adapter — the shape rule 3 names specifically. **Rejected.** |
| **B** | children become the only writer; `options` is deleted | One writer, but it breaks **every** consumer, and it breaks two behaviours outright rather than moving them: the filter has no label strings for unmounted options, and a chip for a filtered-out selection has no label to render. Recovering them means re-declaring the data on the children *and* keeping a registry — i.e. arriving back at A with extra steps. It would also make `MultiSelect` filter-agnostic like `Combobox`, which is the one thing its docblock says it is not. **Rejected.** |
| **C** | the subcomponents are **render-prop-shaped**: the root keeps `options` and keeps ownership of the tree; children are a function it invokes over its own already-filtered list | One writer for the data (`options`), one writer for presentation (the function). No branch, no registry, no adapter. The cost is that `MultiSelect.Item` is not free-standing JSX — it is only legal inside the callback, and that constraint has to be taught by the type and the doc rather than by the compiler alone. **Recommended, and the ruling.** |

#### C, concretely

```tsx
<MultiSelect options={opts} value={v} onValueChange={setV}>
  {({ options, selected }) => (
    <MultiSelect.Content className="w-80">
      {options.length === 0 && <MultiSelect.Empty>Nothing matches</MultiSelect.Empty>}
      {options.map((option) => (
        <MultiSelect.Item key={option.value} option={option}>
          <MultiSelect.ItemIndicator />
          {option.label} <Badge>{option.team}</Badge>
        </MultiSelect.Item>
      ))}
    </MultiSelect.Content>
  )}
</MultiSelect>
```

Five properties a lane must preserve, each of which is why this shape was chosen:

1. **`options` inside the callback is the root's own filtered list**, not a list the consumer
   supplied. The consumer maps over it; they never author it. That is the whole answer to rule 3 —
   there is exactly one writer, and the callback is downstream of it.
2. **`children` becomes optional**, defaulting to today's tree. `MultiSelectProps` currently
   `Omit`s it (`MultiSelect.tsx:65-68`, `"onChange" | "defaultValue" | "children"`), so this is
   additive for every existing consumer: nothing passing `options` alone changes behaviour.
3. **`MultiSelect.Item` takes the `option` and reads the rest from context** — index, `optionId`
   (`:222`), the `listRef` registration (`:392`), `role="option"`, `aria-selected`,
   `aria-disabled`, `data-active`/`data-selected` and `getItemProps`. A consumer cannot omit or
   mis-wire an a11y attribute, because they never write one.
4. **`MultiSelect.Content` renders the portal and the listbox chrome from context** —
   `FloatingPortal` `:363`, `getFloatingProps` `:365`, `id={listboxId}` / `role="listbox"` /
   `aria-multiselectable` `:367-369`, `floatingStyles` `:371`, and the `onMouseDown` focus guard
   `:374-376`. A composed listbox cannot be missing them either.
5. **The failure mode of omitting `.Content` is visible, not silent** — the listbox never opens, and
   `aria-controls` points at nothing on the first interaction. This is the distinction that keeps
   the `ColorPicker` rejection intact rather than undercutting it: a `ColorPicker` composed without
   `.Hue` *works*, looks finished, and is silently unable to express hue (`memory/state.md:33-36`).
   Composition hazards are not one category; a hazard you meet on the first click is not the hazard
   that ships.

#### The names, and every one checked

| Subcomponent | Element | Ban-list check (§3, §3.6) | Precedent |
| --- | --- | --- | --- |
| `MultiSelect.Content` | `:370` | `content` is *reserved for exactly this* | `Combobox.Content` `Combobox.tsx:540`, plus nine more (§3) |
| `MultiSelect.Item` | `:400` | `option` is banned (§3.6 — `role="option"` is an ARIA role, not an element identity); `item` is the §6 name | `Combobox.Item` `:541`. **Ten components already ship `.Item`** — `grep -rn '^  Item:' src/components --include=*.tsx \| grep -v '\.test\.\|\.examples\.'` → ActivityFeed, Combobox, DropdownMenu, Spotlight, MasonryGrid, Timeline, Breadcrumbs, Carousel, Accordion, ContextMenu |
| `MultiSelect.ItemIndicator` | `:409` | `check`/`checkmark` banned (§3.6 — names the glyph, not the role) | §8.1's two-concept ruling; no shipped precedent, so this one is **new public API and permanent** |
| `MultiSelect.Empty` | `:380` | — | `Combobox.Empty` `:542` |
| `MultiSelect.Tag` | `:299` | `chip` banned (§3.6 — `TagRejection` `TagInput.tsx:23`, `maxTags` `:59`, `validateTag` `:60`); `multi-select.md` says "chip" 23 times and **the code wins** (§3.2) | class `multiselect-tag` `:299`; `TagInput`'s slot `tag` (§1.3) |
| `MultiSelect.TagRemove` | `:307` | — | class `multiselect-tag__remove` `:307`; slot `tagRemove` |

**No `.Root`** — §4a bans `root`; the compound is `Object.assign` onto the root function, exactly as
`Combobox.tsx:538-543` does it. **No `.Input`, `.Control`, `.List` or `.Chevron`**, and the reason
is the discriminator that generated the table above:

> **A subcomponent where the consumer must supply *content*. A slot where they only need to change
> *class*.**

`multiselect-control` (`:268`), `multiselect-tags` (`:297`), `multiselect-input` (`:337`) and
`multiselect-toggle` (`:357`) have no consumer-authored content — and the input in particular
carries four invariants a consumer cannot see (`getReferenceProps`, the `aria-activedescendant`
wiring at `:334`, `readOnly: !searchable` at `:339`, and the Backspace-peel handler at `:243-250`).
They keep slots (§7.1). **This is a deliberate divergence from `Combobox.Input`, and it is
permanent**: moving an element from a slot to a subcomponent later is breaking in both directions.

**The precedent for siblings.** Any form component that later wants a compound gets the same
construction, not a copy of `Combobox`: keep the data prop, invoke the children, name the parts from
§6. `Select`, `TagInput` and `Repeater` are the near siblings; none is proposed here, and the point
of writing the construction down is that the next one does not have to re-derive it — or re-argue
rule 3.

#### The doc that refutes this, and what has to change

`docs/components/multi-select.md:45` states the absence as design intent:

> *"There is no sub-component and no render prop: `children` is omitted from the prop type, so the
> list is data, never JSX."*

Per `memory/README.md` §7 and plan §13 that is a **refutation to answer, not staleness to delete**.
Precisely what has to change, for the Phase 3 lane that implements decision 1 (**not for this
document**):

1. **The sentence is answered, not removed.** The half that survives is *"the list is data"* — that
   is exactly what shape C preserves, and it is now the load-bearing half. The half that dies is
   *"there is no sub-component and no render prop"*.
2. **`children` is no longer omitted from the prop type**, so the props table at `:40-42` ("…rest —
   `<div>` props minus `defaultValue` / `children`") is wrong the moment the code lands and must
   move in the same commit.
3. **The `chip` prose (23 occurrences, §3.2) collides with `MultiSelect.Tag`.** It was a Phase 5
   doc item while the mismatch was prose-vs-class; a subcomponent named `Tag` in a page that says
   "chip" 23 times is an API-vs-prose mismatch, which is worse. It moves into the same lane.
4. **`bugs/ARCHIVE.md` #498 gets nothing.** It is already correct — it called the compound *"an
   owner's API decision and a breaking change"* and declined to make it. The archive is the
   authoritative record of that refutation; restating the outcome there would be a second source of
   truth (`memory/README.md` §20).

### 10.2 What decision 1 does to the other five rejections

The premise the owner overruled is *"a required data prop makes (d) a two-writers violation."* Of
the five rejections that remain, it was load-bearing for exactly **one** — `CommandPalette`. A
second premise moved with it: §5's loop test read as *"(d) is structurally impossible"*, which
§10.1 shows is too strong, and that one was load-bearing for **two** more (`Repeater`,
`FileUpload`). Each of the five is re-examined below on its own evidence.

**`CommandPalette` — the reason is dead, and the question re-opens.** Its rejection was: *"`items:
CommandItem[]` is a required data prop (`CommandPalette.tsx:38`). Same `CLAUDE.md` rule 3 argument
as `MultiSelect`."* That argument is now overruled, and §10.1's construction transfers exactly:
`items` stays the writer, children are invoked over the already-filtered list. What is genuinely
different, measured:

- **Two of the three content channels already ship.** `emptyMessage?: ReactNode`
  (`CommandPalette.tsx:42`, defaulted `"No results"` at `:99`, rendered `:447`) and
  `filter?: (item, query) => boolean` (`:40`). `MultiSelect` has neither — its empty row is a
  hardcoded `"No options"` (`MultiSelect.tsx:380-382`) and its filter is not injectable
  (`:162-167`).
- **The third channel is the row, and §11 already routes it as (e) `renderItem`** — replacing the
  private closure at `:338`, which a consumer cannot reach.
- **Its group structure is derived from the data too** (`item.group` → `groups`, rendered `:423-444`)
  and the `role="group"` ownership is explicitly load-bearing at source (`:334-336`: *"A listbox
  owns its options directly, or through a `role="group"` that is itself a direct child. An
  intervening list element breaks that ownership"*). Under shape C the root keeps rendering that,
  so the invariant survives — but it means a `CommandPalette` compound buys **one** channel over
  what §11 already prescribes, where `MultiSelect`'s bought three.

**Ruling: not mine to close.** The stated reason is gone, so leaving the (c) verdict standing on it
would be a superseded ruling — exactly what this document must not contain. **My recommendation is
(d)**, matching `MultiSelect`: two components with one anatomy — data-supplied options, a query
filter, an empty row, a floating surface — shipping under two different mechanisms is the §10 failure
one level up from class names, and "the marginal gain is only one channel" is an argument about
size, not about correctness. But it is a breaking public-API change of exactly the class the owner
just reserved to themselves, so it goes to **§14.2**, and a lane must not start `CommandPalette`
until it closes.

**`Repeater` — verdict stands, reason refined.** It was rejected because *"rows are loop-generated
(`Repeater.tsx:226` `array.fields.map`), so (d) is structurally impossible by §5's own loop test."*
§10.1 shows that reading of the loop test is too strong: **loop-generation forbids *free-children*
(d), not (d) as such** — shape C is a compound over a loop. The refined reason is that `Repeater`
needs nothing from it: the render prop already ships (`children: (item: RepeaterItem) => ReactNode`,
`Repeater.tsx:87`), its rows' content is the *consumer's own fields* rather than library-rendered
text, and its remaining internals are covered by slots plus the `itemActionProps` hatch (§13.3).
There is no library-owned row content to name, which is what a subcomponent would be for.

**`FileUpload` — verdict stands, on its second reason.** Same refinement applies to its loop half;
the unpredictable-dispatch half is untouched and is what carries it (table above).

**`ColorPicker` — verdict stands, on evidence decision 1 never touched.** Its rejection was never
about who writes the data; it is about what a *legal composition* can express. §10.1's fifth
property states the line explicitly, and `ColorPicker` sits on the wrong side of it.

**`Tooltip` — untouched.** Its rejection is §4b, not rule 3.

---

## 11. The (a)–(e) triage table

Loop test applied first, then the second test — **does the element have *no* override path, or
merely a *different* one?** Component doc read before classifying, per §5.

| Candidate | §5's expectation | **Ruling** | Evidence |
| --- | --- | --- | --- |
| **`MultiSelect`** — 10 internals *(count reproduces exactly: `multiselect-control`, `-tags`, `-tag`, `-tag__remove`, `-input`, `-toggle`, `-content`, `-empty`, `-item`, `-item__check`)* | (d) | **(d) × 6 + (c) × 4** — §5's expectation, taken by the owner (decision 1). This document ruled **(c) × 10** and recommended against; **resolved against, and the reasoning is preserved and answered in §10.1.** | `className` destructured `:98`, merged only at `:256` — no internal has any route (`bugs/ARCHIVE.md` #498 measured this). **(d):** `-content` `:370` → `.Content`; `-item` `:400` → `.Item`; `-item__check` `:409` → `.ItemIndicator`; `-empty` `:380` → `.Empty`; `-tag` `:299` → `.Tag`; `-tag__remove` `:307` → `.TagRemove`. **(c):** `-control` `:268`, `-tags` `:297` → `list`, `-input` `:337`, `-toggle` `:357` → `chevron`. The loop-generated elements (`:299`, `:400`, `:409`, `:307`) are reachable as (d) **only** in §10.1's shape C — the root invokes the children over its own filtered list, so §5's loop test is satisfied rather than overridden. |
| **`ColorPicker`** — §5 says 13 | (d) | **(c) × 11 + (a) × 1**, and the count is **12**, not 13 | 13 reproduces only by counting the **root**; excluding the root and the two `--modifier` classes there are **12** internal class names, on 12 elements. `grep -oE 'colorpicker[a-zA-Z0-9_-]*' src/components/form/ColorPicker.tsx \| grep -v -- '--' \| sort -u \| wc -l` → 13 including root. `colorpicker-row` (`:367`) ruled **(a)**. |
| **`CommandPalette`** — 11 + a `renderOption` closure | (d) | **(c) × 10 + (e) × 1 — provisional; the (d) question is re-opened (§14.2).** | 11 reproduces including the root → **10 internals**. `renderOption` confirmed a local `const` at `:338`, unreplaceable. Loop-generated: `:352, :363, :367, :369, :436, :438`. ~~`items` is data → no (d)~~ — **that reason died with decision 1** (§10.2); the verdict now rests on the two content channels that already ship (`emptyMessage` `:42`, `filter` `:40`) plus `renderItem`, and the owner has the call. |
| **`Tooltip`** — 1 literal / 10 unreachable declarations | (d) | **§4b root — none of (a)–(e).** | `Tooltip.css` has exactly **10 declarations** (`:2-11`) and `Tooltip.tsx:116` is the only literal — both reproduce. `TooltipProps` (`:26-38`) has no `className`, no `ComponentProps`, no rest spread → `<Tooltip className>` **is** a TS error, and `docs/components/tooltip.md:27` documents the absence (*"no `className`"*). The bubble is the only element Tooltip constructs, so §4b hands it `className`. **No compound.** §5's taxonomy has no bucket for this (§15.5). **Amended by decision 4:** with `arrow` set, Tooltip constructs a *second* element, so it takes `className` (the bubble) **plus** `classNames.arrow` — one slot, not none (§4.3). The "one element" premise was true when written and is what the decision changes. |
| **`Repeater`** — 5 internals | (d), and "a passed `className` is a TypeScript error" | **(c) × 4 + (a) × 1**, and **the TS-error claim is false** | `RepeaterProps` (`:77-127`) **contains `className?: string` at `:126`** and it is merged at `:221` (`cn("flex flex-col gap-r4", className)`). `docs/components/repeater.md:48` lists it in the props table and `:58-60` documents the behaviour. What *is* a type error is `ref` and rest props — which is what §11 says, correctly. Rows loop-generated (`:226`); render prop already at `:87`, and the row content is the *consumer's own fields*, so there is no library-owned content for a subcomponent to name (§10.2 — the loop test alone no longer carries this). Live region `:308` → (a). |
| **`FileUpload`** — 27 internals | (d), "not as 27 slots" | **(c) × 12 + (e) × 2 + (b→`data-*`) × 6 + (a) × 1** | 27 reproduces **exactly** (method: distinct `file-upload*` tokens in the `.tsx`, minus the root and the 6 `--modifier` classes). 12 chrome slots the root always or conditionally renders; 15 internals live inside the three private components → `renderPreview` + `renderFile`; 6 root modifiers → `data-*`; `:801` `sr-only` input → (a). |
| **`CalendarBase`** — 15 internals, 9 loop, 6 chrome | "6 slots + 3 applied-to-every-instance + `renderDay`" | **(c) × 16 + (e) × 1**, and the 6/9 split has a different membership | 15 **elements** reproduces; 17 **class names** (`:657` carries two). 9 loop-generated, but **only 8 are in `renderMonthGrid`** — the 9th is `calendar-picker-cell` (`:222`, from `renderMonthsView`/`renderYearsView` `:498`/`:517`). `-month-caption` is **not** rendered once: it is inside `renderMonthGrid` at `:541`, guarded `monthCount > 1`. The 6th once-rendered element is `calendar-picker-grid` (`:213`), which §5 omits (§15.4). |
| `MediaCard.Image` container | not listed | **(c)/§4b** | `MediaCard.tsx:52` — the container has **no** route while `className` goes to the `<img>` at `:56`. §4b inverts it. |
| `AppShell` scrim | §10 said `scrim` was (b) | **(c)** | `AppShell.tsx:275` — a real element with no route (§3.4). |
| `Accordion`/`Collapsible` content clipper | not listed | **(a)** | `Accordion.css:94-96` is `overflow: hidden` only; the outer box animates `grid-template-rows` (`:91-92`). No caller `className` reaches it, and varying `overflow` breaks the animation. |
| `ColorPicker` panel row | not listed | **(a)** | `ColorPicker.tsx:367` — a two-child flex row inside a fixed instrument panel. Reflowing it does not produce a usable picker; the `panel` slot restyles the surface. |
| `Rating` star internals | not listed | **(a) × 4** | `Rating.tsx:73-76` — `rating-star`, `-star-base`, `-star-fill`, `-star-fill-icon` implement a clipped partial fill driven by `style={{ width }}` (`:75`). A class cannot participate; a consumer changing them breaks the fill fraction. |
| `Timeline`/`ActivityFeed` marker + gutter | not listed | **(b)** / **(a)** | §5, on the source docblocks at `Timeline.tsx:146-158` and `ActivityFeed.tsx:39-49`. |
| `Sparkline` internals | not listed | **(a)+(b) × 4** | `Sparkline.css:6-8,13` documents the `currentColor` route (§5). |
| `ProgressRing` colour modifiers | not listed | **(a) × 5** | `ProgressRing.css:25-42` — driven by the `color` prop. |
| Nine `sr-only role="status"`/`role="alert"` regions | §10 named 2 | **(a) × 10** | `TagInput.tsx:471` · `Repeater.tsx:308` · `CommandPalette.tsx:411` · `AvatarUpload.tsx:331` · `Toast.tsx:185` · `Alert.tsx:97` · `StatCard.tsx:150` · `Rating.tsx:237` · `Skeleton.tsx:48` · `Table.tsx:290`. §10's reason ("exposing invites a consumer to drop `sr-only`") applies unchanged to all ten. |
| `VirtualizedDataTable` spacer rows | not listed | **(a) × 2** | `:344`, `:382` — `aria-hidden` height shims whose geometry `use-virtual-rows` computes. |
| Three bare `className="relative"` boxes | not listed | **§4b** | `Select.tsx:30` · `NumberInput.tsx:170` · `DatePicker.tsx:285` — outermost elements receiving nothing while `className` lands on the inner control. Same shape as `TagInput.tsx:378`, which §4b already names. |

**Totals, named not counted.** Of the candidates the plan flags: **six (d)** — all six on
`MultiSelect` (`.Content`, `.Item`, `.ItemIndicator`, `.Empty`, `.Tag`, `.TagRemove`, decision 1) —
**three (e)** (`renderDay`, `renderItem`, `renderPreview`+`renderFile`), and the rest (c), (b) or
(a).

**This document's earlier total was "zero (d)", and it is superseded rather than deleted.** One of
the five rejections was overruled by the owner; of the remaining four, `ColorPicker` and `Tooltip`
stand on evidence decision 1 never touched, `Repeater` and `FileUpload` stand with refined reasons,
and `CommandPalette`'s reason is gone with the verdict re-opened (§10.2, §14.2). The honest summary
is that the *conclusion* survived for four of five and the *shared premise* did not survive for two
of them.

**Decision 4 adds one element to the package that no triage row could have covered**, because it did
not exist: the floating-surface arrow on `Popover`, `HoverCard` and `Tooltip`. It is **(c)** —
floating-ui measures the element, so a consumer class that resizes it stays correctly positioned
(§4.2).

---

## 12. Retained class names

§12 stands unchanged: strip declarations, **keep the class names** as declaration-free markers.
Where this document renames a class (`menu-divider`, `menu-group-header`, `command-palette-item*`)
it is because §8 already decided to delete `classPrefix` and use static shared names, or because a
name would otherwise be a third word for a second thing. **Every other class name in §7 is
retained verbatim**, including the three `querySelector` targets, which may only be appended to.

---

## 13. The `<thing>Props` hatches

§4a: **where the target is another component, the pattern is a props hatch, not a slot.**
Library base class first, caller's last.

### 13.1 The three that already comply, and the one exception — all four verified

| Site | Type declared | Merge | Verdict |
| --- | --- | --- | --- |
| `CodeBlock` `copyButtonProps` | `:22` | `:76` — `cn("code-block-copy", copyButtonProps?.className)` | ✔ **the reference form**, both citations exact |
| `Swimlane` `viewAllProps` | `:19` | `:57` — `cn("swimlane__view-all", viewAllProps?.className)` | ✔ (§4a cites the merge site; the type is at `:19`) |
| `Table` `tableProps` | `:70` | `:87` destructures `className`, `:98` merges it | ✔ (§4a cites the type; the merge is at `:87`/`:98`) |
| `Spotlight` `imgProps` | `:103` | `:111` — `<img {...imgProps} …>`, **no class, no `cn()`** | ✘ **confirmed exception** |

**Ruling on the exception.** Take §4a's second option: **carve it out explicitly.** The rule, stated
so no lane has to guess:

> A `<thing>Props` hatch merges its `className` with `cn()` **whenever the target element carries
> any library class — BEM hook or utility.** Only a genuinely class-free element may take a raw
> spread, and the prop's docblock must say so. `Spotlight.tsx:111` is the sole class-free case.

`cn("one-static-class")` returns that string unchanged, so adding a `cn()` there would be a provable
no-op (`memory/affordances.md`), which is why the carve-out is cheaper than the base class. **Do not
describe the four as uniform** — three plus a documented exception.

### 13.2 The four worst uncovered cases — all confirmed, each given a named hatch

| Case | Verified defect | Hatch to add |
| --- | --- | --- |
| `DataTable` → `Table` | Root is a bare classless `<div>` (`DataTable.tsx:472`). `DataTableProps` (`:32-122`) has **no `className`, no `ComponentProps`, no rest spread** — `sed -n '32,122p' … \| grep -E 'className\|ComponentProps'` returns nothing. And `DataTable` **hardcodes** `tableProps={{ "aria-busy": … }}` at `:480`, so the consumer cannot reach `Table`'s own hatch either. | `className` on the root (§4b) **and** `tableProps?: TableProps["tableProps"]`, merged into the hardcoded object rather than replacing it |
| `VirtualizedDataTable` | `VirtualizedDataTableProps` (`:22-143`) has **no `className`** either. `:333` hardcodes `className="table-virtual-scroll"` and `:334` hardcodes `style={{ height, overflowY: "auto" }}` onto `<Table>`. | `className` (§4b) **and** `tableProps`, with the hardcoded `className`/`style` moved to `cn(…)` / spread-last |
| `DataTable` → `Pagination` → `IconButton` | Three levels. `DataTable.tsx:319-324` passes `<Pagination>` **no** `className`, and its wrapper is `cn("mt-r3 flex justify-center")` — a `cn()` around a lone static string, a provable no-op. `Pagination.tsx:120,133,186,199` hardcode `className="pagination__nav"` on four `IconButton`s. | `paginationProps?: Omit<PaginationProps,"page"\|"totalPages"\|"onPageChange">` on `DataTable`; the four `IconButton`s become `classNames.first/prev/next/last` on `Pagination` (§8.4) |
| `TagInput` → `Badge` | `TagInput.tsx:409` — `<Badge key={…} role="listitem">` carries **no hook whatsoever**. | `badgeProps?: Omit<ComponentPropsWithRef<typeof Badge>,"children">`, merged `cn("taginput-tag", badgeProps?.className)` |

### 13.3 Further hatches this pass found

| Case | Why a hatch, not a slot | Prop |
| --- | --- | --- |
| `MediaCard.Image` → `<img>` | after §4b moves `className` to the container (`:52`), the `<img>` (`:56`) needs a route, and it carries utilities so the merge is required | `imgProps` — same name as `Spotlight` |
| `AvatarUpload` → `Avatar` | `AvatarUpload.tsx:267` hardcodes `className="size-full"` on an inner `Avatar` | `avatarProps` |
| `StatCard.Sparkline` → `Sparkline` | `StatCard.tsx:285-288` wraps and classes an inner `Sparkline` (§9 cluster 5) | `sparklineProps` |
| `Toast` → `IconButton` | `Toast.tsx:195` hardcodes `cn("shrink-0 -mr-r6", dismissClasses)` | `dismissProps` (or `classNames.dismiss`; the hatch is preferred, the target is a component) |
| `Repeater` → `IconButton` ×3 | `Repeater.tsx:257-269+` render Move/Remove `IconButton`s with no route | `itemActionProps` |

**Naming rule for hatches:** `<camelCaseTargetName>Props`, singular, matching the element or
component it addresses — `imgProps`, `tableProps`, `copyButtonProps`, `viewAllProps`, `badgeProps`,
`avatarProps`, `sparklineProps`. **No `slotProps`** (§4a).

---

## 14. Owner decisions

### 14.1 Closed — the four taken

Recorded with their outcome so a lane meets the ruling, not the question. Each is folded into the
body; nothing here is the only place a decision lives.

| # | Question as it was put | Outcome | Body |
| --- | --- | --- | --- |
| 1 | **`MultiSelect` compound — yes or no.** This document recommended **(c)**, on the grounds that the `options` data prop makes (d) a two-writers violation (`CLAUDE.md` rule 3) and that `docs/components/multi-select.md:45` states the absence as design intent. `bugs/ARCHIVE.md` #498 had routed it to the owner. | **(d).** `.Content`/`.Item`/`.ItemIndicator`/`.Empty`/`.Tag`/`.TagRemove`. The rule 3 objection was **not waived** — it is engineered around by shape C, which keeps `options` the single writer of the data and makes children a function invoked over the root's own filtered list. The `item`/`panel`/`empty`/`itemIndicator`/`tag`/`tagRemove` slots are **removed** from §7.1. | §10.1, §7.1, §11, §1.5a |
| 2 | **`Breadcrumbs.Separator` → `.Divider`?** Two shipped words for one concept; renaming is breaking. | **Renamed.** The rename also moves the internal component name and the `child.type` identity check (`Breadcrumbs.tsx:62`). | §8.5, §7.4, §6, §3.6 |
| 3 | **`DropdownMenu.Label`/`ContextMenu.Label` → `.GroupHeader`?** The class becomes `menu-group-header`, leaving the subcomponent named after a word its class no longer contains. | **Renamed**, with `MenuLabel`/`MenuLabelProps` moving too. `label` remains **hard-banned as a slot name** in every family. | §8.8, §7.3, §6, §3.1 |
| 4 | **`arrowRef`: cover it or document it as unsupported.** Exported, documented, activatable public API that renders nothing. | **Covered.** The arrow is rendered and positioned on `Popover`, `HoverCard` and `Tooltip`, behind an opt-in `arrow` prop. `arrow` comes **off the ban list for that element only** and stays banned as a name for a direction control. | §4, §3.3, §3, §6, §7.3 |

### 14.2 Still open — two items, neither a lane's call

1. **`MultiSelectOption` vs `CommandItem`.** Two exported type names for one concept, both public
   (`MultiSelect.tsx:27-31`, `CommandPalette.tsx:20-29`). The slot vocabulary settles on `item`
   (§3.6); harmonising the *type* names is a separate breaking change and is not in this plan.
   **Decision 1 may change its shape**: `MultiSelect.Item` takes an `option: MultiSelectOption`
   prop under §10.1, so the type name moves from a data-prop element type to a *subcomponent prop*
   type — more public, not less. Decide the harmonisation before Phase 3 writes the subcomponent's
   props type, or the rename gets more expensive.
2. **▲ New: does `CommandPalette` follow `MultiSelect` into (d)?** Decision 1 overruled the reason
   this document used to rule it out (*"`items` is a required data prop"*), so the (c) verdict can
   no longer stand on what it was standing on. §10.2 lays out both sides at source and recommends
   **(d)**, matching `MultiSelect`, on the grounds that one anatomy shipping under two mechanisms is
   the §10 failure one level up. The counter-argument — that two of the three content channels
   already ship (`emptyMessage` `CommandPalette.tsx:42`, `filter` `:40`) so the compound buys one
   channel over the `renderItem` §11 already prescribes — is an argument about size, not
   correctness. **A lane must not start `CommandPalette` until this closes**, because the names are
   identical either way but the mechanism is not, and §1.5a makes the two mutually exclusive.

---

## 15. Claims in the plan I could not reproduce

Eleven. Three of them change what a lane builds — §15.1, §15.4 and **§15.12**, which is the one
that matters most now that decision 1 has been taken on the strength of a sibling.

### 15.1 §9's four families do not cover the package

§9 names `form`, `overlay`, `sequence+tabular`, `layout+media` and says Phase 3 is blocked for the
last two. Those four leave **20 modules** in no family: the nine in §2's `status`, the eight in
`primitive`, and the three in `non-visual`. Three of the twenty carry real slot surfaces
(`ProgressBar`, `ProgressRing`, `CodeBlock`); the rest are single-element components. **A lane plan
built from §9's list alone would leave `status` and `primitive` unassigned.** §2 names all ten.

### 15.2 §10's cross-family collision omits two of the six usages

§10 names three sites for the leading-glyph/indicator collision. There are **six**:
`menu-internals.tsx:368`, `MultiSelect.tsx:409`, `SearchInput.tsx:96`, plus
`CommandPalette.tsx:363` (`command-palette-option-icon`), `AppShell.tsx:396`
(`app-shell-sidebar-link-icon`) and `Toast.tsx:183` (no class at all). The two-concept reading
survives all six; the prescription needed refining for two of them (§8.1). Note `AppShell.tsx:396`
carries the §13-settled caveat from `bugs/ARCHIVE.md` #497: `icon` is `LucideIcon`, a **component**,
so the class is handed over as a prop and there is nothing to merge.

### 15.3 §10: "`SearchInput`/`Toast` use `icon` for a leading glyph" — half false

`SearchInput.tsx:96` uses `search-input__icon` ✔. **`Toast` does not use `icon` as public
vocabulary**: the prop is `statusIcon` (`Toast.tsx:110-117`), `icon` is a local at `:141`, and the
wrapping `<span>` at `:183` carries `firstLineClasses` — no class name at all. Toast is not a
third-word site; it is a **no-word** site.

### 15.4 §5's `CalendarBase` split does not close

Reproduces exactly: **15 internals** (element reading), **42 cells/month**
(`src/util/date.ts:75-81`, 6 × 7), `renderMonthGrid` at **`:535-628`**, `querySelector` sites at
`:174`, `:348`, `:366`.

Does **not** reproduce:

- **"9 are loop-generated by `renderMonthGrid`."** Nine *are* loop-generated, but only **eight** are
  in `renderMonthGrid` (`:539, :541, :548, :551, :557, :565, :596, :603`). The ninth is
  `calendar-picker-cell` (`:222`), generated by `renderMonthsView`/`renderYearsView`
  (`:498`/`:517`).
- **"6 are chrome rendered exactly once (`calendar-header`, `-label-button`, `-months`, `-footer`,
  `-today-button`, `-month-caption`)."** `-month-caption` is at `:541`, **inside `renderMonthGrid`**
  and guarded `monthCount > 1` — one per visible month, or none. It is simultaneously counted in
  the loop set and the once-set. The sixth once-rendered element is `calendar-picker-grid`
  (`:213`), which §5 omits. Same count, **different membership**.
- **"So: 6 slots + 3 applied-to-every-instance + `renderDay`."** That routes 9 of 15 elements.
  `calendar-month`, `-month-caption`, `-grid`, `-weekdays`, `-weekday` and `-week` get neither a
  slot nor `renderDay` — and `renderDay` structurally cannot address a weekday header or a week
  row. §7.2 routes all 16 class names.
- §5's `:489-500` for the preview/MIME logic is `:489-501` in `FileUpload.tsx` (the `useMemo`
  closes at `:501`). Trivial, recorded for the anchor.

### 15.5 §5's five-way triage has no bucket for `Tooltip`

`Tooltip`'s bubble is not (a) — a consumer would vary its `max-width` and `padding`. It is not (c) —
a one-key `classNames` object on a component with one element is worse than `className`. It is not
(d), (e) or (b). **The resolution is §4b: `className` → the one element the component renders.**
That is a legitimate sixth outcome and it is missing from the taxonomy, which matters because §5
says *"a lane must say which before writing code."* A lane forced to pick from five will pick (d),
which is the rewrite §11 rejects.

**Decision 4 does not disturb this.** The argument here is against a one-key `classNames` object
standing *instead of* `className` on a one-element component. Once the arrow exists, `className`
still goes to the bubble under §4b and `classNames.arrow` addresses a different element beside it
(§4.3) — two elements, two routes, no second writer.

### 15.6 §5: "a passed `className` is a TypeScript error" is **true for `Tooltip` and false for `Repeater`**

The §5 sentence covers both with one citation pair. `Tooltip.tsx:26-38` ✔ — no `className`, and
`docs/components/tooltip.md:27` documents it. `Repeater.tsx:77-127` ✘ — the type **contains**
`className?: string` at `:126`, it **is** merged at `:221`, and `docs/components/repeater.md:48,58-60`
documents it as working public API. `Repeater` also has **no `.css` file**, so
`<Repeater className="gap-r3">` works *today*, before Phase 1.

What is a type error on `Repeater` is `ref` and rest props — which is exactly what §11's follow-up
says, correctly. §5 conflated the two. `memory/ledger.md`: *"Read the component's own doc page
before filing or fixing — it is the cheapest refutation available."* This one died on the doc.

### 15.7 §5: "all 10 `Tooltip.css` declarations unreachable" — right in substance, imprecise in scope

10 declarations ✔ (`Tooltip.css:2-11`). All ten are unreachable **per instance** ✔. But
`docs/components/tooltip.md:181-187` publishes a **theme-level** override table covering six of
them (`background`→`--C-PRIMARY`, `color`→`--C-TEXT-ON-PRIMARY`, `border-radius`→`--RADIUS-SM`,
`box-shadow`→`--SHADOW-SM`, `font-size` + `line-height`→`--BodyText-2`). The four with no route at
any level are `padding` (`:4`), `max-width` (`:9`), `word-wrap` (`:10`) and `z-index` (`:11`).
Say "unreachable per instance", or the doc reads as a refutation.

### 15.8 §8's proposed static menu names contain two errors

§8 proposes `menu-content`, `menu-item`, `menu-item-icon`, **`menu-separator`**, **`menu-group-header`**.
`menu-separator` disagrees with the `Divider` subcomponent that renders it and with the top-level
`Divider` export — three words for one concept (§8.5); it must be `menu-divider`, which is also the
current name. `menu-group-header` is **correct** and matches `command-palette-group-header`, and the
residue it left — `DropdownMenu.Label` naming a class it does not share — is closed by decision 3:
the subcomponent is `.GroupHeader` (§8.8).

### 15.9 §7 item 3 and §6 Phase 3 contradict each other

§7 item 3: *"every element carrying a class literal is reachable via `className` (root) or
`classNames.<slot>`."* §6 Phase 3: *"a bare static class on an element no caller `className` reaches
is not a defect."* Item 3 is the **verifier's** contract, so as written it forbids triage (a) — and
§11 rules (a) on, named in full: `ColorPicker.tsx:367`; `Accordion.tsx:283`; `Collapsible.tsx:141`;
`DataTable.tsx:590`; `Rating.tsx:73,74,75,76`; `Timeline.tsx:183`; `ActivityFeed.tsx:70`;
`Sparkline.tsx:137,151,169,174`; the five `ProgressRing.css:25-42` modifiers; `Stepper.tsx:178`;
`Swimlane.tsx:57`; `Hero.tsx:91`; `Spotlight.tsx:115`; `AvatarUpload.tsx:296,323`;
`VirtualizedDataTable.tsx:344,382`; and the ten live regions listed in the row above.
§8's `verify:slot-annotations` already assumes the reconciliation
(*"a literal annotated `(c)` has a corresponding slot"*), so item 3 should read **"…reachable, or
annotated `(a)`/`(b)` with its reason."** Left as written, a lane satisfies its verifier by inventing
slots for non-gaps — the exact cost §6 Phase 3 warns is higher than a miss.

### 15.10 Two cross-reference errors that will send a lane to the wrong section

§7's Phase 3 row says *"slot vocabulary frozen first (**§8**)"* and §9 says *"Settle the convention
before any fan-out (**§8** vocabulary)."* §8 is **Gates**. The vocabulary is **§10**. Both pointers
are off by one section, and §10 is the one marked ▲ ONE-WAY DOOR.

### 15.11 `Combobox.tsx:537-542` is `:538-543`

§10 cites the `Object.assign` block as `Combobox.tsx:537-542` with `Content:` on `:539`; §3 of this
document repeated it. Both are **off by one**:

```
grep -n 'Object.assign(ComboboxRoot' -A 6 src/components/form/Combobox.tsx
# 538  export const Combobox = Object.assign(ComboboxRoot, {
# 539    Input: ComboboxInput,
# 540    Content: ComboboxContent,
# 541    Item: ComboboxItem,
# 542    Empty: ComboboxEmpty,
# 543  });
```

Trivial on its own; recorded because §10.1 now uses this block as the shape `MultiSelect`'s
`Object.assign` copies, and because a citation nobody re-runs is how the last set of inflated
numbers travelled (`memory/README.md` §19).

### 15.12 ▲ `Combobox` does not prove what §5's "proving sibling" column claims

§5's ▲ ONE-WAY DOOR table gives `MultiSelect`'s (d) candidacy the proving sibling
`Combobox.Input`/`.Content`/`.Item`/`.Empty`. The subcomponents exist (`Combobox.tsx:538-543`). The
inference does not: **`Combobox` has no required data prop.** `ComboboxRootProps`
(`Combobox.tsx:93-106`) is eleven optional props plus `children: React.ReactNode` (`:105`), its
option data exists only as registrations from its children (`itemDataRef`, `:59`, shape at
`:71-77`), and it is filter-agnostic by design (`MultiSelect.tsx:77-79`).

So the sibling proves a listbox compound is *achievable*; it says nothing about whether one can
coexist with `options: MultiSelectOption[]`, which is the entire question §5 was using it to settle.
**This changes what a lane builds**: a lane that copies `Combobox` inherits a design with no answer
for the filter, the chip labels or the cap (§10.1), and discovers it at the point where those three
need a list nobody has supplied. §10.1's shape C is the answer; the sibling is not.

---

## 16. What would prove this document wrong

- **An unaccounted spelling of the leading glyph.** Runnable, with its output pinned:

  ```
  for f in $(find src/components -name '*.tsx' ! -name '*.test.tsx' ! -name '*.examples.tsx'); do
    grep -ohE '[a-z][a-z0-9]*(-[a-z0-9]+)*(__)?[a-z0-9-]*icon' "$f"
  done | sort -u          # 12 stems
  ```

  All twelve are routed, and the routing is the audit:

  | Stem | `file:line` | Route |
  | --- | --- | --- |
  | `item-icon` | `menu-internals.tsx:368` | `itemIcon` |
  | `command-palette-option-icon` | `CommandPalette.tsx:363` | `itemIcon` |
  | `app-shell-sidebar-link-icon` | `AppShell.tsx:396` | `itemIcon` (target is a component — §15.2) |
  | `search-input__icon` | `SearchInput.tsx:96` | `icon` |
  | `file-upload__icon` | `FileUpload.tsx:754` | `icon` |
  | `timeline-icon` | `Timeline.tsx:184` | `icon` |
  | `empty-state__icon` | `EmptyState.tsx:62` | **no slot** — `EmptyState.Icon` ships |
  | `stat-card__icon` | `StatCard.tsx:259` | **no slot** — `StatCard.Icon` ships |
  | `stat-card__trend-icon` | `StatCard.tsx:215` | `trendIcon` (family-owned) |
  | `table-header-cell__sort-icon` | `Table.tsx:253` | `sortIcon` (family-owned) |
  | `file-upload__preview-file-icon` | `FileUpload.tsx:368` | inside `FilePreviewItem` → `renderFile` **(e)** |
  | `rating-star-fill-icon` | `Rating.tsx:76` | **(a)** — clipped partial fill (§11) |

  A thirteenth stem, or any of the twelve landing on a second route, means §8.1 is incomplete.
- **A slot name in §7 that is not in §6 and not listed as family-owned.** That is §1.5 broken.
- **A `MultiSelect` compound in which the option list has two writers.** The cheapest check is the
  type: if `MultiSelectProps` ends up with both a `options?:` and a children channel that can
  *supply* options — rather than a children channel invoked *over* options — shape A was built
  instead of shape C and §10.1 is broken (`CLAUDE.md` rule 3). The runtime tell is a rendered chip
  whose label is blank for a selection the current query filters out.
- **A slot key on `MultiSelect` named `item`, `panel`, `empty`, `itemIndicator`, `tag` or
  `tagRemove` after Phase 3 ships.** Each is a second writer for an element a subcomponent already
  reaches (§1.5a). The same check on `Popover`/`HoverCard`/`Tooltip` runs the other way: an
  `.Arrow` **subcomponent** beside `classNames.arrow` breaks the identical rule.
- **`docs/components/popover.md:85` still saying there is no arrow element after decision 4
  ships.** A false cannot is the worst doc-rot shape (`memory/README.md` §21), and this one is
  pre-identified, so shipping it is a choice.
- **Any name in §3 appearing as a `classNames` key once Phase 3 lands.** `verify:slot-annotations` should be extended to assert the ban list, since it is the half of §10 that no gate can see today (`memory/README.md` §8: *"When the thing at risk is a claim rather than a behaviour, write the gate that asserts the claim."*).
- **`grep -rn classNames src/components` returning non-zero before Phase 1 lands.** That is §0 constraint 2 broken and this document being read as permission.
