import { useState } from "react";

import { Field } from "./Field";
import { FieldError } from "./FieldError";
import { Label } from "./Label";
import { SearchInput } from "./SearchInput";

/** Controlled only: hold the query in `useState` and hand `SearchInput` the string plus a
 *  setter. It supplies its own placeholder, its own accessible name, and a clear button. */
export function Minimal() {
  const [query, setQuery] = useState("");

  return <SearchInput value={query} onChange={setQuery} />;
}

/** The built-in name is the literal `"Search"`, and it beats an associated `<Label>` — so
 *  point `aria-labelledby` at the label's `id` to make the visible text the announced name. */
export function AccessibleName() {
  const [query, setQuery] = useState("");

  return (
    <>
      <Label id="orders-search-label" htmlFor="orders-search">
        Search orders
      </Label>
      <SearchInput
        id="orders-search"
        aria-labelledby="orders-search-label"
        value={query}
        onChange={setQuery}
        placeholder="Order number, customer, or SKU"
      />
    </>
  );
}

/** `size="sm"` steps the type down and narrows the icon gutters; the control's height and
 *  vertical padding are the same at both sizes. */
export function Sizes() {
  const [query, setQuery] = useState("Ada Lovelace");

  return (
    <>
      <SearchInput value={query} onChange={setQuery} />
      <SearchInput size="sm" value={query} onChange={setQuery} />
    </>
  );
}

/** The wrapper is `width: 100%`, and `className` lands on that wrapper rather than the
 *  input — so this is where you cap the field's width. */
export function ConstrainWidth() {
  const [query, setQuery] = useState("");

  return (
    <SearchInput
      className="max-w-sm"
      value={query}
      onChange={setQuery}
      aria-label="Search the docs"
    />
  );
}

/** Filtering is yours to do: `onChange` hands you the raw string on every keystroke. */
export function FilterAList() {
  const [query, setQuery] = useState("");

  return (
    <>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Filter contributors…"
        aria-label="Filter contributors"
      />
      <ul className="text-body-2 text-fg-secondary">
        {["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"]
          .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
          .map((name) => (
            <li key={name}>{name}</li>
          ))}
      </ul>
    </>
  );
}

/** `onClear` runs after the value has already been reset to `""` — for the side effects
 *  `onChange("")` cannot express, such as sending a paginated list back to page 1. */
export function ClearCallback() {
  const [query, setQuery] = useState("Ada");
  const [page, setPage] = useState(3);

  return (
    <>
      <SearchInput
        value={query}
        onChange={setQuery}
        onClear={() => setPage(1)}
        aria-label="Search contributors"
      />
      <p className="text-body-3 text-fg-muted">Page {page}</p>
    </>
  );
}

/** Inside an errored `Field` the input picks up `aria-invalid` and `aria-describedby` from
 *  the `Input` it renders — but nothing reddens the icon or the clear button. */
export function InField() {
  const [query, setQuery] = useState('status:"error');

  return (
    <Field error="Unclosed quote in the query.">
      <Label htmlFor="log-search">Filter log lines</Label>
      <SearchInput
        id="log-search"
        aria-label="Filter log lines"
        value={query}
        onChange={setQuery}
      />
      <FieldError />
    </Field>
  );
}
