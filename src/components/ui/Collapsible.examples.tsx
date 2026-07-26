import { useState } from "react";

import { Collapsible } from "./Collapsible";

/** One disclosure: a trigger and the panel it shows. Closed until clicked. */
export function Minimal() {
  return (
    <Collapsible>
      <Collapsible.Trigger>Shipping details</Collapsible.Trigger>
      <Collapsible.Content>Ships in 2–3 business days. Free over $50.</Collapsible.Content>
    </Collapsible>
  );
}

/** `defaultOpen` seeds the uncontrolled state; it is read on the first render only. */
export function OpenByDefault() {
  return (
    <Collapsible defaultOpen>
      <Collapsible.Trigger>Advanced options</Collapsible.Trigger>
      <Collapsible.Content>Retry failed jobs automatically after 30 seconds.</Collapsible.Content>
    </Collapsible>
  );
}

/** Pass `open` and `onOpenChange` to own the state — the trigger then only reports intent. */
export function Controlled() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger>{open ? "Hide" : "Show"} release notes</Collapsible.Trigger>
      <Collapsible.Content>
        <p>Fixed a focus trap in the date picker.</p>
      </Collapsible.Content>
    </Collapsible>
  );
}

/** `disabled` on the root disables the trigger button and blocks every toggle. */
export function Disabled() {
  return (
    <Collapsible disabled>
      <Collapsible.Trigger>Billing history</Collapsible.Trigger>
      <Collapsible.Content>Available once your first invoice is issued.</Collapsible.Content>
    </Collapsible>
  );
}

/** The trigger ships with no CSS of its own — style it directly; it brings its own focus ring. */
export function StyledTrigger() {
  return (
    <Collapsible className="rounded-md border border-border-default">
      <Collapsible.Trigger className="flex w-full items-center justify-between p-r5 text-body-2 text-fg-primary">
        Payment method
        <span aria-hidden="true">▾</span>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <p className="p-r5 text-body-2 text-fg-secondary">Visa ending 4242 · expires 09/28</p>
      </Collapsible.Content>
    </Collapsible>
  );
}

/** Closed content stays in the DOM and in the tab order — mount focusable children only while open. */
export function GatedContent() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger>Invoices</Collapsible.Trigger>
      <Collapsible.Content>
        {open && <a href="/invoices/2026">Download 2026 invoices</a>}
      </Collapsible.Content>
    </Collapsible>
  );
}
