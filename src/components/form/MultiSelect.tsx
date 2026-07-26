"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { useControllableState } from "../../hooks/use-controllable-state";
import {
  FloatingPortal,
  type Placement,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "../../hooks/use-floating";
import { cn } from "../../util/style";

import { useFieldError } from "./Field";

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type MultiSelectProps = {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * Called with the selected values — the same payload as `onValueChange`, not a
   * DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<string[]>("picks")}` binding
   * works: a JSX spread performs no excess-property check, so `Omit`ting
   * `onChange` never stopped `field()` delivering it — it only stopped
   * TypeScript reporting it, and the rest spread then landed it on the wrapper
   * `<div>`, where React's delegated change event from the inner search input
   * wrote a query string into the array-typed field.
   */
  onChange?: (value: string[]) => void;
  placeholder?: string;
  /** Whether the listbox is open. Controlled — pair with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Show an inline text filter inside the control. @default true */
  searchable?: boolean;
  /** Cap the number of selectable items. Reaching it disables unselected options. */
  maxItems?: number;
  error?: boolean;
  disabled?: boolean;
  placement?: Placement;
  className?: string;
  "aria-label"?: string;
} & Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "defaultValue" | "children"
>;

/**
 * Multi-select-from-options: a chip-filled control that opens a floating
 * listbox of toggleable options. Selecting keeps the menu open (multi-select),
 * a search box filters the list, Backspace on an empty query peels off the last
 * chip, and full keyboard navigation comes from the same floating-ui wiring the
 * single-select Combobox uses.
 *
 * Unlike `Combobox` (free-form, filter-agnostic, single value) this is a closed
 * set of `options` with an array value — the everyday "pick several tags /
 * categories / people" control.
 */
export const MultiSelect = forwardRef<HTMLDivElement, MultiSelectProps>(
  function MultiSelect(
    {
      options,
      value,
      defaultValue,
      onValueChange,
      onChange,
      placeholder = "Select…",
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      searchable = true,
      maxItems,
      error,
      disabled,
      placement = "bottom-start",
      className,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) {
    const [selected, setSelected] = useControllableState<string[]>({
      value,
      defaultValue: defaultValue ?? [],
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
    });

    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const toggleRef = useRef<HTMLSpanElement>(null);
    const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
    // Set when a chip removes itself, so focus can land on its successor once
    // React has re-rendered without it.
    const pendingChipFocus = useRef<number | null>(null);
    const listRef = useRef<(HTMLElement | null)[]>([]);
    const listboxId = useId();
    const idBase = useId();

    const { invalid, ariaProps } = useFieldError(error);

    const { refs, floatingStyles, context } = useFloating({
      placement,
      open,
      onOpenChange: (next) => {
        setOpen(next);
        if (!next) setQuery("");
      },
    });

    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "listbox" });
    const listNavigation = useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      virtual: true,
      loop: true,
    });

    const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
      dismiss,
      role,
      listNavigation,
    ]);

    const atMax = maxItems !== undefined && selected.length >= maxItems;

    const filtered = useMemo(() => {
      if (!searchable || query === "") return options;
      const q = query.toLowerCase();
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query, searchable]);

    const labelOf = useMemo(() => {
      const map = new Map<string, string>();
      for (const o of options) map.set(o.value, o.label);
      return map;
    }, [options]);

    function toggle(optionValue: string) {
      if (selected.includes(optionValue)) {
        setSelected(selected.filter((v) => v !== optionValue));
      } else {
        if (atMax) return;
        setSelected([...selected, optionValue]);
      }
      // A committed choice consumes the search text — clear it so the list
      // resets to the full set and the next query starts fresh. (The early
      // `atMax` return above keeps the query when nothing was actually added.)
      setQuery("");
      setActiveIndex(null);
    }

    function removeAt(index: number) {
      setSelected(selected.filter((_, i) => i !== index));
    }

    /**
     * Remove a chip from its own remove button. The button is about to unmount,
     * so name its successor now — otherwise focus falls to `<body>`.
     */
    function removeChipAt(index: number) {
      pendingChipFocus.current = index;
      removeAt(index);
    }

    useEffect(() => {
      const index = pendingChipFocus.current;
      if (index == null) return;
      pendingChipFocus.current = null;
      const successor = chipRefs.current[index] ?? chipRefs.current[index - 1];
      const target = successor && !successor.disabled ? successor : inputRef.current;
      target?.focus();
    }, [selected]);

    function handleFocusOut(event: React.FocusEvent<HTMLDivElement>) {
      const next = event.relatedTarget;
      if (
        next instanceof Node &&
        (event.currentTarget.contains(next) ||
          refs.floating.current?.contains(next))
      ) {
        return;
      }
      setOpen(false);
    }

    function optionId(index: number) {
      return `${idBase}-option-${index}`;
    }

    const activeOptionId =
      open && activeIndex != null ? optionId(activeIndex) : undefined;

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.defaultPrevented) return;
      if (event.key === "ArrowDown" && !open) {
        setOpen(true);
        return;
      }
      if (event.key === "Enter" && open) {
        // Enter belongs to the open listbox whether or not an option is
        // highlighted; letting it through submits the surrounding form instead.
        event.preventDefault();
        const option = activeIndex == null ? undefined : filtered[activeIndex];
        if (option && !option.disabled) toggle(option.value);
        return;
      }
      if (
        event.key === "Backspace" &&
        query === "" &&
        selected.length > 0
      ) {
        event.preventDefault();
        removeAt(selected.length - 1);
      }
    }

    return (
      <div
        ref={ref}
        className={cn("multiselect", className)}
        data-disabled={disabled || undefined}
        {...props}
      >
        <div
          // The whole control is the floating anchor, but the ARIA combobox +
          // interaction props live on the input — putting `getReferenceProps`
          // on the input keeps a single combobox role and matches the sibling
          // Combobox wiring. The panel is content-sized off this anchor, not
          // stretched to its width.
          ref={refs.setReference}
          className={cn(
            "multiselect-control",
            invalid && "multiselect-control--error",
          )}
          // Lets CSS collapse the idle text input when chips are present (so it
          // isn't an empty row beneath the tags) until the control is focused.
          data-has-selection={selected.length > 0 ? "" : undefined}
          // Pressing the control's own chrome — padding, the chip row, the
          // chevron — must not pull focus off the input, or the focus-out below
          // would shut the listbox before the click that toggles it lands.
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest("input, button")) return;
            event.preventDefault();
          }}
          onClick={(event) => {
            if (disabled) return;
            // The chevron is the control's open/close affordance; the rest of
            // the box only ever opens, the way a text field does.
            if (
              event.target instanceof Node &&
              toggleRef.current?.contains(event.target)
            ) {
              setOpen(!open);
            } else if (!open) {
              setOpen(true);
            }
            inputRef.current?.focus();
          }}
          onBlur={handleFocusOut}
        >
          <div className="multiselect-tags">
            {selected.map((v, index) => (
              <span key={`${index}:${v}`} className="multiselect-tag">
                {labelOf.get(v) ?? v}
                <button
                  type="button"
                  ref={(node) => {
                    chipRefs.current[index] = node;
                  }}
                  aria-label={`Remove ${labelOf.get(v) ?? v}`}
                  className="multiselect-tag__remove"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeChipAt(index);
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              {...getReferenceProps({
                ref: inputRef,
                type: "text",
                role: "combobox",
                // `id` and `aria-labelledby` name and address the combobox
                // itself, so they belong on the input rather than on the
                // wrapper the rest spread lands on.
                id,
                "aria-expanded": open,
                // The listbox is only in the document while open; an IDREF to a
                // node that is not there resolves to nothing.
                "aria-controls": open ? listboxId : undefined,
                // Nothing is filtered when the control is not searchable — the
                // input is read-only and the option set never narrows.
                "aria-autocomplete": searchable ? "list" : "none",
                "aria-activedescendant": activeOptionId,
                "aria-label": ariaLabel,
                "aria-labelledby": ariaLabelledBy,
                className: "multiselect-input",
                disabled,
                readOnly: !searchable,
                value: query,
                // Always carry a placeholder so the CSS `:placeholder-shown`
                // check can distinguish an empty input from one holding a
                // half-typed query. When chips are present the real placeholder
                // would clutter the row, so use a blank space — it renders
                // invisibly but still keeps `:placeholder-shown` meaningful, so
                // a half-typed query stays visible after focus leaves.
                placeholder: selected.length === 0 ? placeholder : " ",
                ...ariaProps,
                onChange(event: React.ChangeEvent<HTMLInputElement>) {
                  setQuery(event.target.value);
                  if (!open) setOpen(true);
                },
                onKeyDown: handleKeyDown,
              })}
            />
          </div>
          <span className="multiselect-toggle" aria-hidden="true" ref={toggleRef}>
            <ChevronDown size={16} />
          </span>
        </div>

        {open && (
          <FloatingPortal>
            <div
              {...getFloatingProps({
                ref: refs.setFloating,
                id: listboxId,
                role: "listbox",
                "aria-multiselectable": true,
                className: "multiselect-content",
                style: floatingStyles,
                // Options are plain divs, so pressing one would otherwise pull
                // focus off the combobox input and read as a focus-out.
                onMouseDown(event: React.MouseEvent) {
                  event.preventDefault();
                },
              })}
            >
              {filtered.length === 0 ? (
                <div className="multiselect-empty" role="presentation">
                  No options
                </div>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = selected.includes(option.value);
                  const isDisabled =
                    option.disabled || (!isSelected && atMax) || disabled;
                  return (
                    <div
                      key={option.value}
                      ref={(node) => {
                        listRef.current[index] = node;
                      }}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled || undefined}
                      data-active={index === activeIndex ? "" : undefined}
                      data-selected={isSelected ? "" : undefined}
                      className="multiselect-item"
                      {...getItemProps({
                        onClick() {
                          if (isDisabled) return;
                          toggle(option.value);
                          inputRef.current?.focus();
                        },
                      })}
                    >
                      <span className="multiselect-item__check" aria-hidden="true">
                        {isSelected && <Check size={14} />}
                      </span>
                      {option.label}
                    </div>
                  );
                })
              )}
            </div>
          </FloatingPortal>
        )}
      </div>
    );
  },
);
