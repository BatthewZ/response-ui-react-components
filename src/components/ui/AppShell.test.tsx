import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useState } from "react";
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

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Puts AppShell under its `(max-width: 639px)` mobile branch. */
function stubMobileMatchMedia() {
  stubMatchMedia(true);
}

beforeEach(() => {
  stubMatchMedia(false);
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
    stubMobileMatchMedia();
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

  it("Escape closes the open mobile sidebar", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithRouter(
      <AppShell onOpenChange={onOpenChange}>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/">Home</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("Escape does nothing while the mobile sidebar is already closed", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithRouter(
      <AppShell onOpenChange={onOpenChange}>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledTimes(0);
  });

  it("Escape leaves the desktop sidebar alone", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithRouter(
      <AppShell open onOpenChange={onOpenChange}>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    // Desktop keeps the sidebar inline; Escape is not a dismissal there.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(0);
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

  // `data-active` is the hook the stylesheet uses to draw the current link's
  // edge and ink; it must land on the same link as `aria-current` and nowhere
  // else. jsdom applies no stylesheets, so this locks the DOM contract the
  // styling hangs off — not the styling itself.
  it("puts data-active on exactly the aria-current link", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/">Home</AppShell.SidebarLink>
          <AppShell.SidebarLink to="/about">About</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
      { route: "/about" },
    );

    const marked = screen
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("data-active"));
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAccessibleName("About");
    expect(marked[0]).toHaveAttribute("aria-current", "page");
  });
});

/**
 * `useClickOutside` fires on `mousedown`; the Toggle acts on `click`. With the
 * drawer open, a press on the Toggle used to close it on `mousedown` and reopen
 * it on the `click` that followed, so the drawer could be opened and never
 * closed from its own control.
 *
 * The two events must straddle a task boundary to reproduce — dispatched in one
 * microtask the close and reopen collapse into a single render and the bug
 * hides. `userEvent.setup()` inserts that boundary; a bare `fireEvent` pair
 * would not, and this test would then pass against the unfixed source.
 */
describe("#387 · the mobile Toggle closes the drawer it opened", () => {
  function renderShell(onOpenChange?: (open: boolean) => void) {
    return renderWithRouter(
      <AppShell onOpenChange={onOpenChange}>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/">Home</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
  }

  it("a second press on the Toggle closes the drawer", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderShell(onOpenChange);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close navigation" }));

    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reports the close exactly once, not close-then-reopen", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderShell(onOpenChange);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    onOpenChange.mockClear();

    await user.click(screen.getByRole("button", { name: "Close navigation" }));

    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  it("a press outside the drawer still closes it", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();

    await user.click(screen.getByText("Main"));

    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });
});

/**
 * Collapsed, the rail shows icons only: the stylesheet used to `display: none`
 * the label and lucide marks its own svg `aria-hidden`, which left every link
 * with an empty accessible name. The label now stays in the accessibility tree
 * behind `sr-only`, so the name survives the collapse.
 *
 * jsdom applies no stylesheet, so `toHaveAccessibleName` alone cannot tell the
 * two states apart — it reads the text either way. The class is the assertion
 * that can actually fail, the same contract `Spinner.test.tsx` locks.
 */
describe("#388 · a collapsed sidebar link keeps its accessible name", () => {
  async function collapse() {
    const user = userEvent.setup();
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/">Dashboard</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  }

  it("hides the label visually rather than removing it from the tree", async () => {
    await collapse();

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveAttribute(
      "data-collapsed",
    );
    expect(screen.getByText("Dashboard")).toHaveClass("sr-only");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("does not hide the label while the sidebar is expanded", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/">Dashboard</AppShell.SidebarLink>
        </AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    expect(screen.getByText("Dashboard")).not.toHaveClass("sr-only");
  });
});

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any`. `href?: never` makes the *typed* spread of the
 * same object a compile error; the runtime destructure is what covers this half,
 * and it is the half a published package cannot assume away.
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

/**
 * The controlled/uncontrolled mode must lock on the first render. A parent that
 * writes `open={o ?? undefined}` / `collapsed={c ?? undefined}` otherwise flips
 * the shell uncontrolled mid-life and it starts answering the toggle from
 * internal state the parent cannot see.
 */
describe("mode lock", () => {
  let onOpenChange = vi.fn();
  let onCollapsedChange = vi.fn();

  beforeEach(() => {
    onOpenChange = vi.fn();
    onCollapsedChange = vi.fn();
  });

  function ControlledDrawer({ open }: { open: boolean | undefined }) {
    return (
      <AppShell open={open} onOpenChange={onOpenChange}>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>
    );
  }

  function ControlledSidebar({ collapsed }: { collapsed: boolean | undefined }) {
    return (
      <AppShell collapsed={collapsed} onCollapsedChange={onCollapsedChange}>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>
    );
  }

  it("a controlled drawer never adopts internal state when `open` goes undefined", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    const { rerender } = renderWithRouter(<ControlledDrawer open={false} />);

    rerender(<ControlledDrawer open={undefined} />);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("an uncontrolled drawer is not turned controlled by a later `open`", async () => {
    stubMobileMatchMedia();
    const user = userEvent.setup();
    const { rerender } = renderWithRouter(<ControlledDrawer open={undefined} />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    rerender(<ControlledDrawer open={false} />);

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("a controlled sidebar never adopts internal state when `collapsed` goes undefined", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithRouter(<ControlledSidebar collapsed={false} />);

    rerender(<ControlledSidebar collapsed={undefined} />);
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(onCollapsedChange).toHaveBeenCalledTimes(1);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).not.toHaveAttribute(
      "data-collapsed",
    );
  });

  it("an uncontrolled sidebar is not turned controlled by a later `collapsed`", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithRouter(<ControlledSidebar collapsed={undefined} />);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    rerender(<ControlledSidebar collapsed={false} />);

    expect(onCollapsedChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveAttribute(
      "data-collapsed",
    );
  });
});

describe("omitted props", () => {
  it("a spread `href` cannot override the `to`-derived destination", () => {
    const bag = { href: "/somewhere-else", rel: "noopener" };

    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>
          <AppShell.SidebarLink to="/dashboard" {...untypedProps(bag)}>
            Dashboard
          </AppShell.SidebarLink>
        </AppShell.Sidebar>
      </AppShell>,
    );

    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).toHaveAttribute("href", "/dashboard");
    // The rest of the bag is still forwarded — the fix strips one key, not all.
    expect(link).toHaveAttribute("rel", "noopener");
  });
});

/**
 * #397 — the layout's two shared magnitudes.
 *
 * The navbar height was written into three rules; it now has one declaration
 * (`--app-shell-navbar-height`) that the other two read. That half is not
 * asserted here: vitest runs with `css: false`, which replaces every CSS request
 * — `?raw` included — with an empty string, so no test in this package can read
 * a stylesheet. Only `scripts/verify-*` can.
 *
 * The breakpoint half cannot be single-sourced at all: a CSS media query cannot
 * read a custom property, this package has no CSS build step, and neither copy
 * is removable (the stylesheet's block is what keeps the pre-hydration render
 * from showing the inline sidebar on a phone; the `matchMedia` call is what
 * drives `isMobile`). What is fixable is the JS side stating it twice, so this
 * pins it to one named constant that the effect reads.
 */
describe("#397 · the mobile breakpoint is stated once in AppShell.tsx", () => {
  // Vite's raw glob rather than `node:fs` — `@types/node` is not a dependency
  // and `tsconfig.types` is an allowlist, so `readFileSync` would not typecheck.
  const sources = import.meta.glob<string>("./AppShell.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const tsx = sources["./AppShell.tsx"];

  it("names the query once and subscribes through the name", () => {
    expect(tsx.match(/\(max-width: 639px\)/g)).toHaveLength(1);
    expect(tsx).toMatch(/const MOBILE_VIEWPORT_QUERY = "\(max-width: 639px\)";/);
    expect(tsx).toContain("window.matchMedia(MOBILE_VIEWPORT_QUERY)");
  });
});

/* ------------------------------------------------------------------ */
/*  #391 — closing on navigation must not notify during render         */
/* ------------------------------------------------------------------ */

describe("#391 · the navigation close runs in an effect", () => {
  // A real controlled parent: `onOpenChange` writes the parent's state, which is
  // what turns a render-phase `setOpen` into React's cross-component warning.
  function ControlledShell({
    route,
    onOpenChange,
  }: {
    route: string;
    onOpenChange: (next: boolean) => void;
  }) {
    const [open, setOpen] = useState(true);
    return (
      <RouterAdapterProvider value={{ Link: TestLink, usePathname: () => route }}>
        <AppShell
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            onOpenChange(next);
          }}
        >
          <AppShell.Navbar>
            <AppShell.Toggle />
          </AppShell.Navbar>
          <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
          <AppShell.Main>Main</AppShell.Main>
        </AppShell>
      </RouterAdapterProvider>
    );
  }

  it("closes a controlled drawer on a route change without a render-phase update", () => {
    stubMobileMatchMedia();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const onOpenChange = vi.fn();

    const { rerender } = render(<ControlledShell route="/" onOpenChange={onOpenChange} />);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();

    rerender(<ControlledShell route="/settings" onOpenChange={onOpenChange} />);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();

    // React's message is a format string: "Cannot update a component (`%s`)
    // while rendering a different component (`%s`)".
    const renderPhaseWarnings = errors.mock.calls.filter(([first]) =>
      String(first).includes("while rendering a different component"),
    );
    expect(renderPhaseWarnings).toHaveLength(0);
    errors.mockRestore();
  });

  it("leaves a closed drawer alone on a route change", () => {
    stubMobileMatchMedia();
    const onOpenChange = vi.fn();

    function Shell({ route }: { route: string }) {
      return (
        <RouterAdapterProvider value={{ Link: TestLink, usePathname: () => route }}>
          <AppShell open={false} onOpenChange={onOpenChange}>
            <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
            <AppShell.Main>Main</AppShell.Main>
          </AppShell>
        </RouterAdapterProvider>
      );
    }

    const { rerender } = render(<Shell route="/" />);
    rerender(<Shell route="/settings" />);

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  #392 — aria-modal belongs on a dialog, not on a navigation         */
/* ------------------------------------------------------------------ */

describe("#392 · the mobile drawer is a modal dialog", () => {
  it("puts aria-modal on a dialog that holds the navigation landmark", async () => {
    stubMobileMatchMedia();
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

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const dialog = screen.getByRole("dialog", { name: "Main navigation" });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).not.toHaveAttribute("aria-modal");
    expect(dialog).toContainElement(nav);
  });

  it("leaves the desktop sidebar a plain navigation landmark", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).not.toHaveAttribute(
      "aria-modal",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  #394 — aria-controls must name an element that exists              */
/* ------------------------------------------------------------------ */

describe("#394 · aria-controls only names a rendered sidebar", () => {
  function expectResolvable(toggle: HTMLElement) {
    const id = toggle.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).not.toBeNull();
  }

  it("drops aria-controls when the mobile drawer is closed and restores it when open", async () => {
    stubMobileMatchMedia();
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

    const toggle = screen.getByRole("button", { name: "Open navigation" });
    expect(toggle).not.toHaveAttribute("aria-controls");

    await user.click(toggle);
    expectResolvable(screen.getByRole("button", { name: "Close navigation" }));
  });

  it("names nothing when the shell renders no Sidebar", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).not.toHaveAttribute(
      "aria-controls",
    );
  });

  it("names the inline sidebar on desktop", () => {
    renderWithRouter(
      <AppShell>
        <AppShell.Navbar>
          <AppShell.Toggle />
        </AppShell.Navbar>
        <AppShell.Sidebar>Sidebar</AppShell.Sidebar>
        <AppShell.Main>Main</AppShell.Main>
      </AppShell>,
    );

    expectResolvable(screen.getByRole("button", { name: "Collapse sidebar" }));
  });
});
