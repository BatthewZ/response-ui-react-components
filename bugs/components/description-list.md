# description-list — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 7 · DescriptionList — a second `<dd>` transposes every row after it (med)

The default (horizontal) layout is `grid grid-cols-[max-content_1fr]`
(DescriptionList.tsx:16) with `dt`/`dd` as direct grid items under default auto-flow.
Measured placement for one Term with two Details: `(1,1)Phones (1,2)Home (2,1)Work
(2,2)Email (3,1)a@b.c` — the second `<dd>` occupies the **term** column and the next
`<dt>` lands in the detail column, permanently swapping every following pair. Multiple
`<dd>` per `<dt>` is valid HTML and a shipped example.
**A test in the suite already renders this and passes:** `DescriptionList.test.tsx:63`
("supports multiple Detail per Term") asserts only `toHaveLength(2)`,
`toHaveTextContent` and roles — never placement, which is the whole claim.
**Fix:** pin the columns (`[&>dt]:col-start-1 [&>dd]:col-start-2`) so extra `dd`s flow
down column 2, and strengthen that test to assert grid position.
