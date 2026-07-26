import { useState } from "react";

import { Accordion } from "./Accordion";
import { Button } from "./Button";

/** `mode="single"` is the default — opening one section closes the other. */
export function Minimal() {
  return (
    <Accordion defaultValue="shipping">
      <Accordion.Item value="shipping">
        <Accordion.Trigger>When will my order ship?</Accordion.Trigger>
        <Accordion.Content>
          <p>Orders placed before 2pm ship the same working day.</p>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="returns">
        <Accordion.Trigger>How do I return an item?</Accordion.Trigger>
        <Accordion.Content>
          <p>Start a return from your order history within 30 days of delivery.</p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

/** `mode="multiple"` lets sections stack open, and `defaultValue` takes an array. */
export function MultipleOpen() {
  return (
    <Accordion mode="multiple" defaultValue={["billing", "security"]}>
      <Accordion.Item value="billing">
        <Accordion.Trigger>Billing</Accordion.Trigger>
        <Accordion.Content>
          <p>Visa ending 4242. Next invoice 1 August.</p>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="security">
        <Accordion.Trigger>Security</Accordion.Trigger>
        <Accordion.Content>
          <p>Two-factor authentication is on for every member of the workspace.</p>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="notifications">
        <Accordion.Trigger>Notifications</Accordion.Trigger>
        <Accordion.Content>
          <p>Weekly digest only. Nothing is sent outside working hours.</p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

/** Hold the open set yourself with `useState<string | string[]>([])` and drive it from outside. */
export function Controlled() {
  const [openSections, setOpenSections] = useState<string | string[]>(["billing"]);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpenSections([])}>
        Collapse all
      </Button>
      <Accordion mode="multiple" value={openSections} onValueChange={setOpenSections}>
        <Accordion.Item value="billing">
          <Accordion.Trigger>Billing</Accordion.Trigger>
          <Accordion.Content>
            <p>Visa ending 4242. Next invoice 1 August.</p>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="security">
          <Accordion.Trigger>Security</Accordion.Trigger>
          <Accordion.Content>
            <p>Two-factor authentication is on for every member of the workspace.</p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </>
  );
}

/** A disabled item is a disabled `<button>`: not clickable, and not reachable by keyboard at all. */
export function DisabledItem() {
  return (
    <Accordion defaultValue="plan">
      <Accordion.Item value="plan">
        <Accordion.Trigger>Change plan</Accordion.Trigger>
        <Accordion.Content>
          <p>You are on Team. Upgrading takes effect at the next billing date.</p>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="transfer" disabled>
        <Accordion.Trigger>Transfer ownership</Accordion.Trigger>
        <Accordion.Content>
          <p>Only the workspace owner can transfer ownership.</p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

/** Triggers already render inside a heading; `headingLevel` picks the rank. */
export function WithHeadings() {
  return (
    <Accordion mode="multiple" headingLevel={2}>
      <Accordion.Item value="shipping">
        <Accordion.Trigger>When will my order ship?</Accordion.Trigger>
        <Accordion.Content>
          <p>Orders placed before 2pm ship the same working day.</p>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="returns">
        <Accordion.Trigger>How do I return an item?</Accordion.Trigger>
        <Accordion.Content>
          <p>Start a return from your order history within 30 days of delivery.</p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
