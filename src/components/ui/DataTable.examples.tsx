import { useState } from "react";

import { Badge } from "./Badge";
import { Button } from "./Button";
import { DataTable, type SortState } from "./DataTable";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from "./EmptyState";

/** Three props carry a table: the rows, the column descriptors, and a stable key per row. */
export function Minimal() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
        { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
    />
  );
}

/** `render` replaces the cell body entirely, so a column's `key` no longer has to name a field. */
export function CustomCells() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: 128.4, paid: true },
        { id: "ORD-1002", customer: "Grace Hopper", total: 76, paid: false },
      ]}
      columns={[
        { key: "customer", header: "Customer", width: "50%" },
        {
          key: "total",
          header: "Total",
          align: "right",
          render: (order) => `$${order.total.toFixed(2)}`,
        },
        {
          key: "payment",
          header: "Payment",
          render: (order) => (
            <Badge variant={order.paid ? "success" : "warning"}>
              {order.paid ? "Paid" : "Awaiting payment"}
            </Badge>
          ),
        },
      ]}
      rowKey={(order) => order.id}
    />
  );
}

/** `sortable` per column; the table sorts the whole array itself and `defaultSort` seeds it. */
export function ClientSorting() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", placed: new Date("2026-07-02"), total: 128.4 },
        { id: "ORD-1002", customer: "Grace Hopper", placed: new Date("2026-07-11"), total: 76 },
        { id: "ORD-1003", customer: "Alan Turing", placed: new Date("2026-06-28"), total: 240.15 },
      ]}
      columns={[
        { key: "customer", header: "Customer", sortable: true },
        { key: "placed", header: "Placed", sortable: true },
        { key: "total", header: "Total", align: "right", sortable: true },
      ]}
      rowKey={(order) => order.id}
      defaultSort={{ key: "placed", direction: "desc" }}
    />
  );
}

/** `pageSize` turns on client paging: the table sorts everything, then slices to the page. */
export function ClientPagination() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
        { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
        { id: "ORD-1004", customer: "Katherine Johnson", total: "$54.90" },
        { id: "ORD-1005", customer: "Margaret Hamilton", total: "$312.00" },
      ]}
      columns={[
        { key: "id", header: "Order", sortable: true },
        { key: "customer", header: "Customer", sortable: true },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
      pageSize={2}
    />
  );
}

/**
 * Server-driven: `sort` and `page` are `useState` values in your component that you send to
 * the API; `data` is whatever the API returned. No `pageSize`, so the table never re-slices.
 * `sort` is typed `SortState | undefined`, so a nullable state needs the `?? undefined`.
 */
export function ServerDriven() {
  const [sort, setSort] = useState<SortState | null>({ key: "total", direction: "desc" });
  const [page, setPage] = useState(1);

  return (
    <DataTable
      data={[
        { id: "ORD-1042", customer: "Margaret Hamilton", total: "$312.00" },
        { id: "ORD-1039", customer: "Alan Turing", total: "$240.15" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer", sortable: true },
        { key: "total", header: "Total", align: "right", sortable: true },
      ]}
      rowKey={(order) => order.id}
      sort={sort ?? undefined}
      onSortChange={setSort}
      page={page}
      totalPages={12}
      onPageChange={setPage}
    />
  );
}

/**
 * Selection is always controlled: `selected` is a `useState` `Set` of row keys, and both
 * `selectedKeys` and `onSelectionChange` must be supplied or the boxes never tick.
 */
export function Selection() {
  const [selected, setSelected] = useState<Set<string | number>>(new Set(["ORD-1002"]));

  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
        { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
      selectable
      selectedKeys={selected}
      onSelectionChange={setSelected}
    />
  );
}

/** `renderExpanded` adds a leading chevron column and a full-width detail row per open row. */
export function ExpandableRows() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40", ship: "12 Bletchley Rd, MK3" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00", ship: "8 Harvard Yard, MA" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
      renderExpanded={(order) => <p>Shipping to {order.ship}</p>}
    />
  );
}

/** `loading` wins over `data`: the body becomes `loadingRowCount` skeleton rows, one cell per column. */
export function LoadingSkeleton() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
      loading
      loadingRowCount={4}
    />
  );
}

/** An empty `data` swaps the body for `emptyContent`, or a built-in "No data" panel if you omit it. */
export function CustomEmptyState() {
  return (
    <DataTable
      data={[]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order: { id: string }) => order.id}
      emptyContent={
        <EmptyState size="md">
          <EmptyStateTitle>No orders this week</EmptyStateTitle>
          <EmptyStateDescription>
            Nothing has been placed since Monday. Widen the date range to see more.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button variant="secondary">Reset filters</Button>
          </EmptyStateActions>
        </EmptyState>
      }
    />
  );
}

/** `density` tightens every cell; `striped` zebras the rows. Both are passed straight through. */
export function DenseStriped() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
        { id: "ORD-1003", customer: "Alan Turing", total: "$240.15" },
        { id: "ORD-1004", customer: "Katherine Johnson", total: "$54.90" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
      density="dense"
      striped
    />
  );
}

/** The `footer` slot sits between the table and the pager — the hook for "load more" paging. */
export function LoadMoreFooter() {
  return (
    <DataTable
      data={[
        { id: "ORD-1001", customer: "Ada Lovelace", total: "$128.40" },
        { id: "ORD-1002", customer: "Grace Hopper", total: "$76.00" },
      ]}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total", align: "right" },
      ]}
      rowKey={(order) => order.id}
      footer={
        <div className="mt-r3 flex justify-center">
          <Button variant="secondary">Load 25 more</Button>
        </div>
      }
    />
  );
}
