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

  /**
   * The gutters and the `sm` step have to REPLACE `Input`'s own `px-r4` /
   * `py-r5` / `text-body-2` in the class list, not merely sit beside them:
   * this package's CSS is in `@layer components`, below `@layer utilities`, so
   * anything left to the cascade is decided one layer up and lost. `css: false`
   * makes every assertion here blind to computed style, so the surviving signal
   * is the merged class list — the base utility must be GONE.
   */
  it("replaces Input's horizontal padding rather than sitting beside it", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole("searchbox");
    expect(input.className).toContain("px-[2.25rem]");
    expect(input.className).not.toContain("px-r4");
  });

  it("replaces Input's vertical padding and type at size='sm'", () => {
    render(<SearchInput value="" onChange={vi.fn()} size="sm" />);
    const input = screen.getByRole("searchbox");
    expect(input.className).toContain("px-[2rem]");
    expect(input.className).toContain("py-r6");
    expect(input.className).toContain("text-body-3");
    expect(input.className).not.toContain("px-r4");
    expect(input.className).not.toContain("py-r5");
    expect(input.className).not.toContain("text-body-2");
  });

  it("lets a caller's own padding beat the gutters", () => {
    render(
      <SearchInput value="" onChange={vi.fn()} classNames={{ input: "px-r2" }} />,
    );
    const input = screen.getByRole("searchbox");
    expect(input.className).toContain("px-r2");
    expect(input.className).not.toContain("px-[2.25rem]");
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

  describe("classNames slots", () => {
    /**
     * One slot-override test per slot, and each is the falsifier for its own
     * merge: delete that element's `cn()` and exactly this test must go red.
     */
    it("lands classNames.icon on the magnifier, beside the base class", () => {
      const { container } = render(
        <SearchInput value="" onChange={vi.fn()} classNames={{ icon: "size-r3" }} />,
      );
      const icon = container.querySelector("svg");
      expect(icon?.getAttribute("class")).toContain("search-input__icon");
      expect(icon?.getAttribute("class")).toContain("size-r3");
    });

    it("lands classNames.input on the field, beside the base class", () => {
      render(
        <SearchInput value="" onChange={vi.fn()} classNames={{ input: "px-r2" }} />,
      );
      const input = screen.getByRole("searchbox");
      expect(input.className).toContain("search-input__input");
      expect(input.className).toContain("px-r2");
    });

    it("lands classNames.clear on the clear button, beside the base class", () => {
      render(
        <SearchInput value="a" onChange={vi.fn()} classNames={{ clear: "size-r3" }} />,
      );
      const clear = screen.getByRole("button", { name: "Clear search" });
      expect(clear.className).toContain("search-input__clear");
      expect(clear.className).toContain("size-r3");
    });

    it("leaves each internal on its base classes alone when no slot is passed", () => {
      const { container } = render(
        <SearchInput value="a" onChange={vi.fn()} size="sm" />,
      );
      expect(container.querySelector("svg")?.getAttribute("class")).toBe(
        "lucide lucide-search search-input__icon",
      );
      // `toBe` on the tail rather than the whole list: the field is an `Input`,
      // so the head of its class list is `Input`'s own recipe. The tail is
      // exactly what SearchInput contributes, and an empty one is the failure
      // this assertion exists to catch.
      expect(screen.getByRole("searchbox").className).toMatch(
        / search-input__input search-input__input--sm px-\[2rem\] py-r6 text-body-3$/,
      );
      expect(screen.getByRole("button", { name: "Clear search" }).className).toBe(
        "search-input__clear",
      );
    });

    it("does not put a slot class on the wrapper", () => {
      const { container } = render(
        <SearchInput
          value="a"
          onChange={vi.fn()}
          classNames={{ icon: "size-r3", input: "px-r2", clear: "gap-r3" }}
        />,
      );
      const wrapper = container.firstElementChild;
      expect(wrapper?.getAttribute("class")).toBe("search-input");
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      render(
        <SearchInput
          value=""
          onChange={vi.fn()}
          // @ts-expect-error — `field` is not a slot; only untyped JS gets here.
          classNames={{ field: "px-r2" }}
        />,
      );
      expect(screen.getByRole("searchbox").className).toMatch(
        / search-input__input px-\[2.25rem\]$/,
      );
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(
        <SearchInput value="" onChange={vi.fn()} classNames={{ icon: "size-r3" }} />,
      );
      expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
      expect(screen.getByRole("searchbox").hasAttribute("classnames")).toBe(false);
    });
  });
});
