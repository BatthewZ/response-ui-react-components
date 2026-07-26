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
} & Omit<
  ComponentPropsWithRef<"button">,
  "value" | "defaultValue" | "onChange"
>;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/**
 * Hex color picker with an HSV editing surface in a floating popover: a 2D
 * saturation/value square (drag or arrow-key), a hue rail, a hex text field,
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
      ...props
    },
    ref,
  ) {
    const [hex, setHex] = useControllableState<string>({
      value: value !== undefined ? (normalizeHex(value) ?? "#000000") : undefined,
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

    /* — saturation/value square pointer handling — */
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
      updateFromPointer(event.clientX, event.clientY);
    }

    function handleSvPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      if (disabled) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      updateFromPointer(event.clientX, event.clientY);
    }

    function handleSvKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      const stepS = 0.02;
      const stepV = 0.02;
      let { s, v } = hsv;
      switch (event.key) {
        case "ArrowLeft":
          s = clamp01(s - stepS);
          break;
        case "ArrowRight":
          s = clamp01(s + stepS);
          break;
        case "ArrowUp":
          v = clamp01(v + stepV);
          break;
        case "ArrowDown":
          v = clamp01(v - stepV);
          break;
        default:
          return;
      }
      event.preventDefault();
      commitHsv({ ...hsv, s, v });
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
      "aria-label": ariaLabel,
      className: cn(
        "colorpicker-trigger",
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
            <FloatingFocusManager context={context} modal={false}>
              <div
                {...getFloatingProps({
                  ref: refs.setFloating,
                  className: "colorpicker-panel",
                  style: floatingStyles,
                })}
              >
                {/* Saturation / value square */}
                <div
                  ref={svRef}
                  className="colorpicker-sv"
                  role="slider"
                  tabIndex={0}
                  aria-label="Saturation and brightness"
                  aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
                  style={{ "--hue": hueHex } as CSSProperties}
                  onPointerDown={handleSvPointerDown}
                  onPointerMove={handleSvPointerMove}
                  onKeyDown={handleSvKeyDown}
                >
                  <span
                    className="colorpicker-sv__thumb"
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
                  aria-label="Hue"
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
                    className="colorpicker-hex"
                    aria-label="Hex value"
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
                {presets && presets.length > 0 && (
                  <div className="colorpicker-presets">
                    {presets.map((preset) => {
                      const normalized = normalizeHex(preset) ?? preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          className="colorpicker-preset"
                          aria-label={normalized}
                          aria-pressed={normalized === hex}
                          data-active={normalized === hex ? "" : undefined}
                          style={{ backgroundColor: normalized }}
                          onClick={() => commitHex(preset)}
                        />
                      );
                    })}
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
