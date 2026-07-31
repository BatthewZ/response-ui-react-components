"use client";
import { Search, X } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";

import { Input } from "./Input";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  size?: "sm" | "md";
  /** Accessible name for the clear button. */
  clearLabel?: string;
  /**
   * Applied to the positioning wrapper, not the `<input>` — the wrapper is the
   * layout box that holds the icon and the clear button. Everything else
   * (`style`, `id`, `data-*`, handlers) lands on the `<input>`.
   */
  className?: string;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * wrapper (see above), so these three reach the parts inside it that no prop
   * otherwise addresses: the magnifier glyph, the `<input>` and the clear
   * button. The union is written out here so an unknown key is a type error
   * rather than a silently ignored one.
   *
   * Class strings only — `style`, handlers and `aria-*` still land on the
   * `<input>` through the rest props, which is what keeps `field()`'s `ref` and
   * the `id` guard below working.
   */
  classNames?: SlotClassNames<"icon" | "input" | "clear">;
  /**
   * Not a SearchInput prop — `value` is required, so a `defaultValue` beside it
   * is React's controlled/uncontrolled warning waiting to happen. Declared
   * `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check, and the destructure below keeps it off the element.
   */
  defaultValue?: never;
} & Omit<
  ComponentPropsWithRef<"input">,
  "onChange" | "value" | "defaultValue" | "type" | "size" | "className"
>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onChange,
      onClear,
      onKeyDown,
      placeholder = "Search...",
      size = "md",
      className,
      classNames,
      clearLabel = "Clear search",
      disabled,
      readOnly,
      id,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      // Omitted from the type, and destructured so a spread carrier cannot land
      // it either: `value` is required, so a `defaultValue` alongside it is
      // React's controlled/uncontrolled warning waiting to happen.
      defaultValue: _defaultValue,
      ...props
    },
    ref
  ) {
    const iconSize = size === "sm" ? 14 : 16;
    const innerRef = useRef<HTMLInputElement>(null);
    // Neither state may have its value wiped from under the user.
    const locked = disabled === true || readOnly === true;

    // A default name outranks an associated `<label for>`, silently discarding
    // a visible Label. Any sign the caller is naming the field themselves — an
    // explicit ARIA name, or an `id` for a `<label htmlFor>` to point at — and
    // the default stands aside.
    const named =
      ariaLabel !== undefined || ariaLabelledBy !== undefined || id !== undefined;

    function handleClear() {
      if (locked) return;
      onChange("");
      onClear?.();
      // The button is about to unmount. Move focus back to the field before it
      // goes, or it lands on <body> (WCAG 2.4.3).
      innerRef.current?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      // Only an Escape that actually clears something is consumed: an
      // already-empty field must let the press reach the dialog or command
      // palette around it, and must not emit a no-op change.
      if (e.key === "Escape" && !locked && value !== "") {
        e.preventDefault();
        e.stopPropagation();
        handleClear();
      }
      onKeyDown?.(e);
    }

    return (
      <div className={cn("search-input", className)}>
        <Search
          size={iconSize}
          className={cn("search-input__icon", classNames?.icon)}
          aria-hidden="true"
        />
        <Input
          ref={mergeRefs(ref, innerRef)}
          type="search"
          id={id}
          aria-label={named ? ariaLabel : "Search"}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "search-input__input",
            size === "sm" && "search-input__input--sm",
            classNames?.input
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            className={cn("search-input__clear", classNames?.clear)}
            onClick={handleClear}
            disabled={locked}
            aria-label={clearLabel}
          >
            <X size={iconSize} />
          </button>
        )}
      </div>
    );
  }
);
