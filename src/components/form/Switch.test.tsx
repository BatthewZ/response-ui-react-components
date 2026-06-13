import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "./Label";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("renders with role=switch", () => {
    render(<Switch aria-label="Notifications" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("toggles aria-checked on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Toggle" onCheckedChange={onCheckedChange} />);

    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");

    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("respects defaultChecked initial state", () => {
    render(<Switch aria-label="Toggle" defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("controlled value stays fixed without a prop change, flips on rerender", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Switch aria-label="Toggle" checked={false} onCheckedChange={onCheckedChange} />
    );

    const sw = screen.getByRole("switch");
    await user.click(sw);
    // Still false — parent did not update the prop.
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenCalledWith(true);

    rerender(<Switch aria-label="Toggle" checked onCheckedChange={onCheckedChange} />);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Toggle" disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("exposes a data-state attribute reflecting checked", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Toggle" />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("data-state", "unchecked");
    await user.click(sw);
    expect(sw).toHaveAttribute("data-state", "checked");
  });

  it("associates with a Label via htmlFor and focuses on label click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="sw1">Wireless</Label>
        <Switch id="sw1" />
      </>
    );
    await user.click(screen.getByText("Wireless"));
    expect(screen.getByRole("switch")).toHaveFocus();
  });

  it("renders a hidden input reflecting checked when name is set", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          aria-label="Toggle"
          name="notify"
          value="yes"
          checked={checked}
          onCheckedChange={setChecked}
        />
      );
    }
    const { container } = render(<Harness />);
    const hidden = container.querySelector('input[type="hidden"][name="notify"]');
    expect(hidden).toHaveValue("");
    await user.click(screen.getByRole("switch"));
    expect(hidden).toHaveValue("yes");
  });

  it("applies aria-invalid when error is set", () => {
    render(<Switch aria-label="Toggle" error />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "true");
  });
});
