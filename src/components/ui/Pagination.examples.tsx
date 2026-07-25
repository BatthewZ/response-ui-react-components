import { useState } from "react";

import { Input } from "../form/Input";

import { Button } from "./Button";
import { Pagination } from "./Pagination";

/** Fully controlled: you hold the page number, `onPageChange` hands you the next one. */
export function Minimal() {
  const [page, setPage] = useState(1);

  return <Pagination page={page} totalPages={12} onPageChange={setPage} />;
}

/** `showEdges` adds jump-to-first and jump-to-last chevrons either side of the row. */
export function EdgeChevrons() {
  const [page, setPage] = useState(6);

  return <Pagination page={page} totalPages={12} showEdges onPageChange={setPage} />;
}

/** `siblingCount` sets how many neighbours flank the current page — and so the fixed
 *  width of the whole row: `siblingCount * 2 + 5` slots. */
export function WindowSize() {
  const [page, setPage] = useState(50);

  return (
    <div className="flex flex-col gap-r5">
      <Pagination page={page} totalPages={100} siblingCount={0} onPageChange={setPage} />
      <Pagination page={page} totalPages={100} onPageChange={setPage} />
      <Pagination page={page} totalPages={100} siblingCount={2} onPageChange={setPage} />
    </div>
  );
}

/** `variant="compact"` drops the numbers for a "Page X of Y" readout, and turns the
 *  first/last chevrons on by default so the boundaries stay reachable. */
export function Compact() {
  const [page, setPage] = useState(2);

  return <Pagination page={page} totalPages={40} variant="compact" onPageChange={setPage} />;
}

/** `compactBelow` swaps to the compact layout under a viewport width — a number is px,
 *  a string is any CSS length. */
export function CollapseOnNarrowViewports() {
  const [page, setPage] = useState(4);

  return (
    <Pagination page={page} totalPages={40} compactBelow="40rem" onPageChange={setPage} />
  );
}

/** The `<nav>` is named "Pagination" unless you say otherwise. Two paginated regions on
 *  one screen need two distinct names. */
export function NamedRegions() {
  const [invoicePage, setInvoicePage] = useState(1);
  const [receiptPage, setReceiptPage] = useState(1);

  return (
    <div className="flex flex-col gap-r4">
      <Pagination
        aria-label="Invoices"
        page={invoicePage}
        totalPages={9}
        onPageChange={setInvoicePage}
      />
      <Pagination
        aria-label="Receipts"
        page={receiptPage}
        totalPages={4}
        onPageChange={setReceiptPage}
      />
    </div>
  );
}

/** Paging is navigation, not part of the filter form's data — so the pager sits beside the
 *  `<form>` rather than inside it, and `Apply filters` stays the form's only submitter.
 *  Every button Pagination renders is already `type="button"`, so nesting it would no longer
 *  submit anything; keeping it a sibling is about what the form *means*, not a workaround. */
export function OutsideTheFilterForm() {
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col gap-r4">
      <form>
        <Input name="q" aria-label="Search invoices" placeholder="Search invoices" />
        <Button type="submit">Apply filters</Button>
      </form>
      <Pagination page={page} totalPages={12} onPageChange={setPage} />
    </div>
  );
}

/** With no pages the component still renders its named `<nav>` and two disabled arrows,
 *  so decide for yourself whether an empty result set shows a pager at all. */
export function ZeroPages() {
  const [page, setPage] = useState(1);

  return (
    <>
      <p>No invoices match these filters.</p>
      <Pagination page={page} totalPages={0} onPageChange={setPage} />
    </>
  );
}
