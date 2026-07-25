import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MultiSelect, type MultiSelectOption } from "./MultiSelect";
import { useForm } from "./use-form";

const OPTIONS: MultiSelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "date", label: "Date", disabled: true },
];

function Harness({
  onValueChange,
  ...rest
}: Partial<React.ComponentProps<typeof MultiSelect>>) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <MultiSelect
      aria-label="Fruit"
      options={OPTIONS}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      {...rest}
    />
  );
}

describe("MultiSelect", () => {
  it("opens the listbox and selects an option, keeping the menu open", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    await user.click(within(listbox).getByText("Apple"));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(["apple"]);
    // Multi-select: the listbox stays open after a pick.
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders a chip per selected value and toggles selection off", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} defaultValue={undefined} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
    await user.click(within(screen.getByRole("listbox")).getByText("Banana"));

    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "banana"]);

    // Re-clicking a selected option removes it.
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
    expect(onValueChange).toHaveBeenLastCalledWith(["banana"]);
  });

  it("filters options by the search query", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "ban");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Banana")).toBeInTheDocument();
    expect(within(listbox).queryByText("Apple")).not.toBeInTheDocument();
  });

  it("clears the search query after selecting an option (click)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.click(input);
    await user.type(input, "ch");
    expect(input.value).toBe("ch");

    await user.click(within(screen.getByRole("listbox")).getByText("Cherry"));
    expect(onValueChange).toHaveBeenLastCalledWith(["cherry"]);
    // The typed query is consumed by the selection.
    expect(input.value).toBe("");
  });

  it("clears the query after selecting via keyboard (type, arrow, enter)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.click(input);
    await user.type(input, "ch");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenLastCalledWith(["cherry"]);
    expect(input.value).toBe("");
  });

  it("removes the last chip on Backspace with an empty query", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
    await user.click(within(screen.getByRole("listbox")).getByText("Banana"));
    expect(onValueChange).toHaveBeenCalledTimes(2);

    await user.type(screen.getByRole("combobox"), "{backspace}");
    // One press peels off exactly one chip — the last one.
    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Banana" })).not.toBeInTheDocument();
  });

  it("keeps every chip on Backspace while the query is non-empty", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
    expect(onValueChange).toHaveBeenCalledTimes(1);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "ba");
    // Backspace edits the query first; the chip is only at risk once it empties.
    await user.type(input, "{backspace}");
    expect(input.value).toBe("b");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeInTheDocument();
  });

  it("Backspace on an empty selection is a no-op", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    await user.type(screen.getByRole("combobox"), "{backspace}");
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("keeps a placeholder on the input once chips exist so a half-typed query stays visible on blur", async () => {
    const user = userEvent.setup();
    render(<Harness placeholder="Add fruit…" />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    // With no selection the real placeholder shows.
    expect(input).toHaveAttribute("placeholder", "Add fruit…");

    await user.click(input);
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));

    // A chip now exists and the query is empty. The input must still carry a
    // (blank) placeholder: the CSS `:placeholder-shown` collapse rule then hides
    // only the *empty* input, while a half-typed query — which clears the
    // placeholder — stays visible after focus leaves. An absent placeholder here
    // would make `:placeholder-shown` never match and the collapse-on-blur break.
    expect(input).toHaveAttribute("placeholder");
    expect(input.getAttribute("placeholder")).not.toBe("");
  });

  it("does not select a disabled option", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(within(screen.getByRole("listbox")).getByText("Date"));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("blocks new selections once maxItems is reached", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} maxItems={1} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);

    const banana = within(screen.getByRole("listbox")).getByText("Banana");
    expect(banana.closest('[role="option"]')).toHaveAttribute("aria-disabled", "true");
    await user.click(banana);
    // Still only the first pick.
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
  });

  describe("form.field() binding (#430)", () => {
    it("binds via the advertised form.field() spread without crashing", async () => {
      const user = userEvent.setup();
      let values: { picks: string[] } | null = null;
      function FieldHarness() {
        const form = useForm({ defaultValues: { picks: [] as string[] } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <MultiSelect
              aria-label="Fruit"
              options={OPTIONS}
              {...form.field<string[]>("picks")}
            />
          </form>
        );
      }
      render(<FieldHarness />);

      const input = screen.getByRole("combobox");
      await user.click(input);
      // Today: `{...props}` lands on the wrapper div (MultiSelect.tsx:194) carrying
      // field()'s `onChange`; React's delegated change event bubbles from the search
      // input, so the string "a" is written into the array-typed field and the next
      // render throws `TypeError: selected.map is not a function` (MultiSelect.tsx:216).
      await user.type(input, "app");
      await user.click(within(screen.getByRole("listbox")).getByText("Apple"));

      expect(values).toEqual({ picks: ["apple"] });
      expect(screen.getByRole("button", { name: "Remove Apple" })).toBeInTheDocument();
    });

    it("fires onChange with the selected values alongside onValueChange", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onValueChange = vi.fn();
      render(<Harness onChange={onChange} onValueChange={onValueChange} />);

      await user.click(screen.getByRole("combobox"));
      await user.click(within(screen.getByRole("listbox")).getByText("Apple"));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith(["apple"]);
    });

    it("fires onChange for a keyboard selection under virtual focus", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);

      const input = screen.getByRole("combobox");
      await user.click(input);
      await user.keyboard("{ArrowDown}");
      // Virtual focus: no option ever takes DOM focus, so the active option is only
      // observable through aria-activedescendant.
      const activeId = input.getAttribute("aria-activedescendant");
      expect(activeId).not.toBeNull();
      expect(document.getElementById(activeId!)).toHaveTextContent("Apple");

      await user.keyboard("{Enter}");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith(["apple"]);
    });

    it("never puts onChange on a DOM element", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);

      // Typing in the search box is a DOM change event. It must not reach the
      // value-typed onChange, which only ever receives committed selections.
      await user.type(screen.getByRole("combobox"), "app");
      expect(onChange).toHaveBeenCalledTimes(0);
    });
  });
});
