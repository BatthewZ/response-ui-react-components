import { useState } from "react";

import { Checkbox } from "../form/Checkbox";
import { Field } from "../form/Field";
import { Input } from "../form/Input";
import { Label } from "../form/Label";
import { Row } from "../layout/Row";
import { Stack } from "../layout/Stack";

import { Button } from "./Button";
import { Stepper } from "./Stepper";
import { Text } from "./Text";
import { useWizard, Wizard } from "./Wizard";

/** Each step is data — a title, an optional description, and the node shown while it is active. */
export function Minimal() {
  return (
    <Wizard
      steps={[
        {
          title: "Account",
          description: "Your details",
          content: (
            <Field>
              <Label htmlFor="wizard-email">Work email</Label>
              <Input id="wizard-email" type="email" placeholder="ada@example.com" />
            </Field>
          ),
        },
        {
          title: "Plan",
          description: "Pick a tier",
          content: <Text>Team — £12 per seat, billed monthly.</Text>,
        },
        {
          title: "Confirm",
          description: "Review and pay",
          content: <Text>We will email a receipt to ada@example.com.</Text>,
        },
      ]}
      onComplete={() => window.location.assign("/dashboard")}
    />
  );
}

/** `orientation` is forwarded to the header only — content and footer are laid out the same way. */
export function Vertical() {
  return (
    <Wizard
      orientation="vertical"
      steps={[
        {
          title: "Cart",
          description: "2 items",
          content: <Text>Mechanical keyboard, USB-C hub.</Text>,
        },
        {
          title: "Shipping",
          description: "Where it goes",
          content: <Text>221B Baker Street, London NW1 6XE.</Text>,
        },
        {
          title: "Payment",
          description: "How you pay",
          content: <Text>Visa ending 4242.</Text>,
        },
      ]}
    />
  );
}

/** `allowBackNavigation={false}` makes the header a pure indicator; all three labels are yours. */
export function LinearFlow() {
  return (
    <Wizard
      allowBackNavigation={false}
      backLabel="Previous"
      nextLabel="Continue"
      finishLabel="Submit order"
      steps={[
        {
          title: "Terms",
          description: "Read and accept",
          content: <Text>Licence renews annually unless cancelled.</Text>,
        },
        {
          title: "Confirm",
          description: "Place the order",
          content: <Text>One licence for Ada Lovelace, £144 a year.</Text>,
        },
      ]}
    />
  );
}

/** Controlled: refuse a forward move by not writing it. `step` and `accepted` are `useState` pairs. */
export function GatedProgress() {
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);

  return (
    <Wizard
      step={step}
      onStepChange={(next) => {
        if (next <= step || accepted) setStep(next);
      }}
      onComplete={() => window.location.assign("/orders")}
      steps={[
        {
          title: "Terms",
          description: "Accept to continue",
          content: (
            <Row gap="r5">
              <Checkbox
                id="wizard-terms"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <Label htmlFor="wizard-terms">I accept the terms of service</Label>
            </Row>
          ),
        },
        {
          title: "Details",
          description: "Who it is for",
          content: (
            <Field>
              <Label htmlFor="wizard-seat">Seat holder</Label>
              <Input id="wizard-seat" placeholder="Ada Lovelace" />
            </Field>
          ),
        },
        {
          title: "Confirm",
          description: "Place the order",
          content: <Text>One licence, billed annually.</Text>,
        },
      ]}
    />
  );
}

/** `wizard` here is `useWizard({ count: 3 })` — the index and the moves, no markup of its own. */
export function Headless() {
  const wizard = useWizard({ count: 3 });

  return (
    <Stack gap="r4">
      <Stepper activeStep={wizard.activeStep}>
        <Stepper.Step title="Upload" />
        <Stepper.Step title="Map columns" />
        <Stepper.Step title="Import" />
      </Stepper>
      <Row gap="r5" justify="between">
        <Button variant="ghost" onClick={wizard.back} disabled={wizard.isFirst}>
          Back
        </Button>
        <Button onClick={wizard.next} disabled={wizard.isComplete}>
          {wizard.isLast || wizard.isComplete ? "Import 1,204 rows" : "Next"}
        </Button>
      </Row>
    </Stack>
  );
}
