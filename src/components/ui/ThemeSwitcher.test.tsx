import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeSwitcher } from "./ThemeSwitcher";

const mockSetTheme = vi.fn();

vi.mock("../../hooks/use-theme", () => ({
  useTheme: () => ({
    theme: "default" as const,
    setTheme: mockSetTheme,
    themes: ["default", "events", "grimdark", "tech"] as const,
  }),
}));

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it("renders a radiogroup with aria-label", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  });

  it("renders all theme options as radio buttons", () => {
    render(<ThemeSwitcher />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
  });

  it("renders theme names as labels", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radio", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Grimdark" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tech" })).toBeInTheDocument();
  });

  it("indicates the current theme with aria-checked", () => {
    render(<ThemeSwitcher />);
    const defaultRadio = screen.getByRole("radio", { name: "Default" });
    expect(defaultRadio).toHaveAttribute("aria-checked", "true");

    const eventsRadio = screen.getByRole("radio", { name: "Events" });
    expect(eventsRadio).toHaveAttribute("aria-checked", "false");
  });

  it("applies active class to the current theme option", () => {
    render(<ThemeSwitcher />);
    const defaultRadio = screen.getByRole("radio", { name: "Default" });
    expect(defaultRadio.className).toContain("theme-switcher__option--active");

    const eventsRadio = screen.getByRole("radio", { name: "Events" });
    expect(eventsRadio.className).not.toContain("theme-switcher__option--active");
  });

  it("calls setTheme when clicking a theme option", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("radio", { name: "Grimdark" }));
    expect(mockSetTheme).toHaveBeenCalledOnce();
    expect(mockSetTheme).toHaveBeenCalledWith("grimdark");
  });

  it("forwards className to the root container", () => {
    render(<ThemeSwitcher className="custom-switcher" />);
    const root = screen.getByRole("radiogroup", { name: "Theme" });
    expect(root.className).toContain("custom-switcher");
  });
});
