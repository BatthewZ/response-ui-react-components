import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders with search icon and input", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    await user.type(screen.getByRole("searchbox", { name: "Search" }), "a");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("shows clear button when value is non-empty", () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("hides clear button when value is empty", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("calls onClear and clears input when clear button clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchInput value="test" onChange={onChange} onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("clears input on Escape key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="test" onChange={onChange} />);

    const input = screen.getByRole("searchbox", { name: "Search" });
    await user.click(input);
    await user.keyboard("{Escape}");
    // Escape routes through the same single clear — no duplicate emission.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("has correct ARIA attributes", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("aria-label", "Search");
  });

  it("applies size variant classes", () => {
    render(<SearchInput value="" onChange={vi.fn()} size="sm" />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    expect(input.className).toContain("search-input__input--sm");
  });

  it("uses default placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("accepts custom placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Filter items..." />);
    expect(screen.getByPlaceholderText("Filter items...")).toBeInTheDocument();
  });

  describe("disabled and readOnly reach the clear button (#221)", () => {
    it("disables the clear button when the field is disabled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="test" onChange={onChange} disabled />);

      const clear = screen.getByRole("button", { name: "Clear search" });
      expect(clear).toBeDisabled();
      await user.click(clear);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("disables the clear button when the field is readOnly", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="test" onChange={onChange} readOnly />);

      expect(screen.getByRole("button", { name: "Clear search" })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Clear search" }));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does not clear a readOnly field on Escape", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="test" onChange={onChange} readOnly />);

      await user.click(screen.getByRole("searchbox"));
      await user.keyboard("{Escape}");
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("naming (#222)", () => {
    it("stands aside for an associated label", () => {
      render(
        <>
          <label htmlFor="q">Find a product</label>
          <SearchInput id="q" value="" onChange={vi.fn()} />
        </>
      );

      expect(
        screen.getByRole("searchbox", { name: "Find a product" })
      ).toBeInTheDocument();
    });

    it("stands aside for aria-labelledby", () => {
      render(
        <>
          <span id="lbl">Find a product</span>
          <SearchInput aria-labelledby="lbl" value="" onChange={vi.fn()} />
        </>
      );

      expect(
        screen.getByRole("searchbox", { name: "Find a product" })
      ).toBeInTheDocument();
    });
  });

  describe("focus after clearing (#223)", () => {
    it("returns focus to the field rather than dropping it to body", async () => {
      const user = userEvent.setup();
      function Harness() {
        const [value, setValue] = useState("test");
        return <SearchInput value={value} onChange={setValue} />;
      }
      render(<Harness />);

      await user.click(screen.getByRole("button", { name: "Clear search" }));

      expect(document.activeElement).not.toBe(document.body);
      expect(screen.getByRole("searchbox")).toHaveFocus();
    });
  });

  describe("Escape (#224 / #226)", () => {
    it("does not reach the surrounding overlay when it clears the field", async () => {
      const user = userEvent.setup();
      const onOverlayKeyDown = vi.fn();
      render(
        <div onKeyDown={onOverlayKeyDown}>
          <SearchInput value="test" onChange={vi.fn()} />
        </div>
      );

      await user.click(screen.getByRole("searchbox"));
      await user.keyboard("{Escape}");

      expect(onOverlayKeyDown).not.toHaveBeenCalled();
    });

    it("reaches the surrounding overlay when there is nothing to clear", async () => {
      const user = userEvent.setup();
      const onOverlayKeyDown = vi.fn();
      const onChange = vi.fn();
      const onClear = vi.fn();
      render(
        <div onKeyDown={onOverlayKeyDown}>
          <SearchInput value="" onChange={onChange} onClear={onClear} />
        </div>
      );

      await user.click(screen.getByRole("searchbox"));
      await user.keyboard("{Escape}");

      expect(onChange).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onOverlayKeyDown).toHaveBeenCalled();
    });
  });

  describe("the type surface (#229 / #230)", () => {
    it("does not restate the implicit role of input[type=search]", () => {
      render(<SearchInput value="" onChange={vi.fn()} />);
      expect(screen.getByRole("searchbox")).not.toHaveAttribute("role");
    });
  });
});
