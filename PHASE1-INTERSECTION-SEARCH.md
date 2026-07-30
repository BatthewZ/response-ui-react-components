# Phase 1 — the property-intersection search

> ## ⚠ STATUS: WRITTEN BEFORE THE IMPLEMENTATION. SUPERSEDED WHERE MARKED.
>
> This document is the **pre-implementation search record**, kept because plan §7's Phase 1 DoD
> requires "the property-intersection search recorded with direction per rule". It is committed as
> **evidence of what was searched and found**, not as a description of the tree you are looking at.
>
> **Phase 1 has since landed, and it changed the things this document measured.** Every figure below
> was taken against the *unlayered* tree. `Stagger.css` no longer exists, `Tabs.css`'s three
> scrollbar declarations were deleted, `Timeline` no longer emits a foundation `.fade-*` class,
> `Grid.tsx`'s second import is gone, and two `!important` declarations were added. So the counts
> moved. Corrections to statements the implementation **falsified** are marked inline as
> **`⚠ SUPERSEDED`** / **`⚠ CORRECTED`**; the original sentence is left standing beside each, per
> `memory/ledger.md` ("preserving refutations in place"). Everything not marked is either still true
> or is a historical measurement, and a historical measurement is not a claim about today.
>
> **Where current truth lives:** `PLAN-overridability.md` §13 (settled outcomes, do not re-derive),
> `AGENTS.md` (the layering decision, the `!important` admission test, the focus-ring decision), and
> `memory/` (the lessons). **Do not cite a number from this file as current** — re-run its command.

Gates Phase 1 of `PLAN-overridability.md`. The plan's §6 requires the row set to be **derived from a
search over source and its count asserted**, because "a probe's row list is an allowlist, and the rows
nobody wrote are the ones that ship" (`memory/gates.md`).

This document is that search. It is **read-only** — no `.css`, `.ts` or `.tsx` file was modified, and
it proposes no fixes.

**Every number below carries the command that reproduces it.** All commands are run from
`response-ui-react-components/`. Where a number depends on how you count, the method is stated beside
it. All browser measurements were taken against the probe's own two builds
(`node scripts/probe-cascade-layer.mjs --keep`, then a throwaway fixture in `/tmp` — since removed,
along with `scripts/.cascade-probe/`).

## Headline

| | Count |
| --- | --- |
| Confirmed regressions **(A)** | **11** — the probe's 8, plus **3 new** |
| New (A) rows the probe has no fixture for | **3** — A-1 `timeline-right-animation` (fixture in §7 R1), A-2 `tabs-thumb-hover-color` (§7 R2), A-4 `Grid.css` double import (**not probe-shaped** — §7 R5) |
| Confirmed no-op inversions **(B)** | **9** |
| Probe rows my method rediscovers independently | **9 of 11** |
| Probe rows my method **structurally cannot** see | **2** — `switch-ring-vs-consumer-reset` and its `switch-ring-baseline` control |
| Probe rows found to be **vacuous** (cannot come back red) | **1** — `control-sronly-padding` |

The single most important structural finding: **`Grid.css` cannot be moved into `@layer components` by
editing `src/styles.css`**, because `Grid.tsx:5` imports it a second time through the JS graph, where
it lands unlayered and wins. The probe builds CSS only and can never see this.

Three things to read before acting on any row:

- **§1.4** — what this method cannot see. Two of the probe's rows are in that blind spot, and my first
  pass missed a third (§1.3).
- **§5.0** — a correction to my own B-6 row, kept in place. One measured "change" turned out to sit in
  a markup state `AppShell.tsx` cannot render. It is the reason **§1.4 item 10** exists: a property
  intersection is not a finding until someone checks the state is reachable.
- **§6** — the probe's `control-sronly-padding` row is **vacuous**: it cannot come back red, and plan
  §6 currently cites it as evidence.

---

## 1. Method

### 1.1 What the search is

For **every declaration in this package's 46 component CSS files**, find every declaration that
(a) sets the **same property**, (b) **can land on the same element**, and (c) sits in a stratum whose
rank relative to `@layer components` **differs from its rank relative to unlayered**. Then record the
**direction**: does the winner change, and does the *value* change with it.

Two competitor populations satisfy (c), and they are the only two:

| Competitor | Rank today (ours unlayered) | Rank after Phase 1 (ours in `@layer components`) |
| --- | --- | --- |
| **Unlayered** rules in `../response-ui-css/src/` | tie on layer → specificity, then source order | **foundation wins**, at any specificity |
| **`@layer utilities`** — Tailwind utilities generated from *this package's own* TSX | **we win**, at any specificity | **utility wins**, at any specificity |
| `@layer base` in `../response-ui-css/src/` (2 blocks) | we win | we win — `base` < `components` |

The third row is why the foundation's two `@layer base` blocks are out of scope: the winner is the
same before and after. `@layer theme` and `@layer properties` likewise.

Two claims underpin the whole table, and both were verified against the layered build rather than
assumed:

1. **The emitted layer order is `properties < theme < base < components < utilities`.** So
   `@layer components` outranks the foundation's `@layer base` and is outranked by `@layer utilities`.
2. **The foundation's rules really are unlayered in the built output**, emitted *after* the
   `utilities` block closes — not folded into a layer by the bundler.

The command below recomputes both. **It prints offsets; do not quote them.** They move on every
build, and citing them is the self-invalidating evidence `memory/ledger.md` records — the
*ordering* is the claim, and the script is how you re-derive it.

```
node scripts/probe-cascade-layer.mjs --keep
node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");
 const span=i=>{let d=0;for(let k=i;k<s.length;k++){if(s[k]==="{")d++;else if(s[k]==="}"){d--;if(!d)return k;}}};
 const u=s.indexOf("@layer utilities{"), uEnd=span(u);
 const at=p=>s.indexOf(p);
 const order=["@layer properties","@layer theme{","@layer base{","@layer components{","@layer utilities{"];
 console.log("layer order as emitted:", order.filter(p=>at(p)>-1).sort((a,b)=>at(a)-at(b)).join(" < "));
 for (const p of [".mono-font{","body:has(dialog[open].no-body-scroll)"])
   console.log(p, at(p)>uEnd ? "AFTER the utilities block => UNLAYERED (expected)" : "INSIDE a layer => the model in this document is WRONG");
' scripts/.cascade-probe/layered/dist/assets/*.css
rm -rf scripts/.cascade-probe
```

Expected output:

```
layer order as emitted: @layer properties < @layer theme{ < @layer base{ < @layer components{ < @layer utilities{
.mono-font{ AFTER the utilities block => UNLAYERED (expected)
body:has(dialog[open].no-body-scroll) AFTER the utilities block => UNLAYERED (expected)
```

**`!important` is absent from both packages, so no important-layer reversal exists anywhere.**

```
grep -rn '!important' src --include=*.css                                       # 0
grep -rn '!important' ../response-ui-css/src/*.css ../response-ui-css/src/*/*.css   # 0
grep -rnoE 'className="[^"]*[a-z0-9\]]![ "]' src --include=*.tsx                # 0
```

> **⚠ SUPERSEDED — the implementation added two.** True when written; false now, and the sentence is
> load-bearing enough that a reader taking it forward would mis-model the cascade. The **foundation**
> half still holds at 0; **this package** now ships exactly two, both argued for individually and
> both governed by the admission test in `AGENTS.md` ("When a narrowly-scoped `!important` is
> legitimate here, and when it is not"):
>
> ```
> grep -rn '!important;' src --include=*.css
> #   src/components/ui/Hero.css:120         animation-name: none !important;   (timing guard)
> #   src/components/animation/ScrollReveal.css:33   opacity: 1 !important;     (visibility guard,
> #                                                    inside @media (scripting: none))
> grep -rn '!important' ../response-ui-css/src/*.css ../response-ui-css/src/*/*.css   # 0 — unchanged
> grep -rnoE 'className="[^"]*[a-z0-9\]]![ "]' src --include=*.tsx                    # 0 — unchanged
> ```
>
> Note the grep: `!important;` matches the two **declarations**, while a bare `!important` also
> matches the comments that explain them (and the ones in `Radio.css`/`Tabs.css` explaining why those
> two do *not* take one). So an important-layer reversal now **does** exist, in exactly two places,
> and any future search over this axis has to price it.

### 1.2 Property matching expands shorthands, and this is load-bearing

A property-**name** intersection is not enough. `Timeline.css:465-467` sets `animation-name`; its real
competitor is the foundation's `.fade-right { animation: … }` **shorthand** (`animations/fade.css:11`),
which sets no property called `animation-name` at all. A name-only match returns **22** properties;
the longhand-expanded match returns **35**, and the 13 it adds include `animation-name` itself.

**A name-only search misses every animation regression the probe already knows about** —
`timeline-even-animation`, `hero-stagger-animation-name` and `hero-reveal-hidden-animation-none` are
all our-longhand-vs-their-shorthand. That is the strongest available evidence that the expansion is
not optional: a search that returns 22 properties would have reported "no collision" on three rows
already proven red.

The shorthands that matter here are `animation`, `background`, `border-radius`, `overflow` and
`outline` — all five are expanded by the script in §2.3, which prints both counts side by side.

### 1.3 "Can land on the same element" — how it was decided

Every unlayered foundation rule was classified by **reach**, because reach — not class-name overlap —
is what decides collision. The reach classes and their populations are enumerated in §3.

For **class-hook** competitors (`.fade-*`, `.scale-*`, `.morph-*`, `.scroll-reveal-hidden`,
`.stagger-item`, `.mono-font`), co-occurrence was established three ways:

1. **Our CSS names the class.** 7 rules in 4 files:
   ```
   grep -rn 'stagger-item\|scroll-reveal-hidden\|\.fade-\|\.scale-\|\.morph-\|mono-font' src --include=*.css
   # rules: ScrollReveal.css:13, Stagger.css:18, Stagger.css:26, Hero.css:91, Hero.css:97,
   #        Timeline.css:465, Timeline.css:526   (the rest of the hits are comments)
   ```
2. **Our TSX puts both on one element.** The vehicle is `ScrollReveal`, which writes
   `animationClassMap[animation]` onto the element it also receives `className` on
   (`ScrollReveal.tsx:126-131`). Five production wrap sites:
   ```
   grep -rn '<ScrollReveal' src --include=*.tsx | grep -v '\.test\.\|\.examples\.'
   # Hero.tsx:127, Swimlane.tsx:75, MasonryGrid.tsx:150, Timeline.tsx:217, Spotlight.tsx:159
   ```
   Plus `Tabs.tsx:344` (`cn(animClass, "tabs-panel", className)`) and `Stagger.tsx:45`.
3. **A consumer can add the class**, via `className` on any component root. Treated as a separate
   category (§5.3) because the direction is *by design*, not a regression.

For **in-package utility** competitors, per-element token sets were extracted from production TSX —
`className="…"` literals, `cn(…)` string literals, **and identifiers inside `cn(…)` resolved against
class-string constants and class-string object maps in the same file, plus the shared recipes in
`src/util/`**. Utility tokens were then mapped to longhand properties through a hand-written prefix
table and intersected against our CSS declarations on the same classes.

> **The identifier resolution is the whole ballgame, and I got it wrong first.** My first scan read
> only string literals. It found **6** raw hits and **did not find
> `radio-forced-colors-focus-outline`** — the probe's own WCAG-bearing row — because
> `focus:outline-none` arrives at `Radio.tsx:34` as the identifier `focusOutlineResetControl` from
> `src/util/focus.ts:71`, not as text. That is exactly the failure mode `memory/gates.md` records for
> `verify-focus-affordance`: *"the same reset written as a utility class in a component file."* Any
> future gate over this axis must resolve hoisted constants or it is blind to the entire
> `src/util/focus.ts` surface — **9 recipes across 13 production importers** (16 counting tests and
> examples):
>
> ```
> grep -c '^export const' src/util/focus.ts                                                # 9
> grep -rl 'util/focus' src --include=*.tsx --include=*.ts | wc -l                         # 16
> grep -rl 'util/focus' src --include=*.tsx --include=*.ts | grep -v '\.test\.\|\.examples\.' | wc -l   # 13
> ```

### 1.4 What this method structurally CANNOT see

Per `memory/gates.md`, "a new gate's exemptions are where the next bug lives." These are mine.

1. **Consumer-authored CSS and consumer markup.** My search reads two source trees. A consumer's
   unlayered `*:focus{outline:none}` is in neither. **This is why my method cannot rediscover
   `switch-ring-vs-consumer-reset` or its control** (§5). It is not a gap I can close from source; it
   requires an adversarial fixture, which is what the probe already provides.
2. **Runtime-composed class names.** `menu-internals.tsx` emits five template-literal class names
   (`` `${classPrefix}-content` `` at `:288`, `-item` `:346`, `-item-icon` `:368`, `-divider` `:388`,
   `-label` `:408`). My extractor cannot see them. **Manually checked and clear**: those five sites
   carry only library classes and the caller's `className` — no utilities — so there is no in-package
   collision there. But a future edit adding one is invisible to this method.
3. **Cross-component `className` passes.** My per-element extraction is local to one `cn()` call. A
   parent passing a utility to a child that adds a library class is a different element tree. **All
   such sites were enumerated and checked by hand** (§5.4) and none collide, but the automation does
   not cover them:
   ```
   grep -rnE '<[A-Z][A-Za-z.]*[^>]*className="[^"]+"' src --include=*.tsx | grep -v '\.test\.\|\.examples\.'
   ```
4. **The utility→property table is hand-written.** It reports unmatched tokens rather than dropping
   them silently; the final run leaves **13** unmatched, every one of which was inspected and is a
   library class, a foundation animation class, or an object-map key — not a utility. A new Tailwind
   family added to the package would need a new row in the table.
5. **`getComputedStyle` cannot separate "cursor over the scroll track" from "cursor over the thumb".**
   Forcing `:hover` on the host element satisfies both `.tabs-list:hover::-webkit-scrollbar-thumb` and
   `*::-webkit-scrollbar-thumb:hover`. The two states had to be reasoned apart, not measured apart
   (A-2 in §4).
6. **Firefox-only surfaces are unmeasured entirely.** `::-moz-range-thumb` appears in
   `RangeSlider.css`, `Slider.css` and `ColorPicker.css`; the probe is Chromium. The foundation
   declares no `::-moz-*` rule, so the *intersection* is empty — but `scrollbar-color` on the
   foundation's `*` (`base.css:64`) is a Firefox scrollbar channel this package never touches and no
   instrument here observes.
7. **Paint.** Same blind spot the probe documents. `memory/README.md` §15.
8. **Knock-on computed effects on non-intersecting properties.** A property intersection can move a
   property that does *not* intersect. Measured instance: the `sr-only`/`padding` collision changes
   computed `width` 24px→1px and `height` 8px→1px, purely because `box-sizing: border-box` makes
   padding part of the box. A search keyed on properties reports the padding and stays silent about
   the geometry. (For this particular case the whole effect turns out to sit in an unreachable markup
   state — §5.0 — but the blind spot is general.)
9. **`@media` / state-condition overlap is a judgement, not a computation.** The tool pairs
   declarations; whether the two conditions can hold at once was decided by reading. Every (A) row
   below states the environment needed to observe it and was then measured in that environment.
10. **Whether a state is *reachable* is a question about the TSX, not the CSS — and my search does not
    ask it.** The tool will happily pair two declarations whose co-occurrence the components can never
    produce. §5.0 is a worked instance: a real, measurable cascade inversion against markup
    `AppShell.tsx` cannot render. **Every row this method emits needs a reachability check against the
    component that renders it before it becomes a probe row**, or the probe grows fixtures that assert
    behaviour no user can see — the failure `memory/ledger.md` records as "a control that proves the
    fix works is not a control that proves the fix was needed."

---

## 2. Scope counts

### 2.1 This package's CSS

> **⚠ CORRECTED — the `@import` pattern below FAILED OPEN, and the fix is in the code block.** Both
> reproduction scripts here and in §2.3 matched `@import "…css"\s*;`. Phase 1 put `layer(components)`
> between the closing quote and the semicolon, so that pattern now matches **nothing** — and the
> scripts do not error on it. They print `0 files, 0 declarations` and exit `0`.
>
> **A silent zero is worse than a crash**, and worse here than anywhere: this document's whole claim
> is "the search covered every declaration in this package", and a reader re-running the check to
> confirm coverage would be shown *perfect agreement with an empty set*. It is the same shape as
> `memory/gates.md`'s "a probe that cannot report its own inertness always agrees with you" and its
> "a static asset path that does not resolve reads exactly like 'no regressions'".
>
> The fix is one character class: `"\s*;` → `"[^;\n]*;`, which swallows whatever sits between the
> quote and the semicolon. `scripts/probe-cascade-layer.mjs` uses that form and says so at
> `deriveEntries`, together with a **guard that throws if the count drops below 40** — that guard,
> not the regex, is what makes it safe, and any script re-deriving this list should carry one.
> **The code blocks below are the corrected form**; the `# 46 files, 2212 declarations` comment is
> the pre-implementation reading and is kept as the historical measurement.

```
grep -c '^@import "\./components' src/styles.css                     # 46  — the files Phase 1 must layer
#                                                                    # ⚠ 45 today: Stagger.css was deleted
```

```
node -e 'const fs=require("fs");const st=fs.readFileSync("src/styles.css","utf8");
const fl=[...st.matchAll(/@import\s+"(\.\/[^"]+\.css)"[^;\n]*;/g)].map(m=>m[1].slice(2)).filter(p=>!p.endsWith("tokens.css"));
if(fl.length<40)throw new Error("parser drifted: "+fl.length+" imports");
let t=0;for(const f of fl){let s=fs.readFileSync("src/"+f,"utf8").replace(/\/\*[\s\S]*?\*\//g,""),d=0;
for(const c of s){if(c==="{")d++;else if(c==="}")d--;else if(c===";"&&d>=1)t++;}}
console.log(fl.length+" files, "+t+" declarations");'
# 46 files, 2212 declarations     <- as measured before Phase 1
# 45 files, 2205 declarations     <- ⚠ re-run on the implemented tree
```

Method: strip `/* */`, count `;` at brace depth ≥ 1 — the plan §2b method verbatim. My independent
AST-ish parse agrees exactly: 2194 declarations in 685 selector rules, plus 18 declarations in 16
`@keyframes` step rules, = 2212.

> **Note for the plan's maintainer.** §2b states **2,215** for components-only. The method §2b names
> reproduces **2212**, twice, by two implementations. This is a 3-declaration discrepancy, not a
> material one — but `PLAN-overridability.md`'s own rule is that a number nobody can recompute is not
> evidence, so it should be corrected rather than carried.
>
> **⚠ Discharged.** The plan's §2b now carries **2,205 components-only / 2,247 all-`src`**, re-derived
> with the corrected pattern above rather than transcribed from either figure.

`src/tokens.css` and `src/examples/example-theme-tuning.css` are **out of scope and must stay
unlayered**: `tokens.css` carries `@theme inline`, and `example-theme-tuning.css` is imported only by
`dev/styles.css:43`, never by `src/styles.css`.

```
grep -rn 'example-theme-tuning' src dev | grep import      # dev/styles.css:43 only
grep -n '^[^ /}]' src/tokens.css                            # :root and @theme inline — nothing else
```

### 2.2 The foundation

```
grep -rn '@layer' ../response-ui-css/src/
# ../response-ui-css/src/base.css:48
# ../response-ui-css/src/responsive/text.css:114
# (the third hit, base.css:44, is the comment explaining the first)
```

**Two `@layer` blocks, both `@layer base`, 9 rules total.** Everything else in the foundation is
unlayered — so `tokens/`, `themes/`, `responsive/` and the rest of `base.css` are all in scope, as
plan §2a says.

The 16 files reachable from `../response-ui-css/src/index.css` are the population (its import chain is
`fonts.css`, `tailwindcss`, `tokens/index.css` → 7 files, `responsive/index.css` → 2,
`animations/index.css` → 6, `base.css`). `_theme-template.css`, `index-no-fonts.css` and
`examples/themes/*` are **not** reachable and are excluded — the example themes deliberately so
(`CLAUDE.md`: nothing may depend on them).

```
node -e 'const fs=require("fs");
const F=["base","tokens/colors","tokens/radius","tokens/shadows","tokens/transitions","tokens/motion","tokens/overlay","tokens/aspect","responsive/spacing","responsive/text","animations/fade","animations/morph","animations/scale","animations/scroll-reveal","animations/stagger","animations/view-transitions"];
let rules=0,unl=0,lay=0,kf=0,props=new Set();
for(const f of F){let s=fs.readFileSync("../response-ui-css/src/"+f+".css","utf8").replace(/\/\*[\s\S]*?\*\//g,"");
 const st=[];let buf="",i=0;
 while(i<s.length){const c=s[i];
  if(c==="{"){const p=buf.trim();buf="";
   if(p.startsWith("@")){st.push(p);i++;continue;}
   let d=1,j=i+1;while(j<s.length&&d>0){if(s[j]==="{")d++;else if(s[j]==="}"){d--;if(!d)break;}j++;}
   rules++;const inL=st.some(a=>a.startsWith("@layer")),inK=st.some(a=>a.startsWith("@keyframes"));
   if(inK)kf++;else if(inL)lay++;else{unl++;for(const m of s.slice(i+1,j).matchAll(/([-\w]+)\s*:/g))props.add(m[1]);}
   i=j+1;continue;}
  if(c==="}"){st.pop();buf="";i++;continue;}
  if(c===";"&&buf.trim().startsWith("@")){buf="";i++;continue;}
  buf+=c;i++;}}
console.log({rules,unlayered:unl,layered:lay,keyframeSteps:kf,unlayeredDistinctProps:props.size});'
# { rules: 83, unlayered: 48, layered: 9, keyframeSteps: 26, unlayeredDistinctProps: 121 }
```

### 2.3 The intersection

All values in this table are printed by the single script below, run from the package root.

| Measure | Value | Note |
| --- | --- | --- |
| Distinct properties in our 46 files | **181** name-only / **187** longhand-expanded | expansion-dependent — see below |
| Distinct properties in the foundation's 48 unlayered rules | **121** / **133** | same |
| **Intersection** | **22** name-only / **35** longhand-expanded | the 13 extra are all in the `animation` and `background` families |
| Foundation unlayered rules with **any** intersecting property | **37 of 48** | |
| Our declarations with an intersecting property | **516 of 2194** | 2194 = declarations outside `@keyframes`; the 2212 in §2.1 includes the 18 keyframe-step declarations |
| Foundation unlayered rules that can **actually reach** an element our CSS also styles, with an intersecting property | **10** | §3, enumerated by name — **not** produced by the script |

> **The expanded property counts depend on how many shorthands you expand, so state the table.** The
> script below expands exactly five — `animation`, `background`, `border-radius`, `overflow`,
> `outline` — which are the only ones either package uses on a property that intersects. Expanding a
> fuller table (30 shorthands, including `margin`/`padding`/`border`/`gap`/`flex`) raises our
> longhand count to 203 and the intersecting-declaration count to 527, and leaves the intersection
> itself at 35 and the participating-rule count at 37 — because the extra shorthands have no
> unlayered foundation counterpart. **Quote 187/516 with the script below, or 203/527 with the fuller
> table, never one number from each.**

The drop from 37 to 10 is the whole value of the reach analysis: **27 of the 37 property-intersecting
foundation rules cannot match any element this package styles.** They are named in §3 so the
conclusion is auditable rather than counted (`memory/README.md` §5).

The 35 intersecting longhands:

```
--C-TEXT-INVERSE --C-TEXT-MUTED --C-TEXT-ON-ACCENT --C-TEXT-ON-PRIMARY --C-TEXT-PRIMARY
--C-TEXT-SECONDARY --stagger-delay animation-delay animation-direction animation-duration
animation-fill-mode animation-iteration-count animation-name animation-play-state
animation-timing-function background-attachment background-clip background-color background-image
background-origin background-position background-repeat background-size border-bottom-left-radius
border-bottom-right-radius border-top-left-radius border-top-right-radius clip-path font-family
height opacity overflow-x overflow-y transform width
```

<details>
<summary>Reproduction script for §2.3 (paste as a file, run with <code>node</code>)</summary>

```js
// Flat CSS parser + shorthand-aware property intersection.
import { readFileSync } from "node:fs";
const PKG = ".", FDN = "../response-ui-css";
const SHORTHAND = {
  animation: ["animation-name","animation-duration","animation-timing-function","animation-delay","animation-iteration-count","animation-direction","animation-fill-mode","animation-play-state"],
  background: ["background-color","background-image","background-position","background-size","background-repeat","background-attachment","background-origin","background-clip"],
  "border-radius": ["border-top-left-radius","border-top-right-radius","border-bottom-right-radius","border-bottom-left-radius"],
  overflow: ["overflow-x","overflow-y"],
  outline: ["outline-width","outline-style","outline-color"],
};
const expand = (p) => (p.startsWith("--") ? [p] : SHORTHAND[p] ?? [p]);
function parse(file, src) {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const line = (i) => clean.slice(0, i).split("\n").length;
  const rules = [], st = []; let buf = "", start = 0, i = 0;
  while (i < clean.length) { const c = clean[i];
    if (c === "{") { const pre = buf.trim(); buf = "";
      if (pre.startsWith("@")) { st.push(pre); i++; continue; }
      let d = 1, j = i + 1; while (j < clean.length && d) { if (clean[j] === "{") d++; else if (clean[j] === "}") { d--; if (!d) break; } j++; }
      const body = clean.slice(i + 1, j), decls = []; let off = 0;
      for (const part of body.split(";")) { const m = part.match(/^\s*([-\w]+)\s*:\s*([\s\S]+)$/);
        if (m) decls.push({ prop: m[1], value: m[2].trim(), line: line(i + 1 + off + (part.length - part.trimStart().length)) });
        off += part.length + 1; }
      rules.push({ file, line: line(start), selector: pre.replace(/\s+/g, " "), decls,
        layer: st.filter((a) => a.startsWith("@layer")), kf: st.some((a) => a.startsWith("@keyframes")),
        media: st.filter((a) => a.startsWith("@media")) });
      i = j + 1; start = i; continue; }
    if (c === "}") { st.pop(); buf = ""; i++; start = i; continue; }
    if (c === ";" && buf.trim().startsWith("@")) { buf = ""; i++; start = i; continue; }
    if (!buf.trim()) start = i; buf += c; i++; }
  return rules;
}
const load = (root, files) => files.flatMap((f) => parse(f, readFileSync(`${root}/${f}`, "utf8")));
const styles = readFileSync(`${PKG}/src/styles.css`, "utf8");
// ⚠ CORRECTED: was `"\s*;`, which matches nothing once the imports carry
// `layer(components)` — and prints `ourFiles: 0` without erroring. Guard the count.
const ourFiles = [...styles.matchAll(/@import\s+"(\.\/[^"]+\.css)"[^;\n]*;/g)].map((m) => `src/${m[1].slice(2)}`).filter((p) => !p.endsWith("tokens.css"));
if (ourFiles.length < 40) throw new Error(`parser drifted: ${ourFiles.length} imports`);
const fdnFiles = ["base","tokens/colors","tokens/radius","tokens/shadows","tokens/transitions","tokens/motion","tokens/overlay","tokens/aspect","responsive/spacing","responsive/text","animations/fade","animations/morph","animations/scale","animations/scroll-reveal","animations/stagger","animations/view-transitions"].map((f) => `src/${f}.css`);
const ours = load(PKG, ourFiles).filter((r) => !r.kf);
const fdnU = load(FDN, fdnFiles).filter((r) => !r.kf && !r.layer.length);
const ourD = ours.flatMap((r) => r.decls.map((d) => ({ r, d, longs: expand(d.prop) })));
const fdnD = fdnU.flatMap((r) => r.decls.map((d) => ({ r, d, longs: expand(d.prop) })));
const oL = new Set(ourD.flatMap((x) => x.longs)), fL = new Set(fdnD.flatMap((x) => x.longs));
const inter = [...oL].filter((p) => fL.has(p)).sort();
const oN = new Set(ourD.map((x) => x.d.prop)), fN = new Set(fdnD.map((x) => x.d.prop));
console.log({ ourFiles: ourFiles.length, ourRules: ours.length, ourDeclsOutsideKeyframes: ourD.length,
  fdnUnlayeredRules: fdnU.length,
  ourProps: `${oN.size} name-only / ${oL.size} expanded`,
  fdnProps: `${fN.size} name-only / ${fL.size} expanded`,
  intersection: `${[...oN].filter((p) => fN.has(p)).length} name-only / ${inter.length} expanded` });
console.log(inter.join(" "));
const part = new Set(fdnD.filter((x) => x.longs.some((l) => oL.has(l))).map((x) => `${x.r.file}:${x.r.line} {${x.r.selector}} [${x.r.media.join(" && ") || "-"}]`));
console.log("\nparticipating foundation unlayered rules:", part.size);
for (const k of part) console.log("  " + k);
console.log("\nour declarations with an intersecting property:", ourD.filter((x) => x.longs.some((l) => fL.has(l))).length);
```

Expected output:

```
{
  ourFiles: 46,
  ourRules: 685,
  ourDeclsOutsideKeyframes: 2194,
  fdnUnlayeredRules: 48,
  ourProps: '181 name-only / 187 expanded',
  fdnProps: '121 name-only / 133 expanded',
  intersection: '22 name-only / 35 expanded'
}
…
participating foundation unlayered rules: 37
our declarations with an intersecting property: 516
```

**⚠ That expected output is the pre-implementation reading.** The corrected script re-run on the
implemented tree prints:

```
{
  ourFiles: 45,                                    // Stagger.css deleted
  ourRules: 681,
  ourDeclsOutsideKeyframes: 2187,
  fdnUnlayeredRules: 48,                           // unchanged — the foundation was not touched
  ourProps: '179 name-only / 186 expanded',
  fdnProps: '121 name-only / 133 expanded',        // unchanged
  intersection: '20 name-only / 34 expanded'
}
participating foundation unlayered rules: 37       // unchanged
our declarations with an intersecting property: 510
```

The intersection shrinking (35 → 34 expanded, 516 → 510 declarations) is the search's own conclusion
being acted on: `Tabs`' scrollbar declarations and `Stagger.css` were deleted rather than defended.
**Neither reading is "the" number** — the first sized the work, the second records what is left.

</details>

---

## 3. Reach: which of the 48 unlayered foundation rules can touch us

| Reach class | Rules | Can reach a component element? |
| --- | --- | --- |
| `:root` / `html` | 13 — `base.css:4`, `base.css:8`, `tokens/{colors,radius,shadows,transitions,motion,overlay,aspect}.css:1`, `responsive/spacing.css:1` and `:11`, `responsive/text.css:1` and `:38` | **No.** No component CSS rule selects `:root`, `html` or `body`. |
| `body` | 1 — `base.css:89` `body:has(dialog[open].no-body-scroll)` `{overflow}` | **No.** `no-body-scroll` is carried by `.command-palette` (`CommandPalette.tsx:380`) and `.drawer` (`Drawer.tsx:63`), but the rule's *subject* is `body`, which no component CSS selects. |
| `::view-transition-*(root)` | 5 — `animations/view-transitions.css:1,6,12,17,23` | **No.** No component CSS targets a view-transition pseudo-element. |
| `*` (`scrollbar-color`) | 1 — `base.css:63` | **No intersection.** No component CSS declares `scrollbar-color`. (`Tabs.css:11` and `Carousel.css:31` declare `scrollbar-width` — a different property.) |
| `*::-webkit-scrollbar*` | 5 — `base.css:67,72,76,81,85` | **3 of 5 do.** See below. |
| Class hooks | 23 — `.mono-font` ×1, `.fade-*` ×8, `.morph-*` ×6, `.scale-*` ×4, `.scroll-reveal-hidden` ×2, `.stagger-item` ×2 | **7 of 23 do.** See below. |

```
grep -rn ':root\|^html\|^body\|::view-transition' src --include=*.css
# src/tokens.css:5  (out of Phase 1's scope — stays unlayered)
# src/examples/example-theme-tuning.css:23,33,42,51  (dev-only, not imported by src/styles.css)
# -> ZERO hits in the 46 files Phase 1 layers
grep -rn 'scrollbar-color' src --include=*.css                          # 0
grep -rn '::-webkit-scrollbar' src --include=*.css
# Carousel.css:35, Tabs.css:15, Tabs.css:19, Tabs.css:24
```

### The 10 foundation unlayered rules that genuinely compete

| # | Foundation rule | Specificity | Properties | Our side |
| --- | --- | --- | --- | --- |
| F1 | `base.css:67` `*::-webkit-scrollbar` | (0,0,1) | `width`, `height` | `Tabs.css:15` (0,1,1), `Carousel.css:35` (0,1,1) |
| F2 | `base.css:76` `*::-webkit-scrollbar-thumb` | (0,0,1) | `background-color`, `border-radius` | `Tabs.css:19` (0,1,1) |
| F3 | `base.css:81` `*::-webkit-scrollbar-thumb:hover` | (0,1,1) | `background-color` | `Tabs.css:24` (0,2,1) |
| F4 | `animations/scroll-reveal.css:2` `.scroll-reveal-hidden` | (0,1,0) | `opacity` | `ScrollReveal.css:13` (0,1,0) |
| F5 | `animations/scroll-reveal.css:8` same, `@media (prefers-reduced-motion: reduce)` | (0,1,0) | `opacity` | `ScrollReveal.css:13` |
| F6 | `animations/stagger.css:2` `.stagger-item` | (0,1,0) | `--stagger-delay`, `animation-delay`, `animation-fill-mode` | `Stagger.css:18` (0,1,0) |
| F7 | `animations/stagger.css:10` same, `@media (prefers-reduced-motion: reduce)` | (0,1,0) | `animation-delay` | `Stagger.css:26` (0,1,0) |
| F8 | `animations/fade.css:11` `.fade-right` | (0,1,0) | `animation` shorthand | `Timeline.css:465` (0,4,0), `Timeline.css:526` (0,5,0) |
| F9 | `animations/fade.css:17` `.fade-up` | (0,1,0) | `animation` shorthand | `Hero.css:91` (0,2,0), `Hero.css:97` (0,3,0) |
| F10 | `animations/fade.css:118` `.fade-in,.fade-down,.fade-right,.fade-up,.fade-left`, `@media (prefers-reduced-motion: reduce)` | (0,1,0) | `animation`, `opacity`, `transform` | `Timeline.css:465/526`, `Hero.css:91/97` |

**`.morph-*` (6 rules) and `.scale-*` (4 rules) do not participate.** `.morph-*` appears nowhere in
this package (`grep -rn 'morph-' src --include=*.tsx --include=*.css` → 0). `.scale-in` *can* land on
a `ScrollReveal` element via `animationClassMap.scale` (`ScrollReveal.tsx:25`), and that element can
also carry `.swimlane` or `.masonry-grid__item` — but neither of those classes has an
animation/`opacity`/`transform` declaration in our CSS, so the intersection on that element is empty.
Measured as controls (B-8, B-9).

**`.mono-font` (1 rule) does not participate.** It is applied at exactly one site
(`Kbd.tsx:10`), and `Kbd` has no sibling `.css` file. Where a consumer *could* combine it — the three
`font-family: var(--DEFAULT-MONO-FONT)` declarations in `CodeBlock.css:30,42,62` — the value is
byte-identical to `base.css:26`'s, so the inversion is a no-op (B-7, measured).

### The in-package (utility) competitor set

Eleven production elements carry **both** a class our CSS styles as a subject **and** a Tailwind
utility. Named, not counted:

| Element | Library classes | Property overlap? |
| --- | --- | --- |
| `Combobox.tsx:300` | `combobox-input` | none — ours: width/padding/font/color/background/border-radius/cursor; utilities: transition-duration, border-*, box-shadow, `--tw-ring-*`, outline-* |
| **`Radio.tsx:30`** | `radio` | **YES — `outline`** (A-3) |
| `ColorPicker.tsx:250` | `colorpicker-trigger`, `--error` | none |
| `ColorPicker.tsx:380` | `colorpicker-hex` | none |
| `MediaCard.tsx:93` | `media-card__content` | none |
| `MediaCard.tsx:126` | `media-card__action` | none |
| `MasonryGrid.tsx:102` | `masonry-grid` | none — ours `columns`, utility `gap-r*` |
| `Grid.tsx:45` | `rui-grid` | none — ours `display`/`grid-template-columns`/`align-items`, utility `gap-r*` |
| `DataTable.tsx:584` | `data-table-expanded-cell` | none — ours `padding`, utility `bg-surface-3` (background lives on `.table-row--striped`, a different element) |
| **`AppShell.tsx:344`** | `app-shell-sidebar-section-title` | **YES — `padding`, `white-space`, `overflow`** (B-6) |
| `AppShell.tsx:401` | `app-shell-sidebar-link-label` | `overflow` only, value-identical (B-5) |

The `focus:outline-none`/`ring-*` recipes were checked against **every** `outline:` and `box-shadow:`
declaration in our CSS, and `Radio.css:40` is the only element where the recipe and the CSS
declaration land together.

```
grep -rn 'outline:' src --include=*.css | grep -v 'outline: none'   # 36 lines, of which
                                                                   # Radio.css:7 is prose -> 35 declarations
grep -rn 'box-shadow:' src --include=*.css                          # 35 lines, of which
                                                                   # Radio.css:34 is prose -> 34 declarations
grep -rn 'outline-none\|focusOutlineReset\|focusRing' src --include=*.tsx | grep -v '\.test\.\|\.examples\.'
```

`Collapsible.tsx:100` looks like a hit — `cn("collapsible-trigger", focusRingButton, …)` — but
`.collapsible-trigger` has **no rule** in `Collapsible.css` (a declaration-free hook, documented at
`Collapsible.tsx:98-99`: *"a styling hook with no rule behind it, so the ring has to be a utility"*),
so there is nothing to invert. `TagInput.tsx:384` carries `focusRingWithin` on a box with **no**
library class at all, and `TagInput` has no `.css` file. `MultiSelect.tsx:267-270` builds
`.multiselect-control` from library classes only, so its `:focus-within` `box-shadow`
(`MultiSelect.css:27`) has no utility competitor.

---

## 4. (A) — Confirmed regressions

Every row was measured A/B, `getComputedStyle`, in the environment named. `▲NEW` marks a row the
probe has no fixture for.

### A-1 ▲NEW — `Timeline.css:465`: the right-aligned Timeline inverts too, at every viewport

| Field | Value |
| --- | --- |
| Our rule | `src/components/ui/Timeline.css:465-467` — `.timeline[data-align="right"] .timeline-item.fade-right { animation-name: slide-left, fade }` |
| Our specificity | **(0,4,0)** |
| Competitor | `../response-ui-css/src/animations/fade.css:11-15` — `.fade-right { animation: slide-right …, fade … }`, **unlayered** (F8) |
| Competitor specificity | (0,1,0) |
| Property | `animation-name` (via the `animation` shorthand) |
| Before → After | `slide-left, fade` → **`slide-right, fade`** |
| Environment | **default. No media query at all** — `Timeline.css:465` is unconditional |
| Competitor side | **foundation** — §3a does not apply |

**Why the probe misses it.** `Timeline.tsx:219` hard-codes `animation="fade-right"` on every item, and
`Timeline.css` flips the name back for the items whose card sits on the other side. There are **two**
such rules, and the probe's fixture reproduces only one: its `<div class="timeline" data-align="center">`
can never match `[data-align="right"]`. The plan names both lines (§6: *"`Timeline.css:465` at (0,4,0)
and `:526` at (0,5,0)"*) but the probe has one row.

`:526` needs `@media (width >= 40rem)` **and** `:nth-child(even)`; `:465` needs neither. So the
uncovered rule is the *broader* of the two: it regresses at every viewport width and on every item.

Measured, both alignments in one fixture, `prefers-reduced-motion: no-preference`:

```
timeline-right animation-name         slide-left, fade  →  slide-right, fade   *** CHANGED ***
timeline-center-even animation-name   slide-left, fade  →  slide-right, fade   *** CHANGED ***   (= the probe's row)
```

`animation-name` is the deterministic reading and the one a probe row should pin. The same fixture also
showed `opacity` and `transform` differing between builds (`0` vs `0.239009`; `translateX(+374px)` vs
`translateX(-285px)`) — **do not use those as evidence.** They are mid-flight samples of a running
animation and will differ on every run; they are shown only because they are what the direction
reversal looks like on screen. A probe row asserting either would be flaky, which is exactly the
objection `memory/traps.md` records against screenshot baselines.

At `prefers-reduced-motion: reduce` the same rule moves `slide-left, fade` → `none`, but
`animation-duration` is `0s` on both sides, so nothing runs either way — harmless (see B-3).

### A-2 ▲NEW — `Tabs.css:24`: the scrollbar-thumb hover rule becomes unwinnable

| Field | Value |
| --- | --- |
| Our rule | `src/components/ui/Tabs.css:24-26` — `.tabs-list:hover::-webkit-scrollbar-thumb { background-color: var(--C-BORDER-DEFAULT) }` |
| Our specificity | **(0,2,1)** |
| Competitor | `../response-ui-css/src/base.css:81-83` — `*::-webkit-scrollbar-thumb:hover { background-color: var(--C-BORDER-STRONG) }`, **unlayered** (F3) |
| Competitor specificity | (0,1,1) |
| Property | `background-color` |
| Before → After | thumb hovered: `oklch(0.9276 0.0058 264.53)` (`--C-BORDER-DEFAULT`) → **`oklch(0.6446 0.0093 258.34)`** (`--C-BORDER-STRONG`) |
| Environment | default; pointer over the scrollbar thumb |
| Competitor side | **foundation** |

Measured with CDP `CSS.forcePseudoState` **and** with a real mouse hover, agreeing:

```
unlayered  no hover            rgba(0, 0, 0, 0)
unlayered  CDP forced :hover   oklch(0.9276 0.0058 264.53)
unlayered  real mouse hover    oklch(0.9276 0.0058 264.53)
layered    no hover            oklch(0.9276 0.0058 264.53)     <- the probe's tabs-scrollbar-thumb-color row
layered    CDP forced :hover   oklch(0.6446 0.0093 258.34)
layered    real mouse hover    oklch(0.6446 0.0093 258.34)
```

**Why this is a distinct (A) and not a duplicate of `tabs-scrollbar-thumb-color`.** After layering,
`Tabs.css:24` can never win: in the *track*-hover state the foundation's base rule (F2) supplies the
same `--C-BORDER-DEFAULT` value, and in the *thumb*-hover state the foundation's `:hover` rule (F3)
supplies `--C-BORDER-STRONG`. The declaration is **inert in every state** — the shape of defect that
`memory/gates.md` warns gets cited as safe. A fix for `tabs-scrollbar-thumb-color` that only restores
the resting `transparent` will leave `Tabs.css:24` dead and the hover treatment silently reassigned to
the foundation's app-wide one.

Severity: cosmetic, not a11y. But the plan's DoD asks for direction *per rule*, and this rule's
direction is "stops existing."

> Per §1.4 item 5, my instrument cannot separate the two hover states — forcing `:hover` on the host
> satisfies both selectors. The `--C-BORDER-DEFAULT` reading for the track-hover state is **reasoned**
> from F2's value, not measured. A probe row for this needs `CSS.forcePseudoState` and should say in
> its note which of the two states it is pinning.

### A-3 — `Radio.css:39-42`: our own utility deletes our own forced-colors outline

Rediscovered independently, in-package axis. Identical to the probe's
`radio-forced-colors-focus-outline`.

| Field | Value |
| --- | --- |
| Our rule | `src/components/form/Radio.css:39-42` — `.radio:focus { outline: 2px solid Highlight; outline-offset: 2px }`, inside `@media (forced-colors: active)` opened at `:22` |
| Our specificity | (0,2,0) |
| Competitor | `focus:outline-none` → `.focus\:outline-none:focus { outline-style: none }` in **`@layer utilities`**, reaching the element as `focusOutlineResetControl` (`src/util/focus.ts:71`) through `Radio.tsx:34` |
| Competitor specificity | (0,2,0) |
| Property | `outline-width` / `outline-style` / `outline-color` |
| Before → After | `2px` → **`0px`** |
| Environment | `forced-colors: active`, element focused |
| Competitor side | **in-package (utility)** — **§3a explicitly does NOT cover this** |

WCAG 2.4.7. `Radio.css:34-38` states the mechanism at source.

### A-4 ▲NEW (structural) — `Grid.css` cannot be layered by editing `src/styles.css`

| Field | Value |
| --- | --- |
| Our rule | all of `src/components/layout/Grid.css` — notably `.rui-grid { grid-template-columns: repeat(var(--rui-grid-columns, 1), minmax(0, 1fr)) }` |
| Competitor | **the same file, imported a second time and unlayered**, by `src/components/layout/Grid.tsx:5` — `import "./Grid.css";` |
| Property | all of Grid's — `display`, `grid-template-columns`, `align-items`, `--rui-grid-columns` |
| Before → After | no change **— which is the defect.** `<Grid className="grid-cols-2">` still loses after Phase 1 |
| Environment | any consumer resolving this package **from source**, including this repo's own `dev/` app |
| Competitor side | **in-package** |

```
grep -rn '^import .*\.css' src --include=*.tsx --include=*.ts | grep -v '\.test\.\|\.examples\.'
# src/components/layout/Grid.tsx:5:import "./Grid.css";     <- the only one in the package
grep -n 'src/styles.css' dev/styles.css     # dev/styles.css:39 — the dev app consumes SOURCE
```

Adding `layer(components)` to `src/styles.css:57` layers one of the two copies. The JS-side import is
processed by the bundler and injected **unlayered**, where it beats `@layer components`. So for a
source consumer, Grid's rules keep outranking `@layer utilities` and Phase 1's headline promise
silently does not hold for exactly one component.

**Published `dist` is currently unaffected, for an accidental reason.** Vite hoists the import out:
`dist/components/layout/Grid.js:2` is the comment `/* empty css */`, and the extracted rules land in
`dist/response-ui-react-components.css` — a file that is **not** in `package.json` `exports` and is
imported by nothing. So today it is an orphan. That is a build artefact, not a decision, and
`package.json` `files` ships `src` as well.

**No gate can see this.** `probe-cascade-layer.mjs` derives its entries from `src/styles.css` only
(`deriveEntries`, `:64-100`) and builds CSS with no JS graph — so the probe will go green while the
dev gallery shows Grid unlayered. This is `memory/README.md` §14's shape: the verification environment
and the shipped one disagree.

### A-5 … A-11 — the probe's remaining seven rows

All seven are rediscovered by this search; the mechanism, specificity and direction are exactly as the
probe and plan §6 record them, so they are not re-tabulated. Their competitor rules are F4/F5
(`scrollreveal-no-js-opacity`), F6 (`stagger-ancestor-inherit`), F1 (`tabs-scrollbar-height`), F2
(`tabs-scrollbar-thumb-color`), F8 (`timeline-even-animation`), F9 (`hero-stagger-animation-name`,
`hero-reveal-hidden-animation-none`).

One measured refinement worth carrying, on `stagger-ancestor-inherit`: the collision is a **custom
property declaration** contest on one element, and it is worth stating as such because the plan's §6
table warns against reporting custom-property *fan-out* as a layering bug. `Stagger.css:19`
(`--stagger-delay: inherit`) and `animations/stagger.css:3`
(`--stagger-delay: var(--MOTION-STAGGER-DELAY)`) declare the same property on the same
`.stagger-item`, at equal specificity, so today source order decides. Measured on the property itself,
not on the `animation-delay` that consumes it:

```
--stagger-delay on .stagger-item (ancestor sets 999ms)      999ms  →  50ms   *** CHANGED ***
animation-fill-mode on .stagger-item                        both   →  both   same
```

---

## 5. (B) — Confirmed no-op inversions

The winner changes; the observable does not. Each row states **why** it is harmless — asserted from a
measurement, not from expectation.

| # | Our rule | Competitor | Property | Before → After | Why harmless |
| --- | --- | --- | --- | --- | --- |
| B-1 | `Tabs.css:21` `.tabs-list::-webkit-scrollbar-thumb { border-radius: 999px }` (0,1,1) | `base.css:78` `*::-webkit-scrollbar-thumb { border-radius: 999px }` (0,0,1), foundation | `border-*-radius` | `999px` → `999px` | **Byte-identical value.** Measured. The declaration becomes redundant, not wrong. |
| B-2 | `Tabs.css:16` `.tabs-list::-webkit-scrollbar { height }` | `base.css:68` `*::-webkit-scrollbar { width: 0.625rem }` | `width` | `10px` → `10px` | **We never won `width`.** `Tabs.css` declares only `height`, so the vertical dimension was already the foundation's. Confirms plan §6's asymmetry note by measurement. |
| B-3 | `Timeline.css:465`/`:526` `animation-name` | `fade.css:118` `.fade-* { animation: none }` at `prefers-reduced-motion: reduce` (F10) | `animation-name` | `slide-left, fade` → `none` | **`animation-duration` is `0s` on both sides** (measured), so no animation runs either way. Today's state — a name set with zero duration — is already inert. |
| B-4 | `Stagger.css:27` `.stagger-item { animation-delay: 0ms }` at reduced motion (0,1,0) | `animations/stagger.css:11` same selector, same value (0,1,0), foundation (F7) | `animation-delay` | `0s` → `0s` | **Identical value**, measured. `Stagger.css:23-24`'s comment ("re-stated because the declaration above would otherwise outrank the css package's guard") describes a need that disappears once the declaration above is layered. |
| B-5 | `AppShell.css:185` `.app-shell-sidebar-link-label { overflow: hidden }` (0,1,0) | `.sr-only { overflow: hidden }` in `@layer utilities`, in-package via `AppShell.tsx:401` | `overflow-x/y` | `hidden` → `hidden` | **Identical value.** |
| B-6 | `AppShell.css:127` `.app-shell-sidebar-section-title { padding: 0.25rem 0.75rem }` (0,1,0) | `.sr-only { padding: 0 }`, `@layer utilities`, in-package via `AppShell.tsx:344` | `padding-*` | **in reachable markup: `0px` → `0px`** | **Zero user-visible effect, and the reason matters — see the correction below.** In every state the component can actually render, `AppShell.css:206-208` (0,3,0) has already forced the padding to 0. The declaration-level inversion is real; the observable is not. **The deliverable is dead code plus a false comment**, not a value change. |
| B-7 | `CodeBlock.css:30,42,62` `font-family: var(--DEFAULT-MONO-FONT)` | `base.css:26` `.mono-font { font-family: var(--DEFAULT-MONO-FONT) }`, foundation | `font-family` | `"Libertinus Mono", monospace` → same | **Identical value**, measured with both classes on one element. Also requires a consumer to add `.mono-font`; no in-package site does. |
| B-8 | `Swimlane.css` (all) with a foundation `.fade-up` on `.swimlane` (`Swimlane.tsx:75-81`) | `fade.css:17` `.fade-up { animation }` | `animation-name` | `slide-up, fade` → `slide-up, fade` | **No property intersection on that element** — `Swimlane.css` declares no animation, opacity or transform. Control, measured, held. |
| B-9 | `MasonryGrid.css:11` `.masonry-grid__item { break-inside: avoid }` with `.fade-up` (`MasonryGrid.tsx:150-154`) | `fade.css:17` | `animation-name` | `slide-up, fade` → `slide-up, fade` | Same reason. Control, measured, held. |

### 5.0 Correction to B-6: the state that moves is unreachable

My first reading of the `sr-only` collision measured `padding-left` going `12px → 0px` and filed it as
a change worth a pinned probe row. **It is not, and the reason is in `AppShell.tsx`, not in the CSS:**

```
grep -n 'showCollapsed\|data-collapsed' src/components/ui/AppShell.tsx
# 303:  data-collapsed={collapsed || undefined}          <- on the sidebar root
# 333:  const showCollapsed = collapsed && !isMobile;
# 344:  className={cn("app-shell-sidebar-section-title", showCollapsed && "sr-only")}
```

`sr-only` is applied **only** when `collapsed`, and `[data-collapsed]` is present **whenever**
`collapsed`. So `sr-only` on this element **implies** `[data-collapsed]`, which means
`AppShell.css:206-208` — `.app-shell-sidebar[data-collapsed] .app-shell-sidebar-section-title
{ padding: 0 }` at (0,3,0) — is always in play alongside it. Measured in both states:

```
sronly-sectiontitle-padtop  (collapsed, i.e. REACHABLE)      0px    →  0px    same
sronly-sectiontitle-padleft (collapsed, i.e. REACHABLE)      0px    →  0px    same
sronly-sectiontitle-padtop  (sr-only WITHOUT data-collapsed) 4px    →  0px    *** CHANGED ***
sronly-sectiontitle-padleft (sr-only WITHOUT data-collapsed) 12px   →  0px    *** CHANGED ***
CTRL sectiontitle-no-sronly-padtop                            4px    →  4px    same
```

**The two changed rows are a markup state the component cannot produce.** This is
`memory/ledger.md`'s lesson exactly — *"a control that proves the fix works is not a control that
proves the fix was needed"*: my fixture demonstrated a real cascade mechanism against markup no user
will ever see, and if I had stopped at the measurement I would have proposed pinning it as an accepted
delta. §7 R4 is written to the corrected reading.

What genuinely follows for the implementer:

- **`AppShell.css:206-208` becomes dead code.** Its own comment says why it exists: *"This rule
  survives only to surrender the padding, because this file is unlayered and would otherwise outrank
  `sr-only`'s own `padding: 0` whatever the utility's specificity."* After Phase 1 that sentence is
  **false**. Answer it, do not delete it silently (`memory/README.md` §7).
- `white-space: nowrap` (`:133`) and `overflow: hidden` (`:134`) are value-identical to `sr-only`'s, so
  nothing else on the element moves either.
- The geometry consequence in §1.4 item 8 (`width` 24px→1px, `height` 8px→1px) belongs to the same
  unreachable state and must not be quoted as a shipped effect.

### 5.1 Hero's other two declarations move with `animation-name`, harmlessly

`Hero.css:93` (`animation-duration`) and `:94` (`animation-timing-function`) invert alongside the
`animation-name` the probe measures, because the foundation's `.fade-up` shorthand sets all three.
Measured with `.fade-up` on the item:

```
animation-duration          0.3s                             →  0.3s, 0.3s
animation-timing-function   cubic-bezier(0.22, 1, 0.36, 1)   →  cubic-bezier(0.22, 1, 0.36, 1), cubic-bezier(…)
```

The list grows from one entry to two because the winning shorthand declares two animations — and each
entry carries the **same** duration and easing Hero was asking for. Harmless in effect; same root
cause and same fix as `hero-stagger-animation-name`. Worth knowing so a reader does not treat them as
two more regressions.

And the control that makes the Hero rows a finding rather than a coincidence: with **no** foundation
`.fade-*` class on the item — which is what `Hero.Content` renders on its own, since the fade class
goes on the `ScrollReveal` div and `Stagger` puts `.stagger-item` on a *child*
(`Hero.tsx:126-129` → `Stagger.tsx:45`) — nothing moves.

```
CTRL hero-stagger-no-fadeclass-name       fade   →  fade   same
CTRL hero-stagger-no-fadeclass-duration   0.3s   →  0.3s   same
```

This confirms plan §13's refinement: `Hero.css:91` is a **conditional** collision, needing markup a
consumer controls.

### 5.2 Carousel's scrollbar survives, and it is worth knowing why

`Carousel.css:35-37` sets `display: none` on `.carousel-track::-webkit-scrollbar`. `display` is **not**
among the foundation's `*::-webkit-scrollbar` declarations, so it has no competitor and keeps winning.
Measured:

```
carousel-scrollbar-display   none   →  none   same
carousel-scrollbar-width     10px   →  10px   same   (never won — same asymmetry as B-2)
```

A strict property intersection classifies this as **(C) not a collision**, correctly. It is recorded
because it is the one place where `Tabs`-shaped markup does *not* regress, and a reader sweeping "all
`::-webkit-scrollbar` rules" would otherwise assume it does.

### 5.3 The consumer-facing inversion is the feature, not a finding

Any consumer class on a component root now beats our CSS. That is Phase 1's entire purpose
(`<StatCard className="flex-row">`), and it is *also* the mechanism behind §3a's accepted hazard and
plan §12's "restyle every StatCard at once." My search deliberately does **not** enumerate this
surface as regressions — it is all **2194** of our declarations, by design, of which the **516**
in §2.3 are merely the ones a *foundation* rule could also reach.

### 5.4 Cross-component `className` passes — checked by hand, all clear

| Site | Utility passed | Target element's library class | Verdict |
| --- | --- | --- | --- |
| `DataTable.tsx:335`, `:337`, `VirtualizedDataTable.tsx:239` | `w-10` | `.table-header-cell` | **(C)** — `Table.css:31` sets `text-align`/`font-weight`/`color`/`white-space`; no `width` |
| `DataTable.tsx:584` | `bg-surface-3` | `.table-cell` + `.data-table-expanded-cell` | **(C)** — `Table.css:160` sets `color`; background lives on `.table-row--striped`/`--selected`, a different element |
| `CommandPalette.tsx:369` | `Kbd`'s base recipe (`Kbd.tsx:10`) | `.command-palette-option-shortcut` | **(C)** — ours sets only `flex-shrink`/`margin-left`; Kbd's utilities set neither |
| `AvatarUpload.tsx:267` | `size-full` | `Avatar` — **no `.css` file** | **(C)** — and already covered by plan §4d as a tw-merge finding |
| `Hero.tsx:91`, `Spotlight.tsx:115` | `size-full` | `Parallax` — no `.css` file | **(C)** |
| `menu-internals.tsx:288,346,368,388,408` | none | `${classPrefix}-*` | **(C)** — library classes and caller `className` only |

---

## 6. Reconciliation with the probe's 11 rows

| Probe row | Rediscovered by this search? | How |
| --- | --- | --- |
| `timeline-even-animation` | **Yes** | `Timeline.css:526` × F8. Needs shorthand expansion (§1.2) — a name-only intersection misses it. |
| `stagger-ancestor-inherit` | **Yes** | `Stagger.css:19` (`--stagger-delay`) and `:20` (`animation-delay`) × F6. Found on the custom property itself, re-measured directly (§4 A-5). |
| `radio-forced-colors-focus-outline` | **Yes — but only on the second attempt** | In-package axis, `Radio.css:40` × `focus:outline-none`. **My first scan missed it** because the utility arrives as the identifier `focusOutlineResetControl`. See §1.3. |
| `scrollreveal-no-js-opacity` | **Yes** | `ScrollReveal.css:13` × F4 |
| `tabs-scrollbar-height` | **Yes** | `Tabs.css:16` × F1 |
| `tabs-scrollbar-thumb-color` | **Yes** | `Tabs.css:20` × F2 |
| `hero-stagger-animation-name` | **Yes** | `Hero.css:92` × F9 |
| `hero-reveal-hidden-animation-none` | **Yes** | `Hero.css:98` × F9 |
| `switch-ring-vs-consumer-reset` | **NO — structurally impossible** | The winning rule is authored by the **consumer**, in neither source tree. See below. |
| `switch-ring-baseline` (control) | **NO** | Same reason: it is the control for a consumer-side fixture. |
| `control-sronly-padding` (control) | **Yes — and it is vacuous.** See below. | |

### ⚠ My method cannot see the consumer-side row, and that is a real hole

`switch-ring-vs-consumer-reset` measures a consumer's unlayered `*:focus,*:focus-visible{outline:none}`
beating `Switch.css:41`. **No search over this repo's source can find it**, because the competing
declaration does not exist in this repo. My search has one competitor population inside each of two
source trees; this row's competitor is in a third tree nobody here owns.

Consequences the implementer must hold onto:

- **Do not treat "the derived row set matches the search" as covering the probe's full surface.** The
  probe's adversarial fixtures cover a class my search cannot reach, and mine covers a class the
  probe's hand-written list did not reach. **Neither instrument subsumes the other**, and the
  intersection of their blind spots is the honest risk surface.
- The generalised version of this row is the whole of §5.3 — after Phase 1, **all 2194** of our
  declarations are beatable by unlayered consumer CSS, not just the 516 a foundation rule can also
  reach. `switch-ring-vs-consumer-reset` is the single instance the owner has priced. No measurement
  can tell you whether the rest are acceptable; that is a policy question, and §3a answered it once,
  narrowly, for focus rings.

### ⚠ `control-sronly-padding` is a control that cannot come back red

The probe measures `padding-top` on `#ct-1` = `<span class="app-shell-sidebar-link-label sr-only">`,
and reports `0px → 0px, unchanged, control held`. Plan §6 cites this as evidence that
`AppShell.css:205` is "not a regression."

**`.app-shell-sidebar-link-label` declares no padding.** Its only rule is `AppShell.css:184-187`:
`overflow: hidden; text-overflow: ellipsis`. So `sr-only`'s `padding: 0` has no competitor on that
element, the reading is `0px` for a trivial reason, and it would read `0px` under any layering scheme.

```
grep -n 'app-shell-sidebar-link-label\|app-shell-sidebar-section-title' src/components/ui/AppShell.css
# 116: .app-shell-sidebar-section-title            <- declares `padding: 0.25rem 0.75rem` at :127
# 184: .app-shell-sidebar-link-label               <- overflow + text-overflow only
# 206: .app-shell-sidebar[data-collapsed] .app-shell-sidebar-section-title  <- `padding: 0`
```

Measured, both classes side by side (full table in §5.0):

```
CTRL sronly-linklabel-padtop                    0px    →  0px    same    <- the probe's control
     sronly-sectiontitle-padtop (collapsed)     0px    →  0px    same    <- the reachable state
CTRL sectiontitle-no-sronly-padtop              4px    →  4px    same    <- our padding survives with no competitor
```

Per `memory/gates.md`, "'the gate is green' and 'the gate can still fail' are two separate
observations, and only the second is evidence." **This control supplies only the first, and the plan
should stop citing it as evidence that the sr-only interaction is safe.**

The honest resolution is smaller than "re-point it at the real collision", because §5.0 shows the real
collision has no reachable observable either. So:

- **Keep the row, and say in its `note` that it is weak by construction** — that is strictly better
  than a row whose green is read as a measurement.
- **Add the `sectiontitle` + `[data-collapsed]` pair as a control pinned at `0px`** (§7 R4). It is a
  *stronger* control than `#ct-1`, because it can move: if `AppShell.css:206-208` is deleted as "dead
  code" *without* Phase 1 having landed, or if the `sr-only`/`[data-collapsed]` coupling in
  `AppShell.tsx:333` is ever broken, the row reddens.
- **Do not add an `expectAfter` here.** There is no user-visible delta to accept.

---

## 7. Recommended new probe rows

Fixture format per `scripts/probe-cascade-layer.mjs`: markup goes in `FIXTURE` (`:110-171`), rows in
`PROBES` (`:198-301`) as `{ id, state, sel, pseudo?, prop, focus?, keyboardFocus?, expectBefore,
expectAfter?, accepted?, note }`. `state` selects an entry in `STATES` (`:329-350`). Remember
`expectBefore` is the **precondition** — a mismatch reports `INERT`, which fails the run.

### R1 — `timeline-right-animation` (A-1). Must-fix.

New fixture block:

```html
<!-- Timeline, data-align="right": Timeline.css:465 at (0,4,0) flips animation-name
     against the foundation's UNLAYERED .fade-right. Distinct from
     timeline-even-animation, which reproduces Timeline.css:526 only — that rule
     needs data-align="center", :nth-child(even) AND a >=40rem viewport, while
     this one needs none of the three. Timeline.tsx:219 hard-codes
     animation="fade-right" on every item, so both rules are live in real markup. -->
<div class="timeline" data-align="right">
  <div class="timeline-item fade-right" id="tr-1"></div>
</div>
```

```js
{
  id: "timeline-right-animation",
  state: "default",
  sel: "#tr-1",
  prop: "animation-name",
  expectBefore: "slide-left, fade",
  note: "Timeline.css:465 — right-aligned entrance direction; no media query, so it regresses at every width",
},
```

### R2 — `tabs-thumb-hover-color` (A-2).

Needs no new markup — `#tb-1` already exists. It **does** need a new capability: forcing `:hover`.
`page.hover()` worked in a standalone fixture but the row must be explicit about which of the two
hover states it pins (§1.4 item 5). Suggest a `hover: "<selector>"` field on the probe object,
applied with `await page.hover(probe.hover)` before the read, and a note saying the reading is the
**thumb**-hover state because forcing `:hover` on the host satisfies both selectors.

```js
{
  id: "tabs-thumb-hover-color",
  state: "default",
  sel: "#tb-1",
  pseudo: "::-webkit-scrollbar-thumb",
  prop: "background-color",
  hover: "#tb-1",                       // NEW capability — see note
  expectBefore: "oklch(0.9276 0.0058 264.53)",   // --C-BORDER-DEFAULT
  note: "Tabs.css:24 (0,2,1) vs the foundation's *::-webkit-scrollbar-thumb:hover (0,1,1). " +
        "Forcing :hover on the host satisfies BOTH selectors, so this pins the THUMB-hover state. " +
        "After layering Tabs.css:24 cannot win in any state — track-hover falls through to the " +
        "foundation's base rule at the same value, thumb-hover to --C-BORDER-STRONG.",
},
```

### R3 — `timeline-right-animation-reduced-motion` (B-3). Optional but cheap.

A control, and the kind `memory/gates.md` says turns a difference into a finding: it asserts that the
reduced-motion path is *already* inert and does not become less so.

```js
{
  id: "timeline-right-anim-duration-rm",
  state: "reduced-motion",
  sel: "#tr-1",
  prop: "animation-duration",
  expectBefore: "0s",
  note: "CONTROL — at reduced motion animation-name flips slide-left,fade -> none, but duration is " +
        "0s on both sides so nothing runs either way. Asserts the harmlessness rather than assuming it.",
},
```

### R4 — strengthen `control-sronly-padding` rather than replacing it (§5.0, §6).

**No `expectAfter`, no accepted delta.** §5.0 establishes there is no reachable value change here. What
the probe is missing is a control with *teeth* — one that can actually redden — plus an honest note on
the existing one. Reachable markup only:

```html
<!-- sr-only vs an unlayered padding declaration.
     #ct-1: `.app-shell-sidebar-link-label` declares NO padding, so this row can
       never move whatever the layering. Kept as a documented WEAK control.
     #ct-3: the real pairing, in the only markup AppShell can produce —
       `sr-only` is applied iff `collapsed` (AppShell.tsx:333) and the sidebar
       carries [data-collapsed] iff `collapsed` (:303), so the two always
       co-occur. AppShell.css:206-208 (0,3,0) therefore always applies too, and
       already forces the padding to 0. This row asserts THAT, and it reddens if
       :206-208 is deleted as "dead code" before Phase 1 lands, or if the
       sr-only/[data-collapsed] coupling in the TSX is ever broken.
     #ct-4: the same declaration with no sr-only, as the positive control. -->
<span class="app-shell-sidebar-link-label sr-only" id="ct-1">label</span>
<div class="app-shell-sidebar" data-collapsed>
  <h3 class="app-shell-sidebar-section-title sr-only" id="ct-3">section</h3>
</div>
<h3 class="app-shell-sidebar-section-title" id="ct-4">section, no sr-only</h3>
```

```js
{
  id: "control-sronly-sectiontitle-padding",
  state: "default",
  sel: "#ct-3",
  prop: "padding-left",
  expectBefore: "0px",
  note: "CONTROL with teeth. AppShell.css:127 (0,1,0) vs Tailwind's .sr-only (0,1,0) in " +
        "@layer utilities — an in-package inversion that Phase 1 flips. It has NO reachable " +
        "observable, because AppShell.css:206-208 (0,3,0) already forces 0 in the only state " +
        "AppShell renders (sr-only implies [data-collapsed] — AppShell.tsx:303,333). This row " +
        "pins that. It reddens if :206-208 is removed as dead code before Phase 1 lands, or if " +
        "the coupling in the TSX changes. Deliberately NOT an expectAfter row: nothing moves.",
},
{
  id: "control-sronly-linklabel-weak",
  state: "default",
  sel: "#ct-1",
  prop: "padding-top",
  expectBefore: "0px",
  note: "CONTROL, and WEAK BY CONSTRUCTION: .app-shell-sidebar-link-label declares no padding " +
        "(AppShell.css:184-187 is overflow + text-overflow only), so nothing can move this row " +
        "under any layering scheme. Kept to record that fact. NOT evidence that the sr-only " +
        "interaction is safe — control-sronly-sectiontitle-padding is the row that can move.",
},
{
  id: "control-sectiontitle-padding-unopposed",
  state: "default",
  sel: "#ct-4",
  prop: "padding-left",
  expectBefore: "12px",
  note: "CONTROL — the same declaration with no sr-only present. Proves the declaration is live " +
        "and the fixture is wired up. If this moves, the fixture or the understanding is wrong.",
},
```

> **Why no `expectAfter`.** The probe's guards (`:306-323`) would accept one — the reason sentence is
> writable and the value differs — and that is precisely the trap. `memory/gates.md`: *"`accepted` is
> never a place to park a row you have not decided about,"* and an `expectAfter` pinning an
> **unreachable** state is worse than that: it is a gate asserting a behaviour that does not exist,
> which will be cited as coverage. Assert the reachable `0px` instead.

### R5 — `grid-css-double-import` (A-4). Not a probe row; a different instrument.

`probe-cascade-layer.mjs` cannot express this: it derives entries from `src/styles.css` and builds no
JS. Two options, both outside the probe:

1. **A source assertion** — a `verify:*` script asserting that no `.css` is imported from a `.ts`/`.tsx`.
   It is one grep, needs no allowlist today (`Grid.tsx:5` is the only hit and is the thing being
   fixed), and it reddens the moment a lane adds another. **In scope**: `memory/README.md` §6's
   "*not even to add a script*" forbids adding scripts to the **other** packages, not to this one —
   this package already ships eight `verify:*` scripts and plan §8 lists two more as "to build".
2. **A dev-app check** — layer `Grid.css`, then confirm in `dev/` that `<Grid className="grid-cols-2">`
   actually takes effect. Cheapest, and the only option that measures the real behaviour, but it is a
   human step rather than a gate. `dev/styles.css:39` imports `../src/styles.css`, so the dev app is
   exactly the environment that exhibits the bug.

Whichever is chosen, Phase 1's commit must **say what it did about `Grid.tsx:5`**, because "the probe
is green" will not be evidence about it either way.

---

## 8. Assertable invariants, for whoever converts this into a gate

If the row set is to be *derived* rather than hand-listed, these are the numbers a script should
assert. Each fails loudly when the source changes, which is the point.

> **⚠ Two rows in this table are SUPERSEDED, and both are marked in place.** "Value today" meant the
> day it was written. The two the implementation moved are the two that mattered most — the import
> count and the JS-side import — and both now have a gate rather than a table row:
> `verify:css-layering` asserts the layering of every import in `src/styles.css` (and that
> `tokens.css` carries none), and `verify:no-css-imports` asserts the JS graph reaches no stylesheet.
> This table's own framing — "the numbers a script should assert" — is what those two scripts are.

| Invariant | Value today | Command |
| --- | --- | --- |
| Component CSS imports in `src/styles.css` | 46 — **⚠ 45 today**, `Stagger.css` was deleted | `grep -c '^@import "\./components' src/styles.css` |
| `@layer` blocks in the foundation | 2, both `@layer base` | `grep -rn '@layer' ../response-ui-css/src/` |
| Unlayered foundation rules | 48 | §2.2 script |
| Foundation unlayered rules with an intersecting property | 37 | §2.3 script |
| **Foundation unlayered rules that can reach a component element** | **10** (F1–F10) | §3 — needs the reach classification, which is the judgement half |
| Our CSS rules naming a foundation-owned class | 7, in 4 files | `grep -rn 'stagger-item\|scroll-reveal-hidden\|\.fade-\|\.scale-\|\.morph-\|mono-font' src --include=*.css` |
| Elements in production TSX carrying both a library subject class and a utility | 11 | §3, in-package table |
| In-package property overlaps among those 11 | 3 (Radio outline; AppShell padding; AppShell overflow) | §3 |
| CSS files imported from JS | 1 — `Grid.tsx:5` — **⚠ 0 today**; the import was deleted and `verify:no-css-imports` now gates it | `grep -rn '^import .*\.css' src --include=*.tsx --include=*.ts \| grep -v '\.test\.\|\.examples\.'` |
| `!important` anywhere in either package's CSS | 0 — **⚠ 2 today**, both in this package, both governed by `AGENTS.md`'s admission test; the foundation is still 0 | §1.1 |
| **Every component `@import` carries `layer(components)`, and `tokens.css` carries none** | **⚠ added after this document** — the layering itself had no assertion at all, and `probe:cascade-layer` cannot supply one because it re-adds `layer()` itself when building its layered variant | `bun run verify:css-layering` |

The one number that is **not** mechanically derivable is the reach classification (48 → 10). It is
judgement: "can these two selectors match one element" needs a selector-matching engine plus knowledge
of what markup the components emit. A gate asserting `37` would be honest; a gate asserting `10` would
be encoding this document's reading. Prefer the former plus this document as the record of the latter.

---

## 9. Overlap with `PHASE1-FIX-DECISIONS.md`

A companion document exists in this package root, written against the probe's **existing eight** rows.
Checked for agreement and for gaps, so this document is not a second source of truth for what it
already settles:

| Finding here | Status in `PHASE1-FIX-DECISIONS.md` |
| --- | --- |
| A-2 `Tabs.css:24` hover rule goes inert | **Independently reached.** Its `:923` recommends *"add a probe row for `.tabs-list:hover::-webkit-scrollbar-thumb`"*. Two searches, one conclusion — treat this row as confirmed. |
| B-6 / §5.0 `sr-only` and `AppShell.css:206-208` | **Independently reached**, and it lands on the same disposition — `:1394` says *"Do not delete it as part of Phase 1"*, with the comment rewritten rather than removed. My §5.0 adds the *reason* the observable is nil (the `sr-only` ⟹ `[data-collapsed]` coupling at `AppShell.tsx:303,333`), which that document does not state. |
| **A-1 `Timeline.css:465` (`data-align="right"`)** | **NOT covered.** `:465` appears there only inside a line-number drift-check table (`:74`); the analysis at `:100-105` is `:526` (`data-align="center"`, `(0,5,0)`) throughout. A fix written to `:526` alone leaves the broader rule regressing. |
| **A-4 `Grid.tsx:5` double import** | **NOT covered.** `grep -n 'Grid' PHASE1-FIX-DECISIONS.md` returns only `MasonryGrid` rows. |
| A-3 `Radio.css:39-42`, A-5…A-11 | Covered there, one section per probe row. Not re-decided here. |

**Both gaps are must-read for whoever implements Phase 1**, and neither is a criticism of that
document: it was scoped to the probe's eight rows, and A-1 and A-4 are exactly the rows the probe does
not have. That is the plan's own point — *"a hand-written row list is an allowlist, and the rows nobody
thought of are the ones that ship."*
