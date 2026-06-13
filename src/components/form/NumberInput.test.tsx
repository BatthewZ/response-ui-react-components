import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { NumberInput } from "./NumberInput";

describe("NumberInput", () => {
  it("renders a spinbutton", () => {
    render(<NumberInput aria-label="Qty" />);
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toBeInTheDocument();
  });

  it("typing '1.' does not emit NaN", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Qty" onValueChange={onValueChange} />);

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "1.");
    // Draft holds "1." but nothing is committed mid-typing.
    expect(input).toHaveValue("1.");
    expect(onValueChange).not.toHaveBeenCalledWith(NaN);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("clamps to min/max on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" min={0} max={10} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "99");
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(10);
    expect(input).toHaveValue("10");
  });

  it("clamps below min on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" min={5} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "1");
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(5);
  });

  it("rounds to precision on commit", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" precision={2} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.type(input, "1.005");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue("1");
  });

  it("steps up via the up button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={1} step={2} onValueChange={onValueChange} />
    );

    const buttons = screen.getAllByRole("button", { hidden: true });
    await user.click(buttons[0]);
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("steps down via the down button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={5} onValueChange={onValueChange} />
    );

    const buttons = screen.getAllByRole("button", { hidden: true });
    await user.click(buttons[1]);
    expect(onValueChange).toHaveBeenLastCalledWith(4);
  });

  it("steps from min when empty", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" min={10} onValueChange={onValueChange} />
    );

    const buttons = screen.getAllByRole("button", { hidden: true });
    await user.click(buttons[0]);
    expect(onValueChange).toHaveBeenLastCalledWith(11);
  });

  it("steps with ArrowUp / ArrowDown", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={0} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenLastCalledWith(-1);
  });

  it("emits null when cleared", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput aria-label="Qty" defaultValue={5} onValueChange={onValueChange} />
    );

    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.clear(input);
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue("");
  });

  it("renders a controlled value", () => {
    render(<NumberInput aria-label="Qty" value={42} onValueChange={vi.fn()} />);
    const input = screen.getByRole("spinbutton", { name: "Qty" });
    expect(input).toHaveValue("42");
    expect(input).toHaveAttribute("aria-valuenow", "42");
  });

  it("updates when the controlled value prop changes", () => {
    const { rerender } = render(
      <NumberInput aria-label="Qty" value={1} onValueChange={vi.fn()} />
    );
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toHaveValue("1");
    rerender(<NumberInput aria-label="Qty" value={7} onValueChange={vi.fn()} />);
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toHaveValue("7");
  });

  it("forwards ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<NumberInput ref={ref} aria-label="Qty" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
