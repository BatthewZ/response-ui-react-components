# code-block — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 148 · CodeBlock — the code scroller cannot be reached by keyboard (med)

`.code-block-pre` is the `overflow-x: auto` element and carries no `tabIndex`; `.code-block` (the
root, which does take rest props) is `overflow: hidden`.

**Failure scenario.** A 200-char line inside a 400px column: a mouse or trackpad pans the `<pre>`,
a keyboard cannot focus it, and the end of the line is unreachable (WCAG 2.1.1). Passing
`tabIndex={0}` to CodeBlock lands it on the `overflow: hidden` root, so arrow keys there scroll the
page instead — **there is no call-site fix.** Two of the three engines now focus a childless scroll
container automatically, which mitigates but does not remove it; that mitigation is browser
knowledge, not measured here. **Fix:** put `tabIndex={0}` on the `<pre>` — it already sits inside a
labelled region.
