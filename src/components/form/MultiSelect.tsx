"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
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
      searchable = true,
      maxItems,
      error,
      disabled,
      placement = "bottom-start",
      className,
      "aria-label": ariaLabel,
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
      defaultValue: false,
    });
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
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
      if (event.key === "Enter" && open && activeIndex != null) {
        const option = filtered[activeIndex];
        if (option && !option.disabled) {
          event.preventDefault();
          toggle(option.value);
        }
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
          // The whole control is the floating anchor (so the menu spans its
          // width), but the ARIA combobox + interaction props live on the input
          // — putting `getReferenceProps` on the input keeps a single combobox
          // role and matches the sibling Combobox wiring.
          ref={refs.setReference}
          className={cn(
            "multiselect-control",
            invalid && "multiselect-control--error",
          )}
          // Lets CSS collapse the idle text input when chips are present (so it
          // isn't an empty row beneath the tags) until the control is focused.
          data-has-selection={selected.length > 0 ? "" : undefined}
          onClick={() => {
            if (disabled) return;
            if (!open) setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <div className="multiselect-tags">
            {selected.map((v, index) => (
              <span key={v} className="multiselect-tag">
                {labelOf.get(v) ?? v}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Remove ${labelOf.get(v) ?? v}`}
                  className="multiselect-tag__remove"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeAt(index);
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
                "aria-expanded": open,
                "aria-controls": listboxId,
                "aria-autocomplete": "list",
                "aria-activedescendant": activeOptionId,
                "aria-label": ariaLabel,
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
          <span className="multiselect-toggle" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </div>

        {open && (
          <FloatingPortal>
            <div
              {...getFloatingProps({
                // eslint-disable-next-line react-hooks/refs -- floating-ui's setFloating is a stable ref-setter assigned via the prop getter
                ref: refs.setFloating,
                id: listboxId,
                role: "listbox",
                "aria-multiselectable": true,
                className: "multiselect-content",
                style: floatingStyles,
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
