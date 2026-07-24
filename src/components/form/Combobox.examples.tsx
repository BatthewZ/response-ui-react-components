import { useState } from "react";

import { Combobox } from "./Combobox";
import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";

/** Root holds no list and does no filtering — you filter, then hand each surviving option
 *  its **rendered** `index`. `query` here is a `useState` string driven by `onInputValueChange`. */
export function Minimal() {
  const [query, setQuery] = useState("");

  return (
    <Combobox onInputValueChange={setQuery}>
      <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
      <Combobox.Content>
        {[
          { value: "us-east-1", label: "US East (N. Virginia)" },
          { value: "us-west-2", label: "US West (Oregon)" },
          { value: "eu-west-1", label: "Europe (Ireland)" },
          { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
        ]
          .filter((region) =>
            region.label.toLowerCase().includes(query.toLowerCase()),
          )
          .map((region, index) => (
            <Combobox.Item key={region.value} index={index} value={region.value}>
              {region.label}
            </Combobox.Item>
          ))}
      </Combobox.Content>
    </Combobox>
  );
}

/** Three independent pieces of state. `region`/`query` are `useState` strings; the value is the
 *  option id, the input text is whatever the user typed, and nothing keeps the two in step. */
export function Controlled() {
  const [region, setRegion] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  return (
    <Combobox
      value={region}
      onValueChange={setRegion}
      inputValue={query}
      onInputValueChange={setQuery}
    >
      <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
      <Combobox.Content>
        {[
          { value: "us-east-1", label: "US East (N. Virginia)" },
          { value: "eu-west-1", label: "Europe (Ireland)" },
        ]
          .filter((option) =>
            option.label.toLowerCase().includes(query.toLowerCase()),
          )
          .map((option, index) => (
            <Combobox.Item key={option.value} index={index} value={option.value}>
              {option.label}
            </Combobox.Item>
          ))}
      </Combobox.Content>
    </Combobox>
  );
}

/** `Combobox.Empty` is the no-results slot: render it instead of the options when your filter
 *  returns nothing. It is not an option, so it never becomes the active descendant. */
export function EmptyResults() {
  return (
    <Combobox defaultOpen defaultInputValue="Ada">
      <Combobox.Input aria-label="Assignee" placeholder="Search teammates…" />
      <Combobox.Content>
        <Combobox.Empty>No teammates match “Ada”.</Combobox.Empty>
      </Combobox.Content>
    </Combobox>
  );
}

/** `loading` swaps the popup's children for a centred `Spinner` — the options below are
 *  mounted in the tree but not rendered while it is set. */
export function Loading() {
  return (
    <Combobox defaultOpen loading defaultInputValue="react">
      <Combobox.Input aria-label="npm package" placeholder="Search packages…" />
      <Combobox.Content>
        <Combobox.Item index={0} value="react">
          react
        </Combobox.Item>
      </Combobox.Content>
    </Combobox>
  );
}

/** `index` is yours to supply and must be the position in the rendered list. A `disabled`
 *  option keeps its index but is skipped by the arrow keys and ignored on click. */
export function DisabledOption() {
  return (
    <Combobox defaultOpen>
      <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
      <Combobox.Content>
        <Combobox.Item index={0} value="us-east-1">
          US East (N. Virginia)
        </Combobox.Item>
        <Combobox.Item index={1} value="eu-west-2" disabled>
          Europe (London) — at capacity
        </Combobox.Item>
        <Combobox.Item index={2} value="eu-west-1">
          Europe (Ireland)
        </Combobox.Item>
      </Combobox.Content>
    </Combobox>
  );
}

/** Inside a `Field`, `Combobox.Input` picks up the red border, `aria-invalid` and the
 *  `FieldError` id from context. Pair the `Label`'s `htmlFor` with the input's `id` yourself. */
export function InField() {
  return (
    <Field error="Pick the region your data will live in.">
      <Label htmlFor="region">Deployment region</Label>
      <Combobox>
        <Combobox.Input id="region" placeholder="Search regions…" />
        <Combobox.Content>
          <Combobox.Item index={0} value="us-east-1">
            US East (N. Virginia)
          </Combobox.Item>
          <Combobox.Item index={1} value="eu-west-1">
            Europe (Ireland)
          </Combobox.Item>
        </Combobox.Content>
      </Combobox>
      <FieldError />
    </Field>
  );
}

/** `error` on the input marks a standalone combobox invalid, with no `Field` involved. */
export function ErrorState() {
  return (
    <Combobox>
      <Combobox.Input error aria-label="Deployment region" placeholder="Search regions…" />
      <Combobox.Content>
        <Combobox.Item index={0} value="us-east-1">
          US East (N. Virginia)
        </Combobox.Item>
      </Combobox.Content>
    </Combobox>
  );
}

/** `placement` is passed straight to the floating engine; `flip` and `shift` still move the
 *  popup if the preferred side has no room. */
export function TopPlacement() {
  return (
    <Combobox placement="top-start" defaultOpen>
      <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
      <Combobox.Content>
        <Combobox.Item index={0} value="us-east-1">
          US East (N. Virginia)
        </Combobox.Item>
        <Combobox.Item index={1} value="eu-west-1">
          Europe (Ireland)
        </Combobox.Item>
      </Combobox.Content>
    </Combobox>
  );
}
