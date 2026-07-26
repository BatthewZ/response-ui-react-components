import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeSwitcher } from "./ThemeSwitcher";

// The real `useTheme` is used throughout: it reads `<html data-theme>` and
// writes it back, so the attribute is both the fixture and the assertion. A
// mocked hook could not show that the `themes` prop reaches it at all (#92).
const APP_THEMES = ["default", "grimdark", "aurora"] as const;

const themeAttr = () => document.documentElement.getAttribute("data-theme");

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

describe("ThemeSwitcher", () => {
  it("renders a radiogroup with aria-label", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  });

  it("renders all theme options as radio buttons", () => {
    render(<ThemeSwitcher />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("renders theme names as labels", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radio", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Grimdark" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tech" })).toBeInTheDocument();
  });

  it("indicates the current theme with aria-checked", () => {
    document.documentElement.setAttribute("data-theme", "grimdark");
    render(<ThemeSwitcher />);

    expect(screen.getByRole("radio", { name: "Grimdark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Default" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("applies active class to the current theme option", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radio", { name: "Default" }).className).toContain(
      "theme-switcher__option--active",
    );
    expect(screen.getByRole("radio", { name: "Events" }).className).not.toContain(
      "theme-switcher__option--active",
    );
  });

  it("sets the theme when clicking an option", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("radio", { name: "Grimdark" }));
    expect(themeAttr()).toBe("grimdark");
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Grimdark" })).toHaveAttribute(
        "aria-checked",
        "true",
      ),
    );
  });

  it("forwards className to the root container", () => {
    render(<ThemeSwitcher className="custom-switcher" />);
    expect(screen.getByRole("radiogroup", { name: "Theme" }).className).toContain(
      "custom-switcher",
    );
  });

  /* --- Roving focus (#91) ------------------------------------------- */

  it("is a single tab stop, held by the checked option", () => {
    document.documentElement.setAttribute("data-theme", "grimdark");
    render(<ThemeSwitcher />);

    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it("moves selection and focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(themeAttr()).toBe("events");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Events" })).toHaveFocus());
    expect(screen.getByRole("radio", { name: "Events" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowLeft}");
    expect(themeAttr()).toBe(null);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus());
  });

  it("loops at both ends", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(themeAttr()).toBe("tech");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Tech" })).toHaveFocus());

    await user.keyboard("{ArrowRight}");
    expect(themeAttr()).toBe(null);
  });

  it("jumps to the first and last theme with Home and End", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.tab();
    await user.keyboard("{End}");
    expect(themeAttr()).toBe("tech");

    await user.keyboard("{Home}");
    expect(themeAttr()).toBe(null);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Default" })).toHaveFocus());
  });

  it("moves the tab stop when an option is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("radio", { name: "Tech" }));
    await waitFor(() =>
      expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, -1, 0]),
    );
  });

  /* --- App-registered themes (#92) ---------------------------------- */

  it("renders the themes it is given instead of the four shipped ones", () => {
    render(<ThemeSwitcher themes={APP_THEMES} />);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "aurora" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Events" })).not.toBeInTheDocument();
  });

  it("reports an app-registered theme as checked instead of falling back to the first", () => {
    document.documentElement.setAttribute("data-theme", "aurora");
    render(<ThemeSwitcher themes={APP_THEMES} labels={{ aurora: "Aurora" }} />);

    expect(screen.getByRole("radio", { name: "Aurora" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Default" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects an app-registered theme by click", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher themes={APP_THEMES} labels={{ aurora: "Aurora" }} />);

    await user.click(screen.getByRole("radio", { name: "Aurora" }));
    expect(themeAttr()).toBe("aurora");
  });

  /* --- Translatable labels (#93) ------------------------------------ */

  it("takes option text from the labels prop", () => {
    render(<ThemeSwitcher labels={{ default: "Standard", grimdark: "Sombre" }} />);

    expect(screen.getByRole("radio", { name: "Standard" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sombre" })).toBeInTheDocument();
    // Unnamed themes keep their English default.
    expect(screen.getByRole("radio", { name: "Tech" })).toBeInTheDocument();
  });
});
