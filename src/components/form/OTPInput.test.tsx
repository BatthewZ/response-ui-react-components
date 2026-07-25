import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OTPInput } from "./OTPInput";
import { useForm } from "./use-form";

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
    render(<OTPInput length={6} defaultValue="9" onComplete={onComplete} />);
    const boxes = getBoxes();
    boxes[1].focus();
    fireEvent.paste(boxes[1], { clipboardData: { getData: () => "12" } });
    expect(boxes[1].value).toBe("1");
    expect(boxes[2].value).toBe("2");
    expect(onComplete).toHaveBeenCalledTimes(0);
  });

  it("pasting into a box past the end of the value fills from the first free slot", () => {
    render(<OTPInput length={6} />);
    const boxes = getBoxes();
    boxes[1].focus();
    fireEvent.paste(boxes[1], { clipboardData: { getData: () => "12" } });
    // The paste target left slot 0 empty, and a string value cannot carry that
    // gap, so the digits settle at the front rather than serialising " 12".
    expect(boxes.map((b) => b.value)).toEqual(["1", "2", "", "", "", ""]);
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

  describe("form.field() binding (#433)", () => {
    it("#433 enters a whole code through the advertised form.field() spread", async () => {
      const user = userEvent.setup();
      let values: { code: string } | null = null;
      function Harness() {
        const form = useForm({ defaultValues: { code: "" } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <OTPInput length={4} aria-label="Code" {...form.field<string>("code")} />
          </form>
        );
      }
      render(<Harness />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.keyboard("1234");
      // Today: each keystroke wipes the last — the div's bubbled `onChange`
      // (spread from `...props`) writes the single box's DOM value into the
      // store, so the boxes read ["4","","",""] and the store holds "4".
      expect(boxes.map((b) => b.value)).toEqual(["1", "2", "3", "4"]);
      expect(values).toEqual({ code: "1234" });
    });

    it("#433 onChange and onValueChange both fire once per commit", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onValueChange = vi.fn();
      render(<OTPInput length={4} onChange={onChange} onValueChange={onValueChange} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.keyboard("12");
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith("12");
    });

    it("#433 onChange never reaches the group element as a DOM handler", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<OTPInput length={4} onChange={onChange} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.keyboard("1");
      // One commit -> exactly one call. A DOM `onChange` left on the group
      // would fire a second time on the bubbled input event.
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("1");
    });

    it("#434 the computed aria-invalid survives a form.field() spread", () => {
      function Harness() {
        const form = useForm({ defaultValues: { code: "" } });
        return <OTPInput length={4} aria-label="Code" error {...form.field<string>("code")} />;
      }
      render(<Harness />);
      for (const box of getBoxes()) {
        expect(box).toHaveAttribute("aria-invalid", "true");
      }
    });
  });

  describe("string <-> slots round-trip (#239, #240, #244)", () => {
    it("#239 spreads a multi-character change across the boxes from the target index", () => {
      const onValueChange = vi.fn();
      render(<OTPInput length={6} onValueChange={onValueChange} />);
      const boxes = getBoxes();
      // Code-path check only: the real browser/OS `one-time-code` autofill is
      // NOT reproducible in jsdom. This asserts the multi-char change path.
      fireEvent.change(boxes[0], { target: { value: "123456" } });
      expect(boxes.map((b) => b.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("123456");
    });

    it("#239 a multi-character change is clipped at the last box", () => {
      const onValueChange = vi.fn();
      render(<OTPInput length={4} onValueChange={onValueChange} />);
      const boxes = getBoxes();
      fireEvent.change(boxes[2], { target: { value: "789" } });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("78");
    });

    it("#240 Delete clears the focused box and emits", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<OTPInput length={4} defaultValue="1234" onValueChange={onValueChange} />);
      const boxes = getBoxes();
      boxes[3].focus();
      await user.keyboard("{Delete}");
      expect(boxes[3]).toHaveValue("");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("123");
    });

    it("#240 cutting a box's contents clears it and emits", () => {
      const onValueChange = vi.fn();
      render(<OTPInput length={4} defaultValue="1234" onValueChange={onValueChange} />);
      const boxes = getBoxes();
      fireEvent.change(boxes[3], { target: { value: "" } });
      expect(boxes[3]).toHaveValue("");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("123");
    });

    it("#240 an all-invalid change is rejected rather than treated as a clear", () => {
      const onValueChange = vi.fn();
      render(<OTPInput length={4} defaultValue="1234" mode="numeric" onValueChange={onValueChange} />);
      const boxes = getBoxes();
      fireEvent.change(boxes[1], { target: { value: "a" } });
      expect(boxes[1]).toHaveValue("2");
      expect(onValueChange).toHaveBeenCalledTimes(0);
    });

    it("#244 a partially filled code serialises without invented spaces", () => {
      const onValueChange = vi.fn();
      render(<OTPInput length={4} onValueChange={onValueChange} />);
      const boxes = getBoxes();
      fireEvent.change(boxes[0], { target: { value: "1" } });
      fireEvent.change(boxes[2], { target: { value: "3" } });
      const last = onValueChange.mock.lastCall?.[0] as string;
      expect(last).toBe("13");
      // The point of #244: length is a truthful count of entered characters.
      expect(last).toHaveLength(2);
    });

    it("#244 a gap left by an earlier edit collapses on the next commit", () => {
      render(<OTPInput length={4} defaultValue="1234" />);
      const boxes = getBoxes();
      fireEvent.change(boxes[1], { target: { value: "" } });
      // A string-typed value cannot hold a gap, so the tail shifts left.
      expect(boxes.map((b) => b.value)).toEqual(["1", "3", "4", ""]);
    });
  });

  describe("onComplete (#238)", () => {
    it("#238 re-fires when an already-complete code is edited", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<OTPInput length={3} onComplete={onComplete} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.keyboard("123");
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenLastCalledWith("123");
      // Overwriting a filled box has to be driven by the DOM change a browser
      // emits: user-event's `getSpaceUntilMaxLength` ignores the selection, so
      // `user.keyboard` silently drops a key aimed at a full `maxLength={1}`
      // box (verified against a bare <input maxLength={1} defaultValue="1" />).
      fireEvent.change(boxes[0], { target: { value: "9" } });
      expect(onComplete).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenLastCalledWith("923");
    });

    it("#238 re-fires when a complete code is replaced wholesale by paste", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<OTPInput length={4} onComplete={onComplete} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.paste("1234");
      expect(onComplete).toHaveBeenCalledTimes(1);
      boxes[0].focus();
      await user.paste("5678");
      expect(onComplete).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenLastCalledWith("5678");
    });

    it("#238 does not re-fire when a commit leaves the same complete value", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<OTPInput length={4} onComplete={onComplete} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.paste("1234");
      boxes[0].focus();
      await user.paste("1234");
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("#238 fires again after the code is broken and re-completed identically", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<OTPInput length={3} onComplete={onComplete} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.keyboard("123");
      expect(onComplete).toHaveBeenCalledTimes(1);
      boxes[2].focus();
      await user.keyboard("{Backspace}");
      await user.keyboard("3");
      expect(onComplete).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenLastCalledWith("123");
    });
  });

  describe("keyboard navigation", () => {
    it("ArrowRight and ArrowLeft move focus and clamp at both ends", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<OTPInput length={4} defaultValue="1234" onValueChange={onValueChange} />);
      const boxes = getBoxes();
      boxes[1].focus();
      await user.keyboard("{ArrowRight}");
      expect(boxes[2]).toHaveFocus();
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(boxes[0]).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(boxes[0]).toHaveFocus();
      boxes[3].focus();
      await user.keyboard("{ArrowRight}");
      expect(boxes[3]).toHaveFocus();
      expect(onValueChange).toHaveBeenCalledTimes(0);
    });

    it("Backspace on a filled box clears it in place and emits once", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<OTPInput length={4} defaultValue="1234" onValueChange={onValueChange} />);
      const boxes = getBoxes();
      boxes[3].focus();
      await user.keyboard("{Backspace}");
      expect(boxes[3]).toHaveValue("");
      expect(boxes[3]).toHaveFocus();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("123");
    });

    it("Backspace on the first empty box emits nothing", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<OTPInput length={4} onValueChange={onValueChange} />);
      const boxes = getBoxes();
      boxes[0].focus();
      await user.keyboard("{Backspace}");
      expect(onValueChange).toHaveBeenCalledTimes(0);
    });
  });
});
