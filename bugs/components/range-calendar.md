# range-calendar — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 321 · RangeCalendar — blocked days sit inside a committed range (med)

`isDayDisabled` gates `handleSelect`, so an endpoint cannot land on a blocked day — but
`getDayStatus` computes `inRange` purely geometrically (`isAfter(day, start) && isBefore(day, end)`)
and nothing inspects the span at commit time. Measured with
`isDateDisabled={d => d.getDay()===0 || d.getDay()===6}`: clicking Fri 12 June then Mon 15 June
commits, and Sat 13 June renders **both** `aria-disabled="true"` and `data-in-range`. A booking or
availability UI therefore accepts, and visibly styles, a span containing days it has just declared
unavailable — and `onValueChange` reports the range as valid.
**Fix:** reject (or flag) a completing click whose span contains a disabled day, or expose the
validated span on the change payload so the caller can.
