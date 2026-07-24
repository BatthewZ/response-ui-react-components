import { useState } from "react";
import { Home, Package, Truck } from "lucide-react";

import { Stepper } from "./Stepper";

/** `activeStep` is a zero-based index — earlier steps read done, later ones upcoming. */
export function Minimal() {
  return (
    <Stepper activeStep={1}>
      <Stepper.Step title="Account" description="Your details" />
      <Stepper.Step title="Plan" description="Pick a tier" />
      <Stepper.Step title="Confirm" description="Review and pay" />
    </Stepper>
  );
}

/** `orientation="vertical"` stacks the steps and runs the rail down the marker column. */
export function Vertical() {
  return (
    <Stepper activeStep={2} orientation="vertical">
      <Stepper.Step title="Cart" description="2 items" />
      <Stepper.Step title="Shipping" description="Address entered" />
      <Stepper.Step title="Payment" description="Card details" />
      <Stepper.Step title="Confirmation" description="Order placed" />
    </Stepper>
  );
}

/** `onStepClick` turns every marker into a button, so gate back-navigation in the handler. */
export function Clickable() {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <Stepper
      activeStep={activeStep}
      onStepClick={(index) => {
        if (index < activeStep) setActiveStep(index);
      }}
    >
      <Stepper.Step title="Account" description="Your details" />
      <Stepper.Step title="Plan" description="Pick a tier" />
      <Stepper.Step title="Confirm" description="Review and pay" />
    </Stepper>
  );
}

/** An `icon` replaces that step's marker outright — number and completed check alike. */
export function CustomIcons() {
  return (
    <Stepper activeStep={1}>
      <Stepper.Step
        title="Order placed"
        description="12 March"
        icon={<Package aria-hidden="true" />}
      />
      <Stepper.Step
        title="In transit"
        description="Leaves the depot tonight"
        icon={<Truck aria-hidden="true" />}
      />
      <Stepper.Step
        title="Delivered"
        description="Estimated 15 March"
        icon={<Home aria-hidden="true" />}
      />
    </Stepper>
  );
}

/** Past the last index every step reads done and no step is current — the finished state. */
export function Completed() {
  return (
    <Stepper activeStep={3}>
      <Stepper.Step title="Cart" />
      <Stepper.Step title="Shipping" />
      <Stepper.Step title="Payment" />
    </Stepper>
  );
}
