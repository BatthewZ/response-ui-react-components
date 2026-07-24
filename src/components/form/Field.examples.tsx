import { Checkbox } from "./Checkbox";
import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Input } from "./Input";
import { Label } from "./Label";
import { FormProvider, useForm } from "./use-form";

/** Group a label, control, and message. `error` marks the field invalid, and the control
 *  inside inherits `aria-invalid` + an `aria-describedby` pointing at the `FieldError`. */
export function Minimal() {
  return (
    <Field error="Enter a valid email address.">
      <Label htmlFor="email">Work email</Label>
      <Input id="email" type="email" defaultValue="ada@" />
      <FieldError />
    </Field>
  );
}

/** Inside a `FormProvider`, `name` binds the field to that form value — its error flows
 *  from validation into the `FieldError` with no explicit `error` prop. */
export function FormWired() {
  const form = useForm({ defaultValues: { email: "" } });

  return (
    <FormProvider form={form}>
      <Field name="email">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" {...form.field("email")} />
        <FieldError />
      </Field>
    </FormProvider>
  );
}

/** `error` accepts any `ReactNode`, so a message can carry a link or formatting. */
export function RichError() {
  return (
    <Field
      error={
        <>
          That username is taken. <a href="/help/usernames">See naming rules</a>.
        </>
      }
    >
      <Label htmlFor="username">Username</Label>
      <Input id="username" defaultValue="ada" />
      <FieldError />
    </Field>
  );
}

/** The wrapper is a `flex flex-col` column by default; `className` overrides it — here to
 *  an inline row for a checkbox and its label. */
export function HorizontalLayout() {
  return (
    <Field className="flex-row items-center gap-r4">
      <Checkbox id="terms" />
      <Label htmlFor="terms">I accept the terms of service</Label>
    </Field>
  );
}
