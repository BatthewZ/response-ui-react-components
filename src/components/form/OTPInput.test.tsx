import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OTPInput } from "./OTPInput";

function getBoxes() {
  const group = screen.getByRole("group");
  return Array.from(group.querySelectorAll("input"));
}

describe("OTPInput", () => {
  it("renders `length` single-char boxes inside a labelled group", () => {
    render(<OTPInput length={4} aria-label="Verification code" />);
    expect(screen.getByRole("group", { name: "Verification code" })).toBeInTheDocument();
    const boxes = getBoxes();
    expect(boxes).toHaveLength(4);
    expect(boxes[0]).toHaveAttribute("maxLength", "1");
    expect(boxes[0]).toHaveAttribute("autoComplete", "one-time-code");
    expect(boxes[0]).toHaveAttribute("inputMode", "numeric");
  });

  it("typing valid chars auto-advances focus", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={4} />);
    const boxes = getBoxes();
    boxes[0].focus();
    await user.keyboard("12");
    expect(boxes[0]).toHaveValue("1");
    expect(boxes[1]).toHaveValue("2");
    expect(boxes[2]).toHaveFocus();
  });

  it("rejects invalid chars in numeric mode", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={4} mode="numeric" />);
    const boxes = getBoxes();
    boxes[0].focus();
    await user.keyboard("a5");
    expect(boxes[0]).toHaveValue("5");
  });

  it("accepts letters in alphanumeric mode", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={4} mode="alphanumeric" />);
    const boxes = getBoxes();
    boxes[0].focus();
    await user.keyboard("a1");
    expect(boxes[0]).toHaveValue("a");
    expect(boxes[1]).toHaveValue("1");
  });

  it("full paste fills all boxes and fires onComplete once", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={4} onComplete={onComplete} />);
    const boxes = getBoxes();
    boxes[0].focus();
    await user.paste("1234");
    expect(boxes.map((b) => (b as HTMLInputElement).value)).toEqual(["1", "2", "3", "4"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("partial paste fills from the focused index", () => {
    const onComplete = vi.fn();
    render(<OTPInput length={6} onComplete={onComplete} />);
    const boxes = getBoxes();
    boxes[1].focus();
    fireEvent.paste(boxes[1], { clipboardData: { getData: () => "12" } });
    expect((boxes[1] as HTMLInputElement).value).toBe("1");
    expect((boxes[2] as HTMLInputElement).value).toBe("2");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("backspace clears current then walks back clearing the previous box", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={4} />);
    const boxes = getBoxes();
    boxes[0].focus();
    await user.keyboard("12");
    // focus now on box 2 (empty)
    expect(boxes[2]).toHaveFocus();
    await user.keyboard("{Backspace}");
    // empty box -> move to previous and clear it
    expect(boxes[1]).toHaveValue("");
    expect(boxes[1]).toHaveFocus();
    await user.keyboard("{Backspace}");
    expect(boxes[0]).toHaveValue("");
    expect(boxes[0]).toHaveFocus();
  });

  it("controlled value renders as per-box slices", () => {
    render(<OTPInput length={4} value="42" onValueChange={() => {}} />);
    const boxes = getBoxes();
    expect(boxes[0]).toHaveValue("4");
    expect(boxes[1]).toHaveValue("2");
    expect(boxes[2]).toHaveValue("");
  });

  it("disabled boxes cannot be edited", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<OTPInput length={4} disabled onValueChange={onValueChange} />);
    const boxes = getBoxes();
    expect(boxes[0]).toBeDisabled();
    await user.click(boxes[0]);
    await user.keyboard("1");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
