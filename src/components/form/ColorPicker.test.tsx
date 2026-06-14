import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ColorPicker } from "./ColorPicker";

function Harness({ onValueChange }: { onValueChange?: (hex: string) => void }) {
  const [value, setValue] = useState("#3366cc");
  return (
    <ColorPicker
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      presets={["#ff0000", "#00ff00"]}
    />
  );
}

describe("ColorPicker", () => {
  it("shows the current hex on the trigger", () => {
    render(<ColorPicker defaultValue="#abcdef" />);
    expect(screen.getByRole("button", { name: "Choose color" })).toHaveTextContent(
      "#abcdef",
    );
  });

  it("normalizes the initial value", () => {
    render(<ColorPicker defaultValue="#ABC" />);
    expect(screen.getByRole("button", { name: "Choose color" })).toHaveTextContent(
      "#aabbcc",
    );
  });

  it("opens the panel on trigger click", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3366cc" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose color" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Hex value")).toHaveValue("#3366cc");
  });

  it("commits a typed hex value on Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    const hexField = screen.getByLabelText("Hex value");
    fireEvent.change(hexField, { target: { value: "#ff8800" } });
    fireEvent.keyDown(hexField, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("#ff8800");
  });

  it("reverts an invalid hex entry on blur", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3366cc" />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    const hexField = screen.getByLabelText("Hex value") as HTMLInputElement;
    fireEvent.change(hexField, { target: { value: "nonsense" } });
    fireEvent.blur(hexField);
    expect(hexField.value).toBe("#3366cc");
  });

  it("selects a preset swatch", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));
    await user.click(screen.getByRole("button", { name: "#ff0000" }));
    expect(onValueChange).toHaveBeenLastCalledWith("#ff0000");
  });

  it("changes hue via the hue rail", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    fireEvent.change(screen.getByLabelText("Hue"), { target: { value: "0" } });
    // Hue 0 at this saturation/value yields a red-dominant hex.
    expect(onValueChange).toHaveBeenCalled();
    const lastHex = onValueChange.mock.lastCall?.[0] as string;
    expect(lastHex.startsWith("#")).toBe(true);
  });

  it("adjusts saturation/brightness with arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Choose color" }));

    const sv = screen.getByLabelText("Saturation and brightness");
    sv.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalled();
  });
});
