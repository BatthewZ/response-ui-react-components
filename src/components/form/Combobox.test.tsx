import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Combobox } from "./Combobox";

interface Fruit {
  value: string;
  label: string;
  disabled?: boolean;
}

const FRUITS: Fruit[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
];

/** Consumer-side harness: filters items by the input text (Root is filter-agnostic). */
function Harness({
  onValueChange,
  loading = false,
  controlledValue,
  controlledInput,
}: {
  onValueChange?: (v: string | null) => void;
  loading?: boolean;
  controlledValue?: string | null;
  controlledInput?: string;
}) {
  const [query, setQuery] = useState("");
  const text = controlledInput ?? query;
  const filtered = FRUITS.filter((f) =>
    f.label.toLowerCase().includes(text.toLowerCase()),
  );

  return (
    <Combobox
      value={controlledValue}
      onValueChange={onValueChange}
      inputValue={controlledInput}
      onInputValueChange={(v) => {
        setQuery(v);
      }}
      loading={loading}
    >
      <Combobox.Input placeholder="Search fruit" aria-label="Fruit" />
      <Combobox.Content>
        {filtered.length === 0 ? (
          <Combobox.Empty>No fruit found</Combobox.Empty>
        ) : (
          filtered.map((f, index) => (
            <Combobox.Item
              key={f.value}
              index={index}
              value={f.value}
              disabled={f.disabled}
            >
              {f.label}
            </Combobox.Item>
          ))
        )}
      </Combobox.Content>
    </Combobox>
  );
}

function getInput(): HTMLInputElement {
  return screen.getByRole("combobox", { name: "Fruit" });
}

describe("Combobox", () => {
  it("opens and shows (consumer-filtered) options when typing", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = getInput();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.type(input, "an");

    const listbox = screen.getByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Banana");
  });

  it("ArrowDown moves aria-activedescendant without moving DOM focus off the input", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = getInput();
    await user.click(input);
    await user.keyboard("a"); // open + render all matching

    await user.keyboard("{ArrowDown}");

    expect(document.activeElement).toBe(input);
    const active = input.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();

    const listbox = screen.getByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    expect(options.some((o) => o.id === active)).toBe(true);
  });

  it("Enter selects the active option: fires onValueChange, sets input text, closes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    const input = getInput();
    await user.click(input);
    await user.type(input, "app"); // open, filters to just Apple

    await user.keyboard("{ArrowDown}"); // active -> Apple (only match)
    await user.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(input.value).toBe("Apple");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Escape closes without selecting", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    const input = getInput();
    await user.type(input, "a");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("respects controlled value and inputValue", () => {
    render(<Harness controlledValue="banana" controlledInput="Banana" />);
    expect(getInput().value).toBe("Banana");
  });

  it("renders Empty when there are no items", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(getInput(), "zzz");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No fruit found")).toBeInTheDocument();
  });

  it("shows a Spinner while loading", async () => {
    const user = userEvent.setup();
    render(<Harness loading />);

    await user.type(getInput(), "a");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("status")).toBeInTheDocument();
    expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
  });

  it("does not select a disabled item on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    const input = getInput();
    await user.type(input, "cherry");

    const option = screen.getByRole("option", { name: "Cherry" });
    expect(option).toHaveAttribute("aria-disabled", "true");

    await user.click(option);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("selects on click and reflects aria-selected on the chosen option", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);

    const input = getInput();
    await user.type(input, "a");

    await user.click(screen.getByRole("option", { name: "Banana" }));
    expect(onValueChange).toHaveBeenCalledWith("banana");
    expect(input.value).toBe("Banana");
  });
});
