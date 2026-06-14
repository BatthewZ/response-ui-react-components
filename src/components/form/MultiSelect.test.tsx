import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MultiSelect, type MultiSelectOption } from "./MultiSelect";

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

    await user.type(screen.getByRole("combobox"), "{backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);
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
});
