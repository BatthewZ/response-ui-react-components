"use client";
import {
  type CSSProperties,
  forwardRef,
  useEffect,
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
  /** Swatches shown beneath the picker for one-click selection. */
  presets?: string[];
  placement?: Placement;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

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
      presets,
      placement = "bottom-start",
      error,
      disabled,
      className,
      "aria-label": ariaLabel = "Choose color",
    },
    ref,
  ) {
    const [hex, setHex] = useControllableState<string>({
      value: value !== undefined ? (normalizeHex(value) ?? "#000000") : undefined,
      defaultValue: normalizeHex(defaultValue ?? "") ?? "#000000",
      onChange: onValueChange,
    });

    // HSV is the editing space; seed it from the initial hex once, then keep it
    // as the source of truth so dragging through grey/black doesn't lose hue.
    const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(hex) ?? { h: 0, s: 0, v: 0 });
    const lastHexRef = useRef(hex);

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(hex);
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

    // Re-seed HSV + draft when the committed hex changes from the OUTSIDE (a
    // controlled prop update or preset/hex-field edit), but not from our own
    // HSV-driven commits — those already match and would clobber hue at s/v=0.
    useEffect(() => {
      if (hex !== lastHexRef.current) {
        const next = hexToHsv(hex);
        if (next) setHsv(next);
        lastHexRef.current = hex;
        setDraft(hex);
      }
    }, [hex]);

    function commitHsv(next: Hsv) {
      setHsv(next);
      const nextHex = hsvToHex(next);
      lastHexRef.current = nextHex;
      setDraft(nextHex);
      setHex(nextHex);
    }

    function commitHex(input: string) {
      const normalized = normalizeHex(input);
      if (!normalized) {
        setDraft(hex); // revert invalid input
        return;
      }
      const next = hexToHsv(normalized);
      if (next) setHsv(next);
      lastHexRef.current = normalized;
      setDraft(normalized);
      setHex(normalized);
    }

    const currentHex = hsvToHex(hsv);
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

    return (
      <div className={cn("colorpicker", className)} data-disabled={disabled || undefined}>
        <button
          {...getReferenceProps({
            // eslint-disable-next-line react-hooks/refs -- mergeRefs defers ref assignment to the returned callback
            ref: mergeRefs(ref, refs.setReference),
            type: "button",
            disabled,
            "aria-label": ariaLabel,
            className: cn(
              "colorpicker-trigger",
              invalid && "colorpicker-trigger--error",
            ),
            ...ariaProps,
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
                  // eslint-disable-next-line react-hooks/refs -- floating-ui's setFloating is a stable ref-setter assigned via the prop getter
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
                      backgroundColor: currentHex,
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
                    value={draft}
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
