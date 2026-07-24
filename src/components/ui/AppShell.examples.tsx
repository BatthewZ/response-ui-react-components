import { BarChart3, CreditCard, LayoutDashboard, LifeBuoy, Settings, Users } from "lucide-react";
import { forwardRef, useState } from "react";

import { RouterAdapterProvider, type RouterLinkProps } from "../router/router-adapter";
import { AppShell } from "./AppShell";
import { Avatar } from "./Avatar";

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

// Stand-in for your router's location hook — react-router's `useLocation().pathname`,
// Next's `usePathname()`, TanStack's `useRouterState`. It has to re-render on navigation.
function useAppPathname() {
  return "/reports";
}

/** Navbar, sidebar and content area in one grid — the toggle wires itself up from context. */
export function Minimal() {
  return (
    <AppShell>
      <AppShell.Navbar>
        <AppShell.Toggle />
        <AppShell.Brand>Acme Analytics</AppShell.Brand>
        <AppShell.NavbarActions>
          <Avatar name="Ada Lovelace" size="sm" />
        </AppShell.NavbarActions>
      </AppShell.Navbar>
      <AppShell.Sidebar>
        <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
          Dashboard
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/reports" icon={BarChart3}>
          Reports
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/settings" icon={Settings}>
          Settings
        </AppShell.SidebarLink>
      </AppShell.Sidebar>
      <AppShell.Main>
        <h1>Dashboard</h1>
      </AppShell.Main>
    </AppShell>
  );
}

/** `SidebarSection` groups links; consecutive sections get a rule between them. */
export function SidebarSections() {
  return (
    <AppShell>
      <AppShell.Navbar>
        <AppShell.Toggle />
        <AppShell.Brand>Acme Analytics</AppShell.Brand>
      </AppShell.Navbar>
      <AppShell.Sidebar>
        <AppShell.SidebarSection title="Workspace">
          <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
            Dashboard
          </AppShell.SidebarLink>
          <AppShell.SidebarLink to="/reports" icon={BarChart3}>
            Reports
          </AppShell.SidebarLink>
        </AppShell.SidebarSection>
        <AppShell.SidebarSection title="Account">
          <AppShell.SidebarLink to="/team" icon={Users}>
            Team
          </AppShell.SidebarLink>
          <AppShell.SidebarLink to="/billing" icon={CreditCard}>
            Billing
          </AppShell.SidebarLink>
          <AppShell.SidebarLink to="/support" icon={LifeBuoy}>
            Support
          </AppShell.SidebarLink>
        </AppShell.SidebarSection>
      </AppShell.Sidebar>
      <AppShell.Main>
        <h1>Dashboard</h1>
      </AppShell.Main>
    </AppShell>
  );
}

/** `defaultCollapsed` starts desktop as a 4rem icon rail; every link needs an `icon` to survive it. */
export function CollapsedByDefault() {
  return (
    <AppShell defaultCollapsed>
      <AppShell.Navbar>
        <AppShell.Toggle />
        <AppShell.Brand>Acme Analytics</AppShell.Brand>
      </AppShell.Navbar>
      <AppShell.Sidebar>
        <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
          Dashboard
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/reports" icon={BarChart3}>
          Reports
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/settings" icon={Settings}>
          Settings
        </AppShell.SidebarLink>
      </AppShell.Sidebar>
      <AppShell.Main>
        <h1>Dashboard</h1>
      </AppShell.Main>
    </AppShell>
  );
}

/** Drive the mobile drawer yourself with `open` + `onOpenChange`; `navOpen` is a `useState` boolean. */
export function ControlledDrawer() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AppShell open={navOpen} onOpenChange={setNavOpen}>
      <AppShell.Navbar>
        <AppShell.Toggle />
        <AppShell.Brand>Acme Analytics</AppShell.Brand>
      </AppShell.Navbar>
      <AppShell.Sidebar>
        <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
          Dashboard
        </AppShell.SidebarLink>
        <AppShell.SidebarLink to="/reports" icon={BarChart3}>
          Reports
        </AppShell.SidebarLink>
      </AppShell.Sidebar>
      <AppShell.Main>
        <button type="button" onClick={() => setNavOpen(false)}>
          Close navigation
        </button>
      </AppShell.Main>
    </AppShell>
  );
}

/** The adapter is what makes links route client-side *and* what makes `aria-current` correct. */
export function WithRouterAdapter() {
  return (
    <RouterAdapterProvider value={{ Link: AppLink, usePathname: useAppPathname }}>
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
          <AppShell.Brand>Acme Analytics</AppShell.Brand>
        </AppShell.Navbar>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
            Dashboard
          </AppShell.SidebarLink>
          <AppShell.SidebarLink to="/reports" icon={BarChart3}>
            Reports
          </AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>
          <h1>Reports</h1>
        </AppShell.Main>
      </AppShell>
    </RouterAdapterProvider>
  );
}

/** `Main` is a plain `div`, so pass `role="main"` and an `id` yourself to get a skip target. */
export function MainLandmark() {
  return (
    <AppShell>
      <AppShell.Navbar>
        <a className="sr-only focus:not-sr-only" href="#content">
          Skip to content
        </a>
        <AppShell.Toggle />
        <AppShell.Brand>Acme Analytics</AppShell.Brand>
      </AppShell.Navbar>
      <AppShell.Sidebar>
        <AppShell.SidebarLink to="/dashboard" icon={LayoutDashboard}>
          Dashboard
        </AppShell.SidebarLink>
      </AppShell.Sidebar>
      <AppShell.Main id="content" role="main" tabIndex={-1}>
        <h1>Dashboard</h1>
      </AppShell.Main>
    </AppShell>
  );
}
