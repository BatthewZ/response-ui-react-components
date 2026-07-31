import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { MultiSelect } from "./MultiSelect";

/** Uncontrolled: hand it a closed set of `options` and it owns the array. `aria-label` is
 *  the control's only naming path — it is the one prop forwarded to the inner input. */
export function Minimal() {
  return (
    <MultiSelect
      aria-label="Skills"
      placeholder="Add skills…"
      options={[
        { value: "react", label: "React" },
        { value: "typescript", label: "TypeScript" },
        { value: "css", label: "CSS" },
        { value: "postgres", label: "PostgreSQL" },
      ]}
    />
  );
}

/** Controlled: hold the selection in `useState` and pass `value` + `onValueChange`. The
 *  array is the source of truth — chips render in the order values were added. */
export function Controlled() {
  const [skills, setSkills] = useState<string[]>(["react"]);

  return (
    <MultiSelect
      aria-label="Skills"
      value={skills}
      onValueChange={setSkills}
      placeholder="Add skills…"
      options={[
        { value: "react", label: "React" },
        { value: "typescript", label: "TypeScript" },
        { value: "css", label: "CSS" },
        { value: "postgres", label: "PostgreSQL" },
      ]}
    />
  );
}

/** `maxItems` caps the selection: once it is reached every *unselected* option turns
 *  `aria-disabled` and is skipped by the arrow keys. Selected ones stay togglable. */
export function MaxItems() {
  return (
    <MultiSelect
      aria-label="Request reviewers"
      maxItems={2}
      placeholder="Up to 2 reviewers"
      options={[
        { value: "ada", label: "Ada Lovelace" },
        { value: "grace", label: "Grace Hopper" },
        { value: "alan", label: "Alan Turing" },
        { value: "katherine", label: "Katherine Johnson" },
      ]}
    />
  );
}

/** An option marked `disabled` renders muted, ignores clicks, and is stepped over by
 *  keyboard navigation — it stays visible so the absence is explainable. */
export function DisabledOption() {
  return (
    <MultiSelect
      aria-label="Deployment regions"
      defaultValue={["us-east-1"]}
      options={[
        { value: "us-east-1", label: "US East (N. Virginia)" },
        { value: "us-west-2", label: "US West (Oregon)" },
        { value: "eu-west-1", label: "Europe (Ireland)" },
        { value: "eu-west-2", label: "Europe (London) — at capacity", disabled: true },
      ]}
    />
  );
}

/** `searchable={false}` makes the inner input `readOnly`: no filter box, the full list
 *  every time. Backspace still peels off the last chip. */
export function WithoutSearch() {
  return (
    <MultiSelect
      aria-label="Notification channels"
      searchable={false}
      placeholder="Choose channels"
      options={[
        { value: "email", label: "Email" },
        { value: "slack", label: "Slack" },
        { value: "sms", label: "SMS" },
        { value: "webhook", label: "Webhook" },
      ]}
    />
  );
}

/** Inside an errored `Field` the control picks up the red border, `aria-invalid` and the
 *  `FieldError` id from context. The visible `Label` is decoration — it cannot be
 *  associated with the input, so repeat the text in `aria-label`. */
export function InField() {
  return (
    <Field error="Pick at least one skill.">
      <Label>Skills</Label>
      <MultiSelect
        aria-label="Skills"
        placeholder="Add skills…"
        options={[
          { value: "react", label: "React" },
          { value: "typescript", label: "TypeScript" },
          { value: "css", label: "CSS" },
        ]}
      />
      <FieldError />
    </Field>
  );
}

/** `error` styles a standalone control as invalid and sets `aria-invalid="true"`. */
export function ErrorState() {
  return (
    <MultiSelect
      error
      aria-label="Skills"
      placeholder="Add skills…"
      options={[
        { value: "react", label: "React" },
        { value: "typescript", label: "TypeScript" },
        { value: "css", label: "CSS" },
      ]}
    />
  );
}

/** `disabled` reaches the input and every chip's remove button, so the selection becomes
 *  read-only rather than merely un-typeable. Clicking the control no longer opens it. */
export function Disabled() {
  return (
    <MultiSelect
      disabled
      aria-label="Skills"
      defaultValue={["react", "typescript"]}
      options={[
        { value: "react", label: "React" },
        { value: "typescript", label: "TypeScript" },
        { value: "css", label: "CSS" },
      ]}
    />
  );
}

/** `children` is a function, and the `options` it receives is the list MultiSelect has
 *  already filtered — map it to compose the rows and the chips. The data prop stays the
 *  only writer of the list; the parts carry the roles, ids and ARIA. */
export function Composed() {
  return (
    <MultiSelect
      aria-label="Reviewers"
      placeholder="Add reviewers…"
      options={[
        { value: "ada", label: "Ada Lovelace" },
        { value: "grace", label: "Grace Hopper" },
        { value: "alan", label: "Alan Turing" },
      ]}
    >
      {({ options, selected }) => (
        <>
          {selected.map(({ value, label }, index) => (
            <MultiSelect.Tag key={`${index}:${value}`} index={index} className="uppercase">
              {label}
              <MultiSelect.TagRemove />
            </MultiSelect.Tag>
          ))}
          <MultiSelect.Content className="min-w-[16rem]">
            {options.length === 0 ? (
              <MultiSelect.Empty>Nobody by that name</MultiSelect.Empty>
            ) : (
              options.map((option) => (
                <MultiSelect.Item key={option.value} option={option}>
                  <MultiSelect.ItemIndicator />
                  {option.label}
                  <span className="ml-auto text-fg-muted">@{option.value}</span>
                </MultiSelect.Item>
              ))
            )}
          </MultiSelect.Content>
        </>
      )}
    </MultiSelect>
  );
}

/** `placement` is the floating-ui preference for where the listbox opens; it still flips
 *  to the opposite side when there is no room. */
export function Placement() {
  return (
    <MultiSelect
      aria-label="Skills"
      placement="top-start"
      placeholder="Opens upward"
      options={[
        { value: "react", label: "React" },
        { value: "typescript", label: "TypeScript" },
        { value: "css", label: "CSS" },
      ]}
    />
  );
}
