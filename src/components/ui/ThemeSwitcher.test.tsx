import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeSwitcher } from "./ThemeSwitcher";

// The real `useTheme` is used throughout: it reads `<html data-theme>` and
// writes it back, so the attribute is both the fixture and the assertion. A
// mocked hook could not show that the `themes` prop reaches it at all (#92).
//
// These are app-defined names on purpose. The component has no theme list of its
// own beyond `default`, so driving these tests with `grimdark`/`tech` would be
// testing the example themes rather than the component.
const APP_THEMES = ["default", "aurora", "midnight", "solstice"] as const;
const LABELS = { aurora: "Aurora", midnight: "Midnight", solstice: "Solstice" };

const themeAttr = () => document.documentElement.getAttribute("data-theme");

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

describe("ThemeSwitcher", () => {
  it("renders a radiogroup with aria-label", () => {
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  });

  it("renders every registered theme as a radio button", () => {
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("renders theme names as labels", () => {
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);
    expect(screen.getByRole("radio", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Aurora" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Midnight" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Solstice" })).toBeInTheDocument();
  });

  it("indicates the current theme with aria-checked", () => {
    document.documentElement.setAttribute("data-theme", "aurora");
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    expect(screen.getByRole("radio", { name: "Aurora" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Default" })).toHaveAttribute("aria-checked", "false");
  });

  it("applies active class to the current theme option", () => {
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);
    expect(screen.getByRole("radio", { name: "Default" }).className).toContain(
      "theme-switcher__option--active",
    );
    expect(screen.getByRole("radio", { name: "Aurora" }).className).not.toContain(
      "theme-switcher__option--active",
    );
  });

  it("sets the theme when clicking an option", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    await user.click(screen.getByRole("radio", { name: "Aurora" }));
    expect(themeAttr()).toBe("aurora");
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Aurora" })).toHaveAttribute("aria-checked", "true"),
    );
  });

  it("forwards className to the root container", () => {
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} className="custom-switcher" />);
    expect(screen.getByRole("radiogroup", { name: "Theme" }).className).toContain(
      "custom-switcher",
    );
  });

  /* --- Roving focus (#91) ------------------------------------------- */

  it("is a single tab stop, held by the checked option", () => {
    document.documentElement.setAttribute("data-theme", "midnight");
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it("moves selection and focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(themeAttr()).toBe("aurora");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Aurora" })).toHaveFocus());
    expect(screen.getByRole("radio", { name: "Aurora" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowLeft}");
    expect(themeAttr()).toBe(null);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus());
  });

  it("loops at both ends", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(themeAttr()).toBe("solstice");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Solstice" })).toHaveFocus());

    await user.keyboard("{ArrowRight}");
    expect(themeAttr()).toBe(null);
  });

  it("jumps to the first and last theme with Home and End", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    await user.tab();
    await user.keyboard("{End}");
    expect(themeAttr()).toBe("solstice");

    await user.keyboard("{Home}");
    expect(themeAttr()).toBe(null);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus());
  });

  it("moves the tab stop when an option is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    await user.click(screen.getByRole("radio", { name: "Solstice" }));
    await waitFor(() =>
      expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, -1, 0]),
    );
  });

  /* --- App-registered themes (#92) ---------------------------------- */

  it("reports an app-registered theme as checked instead of falling back to the first", () => {
    document.documentElement.setAttribute("data-theme", "aurora");
    render(<ThemeSwitcher themes={APP_THEMES} labels={LABELS} />);

    expect(screen.getByRole("radio", { name: "Aurora" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Default" })).toHaveAttribute("aria-checked", "false");
  });

  it("labels an unnamed theme by its id rather than borrowing another name", () => {
    render(<ThemeSwitcher themes={APP_THEMES} />);
    expect(screen.getByRole("radio", { name: "aurora" })).toBeInTheDocument();
  });

  /* --- No registered themes ----------------------------------------- */

  // The component cannot know an app's themes and must not guess. Before this
  // release it defaulted to the four example theme names, which offered options
  // whose CSS the app had probably never imported.
  it("offers only `default` when no themes prop is given", () => {
    render(<ThemeSwitcher />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(1);
    expect(radios[0]).toHaveAccessibleName("Default");
  });

  it("names no example theme when no themes prop is given", () => {
    render(<ThemeSwitcher />);
    for (const name of ["Events", "Grimdark", "Tech", "events", "grimdark", "tech"]) {
      expect(screen.queryByRole("radio", { name })).not.toBeInTheDocument();
    }
  });

  /* --- Translatable labels (#93) ------------------------------------ */

  it("takes option text from the labels prop", () => {
    render(<ThemeSwitcher themes={APP_THEMES} labels={{ default: "Standard", aurora: "Aurore" }} />);

    expect(screen.getByRole("radio", { name: "Standard" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Aurore" })).toBeInTheDocument();
    // A theme with no entry falls through to its id.
    expect(screen.getByRole("radio", { name: "midnight" })).toBeInTheDocument();
  });
});
