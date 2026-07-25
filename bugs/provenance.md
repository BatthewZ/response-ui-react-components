# Provenance

**Clean (no findings):** Stack, FormActions, Tabs, Divider, Grid, Center, Container, Row, Spacer,
Label. (Not proof of correctness — just nothing surfaced.)

> **Batch G (2026-07-25)** added no names to that list and removed none: CodeBlock, EmptyState,
> Hero, MediaCard and Swimlane each carry findings below (#148–#177).
>
> **Batch H (2026-07-25)** added none and **removed `ProgressRing`**. Documenting `ProgressBar`
> meant measuring its track, and the same measurement applied to `ProgressRing`'s track — which
> is the same defect one step less bad (#210). ProgressRing had sat on this list since batch A
> purely because nobody had measured it. MasonryGrid, Carousel, Spotlight, ProgressBar and
> Rating all carry findings below (#178–#220).
>
> **Batch I (2026-07-25)** added none and removed none. SearchInput, NumberInput, OTPInput,
> TagInput and Repeater all carry findings below (#221–#262), and documenting them also put the
> first measured numbers on two *shared* form-control token pairs (#241, #242) and on
> `form-store`'s array mutations (#256). `Label` stays on the list: batch I refuted a claim in
> `label.md` (association is necessary but not sufficient for an accessible name), but that is a
> defect in two *other* components' markup, not in `Label`, which is a faithful passthrough.
>
> **Batch J (2026-07-25)** added none and removed none. MultiSelect, Combobox, ColorPicker,
> RangeSlider and Wizard all carry findings below (#263–#309), three of them high. The batch also
> **narrowed one previously-logged claim**: `multi-select.md`'s first draft said `name` was typed
> and then dropped on the wrapper. It is not — `name` is absent from `HTMLAttributes<HTMLDivElement>`,
> so `<MultiSelect name="…">` is a compile error (verified with `tsc`: *Property 'name' does not
> exist*). Only `id` and `aria-labelledby` compile and land on the wrapper. #263 is scoped to those
> two; the page was corrected. This is the mirror of #245/#246 and worth keeping straight: a `div`
> rest-spread hides *fewer* props than an `input` one, because the `div` prop set is smaller.
>
> **Batch K (2026-07-25)** added none and removed none. Calendar, RangeCalendar, DatePicker,
> DateRangePicker and Timeline all carry findings below (#310–#348). Nine of them (#310–#318) sit
> in **`CalendarBase`**, the internal shared grid, not in either calendar — two authors reported
> them independently against their own component and they are merged here once. `Timeline` (#340)
> is the **third confirmed victim** of the `ScrollReveal` rest-prop drop, after `Swimlane` (#171)
> and `MasonryGrid.Item` (#178): three of the three components audited that render `ScrollReveal`
> with a rest spread have it, and all three hide it behind the same `animate={false}` test path
> (#185, #347). `DatePicker` (#328) and `DateRangePicker` (#333) are one defect twice: floating
> reference props spread onto a text input that has no interaction registered to open the dialog.
> The batch also **narrowed two claims its own pages made**: a `formatOptions` the parser cannot
> read back does *not* make the fields read-only — a complete typed date still commits, measured
> on both pickers; only the displayed text is uneditable (#338, and the same correction in
> `date-picker.md`). And `DateRangePicker`'s popover does **not** stay open when focus tabs past
> it: measured, tabbing out closes it, exactly as `date-picker.md` already said.
>
> **Batch L (2026-07-25)** added none to the list and removed none. Table, DataTable,
> VirtualizedDataTable and AvatarUpload all carry findings below (#349–#386), three of them high.
> The batch's structural finding is that **`Table`'s root spreads every caller prop onto its
> wrapper `<div>` and gives the `<table>` nothing** (#349) — which is not just a naming problem
> for `Table`: it is why `VirtualizedDataTable` cannot be given an `aria-rowcount` from the call
> site (#372), and, paired with the wrapper being the sticky header's own scrollport, why
> `stickyHeader` is inert on `Table` (#352) and unreachable on `DataTable` (#361). Both sticky
> findings were reported as *reasoned*; they were confirmed in real Chromium — with the wrapper at
> content height a 200px page scroll moves `<thead>` by exactly −200px (it does not pin), and a
> `max-height` on the wrapper makes it pin. **`sort?: SortState` is one defect logged twice**
> (#357 high, #370): the type cannot hold the `null` that `onSortChange` emits, so the idiomatic
> `sort={sort ?? undefined}` is *already uncontrolled on mount*, every click taken in that state
> seeds the internal sort, and the click meant to **clear** the sort instead hands ordering back
> to the component. The batch also **refuted one of its own pages**: `virtualized-data-table.md`
> said the reorder needed "the next header click" and then "snaps back when the new `sort` prop
> arrives" — measured, neither is true (no further click is required, and the prop that arrives is
> `undefined`, so nothing puts it back). The page now carries the measured account, which matches
> `data-table.md`'s.
>
> **Batch M (2026-07-25)** added none to the list and removed none. AppShell, CommandPalette and
> FileUpload all carry findings below (#387–#420), four of them high. The batch is unusual in one
> respect: the adversarial re-read **refuted nothing** — every one of the five staked claims per
> component reproduced under a real render, and so did the neighbour claims (Drawer/AppShell/
> CommandPalette all read `--OVERLAY-SCRIM-COLOR`; AppShell is the only direct `./Portal` importer;
> scrim/panel z-indices are 49/50). The recurring shapes are all here again: the
> **rest-spread-after-own-handler** pattern kills `AppShell.Toggle`'s open (#390) and *all four* of
> `FileUpload`'s interactions including the file picker (#407, high) — the same shape as #245 / #380;
> the **accept-as-exact-string** defect that broke AvatarUpload (#379) is byte-for-byte the same in
> `FileUpload` (#408), so `["image/*"]` rejects every file the dialog offered in both; and the
> **status/selection-by-colour + surface-ramp** family claims two more keyboard indicators — the
> CommandPalette highlight is a 1.08–1.16:1 wash with no focus ring under virtual focus (#398, high,
> exactly Combobox #275 / MultiSelect #264 one step up the ramp), and AppShell's *active* link is
> **less** legible than a resting one in `events`/`grimdark` (#393). The contrast audit also puts a
> number on a **fifth token family**: the contract's own paired status foreground/background tokens
> (`--C-STATUS-SUCCESS`/`-BG`, `--C-STATUS-ERROR`/`-BG`) fail AA at body-text size in `default` and
> `events` (#415) — five token families measured, five failures. The batch's sharpest structural
> finding is `AppShell.Main` shipping as a bare `<div>` with no `<main>` and no `role` (#389), so a
> shell assembled from the documented parts has a `banner` and a `navigation` landmark but no main
> landmark and no skip-link target at all.
