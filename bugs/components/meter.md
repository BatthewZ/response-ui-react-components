# meter — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 21 · Meter — threshold status by colour alone (med)

Warning/critical thresholds change only the fill tint; nothing textual or programmatic marks
the status, so greyscale/colour-blind and screen-reader users can't perceive it (WCAG 1.4.1).
**Fix:** a visually-hidden status label or an `aria` annotation tied to the threshold.
