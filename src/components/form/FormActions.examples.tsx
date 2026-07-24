import type { SubmitEvent } from "react";

import { Button } from "../ui/Button";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { FormActions } from "./FormActions";
import { Input } from "./Input";
import { Label } from "./Label";

const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => event.preventDefault();
const deleteInvoice = () => {};

/** The form footer: a right-aligned row of actions, spaced off the fields above it. */
export function Minimal() {
  return (
    <FormActions>
      <Button type="button" variant="secondary">
        Cancel
      </Button>
      <Button type="submit">Save changes</Button>
    </FormActions>
  );
}

/** Its place is the last child of a `<form>`. Every non-submitting action needs an explicit
 *  `type="button"` — FormActions sets none, and a bare `<button>` in a form submits it. */
export function InAForm() {
  return (
    <form onSubmit={handleSubmit}>
      <Field error="Enter a valid email address.">
        <Label htmlFor="billing-email">Billing email</Label>
        <Input id="billing-email" type="email" defaultValue="ada@" />
        <FieldError />
      </Field>
      <FormActions>
        <Button type="button" variant="secondary">
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </FormActions>
    </form>
  );
}

/** There is no `justify` prop; `className` merges through tailwind-merge, so
 *  `justify-between` replaces the built-in `justify-end` rather than fighting it. */
export function SplitAlignment() {
  return (
    <FormActions className="justify-between">
      <Button type="button" variant="danger" onClick={deleteInvoice}>
        Delete invoice
      </Button>
      <Button type="submit">Save changes</Button>
    </FormActions>
  );
}
