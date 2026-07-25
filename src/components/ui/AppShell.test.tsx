import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
} from "../router/router-adapter";
import { AppShell } from "./AppShell";

// AppShell uses useLink() (defaults to <a>) and usePathname() (defaults to
// window.location.pathname). For tests asserting active-link state, drive the
// pathname by overriding the adapter's usePathname.
const TestLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function TestLink({ to, replace: _r, children, ...rest }, ref) {
    return (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    );
  },
);

function renderWithRouter(ui: React.ReactElement, { route = "/" } = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <RouterAdapterProvider value={{ Link: TestLink, usePathname: () => route }}>
        {children}
      </RouterAdapterProvider>
    ),
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppShell", () => {
  it("renders navbar with role='banner'", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>Nav content</AppShell.Navbar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Nav content")).toBeInTheDocument();
  });

  it("renders sidebar with role='navigation'", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>Sidebar content</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText("Sidebar content")).toBeInTheDocument();
  });

  it("renders main content area", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Main>Main content here</AppShell.Main>
      </AppShell>,
    );
    expect(screen.getByText("Main content here")).toBeInTheDocument();
  });

  it("renders sidebar sections with titles", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>
          <AppShell.SidebarSection title="Section A">
            <div>Link A</div>
          </AppShell.SidebarSection>
          <AppShell.SidebarSection title="Section B">
            <div>Link B</div>
          </AppShell.SidebarSection>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
  });

  it("renders sidebar links", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/dashboard">Dashboard</AppShell.SidebarLink>
          <AppShell.SidebarLink to="/settings">Settings</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("marks the active sidebar link with aria-current='page'", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/">Home</AppShell.SidebarLink>
          <AppShell.SidebarLink to="/about">About</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
      { route: "/" },
    );
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("aria-current", "page");

    const aboutLink = screen.getByRole("link", { name: "About" });
    expect(aboutLink).not.toHaveAttribute("aria-current");
  });

  it("toggle has aria-expanded true by default (sidebar not collapsed)", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const toggle = screen.getByRole("button", { name: /sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking toggle collapses sidebar (aria-expanded toggles)", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const toggle = screen.getByRole("button", { name: /sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("toggle controls aria-expanded of the sidebar via aria-controls", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const toggle = screen.getByRole("button", { name: /sidebar/i });
    const sidebarId = toggle.getAttribute("aria-controls");
    expect(sidebarId).toBeTruthy();

    const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
    expect(sidebar.id).toBe(sidebarId);
  });

  it("sidebar gets data-collapsed attribute when collapsed", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
    expect(sidebar).not.toHaveAttribute("data-collapsed");

    const toggle = screen.getByRole("button", { name: /sidebar/i });
    await user.click(toggle);
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  it("Toggle runs a caller onClick and still collapses the sidebar", async () => {
    const user = userEvent.setup();
    const track = vi.fn();
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle onClick={track} />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const toggle = screen.getByRole("button", { name: /sidebar/i });
    const sidebar = screen.getByRole("navigation", { name: "Main navigation" });

    await user.click(toggle);
    expect(track).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  it.each(["{Enter}", " "])(
    "Toggle runs a caller onClick and still collapses the sidebar via %s",
    async (key) => {
      const user = userEvent.setup();
      const track = vi.fn();
      renderWithRouter(
        <AppShell>
          <AppShell.Navbar>
            <AppShell.Toggle onClick={track} />
          </AppShell.Navbar>
          <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
          <AppShell.Main>Main</AppShell.Main>
        </AppShell>,
      );
      const toggle = screen.getByRole("button", { name: /sidebar/i });

      await user.tab();
      expect(toggle).toHaveFocus();
      await user.keyboard(key);
      expect(track).toHaveBeenCalledTimes(1);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    },
  );

  it("Toggle runs a caller onClick and still opens the mobile drawer", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    const track = vi.fn();
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle onClick={track} />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const toggle = screen.getByRole("button", { name: "Open navigation" });
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(track).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("Toggle skips its own behaviour when the caller prevents default", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle onClick={(e) => e.preventDefault()} />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    const toggle = screen.getByRole("button", { name: /sidebar/i });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders brand slot in the navbar", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Brand>MyApp</AppShell.Brand>
        </AppShell.Navbar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    expect(screen.getByText("MyApp")).toBeInTheDocument();
  });

  it("renders navbar actions slot", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.NavbarActions>
            <button type="button">Profile</button>
          </AppShell.NavbarActions>
        </AppShell.Navbar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
  });

  it("renders Main as a <main> landmark", () => {
    render(
      <AppShell>
        <AppShell.Main>Page body</AppShell.Main>
      </AppShell>
    );

    const main = screen.getByRole("main");
    expect(main.tagName).toBe("MAIN");
    expect(main).toHaveTextContent("Page body");
  });
});
