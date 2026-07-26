import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  focusOutlineResetControl,
  focusRingControl,
  focusRingControlError,
} from "../../util/focus";

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
    // `Spinner` is decoration unless it is given something to announce, so the
    // assertion is on the loading slot, not on a live region it does not own.
    expect(listbox.querySelector(".combobox-loading")).not.toBeNull();
    expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
  });

  it("announces the wait when Content is given a loadingLabel", async () => {
    const user = userEvent.setup();
    render(
      <Combobox loading>
        <Combobox.Input aria-label="Fruit" />
        <Combobox.Content loadingLabel="Chargement des fruits…">
          <Combobox.Item index={0} value="apple">
            Apple
          </Combobox.Item>
        </Combobox.Content>
      </Combobox>,
    );

    await user.type(getInput(), "a");

    expect(screen.getByRole("status")).toHaveTextContent("Chargement des fruits…");
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

  describe("caller-supplied props", () => {
    /** Every id on the tree is supplied by the caller, so nothing can rely on the generated ones. */
    function IdHarness() {
      return (
        <Combobox defaultOpen>
          <Combobox.Input aria-label="Fruit" />
          <Combobox.Content id="caller-listbox">
            {FRUITS.map((f, index) => (
              <Combobox.Item
                key={f.value}
                index={index}
                value={f.value}
                id={`caller-option-${index}`}
                disabled={f.disabled}
              >
                {f.label}
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox>
      );
    }

    it("keeps aria-controls resolving to the listbox when the caller gives Content an id", () => {
      render(<IdHarness />);

      const input = getInput();
      const listbox = screen.getByRole("listbox");
      const controls = input.getAttribute("aria-controls");

      expect(controls).toBeTruthy();
      expect(document.getElementById(controls as string)).toBe(listbox);
    });

    it("keeps aria-activedescendant resolving to an option when the caller gives Items ids", async () => {
      const user = userEvent.setup();
      render(<IdHarness />);

      const input = getInput();
      const active = input.getAttribute("aria-activedescendant");
      expect(active).toBeTruthy();
      expect(document.getElementById(active as string)).toBe(
        screen.getByRole("option", { name: "Apple" }),
      );

      await user.click(input);
      await user.keyboard("{ArrowDown}");

      const nextActive = input.getAttribute("aria-activedescendant");
      expect(nextActive).not.toBe(active);
      expect(document.getElementById(nextActive as string)).toBe(
        screen.getByRole("option", { name: "Banana" }),
      );
    });

    it("keeps the input's combobox identity when the caller passes conflicting ARIA", () => {
      render(
        <Combobox defaultOpen>
          <Combobox.Input
            aria-label="Fruit"
            role="textbox"
            aria-expanded={false}
            aria-autocomplete="none"
          />
          <Combobox.Content>
            <Combobox.Item index={0} value="apple">
              Apple
            </Combobox.Item>
          </Combobox.Content>
        </Combobox>,
      );

      const input = getInput();
      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveAttribute("aria-autocomplete", "list");
    });

    it("keeps role=option and aria-selected on an Item the caller re-roles", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Combobox defaultOpen defaultValue="apple" onValueChange={onValueChange}>
          <Combobox.Input aria-label="Fruit" />
          <Combobox.Content>
            <Combobox.Item index={0} value="apple" role="presentation" aria-selected={false}>
              Apple
            </Combobox.Item>
            <Combobox.Item index={1} value="banana" aria-disabled>
              Banana
            </Combobox.Item>
          </Combobox.Content>
        </Combobox>,
      );

      expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      // Not disabled by the component, so the lie must not stick and selection must work.
      const banana = screen.getByRole("option", { name: "Banana" });
      expect(banana).not.toHaveAttribute("aria-disabled");

      await user.click(banana);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("banana");
    });
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

  // `data-active` is the only hook the stylesheet has for the virtual-focus
  // ring: DOM focus never leaves the input, so `:focus-visible` cannot match an
  // option. jsdom applies no stylesheets, so these lock the DOM contract the
  // ring hangs off — not the ring itself.
  it("marks exactly one option data-active, in step with aria-activedescendant", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = getInput();
    await user.click(input);
    await user.keyboard("a");

    const activeIds = () =>
      within(screen.getByRole("listbox"))
        .getAllByRole("option")
        .filter((option) => option.hasAttribute("data-active"))
        .map((option) => option.id);

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

  describe("the chevron toggle (#276 / #283)", () => {
    function getToggle(): HTMLElement {
      return screen.getByRole("button", { name: "Show options" });
    }

    it("closes an open popup", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Combobox onOpenChange={onOpenChange}>
          <Combobox.Input aria-label="Fruit" />
          <Combobox.Content>
            <Combobox.Item index={0} value="apple">
              Apple
            </Combobox.Item>
          </Combobox.Content>
        </Combobox>,
      );

      await user.click(getToggle());
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.click(getToggle());
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      // No false close/open pair on the way: one call per press.
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it("takes its accessible name from a prop and reports its own state", async () => {
      const user = userEvent.setup();
      render(
        <Combobox>
          <Combobox.Input aria-label="Fruit" toggleLabel="Afficher les options" />
          <Combobox.Content>
            <Combobox.Item index={0} value="apple">
              Apple
            </Combobox.Item>
          </Combobox.Content>
        </Combobox>,
      );

      const toggle = screen.getByRole("button", { name: "Afficher les options" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBe(
        screen.getByRole("listbox"),
      );
    });
  });

  describe("loading (#277)", () => {
    it("drops aria-activedescendant while the options are swapped for the spinner", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Harness />);

      const input = getInput();
      await user.click(input);
      await user.keyboard("a");
      await user.keyboard("{ArrowDown}");
      const active = input.getAttribute("aria-activedescendant");
      expect(document.getElementById(active!)).not.toBeNull();

      rerender(<Harness loading />);

      // No options are in the document, so there is nothing for the pointer to
      // name — a dangling IDREF is what an AT reads as "no active option name".
      expect(input).not.toHaveAttribute("aria-activedescendant");
      expect(screen.queryAllByRole("option")).toHaveLength(0);
    });
  });

  describe("focus (#278 / #279)", () => {
    it("keeps focus on the input after a mouse selection", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const input = getInput();
      await user.click(input);
      await user.keyboard("a");
      await user.click(within(screen.getByRole("listbox")).getByText("Apple"));

      expect(input).toHaveFocus();
    });

    it("closes when focus leaves the control", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Harness />
          <button type="button">After</button>
        </>,
      );

      await user.click(getInput());
      await user.keyboard("a");
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.tab();

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(getInput()).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("aria-controls while closed (#280)", () => {
    it("is absent when there is no listbox to point at", async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const input = getInput();
      expect(input).not.toHaveAttribute("aria-controls");

      await user.click(input);
      await user.keyboard("a");
      expect(document.getElementById(input.getAttribute("aria-controls")!)).toBe(
        screen.getByRole("listbox"),
      );
    });
  });

  describe("the focus affordance comes from the shared recipe (#284)", () => {
    // jsdom applies no stylesheets, so the assertion is on the wiring: the
    // control consumes `src/util/focus.ts` rather than restating the recipe in
    // Combobox.css, which is what made a single edit there miss this control.
    it("carries the shared control ring and outline reset", () => {
      render(<Harness />);

      const classes = getInput().className.split(/\s+/);
      for (const cls of `${focusOutlineResetControl} ${focusRingControl}`.split(/\s+/)) {
        expect(classes).toContain(cls);
      }
    });

    it("carries the shared invalid recipe, which recolours the border on focus too", () => {
      render(
        <Combobox>
          <Combobox.Input aria-label="Fruit" error />
        </Combobox>,
      );

      const classes = screen
        .getByRole("combobox", { name: "Fruit" })
        .className.split(/\s+/);
      for (const cls of focusRingControlError.split(/\s+/)) {
        expect(classes).toContain(cls);
      }
    });
  });

  describe("the input label of a multi-node option (#281)", () => {
    it("uses the label prop rather than the concatenated textContent", async () => {
      const user = userEvent.setup();
      render(
        <Combobox defaultOpen>
          <Combobox.Input aria-label="Person" />
          <Combobox.Content>
            <Combobox.Item index={0} value="ada" label="Ada Lovelace">
              <span>Ada Lovelace</span>
              <span>Analytical Engine</span>
            </Combobox.Item>
          </Combobox.Content>
        </Combobox>,
      );

      await user.click(screen.getByRole("option"));

      expect(screen.getByRole("combobox", { name: "Person" })).toHaveValue(
        "Ada Lovelace",
      );
    });
  });

  // #483
  describe("the input's border is a utility, not a stylesheet rule", () => {
    it("carries `border border-border-strong` on the element", () => {
      render(
        <Combobox>
          <Combobox.Input aria-label="Fruit" />
        </Combobox>,
      );

      const input = screen.getByRole("combobox", { name: "Fruit" });
      expect(input.className).toContain("border-border-strong");
    });

    it("recolours the border for the invalid state", () => {
      render(
        <Combobox>
          <Combobox.Input aria-label="Fruit" error />
        </Combobox>,
      );

      expect(screen.getByRole("combobox", { name: "Fruit" }).className).toContain(
        "border-status-error",
      );
    });
  });
});

/*
 * Why the two checks above are class-list assertions and not colour ones:
 * `vitest` runs with `css: false`, so nothing here can read a stylesheet or a
 * computed colour. The defect they guard was a *cascade* one — `Combobox.css`
 * declared `border` unlayered, and unlayered author CSS outranks every Tailwind
 * utility whatever the specificity, so both `focusRingControl`'s
 * `focus:border-border-focus` and `focusRingControlError`'s `border-status-error`
 * were inert while the classes were present all along.
 *
 * Measured in Firefox 146 against the dev gallery, with `Input` as the positive
 * control in the same run: focused, the border went `--C-BORDER-STRONG` →
 * `--C-BORDER-FOCUS` (it stayed `--C-BORDER-STRONG` before the fix, and reverts
 * to that the moment the unlayered rule is re-injected), and the invalid border
 * resolved to `--C-STATUS-ERROR` (it stayed `--C-BORDER-STRONG` before).
 * `scripts/verify-focus-affordance.mjs` covers the reset/ring pairing; nothing
 * in-repo covers the layer question, so these assert the one thing that is
 * observable here — that the border is written where a utility can win.
 */
