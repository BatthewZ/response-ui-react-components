import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { TagInput } from "./TagInput";

/** Uncontrolled. Enter or a comma turns the draft into a chip; Backspace on an empty field
 *  deletes the last one. The `aria-label` lands on the inner text input. */
export function Minimal() {
  return <TagInput aria-label="Topics" placeholder="Add a topic…" />;
}

/** `maxTags` caps the set. Past the cap the component refuses new tags with nothing on screen
 *  — no message, no disabled state — but keeps the typing and announces the refusal. */
export function MaxTags() {
  return (
    <TagInput
      aria-label="Topics"
      maxTags={3}
      defaultValue={["react", "typescript", "design-systems"]}
    />
  );
}

/** `validateTag` returns `true` to accept, a string to reject *with that message*, or `false`
 *  to reject with no visible message. The draft is kept either way, and both are announced. */
export function ValidateTag() {
  return (
    <TagInput
      aria-label="Topics"
      placeholder="lowercase-with-hyphens"
      validateTag={(tag) =>
        /^[a-z0-9-]+$/.test(tag) || "Use lowercase letters, digits and hyphens only"
      }
    />
  );
}

/** `delimiter` replaces the default comma-or-newline regex. This one also commits on a
 *  space, so pasting "react typescript vite" lands three chips at once. */
export function CustomDelimiter() {
  return (
    <TagInput
      aria-label="Topics"
      delimiter={/[\s,]/}
      placeholder="Space- or comma-separated"
    />
  );
}

/** `value` + `onValueChange` drive the set from your own state — here
 *  `const [topics, setTopics] = useState<string[]>(["react", "typescript"])`. */
export function Controlled() {
  const [topics, setTopics] = useState<string[]>(["react", "typescript"]);

  return (
    <TagInput
      aria-label="Topics"
      value={topics}
      onValueChange={setTopics}
      placeholder="Add a topic…"
    />
  );
}

/** Inside a `Field` the control inherits `aria-invalid` and `aria-describedby` from the
 *  field's error — but wire `Label htmlFor` to the input's `id` yourself; `Field` does not. */
export function InField() {
  return (
    <Field error="Add at least one topic.">
      <Label htmlFor="topics">Topics</Label>
      <TagInput id="topics" placeholder="Add a topic…" />
      <FieldError />
    </Field>
  );
}

/** Standalone, `error` reddens the border and focus ring and sets `aria-invalid`. With no
 *  `Field` there is no `aria-describedby`, so pair it with your own visible message. */
export function ErrorState() {
  return <TagInput error aria-label="Topics" defaultValue={["react"]} />;
}

/** `disabled` recesses the fill to `surface-3` and disables the text field and every chip's
 *  remove button, so the set becomes read-only. */
export function Disabled() {
  return (
    <TagInput aria-label="Topics" disabled defaultValue={["react", "typescript"]} />
  );
}
