import { ChevronRight } from "lucide-react";
import { forwardRef } from "react";

import { RouterAdapterProvider, type RouterLinkProps } from "../router/router-adapter";
import { Breadcrumbs } from "./Breadcrumbs";

// Stand-in for your router's Link, adapted to the adapter's `to` / `replace` shape.
const AppLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(function AppLink(
  { to, replace: _replace, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} href={to} {...rest}>
      {children}
    </a>
  );
});

/** The last crumb takes `current` — that is the only thing that emits `aria-current="page"`. */
export function Minimal() {
  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
      <Breadcrumbs.Item current>Acme Corp</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

/** `separator` is a `ReactNode`, so an icon works; the component hides it from screen readers. */
export function CustomSeparator() {
  return (
    <Breadcrumbs separator={<ChevronRight size={14} />}>
      <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
      <Breadcrumbs.Item current>Acme Corp</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

/** Past `maxItems` children the middle folds behind a "Show more breadcrumbs" button. */
export function Collapsed() {
  return (
    <Breadcrumbs maxItems={4}>
      <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers/acme">Acme Corp</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers/acme/invoices">Invoices</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers/acme/invoices/2043">INV-2043</Breadcrumbs.Item>
      <Breadcrumbs.Item current>Line items</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

/** `itemsBeforeCollapse` / `itemsAfterCollapse` (both `1` by default) size the kept window. */
export function CollapseWindow() {
  return (
    <Breadcrumbs maxItems={4} itemsBeforeCollapse={2} itemsAfterCollapse={2}>
      <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers/acme">Acme Corp</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers/acme/invoices">Invoices</Breadcrumbs.Item>
      <Breadcrumbs.Item href="/customers/acme/invoices/2043">INV-2043</Breadcrumbs.Item>
      <Breadcrumbs.Item current>Line items</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

/** A crumb with neither `href` nor `current` is plain text — for a level with no page of its own. */
export function NonNavigableCrumb() {
  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
      <Breadcrumbs.Item>Settings</Breadcrumbs.Item>
      <Breadcrumbs.Item current>Billing</Breadcrumbs.Item>
    </Breadcrumbs>
  );
}

/** Install the adapter once at the root and every crumb becomes a client-side navigation. */
export function WithRouterAdapter() {
  return (
    <RouterAdapterProvider value={{ Link: AppLink }}>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
        <Breadcrumbs.Item current>Acme Corp</Breadcrumbs.Item>
      </Breadcrumbs>
    </RouterAdapterProvider>
  );
}
