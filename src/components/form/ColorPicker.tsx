"use client";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import {
  FloatingFocusManager,
  FloatingPortal,
  type Placement,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "../../hooks/use-floating";
import {
  focusOutlineResetButton,
  focusOutlineResetControl,
  focusRingButton,
  focusRingControl,
} from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

import {
  type Hsv,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from "./color";
import { useFieldError } from "./Field";

type ColorPickerProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (hex: string) => void;
  /**
   * Called with the committed canonical `#rrggbb` string — the same payload as
   * `onValueChange`, not a DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<string>("brand")}` binding
   * works: a JSX spread performs no excess-property check, so a closed props
   * type never stopped `field()` delivering `onChange` — it only stopped
   * TypeScript reporting it, and with no rest spread the handler was silently
   * swallowed, leaving a control that could never commit a value.
   */
  onChange?: (hex: string) => void;
  /** Swatches shown beneath the picker for one-click selection. */
  presets?: string[];
  placement?: Placement;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Accessible name for the floating editing panel. @default "Color picker" */
  panelLabel?: string;
  /**
   * Accessible name for the saturation/brightness group. Every label below is
   * an accessible name rather than visible text, so `""` does not remove the
   * word — it leaves the control unnamed.
   * @default "Saturation and brightness"
   */
  areaLabel?: string;
  /** Accessible name for the saturation axis. @default "Saturation" */
  saturationLabel?: string;
  /** Accessible name for the brightness axis. @default "Brightness" */
  brightnessLabel?: string;
  /** Accessible name for the hue rail. @default "Hue" */
  hueLabel?: string;
  /** Accessible name for the hex text field. @default "Hex value" */
  hexLabel?: string;
} & Omit<
  ComponentPropsWithRef<"button">,
  "value" | "defaultValue" | "onChange"
>;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** 0–1 axis position as the whole percent the axis's `<input type="range">` carries. */
const toPercent = (n: number) => Math.round(n * 100);

/**
 * Hex color picker with an HSV editing surface in a floating popover: a 2D
 * saturation/brightness area (drag or arrow-key), a hue rail, a hex text field,
 * and optional preset swatches. HSV is held internally so hue survives at the
 * greyscale extremes (where it can't be recovered from the hex), while the
 * committed value is always a canonical `#rrggbb` string.
 */
export const ColorPicker = forwardRef<HTMLButtonElement, ColorPickerProps>(
  function ColorPicker(
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      presets,
      placement = "bottom-start",
      error,
      disabled,
      className,
      "aria-label": ariaLabel = "Choose color",
      panelLabel = "Color picker",
      areaLabel = "Saturation and brightness",
      saturationLabel = "Saturation",
      brightnessLabel = "Brightness",
      hueLabel = "Hue",
      hexLabel = "Hex value",
      ...props
    },
    ref,
  ) {
    // Only `useControllableState` reads the raw prop; this ref is the mode
    // lock's one job here — keep feeding the hook a defined value once
    // controlled, so a later `value={undefined}` reads as the empty colour
    // rather than a mode switch (which would hand `undefined` to `hexToHsv`).
    const isControlledRef = useRef(value !== undefined);
    const [hex, setHex] = useControllableState<string>({
      value: isControlledRef.current
        ? (normalizeHex(value ?? "") ?? "#000000")
        : undefined,
      defaultValue: normalizeHex(defaultValue ?? "") ?? "#000000",
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
    });

    // HSV is the editing space, but never a second source of truth: `hsvMemory`
    // is the last edit, and it is believed only while it still describes the
    // committed hex. That keeps hue/saturation alive across the greyscale
    // extremes (where hex cannot carry them) while a hex that moves for any
    // other reason — a controlled prop, a preset, a parent refusing a commit —
    // wins outright.
    const [hsvMemory, setHsvMemory] = useState<Hsv>(() => hexToHsv(hex) ?? { h: 0, s: 0, v: 0 });
    const hsv = hsvToHex(hsvMemory) === hex ? hsvMemory : (hexToHsv(hex) ?? { h: 0, s: 0, v: 0 });

    const [open, setOpen] = useState(false);
    // The hex field's text derives from `hex`; `draft` is a transient override
    // holding what the user has typed, and `null` means "not typing".
    const [draft, setDraft] = useState<string | null>(null);
    const hexText = draft ?? hex;
    const svRef = useRef<HTMLDivElement>(null);
    const saturationRef = useRef<HTMLInputElement>(null);

    const { invalid, ariaProps } = useFieldError(error);

    const { refs, floatingStyles, context } = useFloating({
      placement,
      open,
      onOpenChange: setOpen,
    });
    const click = useClick(context, { enabled: !disabled });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "dialog" });
    const { getReferenceProps, getFloatingProps } = useInteractions([
      click,
      dismiss,
      role,
    ]);

    function commitHsv(next: Hsv) {
      setHsvMemory(next);
      setDraft(null);
      setHex(hsvToHex(next));
    }

    function commitHex(input: string) {
      setDraft(null); // an unparseable entry reverts by deriving from `hex`
      const normalized = normalizeHex(input);
      if (!normalized) return;
      const next = hexToHsv(normalized);
      if (next) setHsvMemory(next);
      setHex(normalized);
    }

    const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
    const saturationPercent = toPercent(hsv.s);
    const brightnessPercent = toPercent(hsv.v);

    // Presets the hex parser cannot read — a CSS colour name, an 8-digit hex —
    // paint a perfectly clickable swatch and then commit nothing. Drop them
    // rather than ship a dead control.
    const swatches = (presets ?? [])
      .map((preset) => normalizeHex(preset))
      .filter((hexValue): hexValue is string => hexValue != null);

    /* — saturation/brightness area pointer handling — */
    // There is deliberately no key handler here. Each axis is a real
    // `<input type="range">`, so the browser already owns arrows, Home, End,
    // Page Up and Page Down for the axis that holds focus; a second handler on
    // the container would move both axes on one press.
    function updateFromPointer(clientX: number, clientY: number) {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp01((clientX - rect.left) / rect.width);
      const v = 1 - clamp01((clientY - rect.top) / rect.height);
      commitHsv({ ...hsv, s, v });
    }

    function handleSvPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      if (disabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      // A drag has to leave the keyboard somewhere usable, and the axis inputs
      // are the only focusable things in the area. `preventDefault` first, or
      // the press's own default action focuses the nearest focusable ancestor
      // — the panel — a beat later and the arrow keys go nowhere. Measured in
      // Firefox; jsdom implements neither default, so no test here can see it.
      // `preventScroll` because the input is a clipped 1px box, not where the
      // user is looking.
      event.preventDefault();
      saturationRef.current?.focus({ preventScroll: true });
      updateFromPointer(event.clientX, event.clientY);
    }

    function handleSvPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      if (disabled) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      updateFromPointer(event.clientX, event.clientY);
    }

    // Rest props go to the trigger `<button>`, not the `.colorpicker` wrapper:
    // the type declares them as `<button>` props, the forwarded ref already
    // points there, and everything `field()` hands over — `name`, `onBlur`,
    // `aria-invalid`, `id` — only means anything on the focusable element that
    // owns the accessibility-tree node. `className` stays destructured and on
    // the wrapper, which is the layout box (same split as TagInput).
    //
    // Merged rather than spread: `field()` emits `"aria-invalid": undefined` on
    // every render, so a plain spread after `ariaProps` would delete the error
    // state the component computed. `mergeProps` lets the component win where it
    // has an opinion and the caller's survive where it does not.
    const triggerProps = mergeProps(props, {
      type: "button" as const,
      disabled,
      // The visible hex is the trigger's value; an `aria-label` replaces the
      // element's text outright, so the label has to carry it or the current
      // colour never reaches AT at all.
      "aria-label": `${ariaLabel} ${hex}`,
      // The ring is the shared button recipe, not a local rule: `focus.ts` keys
      // buttons on `:focus-visible` (which is what this trigger already did) and
      // paints ring only, never the border — so the invalid border survives
      // focus by construction rather than by a specificity tie-break.
      className: cn(
        "colorpicker-trigger duration-fast",
        focusOutlineResetButton,
        focusRingButton,
        invalid && "colorpicker-trigger--error",
      ),
      ...ariaProps,
    });

    return (
      <div className={cn("colorpicker", className)} data-disabled={disabled || undefined}>
        <button
          {...getReferenceProps({
            ...triggerProps,
            ref: mergeRefs(ref, refs.setReference),
          })}
        >
          <span
            className="colorpicker-swatch"
            style={{ backgroundColor: hex }}
            aria-hidden="true"
          />
          <span className="colorpicker-trigger__value">{hex}</span>
        </button>

        {open && (
          <FloatingPortal>
            {/* `initialFocus={-1}`: opening leaves focus on the trigger rather
                than moving it onto the first tabbable, which here is the
                Saturation slider — so the arrow key a user presses next would
                have committed a colour change they never asked for. Same call
                `DatePicker` and `DateRangePicker` make; the panel holds
                tabbable content, so the manager still gives it `tabindex="-1"`
                rather than making it a tab stop, and Tab from the trigger
                walks into it through the portal's focus guards. */}
            <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
              <div
                {...getFloatingProps({
                  ref: refs.setFloating,
                  className: "colorpicker-panel",
                  style: floatingStyles,
                  "aria-label": panelLabel,
                })}
              >
                {/* Saturation / brightness area. Two axes are two sliders: a
                    named `role="group"` holding one visually-hidden
                    `<input type="range">` per axis, which is the only shape
                    where each axis gets its own name, `aria-valuenow` and
                    bounds — a single `role="slider"` can carry exactly one
                    value, and carried none. The square is the pointer surface
                    and the thumb is presentational. */}
                <div
                  ref={svRef}
                  className="colorpicker-sv"
                  role="group"
                  aria-disabled={disabled || undefined}
                  aria-label={areaLabel}
                  style={{ "--hue": hueHex } as CSSProperties}
                  onPointerDown={handleSvPointerDown}
                  onPointerMove={handleSvPointerMove}
                >
                  <input
                    ref={saturationRef}
                    type="range"
                    className="colorpicker-sv__input"
                    min={0}
                    max={100}
                    step={1}
                    value={saturationPercent}
                    disabled={disabled}
                    aria-label={saturationLabel}
                    aria-valuetext={`${saturationPercent}%`}
                    onChange={(event) =>
                      commitHsv({ ...hsv, s: Number(event.target.value) / 100 })
                    }
                  />
                  <input
                    type="range"
                    className="colorpicker-sv__input"
                    min={0}
                    max={100}
                    step={1}
                    value={brightnessPercent}
                    disabled={disabled}
                    aria-label={brightnessLabel}
                    aria-valuetext={`${brightnessPercent}%`}
                    onChange={(event) =>
                      commitHsv({ ...hsv, v: Number(event.target.value) / 100 })
                    }
                  />
                  <span
                    className="colorpicker-sv__thumb"
                    aria-hidden="true"
                    style={{
                      left: `${hsv.s * 100}%`,
                      top: `${(1 - hsv.v) * 100}%`,
                      backgroundColor: hex,
                    }}
                  />
                </div>

                {/* Hue rail */}
                <input
                  type="range"
                  className="colorpicker-hue"
                  min={0}
                  max={360}
                  step={1}
                  value={Math.round(hsv.h)}
                  disabled={disabled}
                  aria-label={hueLabel}
                  onChange={(event) =>
                    commitHsv({ ...hsv, h: Number(event.target.value) })
                  }
                />

                {/* Hex field */}
                <div className="colorpicker-row">
                  <span
                    className="colorpicker-swatch colorpicker-swatch--lg"
                    style={{ backgroundColor: hex }}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    // The border is a utility rather than a rule in
                    // `ColorPicker.css` so that `focusRingControl`'s border
                    // swap can reach it: this package's stylesheets are
                    // unlayered, and unlayered CSS outranks every Tailwind
                    // utility whatever the specificity.
                    className={cn(
                      "colorpicker-hex duration-fast",
                      "border border-border-strong",
                      focusOutlineResetControl,
                      focusRingControl,
                    )}
                    aria-label={hexLabel}
                    spellCheck={false}
                    value={hexText}
                    disabled={disabled}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={(event) => commitHex(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitHex((event.target as HTMLInputElement).value);
                      }
                    }}
                  />
                </div>

                {/* Presets */}
                {swatches.length > 0 && (
                  <div className="colorpicker-presets">
                    {swatches.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        className="colorpicker-preset"
                        aria-label={swatch}
                        aria-pressed={swatch === hex}
                        disabled={disabled}
                        data-active={swatch === hex ? "" : undefined}
                        style={{ backgroundColor: swatch }}
                        onClick={() => commitHex(swatch)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </div>
    );
  },
);
