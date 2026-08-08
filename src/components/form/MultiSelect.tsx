"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
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
import { focusRingWithin, focusRingWithinError } from "../../util/focus";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";

import { useFieldError } from "./Field";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `MultiSelect.css` is gone; everything this component draws is here. Each
 * constant is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually and a composed
 * one would not resolve.
 *
 * Nothing below re-states Tailwind Preflight. The deleted stylesheet carried
 * `font: inherit` twice; neither survived the check. On `.multiselect-input` it
 * was Preflight's own declaration for `button, input, select, optgroup,
 * textarea`, and on `.multiselect-item` — a plain `<div>` — it was a no-op,
 * because every longhand of the `font` shorthand is inherited and nothing in
 * this package sets one on that element. The chip remove button's `padding: 0`,
 * `border: none`, `background: none` and the input's `border: none` /
 * `background: transparent` are Preflight's `*` and `button, input, …` rules —
 * the same ones `Button.tsx` relies on and carries no reset for.
 */
const controlClasses =
  "flex w-full items-center gap-2 min-h-10 px-r4 py-r5 bg-surface-0 border border-border-strong rounded-md cursor-text";

const tagsClasses = "flex flex-auto flex-wrap items-center gap-1.5 min-w-0";

const tagClasses =
  "inline-flex items-center gap-1 py-0.5 pr-1 pl-2 text-body-3 font-semibold leading-[1.4] text-fg-secondary bg-surface-2 rounded-sm";

const tagRemoveClasses =
  "inline-flex items-center justify-center rounded-sm text-fg-muted cursor-pointer hover:text-fg-primary disabled:cursor-not-allowed";

/**
 * The input grows into whatever space is left on the chip row but asks for
 * almost nothing of its own, so it stays inline beside the chips instead of
 * wrapping onto an empty second row. It only wraps once the chip row is
 * genuinely full — at which point a full-width input row is the correct outcome.
 *
 * The three `in-[…]:placeholder-shown:` classes collapse the idle input
 * width-only (not padding — that shifts the control's height on focus) so it
 * tucks beside the chips. `:placeholder-shown` is what keeps a half-typed query
 * visible. That is one class per declaration where the stylesheet had one rule
 * for three, which is the stated cost of moving a compound selector; the
 * ancestor test is written out because the state lives on the control `<div>`,
 * not on the input.
 */
const inputClasses =
  "flex-[1_1_2rem] min-w-8 py-1 text-body-2 text-fg-primary outline-none placeholder:text-fg-muted read-only:cursor-pointer disabled:cursor-not-allowed in-[[data-has-selection]:not(:focus-within)]:placeholder-shown:flex-none in-[[data-has-selection]:not(:focus-within)]:placeholder-shown:min-w-0 in-[[data-has-selection]:not(:focus-within)]:placeholder-shown:w-0";

const toggleClasses = "inline-flex flex-none items-center justify-center text-fg-secondary";

const contentClasses =
  "bg-surface-0 border border-border-default rounded-md shadow-lg py-1 min-w-45 max-h-64 overflow-y-auto z-40 outline-none";

/**
 * Virtual focus: DOM focus stays on the input, so `:focus-visible` never matches
 * an option and the keyboard cursor is drawn from `data-active` instead. The
 * recessed wash reads at 1.08–1.21:1 against the rung-0 listbox fill — enough to
 * be seen, still short of the 3:1 a non-text cue has to clear on its own — so the
 * ring carries the cue and the wash reinforces it.
 *
 * `data-active:outline-solid` is not decoration. `outline-none` above writes
 * `--tw-outline-style: none`, and every `outline-<width>` utility reads that
 * property back rather than setting a style of its own — so without the fourth
 * class `data-active:outline-2` computes `outline-style: none` and the ring
 * paints nothing.
 */
const itemClasses =
  "flex w-full items-center gap-2 px-3 py-1.5 text-body-2 text-fg-primary cursor-pointer outline-none text-left data-active:bg-surface-2 data-active:outline-2 data-active:outline-solid data-active:outline-border-focus data-active:-outline-offset-2 data-selected:font-semibold aria-disabled:text-fg-muted aria-disabled:cursor-not-allowed";

/** Fixed-width check gutter keeps labels aligned whether or not selected. */
const itemCheckClasses =
  "inline-flex flex-none items-center justify-center size-3.5 text-accent";

const emptyClasses = "px-3 py-2 text-body-2 text-fg-muted";

export interface MultiSelectItem {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * What the root hands its children function: its **own** filtered option list
 * and the resolved selection. Both are derived from `options`, so mapping them
 * is the only way to reach a row — the consumer never authors one.
 */
export interface MultiSelectRenderArgs {
  /** The root's filtered list, in `options` order. Map it; do not build it. */
  options: MultiSelectItem[];
  /** The current selection, in the order values were added, with labels resolved. */
  selected: { value: string; label: string }[];
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface MultiSelectContextValue {
  open: boolean;
  disabled: boolean | undefined;
  selected: string[];
  labelOf: Map<string, string>;
  /** Position of an option in the root's filtered list, keyed by value. */
  indexOfValue: Map<string, number>;
  /**
   * The root's own filtered list. `MultiSelect.Item` reads a row's state from
   * here rather than from the `option` it was handed, so the object a consumer
   * passes is an **address** and never a data channel — the same relationship
   * `CommandPalette.Item` gets from `RowContext`.
   */
  filtered: MultiSelectItem[];
  activeIndex: number | null;
  atMax: boolean;
  listboxId: string;
  optionId: (index: number) => string;
  listRef: React.RefObject<(HTMLElement | null)[]>;
  chipRefs: React.RefObject<(HTMLButtonElement | null)[]>;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  /**
   * Where the listbox is portalled — the nearest `<dialog>` ancestor of the
   * trigger, or `undefined` for `<body>`. See `useFloating`.
   */
  portalRoot: ReturnType<typeof useFloating>["portalRoot"];

  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  getItemProps: ReturnType<typeof useInteractions>["getItemProps"];
  toggle: (value: string) => void;
  removeChipAt: (index: number) => void;
  focusInput: () => void;
}

const MultiSelectContext = createContext<MultiSelectContextValue | null>(null);

function useMultiSelectContext(component: string): MultiSelectContextValue {
  const ctx = useContext(MultiSelectContext);
  if (!ctx) {
    throw new Error(`${component} must be used within a MultiSelect`);
  }
  return ctx;
}

/** Set by `MultiSelect.Item` so the indicator knows which row it is in. */
const ItemContext = createContext<{ selected: boolean } | null>(null);

/** Set by `MultiSelect.Tag` so the remove button knows which chip it belongs to. */
const TagContext = createContext<{ index: number } | null>(null);

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

type MultiSelectProps = {
  options: MultiSelectItem[];
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
  /**
   * Composes the chips and the listbox. Optional: omitted, the root renders the
   * standard tree.
   *
   * It is a **function**, and the list it receives is the root's own filtered
   * one — `options` stays the single writer of the data and this is the single
   * writer of the presentation. `MultiSelect.Item` is legal only inside it, and
   * only for an option that came out of it.
   */
  children?: (args: MultiSelectRenderArgs) => ReactNode;
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
  /**
   * Class overrides for the internals the root renders. `className` is the root,
   * and the chips, rows, indicator and empty row are reached through the
   * subcomponents instead — so the slots are the four elements a consumer can
   * only restyle: the bordered box, the chip row, the search field and the
   * chevron. The union is written out here so an unknown key is a type error
   * rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"control" | "list" | "input" | "chevron">;
  "aria-label"?: string;
} & Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "defaultValue" | "children"
>;

/**
 * Multi-select-from-options: a tag-filled control that opens a floating
 * listbox of toggleable options. Selecting keeps the menu open (multi-select),
 * a search box filters the list, Backspace on an empty query peels off the last
 * tag, and full keyboard navigation comes from the same floating-ui wiring the
 * single-select Combobox uses.
 *
 * Unlike `Combobox` (free-form, filter-agnostic, single value) this is a closed
 * set of `options` with an array value — the everyday "pick several tags /
 * categories / people" control. `options` is also what makes it a compound with
 * one writer: `children` is a function the root calls over the list it has
 * already filtered, so a consumer restyles and re-contents the tree without ever
 * supplying an entry of it.
 */
const MultiSelectRoot = forwardRef<HTMLDivElement, MultiSelectProps>(
  function MultiSelect(
    {
      options,
      value,
      defaultValue,
      onValueChange,
      onChange,
      children,
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
      classNames,
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

    const { refs, floatingStyles, context, portalRoot } = useFloating({
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

    // Keyboard navigation, `aria-activedescendant` and the listRef registration
    // are all indexed on this list, so a row's index is looked up here rather
    // than passed in: a consumer mapping `filtered` cannot mis-number a row, and
    // an option that did not come out of `filtered` has no index to find.
    const indexOfValue = useMemo(() => {
      const map = new Map<string, number>();
      filtered.forEach((o, index) => map.set(o.value, index));
      return map;
    }, [filtered]);

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

    const optionId = useCallback(
      (index: number) => `${idBase}-option-${index}`,
      [idBase],
    );

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

    const ctx: MultiSelectContextValue = {
      open,
      disabled,
      selected,
      labelOf,
      indexOfValue,
      filtered,
      activeIndex,
      atMax,
      listboxId,
      optionId,
      listRef,
      chipRefs,
      portalRoot,
      refs,
      floatingStyles,
      getFloatingProps,
      getItemProps,
      toggle,
      removeChipAt,
      focusInput: () => inputRef.current?.focus(),
    };

    const renderArgs: MultiSelectRenderArgs = {
      options: filtered,
      selected: selected.map((v) => ({ value: v, label: labelOf.get(v) ?? v })),
    };

    return (
      <MultiSelectContext.Provider value={ctx}>
        <div
          ref={ref}
          className={cn("multiselect relative w-full", className)}
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
              controlClasses,
              // The wrapper-ring recipe, and the reason `src/util/focus.ts` has
              // one: the box is not itself focusable, so `:focus-within` is the
              // mechanism. The stylesheet needed a third rule
              // (`.multiselect-control--error:focus-within`) to stop focus
              // repainting the invalid border, because base and modifier tied at
              // one class each. Here the error recipe is simply passed last and
              // `cn()`'s tailwind-merge resolves the pair at the call site, so
              // the tie-break rule has nothing left to break.
              focusRingWithin,
              // A declaration-free marker now — the red border and ring are the
              // recipe below it. Kept because a consumer stylesheet, a devtools
              // search and the Astro/Rails consumers of `response-ui-css` all
              // select on it.
              invalid && "multiselect-control--error",
              invalid && focusRingWithinError,
              disabled && "bg-surface-3 cursor-not-allowed",
              classNames?.control,
            )}
            // Lets CSS collapse the idle text input when chips are present (so it
            // isn't an empty row beneath the tags) until the control is focused.
            data-has-selection={selected.length > 0 ? "" : undefined}
            // Pressing the control's own chrome — padding, the chip row, the
            // chevron — must not pull focus off the input, or the focus-out below
            // would shut the listbox before the click that toggles it lands.
            onMouseDown={(event) => {
              // `MultiSelect.Content` is declared inside this box and portals
              // out, so React still routes the listbox's events through here.
              // Only presses on the control itself are the control's.
              if (!event.currentTarget.contains(event.target as Node)) return;
              if ((event.target as HTMLElement).closest("input, button")) return;
              event.preventDefault();
            }}
            onClick={(event) => {
              if (disabled) return;
              if (!event.currentTarget.contains(event.target as Node)) return;
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
            <div className={cn("multiselect-tags", tagsClasses, classNames?.list)}>
              {(children ?? defaultChildren)(renderArgs)}
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
                  className: cn("multiselect-input", inputClasses, classNames?.input),
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
            <span
              className={cn("multiselect-toggle", toggleClasses, classNames?.chevron)}
              aria-hidden="true"
              ref={toggleRef}
            >
              <ChevronDown size={16} />
            </span>
          </div>
        </div>
      </MultiSelectContext.Provider>
    );
  },
);

/**
 * The tree the root renders when no children function is given. It is the same
 * composition a consumer writes, so the default and a custom tree cannot drift.
 */
function defaultChildren({ options, selected }: MultiSelectRenderArgs): ReactNode {
  return (
    <>
      {selected.map(({ value, label }, index) => (
        <Tag key={`${index}:${value}`} index={index}>
          {label}
          <TagRemove />
        </Tag>
      ))}
      <Content>
        {options.length === 0 ? (
          <Empty>No options</Empty>
        ) : (
          options.map((option) => (
            <Item key={option.value} option={option}>
              <ItemIndicator />
              {option.label}
            </Item>
          ))
        )}
      </Content>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

type MultiSelectContentProps = ComponentPropsWithRef<"div">;

/**
 * The subcomponents are declared under their compound key rather than a
 * `MultiSelect`-prefixed one: `MultiSelectItem` is the exported *data* type, and
 * one identifier per concept is the point of the harmonised name. Each keeps a
 * prefixed function name, which is what devtools shows.
 */
const Content = forwardRef<HTMLDivElement, MultiSelectContentProps>(
  function MultiSelectContent({ children, className, style, ...props }, ref) {
    const { open, refs, floatingStyles, getFloatingProps, listboxId, portalRoot } =
      useMultiSelectContext("MultiSelect.Content");

    if (!open) return null;

    return (
      <FloatingPortal root={portalRoot}>
        <div
          {...getFloatingProps({
            ref: mergeRefs(ref, refs.setFloating),
            id: listboxId,
            role: "listbox",
            "aria-multiselectable": true,
            className: cn("multiselect-content", contentClasses, className),
            style: { ...floatingStyles, ...style },
            // Options are plain divs, so pressing one would otherwise pull
            // focus off the combobox input and read as a focus-out.
            onMouseDown(event: React.MouseEvent) {
              event.preventDefault();
            },
            ...props,
          })}
        >
          {children}
        </div>
      </FloatingPortal>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Item                                                              */
/* ------------------------------------------------------------------ */

type MultiSelectItemProps = {
  /**
   * An entry of the `options` argument the root handed to the children
   * function. It is an **address**, not a data channel: only `value` is read,
   * and every other field of the row — its label, its `disabled` — comes from
   * the root's own list. A fabricated `value` throws.
   */
  option: MultiSelectItem;
} & ComponentPropsWithRef<"div">;

const Item = forwardRef<HTMLDivElement, MultiSelectItemProps>(
  function MultiSelectItem({ option, children, className, onClick, ...props }, ref) {
    const {
      indexOfValue,
      filtered,
      selected,
      atMax,
      disabled,
      activeIndex,
      optionId,
      listRef,
      getItemProps,
      toggle,
      focusInput,
    } = useMultiSelectContext("MultiSelect.Item");

    const index = indexOfValue.get(option.value);
    if (index === undefined) {
      throw new Error(
        `MultiSelect.Item was given an option (${option.value}) that is not in the list MultiSelect handed to children. Map the \`options\` argument; do not build entries.`,
      );
    }

    const isSelected = selected.includes(option.value);
    // `filtered[index]`, never the `option` argument: a consumer who spreads a
    // row and flips `disabled` would otherwise write selectability, and only
    // half of it — `handleKeyDown` reads `filtered[activeIndex]`, so the click
    // path would honour the override while the keyboard path refused it and
    // `aria-disabled` reported the caller's answer to both.
    const isDisabled = filtered[index].disabled || (!isSelected && atMax) || disabled;

    return (
      <ItemContext.Provider value={{ selected: isSelected }}>
        <div
          // The bag first, the invariants after it: `id`, `role`, the two
          // `aria-*` and the two `data-*` are what make this a listbox option,
          // and a consumer prop of the same name must not win. Spread last, a
          // `role="presentation"` from the call site left the listbox with zero
          // discoverable options. `CommandPalette.Item` is the sibling with the
          // same construction — keep the two in step.
          {...getItemProps({
            ...props,
            onClick(event: React.MouseEvent<HTMLDivElement>) {
              onClick?.(event);
              if (isDisabled) return;
              toggle(option.value);
              focusInput();
            },
          })}
          ref={mergeRefs<HTMLDivElement>(ref, (node) => {
            listRef.current[index] = node;
          })}
          id={optionId(index)}
          role="option"
          aria-selected={isSelected}
          aria-disabled={isDisabled || undefined}
          data-active={index === activeIndex ? "" : undefined}
          data-selected={isSelected ? "" : undefined}
          className={cn("multiselect-item", itemClasses, className)}
        >
          {children}
        </div>
      </ItemContext.Provider>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  ItemIndicator                                                     */
/* ------------------------------------------------------------------ */

type MultiSelectItemIndicatorProps = ComponentPropsWithRef<"span">;

const ItemIndicator = forwardRef<HTMLSpanElement, MultiSelectItemIndicatorProps>(function MultiSelectItemIndicator({ children, className, ...props }, ref) {
  const item = useContext(ItemContext);
  if (!item) {
    throw new Error("MultiSelect.ItemIndicator must be used within a MultiSelect.Item");
  }

  // The element is rendered whether or not the glyph is: it is a fixed gutter
  // that keeps labels aligned across selected and unselected rows.
  return (
    <span
      ref={ref}
      className={cn("multiselect-item__check", itemCheckClasses, className)}
      aria-hidden="true"
      {...props}
    >
      {item.selected ? (children ?? <Check size={14} />) : null}
    </span>
  );
});

/* ------------------------------------------------------------------ */
/*  Empty                                                             */
/* ------------------------------------------------------------------ */

type MultiSelectEmptyProps = ComponentPropsWithRef<"div">;

const Empty = forwardRef<HTMLDivElement, MultiSelectEmptyProps>(
  function MultiSelectEmpty({ children, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="presentation"
        className={cn("multiselect-empty", emptyClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Tag                                                               */
/* ------------------------------------------------------------------ */

type MultiSelectTagProps = {
  /** Position in the `selected` array the root handed to the children function. */
  index: number;
} & ComponentPropsWithRef<"span">;

const Tag = forwardRef<HTMLSpanElement, MultiSelectTagProps>(
  function MultiSelectTag({ index, children, className, ...props }, ref) {
    const { selected } = useMultiSelectContext("MultiSelect.Tag");
    const value = useMemo(() => ({ index }), [index]);

    // The same guard `MultiSelect.Item` carries, for the same reason and it was
    // missing here: without it a chip at an index the selection does not hold
    // renders, and its `TagRemove` calls `removeChipAt` on nothing — a chip a
    // consumer authored, in a list `value` is supposed to be the sole writer of.
    // Below the hooks so the throw cannot reorder them.
    if (index < 0 || index >= selected.length) {
      throw new Error(
        `MultiSelect.Tag was given index ${index}, which is not a position in the selection MultiSelect handed to children. Map the \`selected\` argument; do not build entries.`,
      );
    }

    return (
      <TagContext.Provider value={value}>
        <span ref={ref} className={cn("multiselect-tag", tagClasses, className)} {...props}>
          {children}
        </span>
      </TagContext.Provider>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  TagRemove                                                         */
/* ------------------------------------------------------------------ */

type MultiSelectTagRemoveProps = ComponentPropsWithRef<"button">;

const TagRemove = forwardRef<HTMLButtonElement, MultiSelectTagRemoveProps>(
  function MultiSelectTagRemove({ children, className, onClick, ...props }, ref) {
    const tag = useContext(TagContext);
    if (!tag) {
      throw new Error("MultiSelect.TagRemove must be used within a MultiSelect.Tag");
    }
    const { selected, labelOf, disabled, chipRefs, removeChipAt } =
      useMultiSelectContext("MultiSelect.TagRemove");

    const value = selected[tag.index];
    const label = labelOf.get(value) ?? value;

    return (
      <button
        {...props}
        type="button"
        ref={mergeRefs<HTMLButtonElement>(ref, (node) => {
          chipRefs.current[tag.index] = node;
        })}
        aria-label={`Remove ${label}`}
        className={cn("multiselect-tag__remove", tagRemoveClasses, className)}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          event.stopPropagation();
          removeChipAt(tag.index);
        }}
      >
        {children ?? <X size={12} aria-hidden="true" />}
      </button>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const MultiSelect = Object.assign(MultiSelectRoot, {
  Content,
  Item,
  ItemIndicator,
  Empty,
  Tag,
  TagRemove,
});
