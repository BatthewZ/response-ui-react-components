import { Input } from "./Input";
import { Label } from "./Label";

/** The field label: associate it with a control by matching `htmlFor` to the input's `id`. */
export function Minimal() {
  return <Label htmlFor="email">Email address</Label>;
}

/** `htmlFor`/`id` is the whole association — clicking the label now focuses the input. */
export function Associated() {
  return (
    <>
      <Label htmlFor="work-email">Work email</Label>
      <Input id="work-email" type="email" placeholder="you@company.com" />
    </>
  );
}

/** No `required` prop — compose the marker as `aria-hidden` children, and set `required` on the control. */
export function Required() {
  return (
    <Label htmlFor="full-name">
      Full name <span aria-hidden="true">*</span>
    </Label>
  );
}

/** Wrapping the control associates it implicitly — no `htmlFor`/`id` pair needed. */
export function WrappingAControl() {
  return (
    <Label>
      <input type="checkbox" /> Email me product updates
    </Label>
  );
}
