import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ColorPicker } from "./ColorPicker";
import { useForm } from "./use-form";

function Harness({ onValueChange }: { onValueChange?: (hex: string) => void }) {
  const [value, setValue] = useState("#3366cc");
  return (
    <ColorPicker
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      presets={["#ff0000", "#00ff00"]}
    />
  );
}

describe("ColorPicker", () => {
  it("shows the current hex on the trigger", () => {
    render(<ColorPicker defaultValue="#abcdef" />);
    expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
      "#abcdef",
    );
  });

  it("normalizes the initial value", () => {
    render(<ColorPicker defaultValue="#ABC" />);
    expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
      "#aabbcc",
    );
  });

  it("opens the panel on trigger click", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3366cc" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Choose color/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Hex value")).toHaveValue("#3366cc");
  });

  it("commits a typed hex value on Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: /^Choose color/ }));

    const hexField = screen.getByLabelText("Hex value");
    fireEvent.change(hexField, { target: { value: "#ff8800" } });
    fireEvent.keyDown(hexField, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("#ff8800");
  });

  it("reverts an invalid hex entry on blur", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3366cc" />);
    await user.click(screen.getByRole("button", { name: /^Choose color/ }));

    const hexField = screen.getByLabelText("Hex value") as HTMLInputElement;
    fireEvent.change(hexField, { target: { value: "nonsense" } });
    fireEvent.blur(hexField);
    expect(hexField.value).toBe("#3366cc");
  });

  it("selects a preset swatch", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: /^Choose color/ }));
    await user.click(screen.getByRole("button", { name: "#ff0000" }));
    expect(onValueChange).toHaveBeenLastCalledWith("#ff0000");
  });

  it("changes hue via the hue rail", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: /^Choose color/ }));

    fireEvent.change(screen.getByLabelText("Hue"), { target: { value: "0" } });
    // Hue 0 at this saturation/value yields a red-dominant hex.
    expect(onValueChange).toHaveBeenCalled();
    const lastHex = onValueChange.mock.lastCall?.[0] as string;
    expect(lastHex.startsWith("#")).toBe(true);
  });

  describe("the saturation/brightness area is two sliders, not one (#287)", () => {
    it("is a named group holding one named, bounded slider per axis", async () => {
      const user = userEvent.setup();
      render(<ColorPicker defaultValue="#3366cc" />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      const area = screen.getByRole("group", { name: "Saturation and brightness" });
      // The old shape: one `role="slider"` for two axes, carrying no value at
      // all. ARIA requires valuenow/valuemin/valuemax on that role, and one
      // slider cannot carry two of them.
      expect(screen.queryByRole("slider", { name: "Saturation and brightness" })).toBeNull();

      const saturation = screen.getByRole("slider", { name: "Saturation" });
      const brightness = screen.getByRole("slider", { name: "Brightness" });
      expect(area).toContainElement(saturation);
      expect(area).toContainElement(brightness);

      // #3366cc is hsv(220, 75%, 80%).
      for (const [axis, now] of [
        [saturation, "75"],
        [brightness, "80"],
      ] as const) {
        // Implicit from `<input type="range">` — jsdom reports the attributes,
        // and the platform computes valuenow from `value`.
        expect(axis).toHaveAttribute("min", "0");
        expect(axis).toHaveAttribute("max", "100");
        expect(axis).toHaveValue(now);
        expect(axis).toHaveAttribute("aria-valuetext", `${now}%`);
      }
    });

    it("moves one axis per input, leaving the other where it was", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Harness onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      const saturation = screen.getByRole("slider", { name: "Saturation" });
      const brightness = screen.getByRole("slider", { name: "Brightness" });

      // What a real ArrowRight on the saturation input produces. jsdom does not
      // implement the range key model, so the event is the honest stand-in —
      // the browser half is verified separately (see the note in this file's
      // sibling docs).
      fireEvent.change(saturation, { target: { value: "76" } });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("76");
      expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("80");

      fireEvent.change(brightness, { target: { value: "81" } });
      expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("76");
      expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("81");
    });

    it("keeps a pointer drag in sync with both axis inputs, and leaves focus in the area", async () => {
      const user = userEvent.setup();
      render(<ColorPicker defaultValue="#3366cc" />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      const area = screen.getByRole("group", { name: "Saturation and brightness" });
      // jsdom performs no layout and synthesises no pointer path: without a
      // stubbed rect the drag maths divides by zero, and the capture calls do
      // not exist on the element at all.
      area.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
      area.setPointerCapture = vi.fn();
      area.hasPointerCapture = () => true;

      fireEvent.pointerDown(area, { clientX: 50, clientY: 25, pointerId: 1 });
      expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("25");
      expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("75");
      // A drag has to leave the keyboard on the axis it just moved.
      expect(document.activeElement).toBe(screen.getByRole("slider", { name: "Saturation" }));

      fireEvent.pointerMove(area, { clientX: 150, clientY: 75, pointerId: 1 });
      expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("75");
      expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("25");
    });

    it("keeps the thumb and the trigger on the value the axes report", async () => {
      const user = userEvent.setup();
      render(<ColorPicker defaultValue="#3366cc" />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      fireEvent.change(screen.getByRole("slider", { name: "Brightness" }), {
        target: { value: "0" },
      });

      expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("0");
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        "#000000",
      );
    });
  });

  describe("controlled sync (#289)", () => {
    it("#289 a parent that ignores the change leaves nothing out of sync", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      // Controlled with no write-back: every commit is refused.
      render(<ColorPicker value="#3366cc" onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      const saturation = screen.getByRole("slider", { name: "Saturation" });
      fireEvent.change(saturation, { target: { value: "76" } });
      fireEvent.change(saturation, { target: { value: "77" } });

      // The refused edits are still reported to the parent…
      expect(onValueChange).toHaveBeenCalledTimes(2);
      // …but nothing on screen may drift away from the value the parent holds,
      // including the axis input's own DOM value: a controlled range input
      // whose `value` prop did not move has to be restored, or the panel is
      // showing an edit that was never committed.
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        "#3366cc",
      );
      expect(screen.getByLabelText("Hex value")).toHaveValue("#3366cc");
      expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("75");
      expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("80");
    });

    it("#289 an accepted edit does move the panel", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Harness onValueChange={onValueChange} />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      fireEvent.change(screen.getByRole("slider", { name: "Saturation" }), {
        target: { value: "76" },
      });

      expect(onValueChange).toHaveBeenCalledTimes(1);
      const committed = onValueChange.mock.calls[0][0] as string;
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        committed,
      );
      expect(screen.getByLabelText("Hex value")).toHaveValue(committed);
    });

    it("#289 hue survives a round trip through black on the square", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      fireEvent.change(screen.getByLabelText("Hue"), { target: { value: "200" } });
      const brightness = () => screen.getByRole("slider", { name: "Brightness" });
      // One percent per arrow press, so 80 of them bottom the axis out at black.
      for (let i = Number(brightness().getAttribute("value")) - 1; i >= 0; i--) {
        fireEvent.change(brightness(), { target: { value: String(i) } });
      }

      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        "#000000",
      );
      // Hue is unrecoverable from #000000; it must be remembered, not re-derived.
      expect(screen.getByLabelText("Hue")).toHaveValue("200");
      // …and so is saturation, which #000000 cannot carry either.
      expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("75");
      fireEvent.change(brightness(), { target: { value: "1" } });
      expect(screen.getByLabelText("Hue")).toHaveValue("200");
    });
  });

  describe("mode lock", () => {
    it("survives the controlled value dropping to undefined, and stays controlled", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(
        <ColorPicker
          value="#3366cc"
          onValueChange={onValueChange}
          presets={["#ff0000"]}
        />,
      );
      rerender(
        <ColorPicker
          value={undefined}
          onValueChange={onValueChange}
          presets={["#ff0000"]}
        />,
      );

      // The dropped prop reads as the empty colour, never as `undefined` on screen.
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        "#000000",
      );

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      await user.click(screen.getByRole("button", { name: "#ff0000" }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith("#ff0000");
      // Still controlled: this parent refused the commit, so nothing may be
      // adopted into internal state behind its back.
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        "#000000",
      );
      expect(screen.getByLabelText("Hex value")).toHaveValue("#000000");
    });
  });

  describe("form.field() binding (#285)", () => {
    it("binds via the advertised form.field() spread and commits edits", async () => {
      const user = userEvent.setup();
      let values: { brand: string } | null = null;
      function FieldHarness() {
        const form = useForm({ defaultValues: { brand: "#3366cc" } });
        values = form.getValues();
        return (
          <form {...form.props}>
            <ColorPicker {...form.field<string>("brand")} presets={["#ff0000"]} />
          </form>
        );
      }
      render(<FieldHarness />);

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      await user.click(screen.getByRole("button", { name: "#ff0000" }));

      // Today: the props type is closed and nothing is spread, so `onChange` is
      // dropped on the floor — the store never hears the edit and the controlled
      // `value` never moves, leaving a permanently inert control.
      expect(values).toEqual({ brand: "#ff0000" });
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveTextContent(
        "#ff0000",
      );
    });

    it("fires onChange with the canonical hex alongside onValueChange", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onValueChange = vi.fn();
      render(
        <ColorPicker
          defaultValue="#3366cc"
          presets={["#ff0000"]}
          onChange={onChange}
          onValueChange={onValueChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      await user.click(screen.getByRole("button", { name: "#ff0000" }));

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith("#ff0000");
    });

    it("lands rest props on the trigger button, and onChange on no element at all", () => {
      render(
        <ColorPicker
          defaultValue="#3366cc"
          id="brand-trigger"
          name="brand"
          data-slot="colour"
          onChange={vi.fn()}
        />,
      );

      const trigger = screen.getByRole("button", { name: /^Choose color/ });
      expect(trigger).toHaveAttribute("id", "brand-trigger");
      expect(trigger).toHaveAttribute("name", "brand");
      expect(trigger).toHaveAttribute("data-slot", "colour");
      // The value-typed onChange is not a DOM ChangeEvent handler and must never
      // be handed to an element.
      expect(trigger.closest(".colorpicker")).not.toHaveAttribute("id");
      expect(trigger.outerHTML).not.toContain("onchange");
    });

    it("runs the caller's onBlur without displacing the floating-ui wiring", async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(<ColorPicker defaultValue="#3366cc" onBlur={onBlur} />);

      const trigger = screen.getByRole("button", { name: /^Choose color/ });
      await user.click(trigger);
      // The click still opens the panel (getReferenceProps kept its handler)…
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      trigger.blur();
      // …and the caller's own handler still ran.
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("keeps a caller's aria-invalid when it has no opinion of its own (#434)", () => {
      const bindings: { "aria-invalid": true | undefined } = { "aria-invalid": true };
      render(<ColorPicker defaultValue="#3366cc" {...bindings} />);
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("is not erased by field()'s always-present `aria-invalid: undefined` (#434)", () => {
      // field() emits the key on every render, valid or not. A plain
      // `{...props}` spread after the computed error props would let that
      // `undefined` delete the component's own opinion.
      const bindings: { "aria-invalid": true | undefined } = { "aria-invalid": undefined };
      render(<ColorPicker defaultValue="#3366cc" error {...bindings} />);
      expect(screen.getByRole("button", { name: /^Choose color/ })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });
  describe("the trigger's accessible name carries the colour (#286)", () => {
    it("puts the current hex in the name, keeping the caller's label", async () => {
      const user = userEvent.setup();
      render(<ColorPicker aria-label="Brand colour" defaultValue="#ff0000" />);

      const trigger = screen.getByRole("button", { name: "Brand colour #ff0000" });
      expect(trigger).toBeInTheDocument();

      await user.click(trigger);
      await user.click(screen.getByRole("slider", { name: "Hue" }));
      fireEvent.change(screen.getByRole("slider", { name: "Hue" }), {
        target: { value: "240" },
      });

      expect(
        screen.getByRole("button", { name: /^Brand colour #/ }).getAttribute("aria-label")
      ).not.toBe("Brand colour #ff0000");
    });
  });

  describe("presets the parser cannot read (#288)", () => {
    it("does not render a swatch that could never commit", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <ColorPicker
          defaultValue="#000000"
          presets={["rebeccapurple", "#ff0000"]}
          onValueChange={onValueChange}
        />
      );

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      expect(screen.queryByRole("button", { name: "rebeccapurple" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "#ff0000" }));
      expect(onValueChange).toHaveBeenCalledWith("#ff0000");
    });
  });

  describe("disabled reaches the open panel (#290)", () => {
    it("disables both axis inputs and the preset buttons", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const props = {
        defaultValue: "#808080",
        presets: ["#ff0000"],
        onValueChange,
      };
      const { rerender } = render(<ColorPicker {...props} />);

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      // Flip `disabled` while the panel is open — a click elsewhere would
      // dismiss it before the assertion could run.
      rerender(<ColorPicker {...props} disabled />);

      // A disabled range input is out of the tab order and emits no change, so
      // the axes are inert without the component having to gate a key handler.
      expect(screen.getByRole("slider", { name: "Saturation" })).toBeDisabled();
      expect(screen.getByRole("slider", { name: "Brightness" })).toBeDisabled();
      expect(screen.getByRole("group", { name: "Saturation and brightness" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );

      // The pointer surface is not a form control and has to be gated by hand.
      const area = screen.getByRole("group", { name: "Saturation and brightness" });
      area.setPointerCapture = vi.fn();
      area.hasPointerCapture = () => true;
      fireEvent.pointerDown(area, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(area, { clientX: 40, clientY: 40, pointerId: 1 });
      expect(onValueChange).not.toHaveBeenCalled();

      expect(screen.getByRole("button", { name: "#ff0000" })).toBeDisabled();
    });
  });

  describe("the floating panel is named (#292)", () => {
    it("gives the dialog an accessible name, overridable by prop", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<ColorPicker defaultValue="#000000" />);

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      expect(screen.getByRole("dialog", { name: "Color picker" })).toBeInTheDocument();
      unmount();

      render(<ColorPicker defaultValue="#000000" panelLabel="Sélecteur de couleur" />);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      expect(
        screen.getByRole("dialog", { name: "Sélecteur de couleur" })
      ).toBeInTheDocument();
    });

    // #485 — every name inside the panel is overridable, not just the dialog's.
    it("takes every name inside the panel from a prop", async () => {
      const user = userEvent.setup();
      render(
        <ColorPicker
          defaultValue="#000000"
          areaLabel="Saturation et luminosité"
          saturationLabel="Saturation FR"
          brightnessLabel="Luminosité"
          hueLabel="Teinte"
          hexLabel="Valeur hexadécimale"
        />
      );

      await user.click(screen.getByRole("button", { name: /^Choose color/ }));

      expect(
        screen.getByRole("group", { name: "Saturation et luminosité" })
      ).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Saturation FR" })).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Luminosité" })).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Teinte" })).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Valeur hexadécimale" })
      ).toBeInTheDocument();

      // No English left behind under the old names.
      expect(screen.queryByRole("slider", { name: "Saturation" })).toBeNull();
      expect(screen.queryByRole("slider", { name: "Hue" })).toBeNull();
      expect(screen.queryByRole("textbox", { name: "Hex value" })).toBeNull();
    });

    // #484 — behaviour change. Opening used to move focus onto the Saturation
    // slider, so the next arrow key committed a colour nobody asked for.
    // `initialFocus={-1}` leaves it on the trigger, which is what DatePicker
    // and DateRangePicker already do.
    //
    // NOT EVIDENCE OF THE FIX. Verified green with `initialFocus` removed:
    // `<FloatingFocusManager>`'s own initial focus move does not happen under
    // jsdom (it depends on tabbability checks that need layout), so only a
    // browser can see it — measured in Firefox 146, `document.activeElement`
    // after opening was the Saturation slider before and the trigger after.
    // What this test does still guard is anything that focuses a panel control
    // *explicitly*, such as an `autoFocus` added to one of the axes.
    it("leaves focus on the trigger when the panel opens", async () => {
      const user = userEvent.setup();
      render(<ColorPicker defaultValue="#3366cc" />);

      const trigger = screen.getByRole("button", { name: /^Choose color/ });
      await user.click(trigger);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe("classNames slots", () => {
    /**
     * Opens the panel and hands back its root, so a panel-internal slot can be
     * read without repeating the click in every test.
     */
    async function openPanel(ui: React.ReactElement) {
      const user = userEvent.setup();
      render(ui);
      await user.click(screen.getByRole("button", { name: /^Choose color/ }));
      return screen.getByRole("dialog");
    }

    const trigger = () => screen.getByRole("button", { name: /^Choose color/ });

    /*
     * One slot-override test per slot, and each is the falsifier for its own
     * merge: delete that element's `cn()` and exactly this test must go red.
     *
     * `trigger` and `panel` are the two whose `className` is an object property
     * rather than a JSX attribute — a props-getter bag, invisible to any walk
     * over JSX attributes — so their merges are only observable here.
     */
    it("lands classNames.trigger on the trigger, beside the base class", () => {
      render(
        <ColorPicker defaultValue="#3366cc" classNames={{ trigger: "px-r3" }} />,
      );
      expect(trigger().className).toContain("colorpicker-trigger");
      expect(trigger().className).toContain("px-r3");
    });

    it("lands classNames.panel on the floating panel, beside the base class", async () => {
      const panel = await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ panel: "gap-r3" }} />,
      );
      expect(panel.className).toContain("colorpicker-panel");
      expect(panel.className).toContain("gap-r3");
    });

    it("lands classNames.swatch on both swatches, beside the base class", async () => {
      const panel = await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ swatch: "rounded-none" }} />,
      );
      const onTrigger = trigger().querySelector(".colorpicker-swatch");
      const inPanel = panel.querySelector(".colorpicker-swatch");
      for (const swatch of [onTrigger, inPanel]) {
        expect(swatch?.getAttribute("class")).toContain("colorpicker-swatch");
        expect(swatch?.getAttribute("class")).toContain("rounded-none");
      }
      // The panel's is the `--lg` variant; the key names both, not one.
      expect(inPanel?.getAttribute("class")).toContain("colorpicker-swatch--lg");
    });

    it("lands classNames.value on the hex readout, beside the base class", () => {
      render(
        <ColorPicker defaultValue="#3366cc" classNames={{ value: "tabular-nums" }} />,
      );
      const value = trigger().querySelector(".colorpicker-trigger__value");
      expect(value?.getAttribute("class")).toContain("colorpicker-trigger__value");
      expect(value?.getAttribute("class")).toContain("tabular-nums");
    });

    it("lands classNames.plane on the saturation area, beside the base class", async () => {
      const panel = await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ plane: "h-40" }} />,
      );
      const plane = panel.querySelector(".colorpicker-sv");
      expect(plane?.getAttribute("class")).toContain("colorpicker-sv");
      expect(plane?.getAttribute("class")).toContain("h-40");
    });

    it("lands classNames.thumb on the plane handle, beside the base class", async () => {
      const panel = await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ thumb: "size-r3" }} />,
      );
      const thumb = panel.querySelector(".colorpicker-sv__thumb");
      expect(thumb?.getAttribute("class")).toContain("colorpicker-sv__thumb");
      expect(thumb?.getAttribute("class")).toContain("size-r3");
    });

    it("lands classNames.hue on the hue rail, beside the base class", async () => {
      await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ hue: "h-r3" }} />,
      );
      const hue = screen.getByLabelText("Hue");
      expect(hue.className).toContain("colorpicker-hue");
      expect(hue.className).toContain("h-r3");
    });

    it("lands classNames.hex on the hex field, beside the base class", async () => {
      await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ hex: "font-mono" }} />,
      );
      const hex = screen.getByLabelText("Hex value");
      expect(hex.className).toContain("colorpicker-hex");
      expect(hex.className).toContain("font-mono");
    });

    it("lands classNames.presets on the preset row, beside the base class", async () => {
      const panel = await openPanel(
        <ColorPicker
          defaultValue="#3366cc"
          presets={["#ff0000", "#00ff00"]}
          classNames={{ presets: "gap-r3" }}
        />,
      );
      const presets = panel.querySelector(".colorpicker-presets");
      expect(presets?.getAttribute("class")).toContain("colorpicker-presets");
      expect(presets?.getAttribute("class")).toContain("gap-r3");
    });

    it("lands classNames.preset on every preset button, beside the base class", async () => {
      const panel = await openPanel(
        <ColorPicker
          defaultValue="#3366cc"
          presets={["#ff0000", "#00ff00"]}
          classNames={{ preset: "rounded-none" }}
        />,
      );
      const buttons = panel.querySelectorAll(".colorpicker-preset");
      expect(buttons).toHaveLength(2);
      for (const button of buttons) {
        expect(button.getAttribute("class")).toContain("colorpicker-preset");
        expect(button.getAttribute("class")).toContain("rounded-none");
      }
    });

    /**
     * This used to assert each class attribute equalled its marker exactly,
     * which stopped being expressible once the elements carried their own
     * utilities. The falsifiers are unchanged and are what the equality was ever
     * standing in for: an absent slot appends **nothing** — no `undefined`, no
     * `null`, no empty token — and every marker survives.
     */
    it("leaves every internal on its base classes alone when no slot is passed", async () => {
      const panel = await openPanel(
        <ColorPicker defaultValue="#3366cc" presets={["#ff0000"]} />,
      );
      const markers = [
        "colorpicker-trigger__value",
        "colorpicker-sv",
        "colorpicker-sv__thumb",
        "colorpicker-hue",
        "colorpicker-presets",
        "colorpicker-preset",
      ];
      for (const marker of markers) {
        const el = marker === "colorpicker-trigger__value" ? trigger() : panel;
        const classes = el.querySelector(`.${marker}`)?.getAttribute("class") ?? "";
        expect(classes.split(" "), marker).toContain(marker);
        expect(classes, marker).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      }
      expect(panel.className.split(" ")).toContain("colorpicker-panel");
      const swatch =
        trigger().querySelector(".colorpicker-swatch")?.getAttribute("class") ?? "";
      expect(swatch.split(" ")).toContain("colorpicker-swatch");
      expect(swatch).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
    });

    it("does not put a slot class on the wrapper className addresses", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ColorPicker
          defaultValue="#3366cc"
          className="w-40"
          classNames={{ trigger: "px-r3", panel: "gap-r3" }}
        />,
      );
      await user.click(trigger());

      const wrapper = container.firstElementChild;
      const classes = wrapper?.getAttribute("class") ?? "";
      expect(classes.split(" ")).toContain("colorpicker");
      // `className` still reaches the wrapper, and no slot does.
      expect(classes.split(" ")).toContain("w-40");
      expect(classes).not.toContain("px-r3");
      expect(classes).not.toContain("gap-r3");
    });

    /**
     * The `@ts-expect-error` is the assertion — an unknown slot key must stay a
     * compile error. It fails if TypeScript ever stops rejecting the key.
     */
    it("rejects an unknown slot key at compile time", () => {
      render(
        // @ts-expect-error — `control` is not a slot; the root takes `className`.
        <ColorPicker defaultValue="#3366cc" classNames={{ control: "px-r3" }} />,
      );
      expect(trigger().className).not.toContain("px-r3");
    });

    it("does not leak classNames onto the DOM", () => {
      const { container } = render(
        <ColorPicker defaultValue="#3366cc" classNames={{ trigger: "px-r3" }} />,
      );
      expect(container.firstElementChild?.hasAttribute("classnames")).toBe(false);
      expect(trigger().hasAttribute("classnames")).toBe(false);
    });

    /**
     * The pin on the two (a) rulings inside the panel: the axis inputs' class is
     * the visually-hidden clip that lets each axis be named and arrow-key
     * operable, and the hex row is the fixed two-child layout the panel is built
     * from. Neither has a route, and neither should.
     */
    it("leaves the clipped axis inputs and the hex row on their own classes only", async () => {
      const panel = await openPanel(
        <ColorPicker defaultValue="#3366cc" classNames={{ plane: "h-40" }} />,
      );
      for (const name of ["Saturation", "Brightness"]) {
        const classes = screen.getByLabelText(name).className;
        expect(classes.split(" "), name).toContain("colorpicker-sv__input");
        // The clip is the whole point of the (a) ruling — un-hiding these puts
        // two raw range controls across the picking surface.
        expect(classes.split(" "), name).toContain("sr-only");
        expect(classes, name).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      }
      const row = panel.querySelector(".colorpicker-row")?.getAttribute("class") ?? "";
      expect(row.split(" ")).toContain("colorpicker-row");
      expect(row).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
    });
  });
});
