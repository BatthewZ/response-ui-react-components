import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Rating } from "./Rating";

/**
 * The props React handed the host element. `Omit` is compile-time only, and
 * `onChange` on a `<div>` renders no attribute and fires only for a descendant
 * form control (Rating has none) — so this is the only place a key that slipped
 * through a `{...props}` spread is observable.
 */
function hostProps(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  if (!key) throw new Error("element is not React-rendered");
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any`. `onChange?: never` makes the *typed* spread of
 * the same object a compile error; the runtime destructure is what covers this
 * half, and it is the half a published package cannot assume away.
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

describe("Rating", () => {
  it("renders a radiogroup with `max` radios", () => {
    render(<Rating aria-label="Rate" max={5} />);
    expect(screen.getByRole("radiogroup", { name: "Rate" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("click sets the value and fires onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    await user.click(radios[2]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(3);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowRight increases and ArrowLeft decreases the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={2} onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("ArrowUp increases and ArrowDown decreases the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={2} onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();

    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    // Focus and value are one machine (#213): the tab stop is the star holding
    // the value, whichever arrow moved it.
    expect(radios[2]).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveFocus();
  });

  it("ArrowUp/ArrowDown step by 0.5 when allowHalf", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Rating aria-label="Rate" allowHalf defaultValue={2} onValueChange={onValueChange} />,
    );
    screen.getAllByRole("radio")[0].focus();

    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(2.5);

    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(2);
  });

  it("ArrowUp at max clamps without re-emitting", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={5} max={5} onValueChange={onValueChange} />);
    screen.getAllByRole("radio")[0].focus();

    await user.keyboard("{ArrowUp}");
    // Clamped back to the value already held — no change, so no emission.
    expect(onValueChange).toHaveBeenCalledTimes(0);
    expect(screen.getAllByRole("radio")[4]).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowDown at zero clamps without re-emitting", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" defaultValue={0} max={5} onValueChange={onValueChange} />);
    screen.getAllByRole("radio")[0].focus();

    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(0);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
  });

  it("ArrowUp/ArrowDown do nothing while disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Rating aria-label="Rate" disabled defaultValue={2} onValueChange={onValueChange} />,
    );

    await user.keyboard("{ArrowUp}");
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("allowHalf: clicking the left half of a star yields x.5", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" allowHalf onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    const target = radios[2];
    target.getBoundingClientRect = () =>
      ({ left: 0, width: 20, top: 0, height: 20, right: 20, bottom: 20, x: 0, y: 0, toJSON() {} }) as DOMRect;
    await user.pointer({ target, coords: { clientX: 4, clientY: 5 } });
    await user.click(target);
    // Only the click commits — the hover preview is local state, never an emission.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(2.5);
  });

  it("readOnly keeps the caller's label and carries the value as a meter", () => {
    render(<Rating aria-label="Product rating" value={3} readOnly max={5} />);
    const meter = screen.getByRole("meter", { name: "Product rating" });
    expect(meter).toHaveAttribute("aria-valuenow", "3");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "5");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("controlled value stays fixed without onValueChange updating it", async () => {
    const user = userEvent.setup();
    render(<Rating aria-label="Rate" value={2} onValueChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    await user.click(radios[4]);
    // controlled: value stays at 2
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[4]).toHaveAttribute("aria-checked", "false");
  });

  /* -- #211: under allowHalf every radio was named `position - 0.5` -- */

  it("#211: allowHalf still offers a radio named for `max`", () => {
    render(<Rating aria-label="Rate" allowHalf max={5} value={3} onValueChange={() => {}} />);

    expect(screen.getByRole("radio", { name: "5" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("#211: the checked radio is named for the value the component holds", () => {
    render(<Rating aria-label="Rate" allowHalf max={5} value={2.5} onValueChange={() => {}} />);

    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName("2.5");
  });

  it("#211: a whole-star value names its radio without a half", () => {
    render(<Rating aria-label="Rate" allowHalf max={5} value={5} onValueChange={() => {}} />);

    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName("5");
  });

  it("#211: names are unchanged without allowHalf", () => {
    render(<Rating aria-label="Rate" max={3} value={2} onValueChange={() => {}} />);

    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("disabled radios do not fire onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating aria-label="Rate" disabled onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeDisabled();
    await user.click(radios[2]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  describe("keyboard activation under allowHalf (#212)", () => {
    // jsdom reports a 0×0 rect for every element, which accidentally reads as
    // the RIGHT half. Give the star a real box so `clientX: 0` means what it
    // means in a browser: the left edge.
    function stubRect(el: HTMLElement) {
      el.getBoundingClientRect = () =>
        ({
          left: 100,
          width: 20,
          top: 0,
          height: 20,
          right: 120,
          bottom: 20,
          x: 100,
          y: 0,
          toJSON() {},
        }) as DOMRect;
    }

    it("Enter commits the whole star, not position − 0.5", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Rating aria-label="Rate" allowHalf max={5} onValueChange={onValueChange} />);

      const radios = screen.getAllByRole("radio");
      stubRect(radios[2]);
      radios[2].focus();
      await user.keyboard("{Enter}");

      expect(onValueChange).toHaveBeenLastCalledWith(3);
    });

    it("Space commits the whole star too", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Rating aria-label="Rate" allowHalf max={5} onValueChange={onValueChange} />);

      const radios = screen.getAllByRole("radio");
      stubRect(radios[4]);
      radios[4].focus();
      await user.keyboard(" ");

      expect(onValueChange).toHaveBeenLastCalledWith(5);
    });
  });

  describe("focus and value are one machine (#213 / #214)", () => {
    it("does not loop focus past the end while the value clamps", async () => {
      const user = userEvent.setup();
      render(<Rating aria-label="Rate" max={3} defaultValue={3} />);

      const radios = screen.getAllByRole("radio");
      radios[2].focus();
      await user.keyboard("{ArrowRight}");

      // The value cannot go past 3, so neither can the tab stop.
      expect(radios[2]).toHaveFocus();
      expect(radios[0]).not.toHaveFocus();
    });

    it("keeps focus on the checked radio through half steps", async () => {
      const user = userEvent.setup();
      render(<Rating aria-label="Rate" allowHalf max={5} defaultValue={2} />);

      const radios = screen.getAllByRole("radio");
      radios[1].focus();

      const checked = () =>
        radios.findIndex((r) => r.getAttribute("aria-checked") === "true");

      // 2 → 2.5: the half lands on star 3, so that is the checked radio.
      await user.keyboard("{ArrowRight}");
      expect(checked()).toBe(2);
      expect(radios[2]).toHaveFocus();

      // 2.5 → 3 is the same radio, so focus does not move again.
      await user.keyboard("{ArrowRight}");
      expect(checked()).toBe(2);
      expect(radios[2]).toHaveFocus();
    });

    it("a click moves the tab stop to the clicked star", async () => {
      const user = userEvent.setup();
      render(<Rating aria-label="Rate" max={5} />);

      const radios = screen.getAllByRole("radio");
      await user.click(radios[3]);

      expect(radios[3]).toHaveAttribute("tabindex", "0");
      for (const other of [radios[0], radios[1], radios[2], radios[4]]) {
        expect(other).toHaveAttribute("tabindex", "-1");
      }
    });

    it("Tab enters the group on the star holding the value", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Rating aria-label="Rate" max={5} defaultValue={4} />
        </>,
      );

      screen.getByRole("button", { name: "Before" }).focus();
      await user.tab();

      expect(screen.getAllByRole("radio")[3]).toHaveFocus();
    });
  });

  describe("Home and End (#217)", () => {
    it("commit the first and last ratings", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Rating aria-label="Rate" max={5} defaultValue={3} onValueChange={onValueChange} />,
      );

      screen.getAllByRole("radio")[2].focus();

      await user.keyboard("{End}");
      expect(onValueChange).toHaveBeenLastCalledWith(5);

      await user.keyboard("{Home}");
      expect(onValueChange).toHaveBeenLastCalledWith(1);
    });
  });

  describe("no hard-coded English (#218)", () => {
    it("names every radio with the bare number by default", () => {
      render(<Rating aria-label="Rate" max={2} />);

      expect(screen.getByRole("radio", { name: "1" })).toBeInTheDocument();
      expect(screen.queryByRole("radio", { name: /star/i })).not.toBeInTheDocument();
    });

    it("routes the name through formatValue when one is supplied", () => {
      render(
        <Rating
          aria-label="Note"
          max={2}
          formatValue={(v, max) => `${v} sur ${max} étoiles`}
        />,
      );

      expect(
        screen.getByRole("radio", { name: "1 sur 2 étoiles" }),
      ).toBeInTheDocument();
    });

    it("uses formatValue for the read-only value text", () => {
      render(
        <Rating
          aria-label="Note"
          max={5}
          value={4}
          readOnly
          formatValue={(v, max) => `${v} sur ${max}`}
        />,
      );

      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "4 sur 5");
    });
  });

  describe("an out-of-range or off-step value (#219)", () => {
    it("clamps a value above max", () => {
      render(<Rating aria-label="Rate" max={5} value={9} readOnly />);

      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "5");
    });

    it("snaps a fractional value to the step it can draw", () => {
      render(<Rating aria-label="Rate" max={5} value={4.3} readOnly />);

      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "4");
    });

    it("snaps to the nearest half under allowHalf", () => {
      render(<Rating aria-label="Rate" max={5} allowHalf value={4.3} readOnly />);

      expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "4.5");
    });
  });

  describe("readOnly with disabled (#220)", () => {
    it("still reports and paints the disabled state", () => {
      render(<Rating aria-label="Rate" max={5} value={3} readOnly disabled />);

      const meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute("aria-disabled", "true");
      expect(meter).toHaveClass("rating--disabled");
    });
  });

  describe("omitted props", () => {
    // The real `field()` shape. A one-key `{ onChange }` bag is rejected by TS2559
    // ("no properties in common") and would give a false green.
    const bag = () => ({ name: "score", value: 3, onChange: vi.fn(), onBlur: vi.fn() });

    it("a field()-shaped bag's onChange never reaches the radiogroup", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const props = bag();

      render(
        <Rating aria-label="Rate" onValueChange={onValueChange} {...untypedProps(props)} />,
      );
      const group = screen.getByRole("radiogroup", { name: "Rate" });
      await user.click(screen.getAllByRole("radio")[4]);

      expect(hostProps(group)).not.toHaveProperty("onChange");
      expect(props.onChange).toHaveBeenCalledTimes(0);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it("the read-only layout drops it too", () => {
      const props = bag();
      render(<Rating aria-label="Rate" readOnly {...untypedProps(props)} />);

      expect(hostProps(screen.getByRole("meter"))).not.toHaveProperty("onChange");
    });
  });
});

/**
 * `Rating.css` is gone. The one declaration that could not simply move is the
 * star button's `all: unset`, and it was *enumerated away* rather than
 * transposed: Tailwind sorts an arbitrary property after every named utility, so
 * `[all:unset]` in this class list would wipe the declarations it was meant to
 * precede and then out-rank the caller as well. Preflight already supplies the
 * reset — the same thing `Button.tsx` has always relied on.
 */
describe("the star button carries no reset of its own", () => {
  it("emits no blanket reset utility, and keeps the positive declarations", () => {
    render(<Rating aria-label="Rate" defaultValue={3} />);
    const classes = screen.getAllByRole("radio")[0].className;

    expect(classes).not.toContain("[all:unset]");
    expect(classes).not.toContain("[font:inherit]");
    for (const util of ["inline-flex", "cursor-pointer", "rounded-sm"]) {
      expect(classes.split(" ")).toContain(util);
    }
  });

  it("still marks the hit target, which measures the half-star click", () => {
    render(<Rating aria-label="Rate" allowHalf defaultValue={3} />);
    expect(screen.getAllByRole("radio")[0].className.split(" ")).toContain("rating-button");
  });
});
