import { useState } from "react";

import { Table } from "./Table";

/** The five parts in order: `Head` › `Row` › `HeaderCell`, then `Body` › `Row` › `Cell`. */
export function Minimal() {
  return (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Invoice</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell className="text-right">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>INV-1042</Table.Cell>
          <Table.Cell>Ada Lovelace</Table.Cell>
          <Table.Cell className="text-right">$1,200.00</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>INV-1043</Table.Cell>
          <Table.Cell>Grace Hopper</Table.Cell>
          <Table.Cell className="text-right">$860.00</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>INV-1044</Table.Cell>
          <Table.Cell>Alan Turing</Table.Cell>
          <Table.Cell className="text-right">$2,415.50</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

/** `density` is set once on the root and reaches every cell through context. */
export function Dense() {
  return (
    <Table density="dense">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Build</Table.HeaderCell>
          <Table.HeaderCell>Branch</Table.HeaderCell>
          <Table.HeaderCell>Duration</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>#4181</Table.Cell>
          <Table.Cell>main</Table.Cell>
          <Table.Cell>2m 14s</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>#4180</Table.Cell>
          <Table.Cell>release/2.4</Table.Cell>
          <Table.Cell>3m 02s</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>#4179</Table.Cell>
          <Table.Cell>fix/oklch-scrim</Table.Cell>
          <Table.Cell>1m 48s</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

/** `striped` tints every even row inside each `<tbody>` — parity is DOM position, not data. */
export function Striped() {
  return (
    <Table striped>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Region</Table.HeaderCell>
          <Table.HeaderCell className="text-right">Signups</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>North America</Table.Cell>
          <Table.Cell className="text-right">12,480</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Europe</Table.Cell>
          <Table.Cell className="text-right">9,315</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Asia Pacific</Table.Cell>
          <Table.Cell className="text-right">7,902</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Latin America</Table.Cell>
          <Table.Cell className="text-right">3,144</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

/**
 * `onSort` is what makes a header cell sortable; `sortDirection` picks the arrow and the
 * `aria-sort` value. `sort` here is a `useState<"asc" | "desc" | false>(false)`.
 */
export function Sortable() {
  const [sort, setSort] = useState<"asc" | "desc" | false>(false);

  return (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell
            sortDirection={sort}
            onSort={() => setSort(sort === false ? "asc" : sort === "asc" ? "desc" : false)}
          >
            Customer
          </Table.HeaderCell>
          <Table.HeaderCell>Plan</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Ada Lovelace</Table.Cell>
          <Table.Cell>Enterprise</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Grace Hopper</Table.Cell>
          <Table.Cell>Team</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

/** `selected` only tints the row, so carry the state in the row's own content as well. */
export function SelectedRow() {
  return (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell>Plan</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row selected>
          <Table.Cell>
            Ada Lovelace <span className="sr-only">(selected)</span>
          </Table.Cell>
          <Table.Cell>Enterprise</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Grace Hopper</Table.Cell>
          <Table.Cell>Team</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

/**
 * `stickyHeader` pins `<thead>` to the top of the wrapper, so the wrapper needs a height
 * for anything to scroll past it — that is what the `max-h-*` class is doing here.
 */
export function StickyHeader() {
  return (
    <Table stickyHeader className="max-h-[9rem]">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Commit</Table.HeaderCell>
          <Table.HeaderCell>Author</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>abd281f</Table.Cell>
          <Table.Cell>Ada Lovelace</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>7c0f543</Table.Cell>
          <Table.Cell>Grace Hopper</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>21b42e5</Table.Cell>
          <Table.Cell>Alan Turing</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>389765f</Table.Cell>
          <Table.Cell>Ada Lovelace</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>d12c4e0</Table.Cell>
          <Table.Cell>Grace Hopper</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

/** A `<caption>` child is the only way to name the `<table>`; `scope="row"` labels each row. */
export function CaptionAndRowHeaders() {
  return (
    <Table>
      <caption className="sr-only">Storage used by plan</caption>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell scope="col">Plan</Table.HeaderCell>
          <Table.HeaderCell scope="col" className="text-right">
            Storage
          </Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row">Team</Table.HeaderCell>
          <Table.Cell className="text-right">250 GB</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">Enterprise</Table.HeaderCell>
          <Table.Cell className="text-right">2 TB</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
