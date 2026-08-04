import { useState } from "react";

import { Badge } from "./Badge";
import type { SortState } from "./data-table-utils";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "./EmptyState";
import { VirtualizedDataTable } from "./VirtualizedDataTable";

type Invoice = {
  id: string;
  reference: string;
  customer: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  issuedAt: Date;
};

const customers = ["Northwind Traders", "Acme Freight", "Blue Ridge Foods", "Halcyon Media"];
const statuses: Invoice["status"][] = ["paid", "pending", "overdue"];

/** 50,000 rows — the size this component exists for. */
const invoices: Invoice[] = Array.from({ length: 50000 }, (_, i) => ({
  id: `inv_${i}`,
  reference: `INV-${20250000 + i}`,
  customer: customers[i % customers.length],
  amount: 120 + ((i * 37) % 9000),
  status: statuses[i % statuses.length],
  issuedAt: new Date(2025, 0, 1 + (i % 365)),
}));

const loadNextPage = () => {};

/** Fifty thousand invoices, a fixed 48px row, a 480px viewport — only the visible slice mounts. */
export function Minimal() {
  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        { key: "customer", header: "Customer" },
        { key: "amount", header: "Amount", align: "right", width: 120 },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
    />
  );
}

/** Uncontrolled sorting reorders the entire dataset, not just the visible window. */
export function ClientSorting() {
  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160, sortable: true },
        { key: "customer", header: "Customer", sortable: true },
        { key: "amount", header: "Amount", align: "right", width: 120, sortable: true },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
      defaultSort={{ key: "amount", direction: "desc" }}
    />
  );
}

/** Pass `sort` and the table stops reordering — it renders `data` exactly as the server sent it. */
export function ServerSorting() {
  const [sort, setSort] = useState<SortState>({ key: "issuedAt", direction: "desc" });

  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160, sortable: true },
        { key: "customer", header: "Customer", sortable: true },
        { key: "issuedAt", header: "Issued", width: 200, sortable: true },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
      sort={sort}
      onSortChange={(next) => setSort(next ?? { key: "issuedAt", direction: "desc" })}
    />
  );
}

/** Selection is fully controlled, and the header checkbox spans all 50,000 rows. */
export function RowSelection() {
  const [selected, setSelected] = useState(new Set<string | number>());

  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        { key: "customer", header: "Customer" },
        { key: "amount", header: "Amount", align: "right", width: 120 },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
      selectable
      selectedKeys={selected}
      onSelectionChange={setSelected}
    />
  );
}

/** `onEndReached` fires once when the window comes within `endReachedThreshold` rows of the end. */
export function InfiniteScroll() {
  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        { key: "customer", header: "Customer" },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
      onEndReached={loadNextPage}
      endReachedThreshold={20}
    />
  );
}

/** `render` owns the cell. Without it a column stringifies `row[key]` — and objects come out blank. */
export function CustomCells() {
  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        {
          key: "amount",
          header: "Amount",
          align: "right",
          width: 120,
          render: (invoice) =>
            invoice.amount.toLocaleString("en-GB", { style: "currency", currency: "GBP" }),
        },
        {
          key: "status",
          header: "Status",
          width: 120,
          render: (invoice) => (
            <Badge variant={invoice.status === "overdue" ? "error" : "success"}>
              {invoice.status}
            </Badge>
          ),
        },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
    />
  );
}

/** Shrinking `density` shrinks the cell padding — `rowHeight` has to come down with it, by hand. */
export function DenseRows() {
  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        { key: "customer", header: "Customer" },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={32}
      height={480}
      density="dense"
    />
  );
}

/** `loading` replaces the whole body with skeleton rows — no virtualization, no scroll container. */
export function Loading() {
  return (
    <VirtualizedDataTable
      data={invoices}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        { key: "customer", header: "Customer" },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
      loading
      loadingRowCount={8}
    />
  );
}

/** An empty `data` array renders the header plus one full-width cell holding `emptyContent`. */
export function CustomEmptyState() {
  return (
    <VirtualizedDataTable<Invoice>
      data={[]}
      columns={[
        { key: "reference", header: "Reference", width: 160 },
        { key: "customer", header: "Customer" },
      ]}
      rowKey={(invoice) => invoice.id}
      rowHeight={48}
      height={480}
      emptyContent={
        <EmptyState size="md">
          <EmptyStateTitle>No invoices this quarter</EmptyStateTitle>
          <EmptyStateDescription>Invoices appear here once a job is billed.</EmptyStateDescription>
        </EmptyState>
      }
    />
  );
}
