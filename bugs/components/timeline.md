# timeline — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 340 · Timeline — every prop on `Timeline.Item` is dropped unless animation is off (high)

`TimelineItemProps` is `Omit<ComponentPropsWithRef<"div">, "title">`, so the type accepts the whole
`div` surface — but on the default path the component renders `<ScrollReveal {...props}>`, and
`ScrollReveal` (#9) spreads nothing onto the element it renders. Measured:
`<Timeline><Timeline.Item id="evt-1" role="listitem" aria-label="Order placed" data-status="done"
style={{opacity:.5}} tabIndex={0} onClick={h} className="mine"/></Timeline>` renders **exactly**
`<div class="scroll-reveal-hidden timeline-item mine">` and a click fires `h` **zero** times; with
`animate={false}` every attribute lands and the click fires once. So list semantics, test hooks,
analytics selectors and click handlers all compile, work in whatever test was written with
`animate={false}`, and then silently do nothing in production. Third confirmed instance of the
`ScrollReveal` pattern after `Swimlane` (#171) and `MasonryGrid.Item` (#178).
**Fix:** spread `...rest` in `ScrollReveal` (the shared root cause), or have `Timeline.Item` render
its own `div` and pass only `className`/`children` to `ScrollReveal`.

### 341 · Timeline — the vertical rhythm reads the `r`-scale backwards (med)

On the responsive scale a *lower* number is a *larger* value. `.timeline-item` takes
`padding-bottom: var(--R-SIZE-6)` — `0.25rem` at every width, the smallest step — while
`.timeline-date` takes `margin-bottom: var(--R-SIZE-1)` — `2.25rem` rising to `6rem` at the 40rem
breakpoint, the largest. A three-event timeline on a desktop viewport therefore renders **96px**
between "12 March" and "Order placed" and **4px** between one event and the next, so the date
detaches from its own entry and the entries run together. The nearest sibling component,
`ActivityFeed`, spends the same two tokens in the opposite roles (`--R-SIZE-3` for its row gap,
`--R-SIZE-6` for its tightest inner gap), which is what the values look like when they are the right
way round. Nothing in the public API changes either one, and a Tailwind override is blocked by the
layer order (`Timeline.css` is unlayered; utilities are in `@layer utilities`).
**Fix:** swap them — `--R-SIZE-3` or `--R-SIZE-2` for the item gap, `--R-SIZE-6` under the date.
