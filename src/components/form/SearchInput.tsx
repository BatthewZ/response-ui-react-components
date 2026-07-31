"use client";
import { Search, X } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";

import { Input } from "./Input";

/**
 * The clear button. Preflight already gives a `<button>` `padding: 0`,
 * `border: 0 solid` and `background-color: transparent` — the same rules
 * `Button.tsx` relies on and carries no reset for — so none of those are
 * restated here.
 *
 * `hover:` compiles to `@media (hover: hover) { &:hover }`, so the hover tint no
 * longer fires on a coarse pointer. That matches the rest of the package.
 *
 * Nothing here resets the UA outline, so `verify:focus-affordance` has no reset
 * to pair: the `focus-visible:outline-*` triple replaces the browser's ring
 * rather than removing it.
 */
const clearClasses =
  "search-input__clear absolute right-2 inline-flex items-center justify-center size-6 rounded-sm text-fg-muted cursor-pointer transition-colors duration-[var(--MOTION-DURATION-ENTER)] ease-[var(--MOTION-EASE-ENTER)] motion-reduce:transition-none hover:text-fg-primary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-1";

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
      <div className={cn("search-input relative inline-flex w-full items-center", className)}>
        <Search
          size={iconSize}
          className={cn(
            "search-input__icon absolute left-3 text-fg-muted pointer-events-none",
            classNames?.icon
          )}
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
          // The geometry is utilities rather than rules in `SearchInput.css`,
          // and has to be: this package's CSS is in `@layer components`, which
          // Tailwind orders BELOW `@layer utilities`, so a `padding-left` there
          // loses to the `px-r4` of `Input`'s own recipe at equal specificity —
          // the gutters never applied and the placeholder sat under the
          // magnifier. The `sm` type and vertical padding lost to `text-body-2`
          // and `py-r5` the same way, which left `sm` the same height as `md`.
          // `px-*` is one class group, so tw-merge drops `px-r4` outright
          // instead of leaving both to source order. `classNames.input` stays
          // last, so a caller's own `px-*` still wins.
          className={cn(
            "search-input__input px-[2.25rem]",
            size === "sm" &&
              "search-input__input--sm px-[2rem] py-r6 text-body-3",
            classNames?.input
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            className={cn(clearClasses, classNames?.clear)}
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
