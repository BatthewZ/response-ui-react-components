import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { MultiSelect, type MultiSelectItem } from "./MultiSelect";
import { useForm } from "./use-form";

const OPTIONS: MultiSelectItem[] = [
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

  /**
   * `atMax` counts the **selection**, not the rendered rows — one of the four
   * things `SLOT-VOCABULARY.md` §10.1 says `options` is load-bearing for, and
   * the only one that had no gate. The test above cannot see it: it never types
   * a query, so every selected row is still mounted and a node-counting `atMax`
   * agrees with a data-counting one. Filtering the first pick out of the DOM is
   * what separates them. Falsifier: count only selections whose row is currently
   * rendered.
   */
  it("counts maxItems against the selection, not against the rendered rows", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} maxItems={1} searchable />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);

    // Query Apple out of the list; the cap must not go with it.
    await user.type(input, "cher");
    const cherry = within(screen.getByRole("listbox")).getByText("Cherry");
    expect(within(screen.getByRole("listbox")).queryByText("Apple")).toBeNull();
    expect(cherry.closest('[role="option"]')).toHaveAttribute("aria-disabled", "true");

    await user.click(cherry);
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

  // `data-active` is the only hook the stylesheet has for the virtual-focus
  // ring: DOM focus never leaves the input, so `:focus-visible` cannot match an
  // option. jsdom applies no stylesheets, so these lock the DOM contract the
  // ring hangs off — not the ring itself.
  it("marks exactly one option data-active, in step with aria-activedescendant", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole("combobox");
    await user.click(input);

    const activeIds = () =>
      within(screen.getByRole("listbox"))
        .getAllByRole("option")
        .filter((option) => option.hasAttribute("data-active"))
        .map((option) => option.id);

    // Nothing is active until the keyboard moves.
    expect(activeIds()).toEqual([]);
    expect(input).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    const first = input.getAttribute("aria-activedescendant");
    expect(activeIds()).toEqual([first]);

    await user.keyboard("{ArrowDown}");
    const second = input.getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    expect(activeIds()).toEqual([second]);

    await user.keyboard("{ArrowUp}");
    expect(activeIds()).toEqual([first]);
  });

  describe("dismissing the listbox (#265)", () => {
    it("closes when the chevron is clicked again", async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness />);

      await user.click(screen.getByRole("combobox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      const toggle = container.querySelector(".multiselect-toggle")!;
      await user.click(toggle);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    });

    it("closes when focus leaves the control", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Harness />
          <button type="button">After</button>
        </>
      );

      await user.click(screen.getByRole("combobox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.tab();

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("controlled open (#445)", () => {
    it("honours the open prop and reports changes", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(<Harness open={false} onOpenChange={onOpenChange} />);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      await user.click(screen.getByRole("combobox"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      // Still shut: the prop owns the state.
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

      rerender(<Harness open onOpenChange={onOpenChange} />);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("Enter with the list open (#266)", () => {
    it("does not submit the surrounding form when nothing is highlighted", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Harness />
        </form>
      );

      await user.click(screen.getByRole("combobox"));
      await user.keyboard("{Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("chip removal (#267 / #441)", () => {
    it("puts every chip's remove button in the tab order", async () => {
      const user = userEvent.setup();
      render(<Harness defaultValue={undefined} />);

      await user.click(screen.getByRole("combobox"));
      await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
      await user.click(within(screen.getByRole("listbox")).getByText("Banana"));

      const remove = screen.getByRole("button", { name: "Remove Apple" });
      expect(remove).not.toHaveAttribute("tabindex", "-1");
    });

    it("keeps focus inside the control after a chip removes itself", async () => {
      const user = userEvent.setup();
      render(<Harness defaultValue={undefined} />);

      await user.click(screen.getByRole("combobox"));
      await user.click(within(screen.getByRole("listbox")).getByText("Apple"));
      await user.click(within(screen.getByRole("listbox")).getByText("Banana"));

      await user.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(document.activeElement).not.toBe(document.body);
      expect(screen.getByRole("button", { name: "Remove Banana" })).toHaveFocus();
    });

    it("falls back to the text input when the last chip goes", async () => {
      const user = userEvent.setup();
      render(<Harness defaultValue={undefined} />);

      await user.click(screen.getByRole("combobox"));
      await user.click(within(screen.getByRole("listbox")).getByText("Apple"));

      await user.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.getByRole("combobox")).toHaveFocus();
    });
  });

  describe("ARIA that describes what is actually there", () => {
    it("#270 drops aria-controls while the listbox is closed", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const input = screen.getByRole("combobox");
      expect(input).not.toHaveAttribute("aria-controls");

      await user.click(input);
      const id = input.getAttribute("aria-controls");
      expect(id).toBeTruthy();
      expect(document.getElementById(id!)).toBe(screen.getByRole("listbox"));
    });

    it("#271 does not advertise list autocomplete when not searchable", () => {
      render(<Harness searchable={false} />);

      expect(screen.getByRole("combobox")).toHaveAttribute(
        "aria-autocomplete",
        "none"
      );
    });

    it("#263 puts id and aria-labelledby on the combobox input", () => {
      render(
        <>
          <span id="ms-label">Fruit</span>
          <Harness id="ms-input" aria-label={undefined} aria-labelledby="ms-label" />
        </>
      );

      const input = screen.getByRole("combobox", { name: "Fruit" });
      expect(input).toHaveAttribute("id", "ms-input");
    });
  });

  /**
   * Audited claim: `className: "multiselect-input"` and
   * `className: "multiselect-content"` are bare strings inside getProps-style
   * objects, so "any className arriving from the caller/spread is discarded and
   * no override is possible".
   *
   * These pin where a caller's className actually goes and what the two internal
   * strings are on the path of. `getReferenceProps`/`getFloatingProps` merge only
   * event handlers and ARIA props — floating-ui contributes no className — and
   * `useFieldError`'s `ariaProps`, the one spread that lands *after* the string,
   * carries only `aria-invalid` and `aria-describedby`.
   */
  describe("className routing", () => {
    it("merges the caller's className onto the root, keeping the base class", () => {
      render(<Harness className="pinned-by-the-caller" />);

      const root = screen.getByRole("combobox").closest(".multiselect");
      expect(root).toHaveClass("multiselect", "pinned-by-the-caller");
    });

    it("keeps the internal input and listbox classes with a caller className present", async () => {
      const user = userEvent.setup();
      render(<Harness className="pinned-by-the-caller" />);

      const input = screen.getByRole("combobox");
      // What this pins is that nothing else reaches this element's className —
      // floating-ui's `mergeProps` contributes event handlers and ARIA props
      // only. The list was exact until the element grew its own utilities; the
      // falsifier is the same one, expressed as "the component's own classes and
      // nothing appended": no `undefined`, no `null`, no empty token, and no
      // caller class (there is no slot for one here without `classNames.input`).
      expect([...input.classList]).toContain("multiselect-input");
      expect(input.className).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      // The caller's class went to the root, not to the search input. Unlike
      // `Combobox.Input`, whose caller addresses the input itself, MultiSelect's
      // `className` addresses its root — so there is nothing to merge here.
      expect(input).not.toHaveClass("pinned-by-the-caller");

      await user.click(input);
      const listbox = screen.getByRole("listbox");
      expect([...listbox.classList]).toContain("multiselect-content");
      expect(listbox.className).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
    });

    it("keeps multiselect-input when the field-error props spread over it", () => {
      render(
        <Field name="picks" error="Pick at least one">
          <Harness />
        </Field>,
      );

      const input = screen.getByRole("combobox");
      // `...ariaProps` is the only spread after the className, and this is the
      // state in which it is non-empty.
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveClass("multiselect-input");
    });
  });

  /**
   * The compound. `options` stays the only writer of the list: `children` is a
   * function the root calls over the list it has *already* filtered, and
   * `MultiSelect.Item` will only take an option that came out of it.
   */
  describe("compound composition", () => {
    it("renders a composed tree in the same places as the default one", async () => {
      const user = userEvent.setup();
      render(
        <Harness>
          {({ options, selected }) => (
            <>
              {selected.map(({ value, label }, index) => (
                <MultiSelect.Tag key={`${index}:${value}`} index={index}>
                  {label}
                  <MultiSelect.TagRemove />
                </MultiSelect.Tag>
              ))}
              <MultiSelect.Content>
                {options.map((option) => (
                  <MultiSelect.Item key={option.value} option={option}>
                    <MultiSelect.ItemIndicator />
                    <span data-testid={`row-${option.value}`}>{option.label}</span>
                  </MultiSelect.Item>
                ))}
              </MultiSelect.Content>
            </>
          )}
        </Harness>
      );

      const input = screen.getByRole("combobox");
      await user.click(input);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveClass("multiselect-content");
      expect(within(listbox).getAllByRole("option")).toHaveLength(4);
      expect(screen.getByTestId("row-apple")).toBeInTheDocument();

      await user.click(within(listbox).getByText("Apple"));

      // The chip lands inside the control's chip row, not in the portal.
      const remove = screen.getByRole("button", { name: "Remove Apple" });
      expect(remove).toHaveClass("multiselect-tag__remove");
      expect(remove.closest(".multiselect-tag")?.parentElement).toHaveClass(
        "multiselect-tags"
      );
      // And the indicator is inside its own row.
      const appleRow = screen.getByTestId("row-apple").closest('[role="option"]');
      expect(appleRow?.querySelector(".multiselect-item__check")).not.toBeNull();
    });

    it("hands children the root's own filtered list, not the options prop", async () => {
      const user = userEvent.setup();
      const seen: string[][] = [];
      render(
        <Harness>
          {({ options }) => {
            seen.push(options.map((o) => o.value));
            return (
              <MultiSelect.Content>
                {options.map((option) => (
                  <MultiSelect.Item key={option.value} option={option}>
                    {option.label}
                  </MultiSelect.Item>
                ))}
              </MultiSelect.Content>
            );
          }}
        </Harness>
      );

      const input = screen.getByRole("combobox");
      await user.click(input);
      expect(seen.at(-1)).toEqual(["apple", "banana", "cherry", "date"]);

      await user.type(input, "ban");
      expect(seen.at(-1)).toEqual(["banana"]);
      expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
    });

    /**
     * The property the whole design rests on. If `MultiSelect.Item` ever starts
     * accepting an option the root did not produce, the consumer has become a
     * second writer of the list and this test is what says so.
     */
    it("refuses an option the root's list never contained", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <Harness open>
            {({ options }) => (
              <MultiSelect.Content>
                {options.map((option) => (
                  <MultiSelect.Item key={option.value} option={option}>
                    {option.label}
                  </MultiSelect.Item>
                ))}
                <MultiSelect.Item option={{ value: "ghost", label: "Ghost" }}>
                  Ghost
                </MultiSelect.Item>
              </MultiSelect.Content>
            )}
          </Harness>
        )
      ).toThrow(/not in the list MultiSelect handed to children/);
      consoleError.mockRestore();
    });

    /**
     * `option` is an address, not a data channel. Spreading a row and flipping
     * `disabled` used to write selectability — and only half of it, because
     * `handleKeyDown` reads `filtered[activeIndex]`: the click path honoured the
     * override while the keyboard path refused it, and `aria-disabled` reported
     * the caller's answer to both. Falsifier: read `option.disabled` instead of
     * `filtered[index].disabled` in `MultiSelect.Item`.
     */
    it("reads a row's disabled state from options, not from the option a child passed", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Harness onValueChange={onValueChange} open>
          {({ options }) => (
            <MultiSelect.Content>
              {options.map((option) => (
                <MultiSelect.Item
                  key={option.value}
                  option={{ ...option, disabled: !option.disabled }}
                >
                  {option.label}
                </MultiSelect.Item>
              ))}
            </MultiSelect.Content>
          )}
        </Harness>
      );

      const listbox = screen.getByRole("listbox");
      // `date` is disabled in OPTIONS and the child said otherwise.
      const date = within(listbox).getByText("Date").closest('[role="option"]')!;
      expect(date).toHaveAttribute("aria-disabled", "true");
      await user.click(date);
      expect(onValueChange).not.toHaveBeenCalled();

      // And the reverse: `apple` is enabled in OPTIONS and the child said otherwise.
      const apple = within(listbox).getByText("Apple").closest('[role="option"]')!;
      expect(apple).not.toHaveAttribute("aria-disabled");
      await user.click(apple);
      expect(onValueChange).toHaveBeenCalledWith(["apple"]);
    });

    /**
     * The bag is spread before the invariants, so a consumer prop of the same
     * name cannot win. Spread last, a `role` from the call site left the listbox
     * with zero discoverable options. Falsifier: move the `getItemProps(...)`
     * spread back below `className` in `MultiSelect.Item`.
     */
    it("keeps its own id, role and aria state when a child passes the same props", () => {
      render(
        <Harness open>
          {({ options }) => (
            <MultiSelect.Content>
              {options.map((option) => (
                <MultiSelect.Item
                  key={option.value}
                  option={option}
                  id="hijacked"
                  role="presentation"
                  aria-selected={true}
                >
                  {option.label}
                </MultiSelect.Item>
              ))}
            </MultiSelect.Content>
          )}
        </Harness>
      );

      const rows = within(screen.getByRole("listbox")).getAllByRole("option");
      expect(rows).toHaveLength(OPTIONS.length);
      expect(rows[0]).not.toHaveAttribute("id", "hijacked");
      expect(rows[0]).toHaveAttribute("aria-selected", "false");
    });

    /**
     * The chip half of the sole-writer property. `.Item` guarded its address and
     * `.Tag` did not, so a consumer could author a chip the selection does not
     * hold — whose remove button then called `removeChipAt` on nothing.
     * Falsifier: delete the index guard in `MultiSelect.Tag`.
     */
    it("refuses a chip at an index the selection does not hold", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <Harness>
            {() => (
              <MultiSelect.Tag index={99}>
                Ghost
                <MultiSelect.TagRemove />
              </MultiSelect.Tag>
            )}
          </Harness>
        )
      ).toThrow(/not a position in the selection MultiSelect handed to children/);
      consoleError.mockRestore();
    });

    it("refuses a part rendered outside a MultiSelect", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<MultiSelect.Content />)).toThrow(
        "MultiSelect.Content must be used within a MultiSelect"
      );
      expect(() => render(<MultiSelect.ItemIndicator />)).toThrow(
        "MultiSelect.ItemIndicator must be used within a MultiSelect.Item"
      );
      expect(() => render(<MultiSelect.TagRemove />)).toThrow(
        "MultiSelect.TagRemove must be used within a MultiSelect.Tag"
      );
      consoleError.mockRestore();
    });

    it("keeps toggling, chip removal and virtual focus working in a composed tree", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Harness onValueChange={onValueChange}>
          {({ options, selected }) => (
            <>
              {selected.map(({ value, label }, index) => (
                <MultiSelect.Tag key={`${index}:${value}`} index={index}>
                  {label}
                  <MultiSelect.TagRemove />
                </MultiSelect.Tag>
              ))}
              <MultiSelect.Content>
                {options.map((option) => (
                  <MultiSelect.Item key={option.value} option={option}>
                    {option.label}
                  </MultiSelect.Item>
                ))}
              </MultiSelect.Content>
            </>
          )}
        </Harness>
      );

      const input = screen.getByRole("combobox");
      await user.click(input);
      await user.keyboard("{ArrowDown}");
      // A composed row still registers with the root's list navigation.
      const activeId = input.getAttribute("aria-activedescendant");
      expect(document.getElementById(activeId!)).toHaveTextContent("Apple");

      await user.keyboard("{Enter}");
      expect(onValueChange).toHaveBeenLastCalledWith(["apple"]);

      await user.click(screen.getByRole("button", { name: "Remove Apple" }));
      expect(onValueChange).toHaveBeenLastCalledWith([]);
    });
  });

  /**
   * One override test per slot, plus the four companions. `MultiSelect`'s other
   * six internals are subcomponents, not slots — a slot beside one would be a
   * second writer for the same element.
   */
  describe("classNames slots", () => {
    it("lands classNames.control on the bordered box", () => {
      const { container } = render(<Harness classNames={{ control: "border-4" }} />);
      const control = container.querySelector(".multiselect-control")!;
      expect(control.getAttribute("class")).toContain("multiselect-control");
      expect(control.getAttribute("class")).toContain("border-4");
    });

    it("lands classNames.list on the chip row", () => {
      const { container } = render(<Harness classNames={{ list: "gap-r2" }} />);
      const tags = container.querySelector(".multiselect-tags")!;
      expect(tags.getAttribute("class")).toContain("multiselect-tags");
      expect(tags.getAttribute("class")).toContain("gap-r2");
    });

    it("lands classNames.input on the search field", () => {
      render(<Harness classNames={{ input: "text-sm" }} />);
      const input = screen.getByRole("combobox");
      expect(input.getAttribute("class")).toContain("multiselect-input");
      expect(input.getAttribute("class")).toContain("text-sm");
    });

    it("lands classNames.chevron on the disclosure glyph", () => {
      const { container } = render(<Harness classNames={{ chevron: "rotate-180" }} />);
      const chevron = container.querySelector(".multiselect-toggle")!;
      expect(chevron.getAttribute("class")).toContain("multiselect-toggle");
      expect(chevron.getAttribute("class")).toContain("rotate-180");
    });

    /**
     * This used to assert each class attribute equalled its marker exactly,
     * which stopped being expressible once the elements carried their own
     * utilities. The falsifier is unchanged: an absent slot appends **nothing**
     * — no `undefined`, no `null`, no empty token.
     */
    it("keeps every base class when no slot is passed", () => {
      const { container } = render(<Harness />);
      for (const marker of ["multiselect-control", "multiselect-tags", "multiselect-toggle"]) {
        const classes = container.querySelector(`.${marker}`)?.getAttribute("class") ?? "";
        expect(classes.split(" "), marker).toContain(marker);
        expect(classes, marker).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      }
    });

    it("puts no slot class on the root", () => {
      const { container } = render(
        <Harness
          classNames={{
            control: "slot-control",
            list: "slot-list",
            input: "slot-input",
            chevron: "slot-chevron",
          }}
        />
      );
      const root = container.querySelector(".multiselect")!;
      const classes = root.getAttribute("class") ?? "";
      expect(classes.split(" ")).toContain("multiselect");
      for (const slot of ["slot-control", "slot-list", "slot-input", "slot-chevron"]) {
        expect(classes, slot).not.toContain(slot);
      }
    });

    it("rejects an unknown slot key at compile time", () => {
      render(
        // @ts-expect-error `panel` is not a slot — MultiSelect.Content reaches
        // that element, so a slot for it would be a second writer.
        <Harness classNames={{ panel: "p-4" }} />
      );
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("does not put classNames on the DOM", () => {
      const { container } = render(<Harness classNames={{ control: "border-4" }} />);
      const root = container.querySelector(".multiselect")!;
      expect(root.hasAttribute("classnames")).toBe(false);
      expect(root.outerHTML).not.toContain("[object Object]");
    });
  });

  describe("duplicate entries in a controlled value (#272)", () => {
    it("renders both chips without a duplicate-key error", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <MultiSelect
          aria-label="Fruit"
          options={OPTIONS}
          value={["apple", "apple"]}
          onValueChange={vi.fn()}
        />
      );

      expect(screen.getAllByRole("button", { name: "Remove Apple" })).toHaveLength(2);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
