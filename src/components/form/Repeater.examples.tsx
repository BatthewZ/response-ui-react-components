import { Button } from "../ui/Button";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { FormActions } from "./FormActions";
import { Input } from "./Input";
import { Label } from "./Label";
import { Repeater } from "./Repeater";
import { FormProvider, useForm } from "./use-form";

const publishAgenda = () => {};

/** One row per array entry, a Remove button per row, and an Add button underneath. The
 *  Repeater holds no value — every edit lands in the `useForm` store it is handed. */
export function Minimal() {
  const form = useForm({ defaultValues: { links: [{ url: "" }] } });

  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="links"
        defaultItem={() => ({ url: "" })}
        addLabel="Add link"
      >
        {({ name, index }) => (
          <Field name={`${name}.url`}>
            <Label htmlFor={`${name}.url`}>Link {index + 1}</Label>
            <Input
              id={`${name}.url`}
              placeholder="https://example.com"
              {...form.field(`${name}.url`)}
            />
            <FieldError />
          </Field>
        )}
      </Repeater>
    </FormProvider>
  );
}

/** `reorderable` adds a Move up / Move down pair to every row's control column. */
export function Reorderable() {
  const form = useForm({
    defaultValues: {
      steps: [
        { text: "Preheat the oven to 200°C" },
        { text: "Season the chicken" },
        { text: "Roast for 45 minutes" },
      ],
    },
  });

  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="steps"
        defaultItem={() => ({ text: "" })}
        addLabel="Add step"
        reorderable
      >
        {({ name, index }) => (
          <Field name={`${name}.text`}>
            <Label htmlFor={`${name}.text`}>Step {index + 1}</Label>
            <Input id={`${name}.text`} {...form.field(`${name}.text`)} />
            <FieldError />
          </Field>
        )}
      </Repeater>
    </FormProvider>
  );
}

/** `min` disables every Remove button once the count reaches it; `max` disables Add. */
export function Bounded() {
  const form = useForm({
    defaultValues: { recipients: [{ email: "ada@example.com" }] },
  });

  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="recipients"
        defaultItem={() => ({ email: "" })}
        addLabel="Add recipient"
        min={1}
        max={5}
      >
        {({ name, index }) => (
          <Field name={`${name}.email`}>
            <Label htmlFor={`${name}.email`}>Recipient {index + 1}</Label>
            <Input id={`${name}.email`} type="email" {...form.field(`${name}.email`)} />
            <FieldError />
          </Field>
        )}
      </Repeater>
    </FormProvider>
  );
}

/** A row is whatever you return — compose several controls off the same `name` prefix. */
export function MultipleFieldsPerRow() {
  const form = useForm({
    defaultValues: { contacts: [{ fullName: "", email: "" }] },
  });

  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="contacts"
        defaultItem={() => ({ fullName: "", email: "" })}
        addLabel="Add contact"
      >
        {({ name, index }) => (
          <div className="flex gap-r5">
            <Field name={`${name}.fullName`} className="flex-1">
              <Label htmlFor={`${name}.fullName`}>Contact {index + 1} name</Label>
              <Input
                id={`${name}.fullName`}
                placeholder="Ada Lovelace"
                {...form.field(`${name}.fullName`)}
              />
              <FieldError />
            </Field>
            <Field name={`${name}.email`} className="flex-1">
              <Label htmlFor={`${name}.email`}>Contact {index + 1} email</Label>
              <Input
                id={`${name}.email`}
                type="email"
                {...form.field(`${name}.email`)}
              />
              <FieldError />
            </Field>
          </div>
        )}
      </Repeater>
    </FormProvider>
  );
}

/** The render prop is handed the row's own API, so you can build controls that name the
 *  row they act on. The built-in Remove button still renders beside them. */
export function CustomRowControls() {
  const form = useForm({ defaultValues: { questions: [{ prompt: "" }] } });

  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="questions"
        defaultItem={() => ({ prompt: "" })}
        addLabel="Add question"
      >
        {({ name, index, count, isFirst, isLast, moveUp, moveDown, remove }) => (
          <Field name={`${name}.prompt`}>
            <Label htmlFor={`${name}.prompt`}>
              Question {index + 1} of {count}
            </Label>
            <Input id={`${name}.prompt`} {...form.field(`${name}.prompt`)} />
            <FieldError />
            <div className="flex gap-r5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isFirst}
                onClick={moveUp}
              >
                Move question {index + 1} earlier
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLast}
                onClick={moveDown}
              >
                Move question {index + 1} later
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                Delete question {index + 1}
              </Button>
            </div>
          </Field>
        )}
      </Repeater>
    </FormProvider>
  );
}

/** Repeater is a bound field like any other: it submits, validates and resets with the form. */
export function InAForm() {
  const form = useForm({
    defaultValues: { title: "Sprint review", agenda: [{ item: "" }] },
    onSubmit: publishAgenda,
  });

  return (
    <FormProvider form={form}>
      <form {...form.props}>
        <Field name="title">
          <Label htmlFor="agenda-title">Meeting title</Label>
          <Input id="agenda-title" {...form.field("title")} />
          <FieldError />
        </Field>
        <Repeater
          form={form}
          name="agenda"
          defaultItem={() => ({ item: "" })}
          addLabel="Add agenda item"
          min={1}
        >
          {({ name, index }) => (
            <Field name={`${name}.item`}>
              <Label htmlFor={`${name}.item`}>Agenda item {index + 1}</Label>
              <Input id={`${name}.item`} {...form.field(`${name}.item`)} />
              <FieldError />
            </Field>
          )}
        </Repeater>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => form.reset()}>
            Discard
          </Button>
          <Button type="submit">Publish agenda</Button>
        </FormActions>
      </form>
    </FormProvider>
  );
}

/** `disabled` reaches only the Repeater's own Add / Remove / Move buttons. The row fields
 *  are disabled separately, by `useForm`'s own `disabled` option. */
export function Disabled() {
  const form = useForm({
    defaultValues: { links: [{ url: "https://ada.example/cv" }] },
    disabled: true,
  });

  return (
    <FormProvider form={form}>
      <Repeater
        form={form}
        name="links"
        defaultItem={() => ({ url: "" })}
        addLabel="Add link"
        disabled
      >
        {({ name, index }) => (
          <Field name={`${name}.url`}>
            <Label htmlFor={`${name}.url`}>Link {index + 1}</Label>
            <Input id={`${name}.url`} {...form.field(`${name}.url`)} />
            <FieldError />
          </Field>
        )}
      </Repeater>
    </FormProvider>
  );
}
