"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";

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
import {
  focusOutlineResetControl,
  focusRingControl,
  focusRingControlError,
} from "../../util/focus";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";
import { Spinner } from "../ui/Spinner";

import { useFieldError } from "./Field";

/* ------------------------------------------------------------------ */
/*  Classes                                                           */
/* ------------------------------------------------------------------ */

/**
 * `Combobox.css` is gone; everything this component draws is here. Each constant
 * is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually and a composed
 * one would not resolve.
 *
 * Nothing below re-states Tailwind Preflight. The deleted stylesheet carried
 * `font: inherit` twice; neither survived the check. On `.combobox-input` it was
 * Preflight's own declaration for `button, input, select, optgroup, textarea`
 * (`node_modules/tailwindcss/preflight.css`), and on `.combobox-item` — a plain
 * `<div>` — it was a no-op, because every longhand of the `font` shorthand is an
 * inherited property and nothing in this package sets one on that element. The
 * toggle's `padding: 0`, `border: none` and `background: none` are Preflight's
 * `*` and `button` rules, the same ones `Button.tsx` relies on and carries no
 * reset for.
 *
 * **Do not declare `border` (or `border-color`) on the input here or anywhere
 * else.** `focusRingControl` swaps the border on focus and `focusRingControlError`
 * paints it red; a second writer for that one property defeats both. Before
 * Phase 1 this package's stylesheets were unlayered and out-ranked every utility
 * whatever the specificity, so a `border` in `Combobox.css` silently beat them.
 * That specific reason expired when the CSS moved to `@layer components`, but
 * the rule stands on `CLAUDE.md` rule 3 alone: `src/util/focus.ts` is the single
 * source for this control's border and ring.
 */
const inputWrapClasses = "relative flex w-full items-center";

const inputClasses =
  "w-full py-2 pr-9 pl-3 text-body-2 text-fg-primary bg-surface-0 rounded-md placeholder:text-fg-muted disabled:bg-surface-3 disabled:cursor-not-allowed";

const toggleClasses =
  "absolute right-2 inline-flex items-center justify-center text-fg-secondary cursor-pointer";

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
  "flex w-full items-center gap-2 px-3 py-1.5 text-body-2 text-fg-primary cursor-pointer outline-none text-left data-active:bg-surface-2 data-active:outline-2 data-active:outline-solid data-active:outline-border-focus data-active:-outline-offset-2 aria-selected:font-semibold aria-selected:text-fg-primary aria-disabled:text-fg-muted aria-disabled:cursor-default";

const emptyClasses = "px-3 py-2 text-body-2 text-fg-muted";

const loadingClasses = "flex items-center justify-center p-3 text-fg-secondary";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface ComboboxContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedValue: string | null;
  selectValue: (value: string, label: string) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  loading: boolean;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  /**
   * Where the listbox is portalled — the nearest `<dialog>` ancestor of the
   * trigger, or `undefined` for `<body>`. See `useFloating`.
   */
  portalRoot: ReturnType<typeof useFloating>["portalRoot"];

  context: ReturnType<typeof useFloating>["context"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  getItemProps: ReturnType<typeof useInteractions>["getItemProps"];
  listRef: React.RefObject<(HTMLElement | null)[]>;
  /** Parallel to listRef: the `{ value, disabled }` each option registers. */
  itemDataRef: React.RefObject<(ItemData | null)[]>;
  activeIndex: number | null;
  /** Selects the option at the given index from the registered item data. */
  selectIndex: (index: number | null) => void;
  /** Reset to 0 after the rendered item count is known, on each item-set change. */
  registerRenderedCount: (count: number) => void;
  listboxId: string;
  /** id of the currently-active option, for aria-activedescendant. */
  activeOptionId: string | undefined;
  optionId: (index: number) => string;
}

interface ItemData {
  value: string;
  disabled: boolean;
  node: HTMLElement | null;
  /** Explicit text for the input, when the option's own markup is not it. */
  label?: string;
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useComboboxContext(component: string): ComboboxContextValue {
  const ctx = useContext(ComboboxContext);
  if (!ctx) {
    throw new Error(`${component} must be used within a Combobox`);
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface ComboboxRootProps {
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  loading?: boolean;
  placement?: Placement;
  children: React.ReactNode;
}

function ComboboxRoot({
  value,
  defaultValue,
  onValueChange,
  inputValue,
  defaultInputValue = "",
  onInputValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  loading = false,
  placement = "bottom-start",
  children,
}: ComboboxRootProps) {
  const [selectedValue, setSelectedValue] = useControllableState<string | null>({
    value,
    defaultValue: defaultValue ?? null,
    onChange: onValueChange,
  });

  const [inputVal, setInputVal] = useControllableState<string>({
    value: inputValue,
    defaultValue: defaultInputValue,
    onChange: onInputValueChange,
  });

  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const listboxId = useId();
  const idBase = useId();

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const itemDataRef = useRef<(ItemData | null)[]>([]);

  const { refs, floatingStyles, context, portalRoot } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
  });

  // The chevron toggle sits beside the input, so it is neither the reference
  // nor the floating element: an unqualified outside-press would dismiss on its
  // pointerdown and its own click would then re-open, leaving no way to close.
  const dismiss = useDismiss(context, {
    outsidePress: (event) =>
      !(
        event.target instanceof Node &&
        refs.domReference.current?.parentElement?.contains(event.target)
      ),
  });
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

  const optionId = useCallback(
    (index: number) => `${idBase}-option-${index}`,
    [idBase],
  );

  const activeOptionId =
    open && activeIndex != null ? optionId(activeIndex) : undefined;

  // The consumer re-filters and re-renders items with new indices each
  // keystroke. Truncate listRef to the rendered count and reset the active
  // option to the top whenever the item set changes — keeping Root
  // filter-agnostic.
  const registerRenderedCount = useCallback(
    (count: number) => {
      listRef.current.length = count;
      itemDataRef.current.length = count;
      setActiveIndex((prev) => {
        if (count === 0) return null;
        if (prev == null || prev >= count) return 0;
        return prev;
      });
    },
    [],
  );

  const selectValue = useCallback(
    (next: string, label: string) => {
      setSelectedValue(next);
      setInputVal(label);
      setOpen(false);
    },
    [setSelectedValue, setInputVal, setOpen],
  );

  const selectIndex = useCallback(
    (index: number | null) => {
      if (index == null) return;
      const data = itemDataRef.current[index];
      if (!data || data.disabled) return;
      // `label` is the escape hatch for options whose markup is more than the
      // text that belongs in the field — a multi-node option's `textContent`
      // is every node run together.
      const label = data.label ?? data.node?.textContent ?? data.value;
      selectValue(data.value, label);
    },
    [selectValue],
  );

  const ctx: ComboboxContextValue = {
    open,
    setOpen,
    selectedValue,
    selectValue,
    inputValue: inputVal,
    setInputValue: setInputVal,
    loading,
    refs,
    floatingStyles,
    portalRoot,
    context,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
    listRef,
    itemDataRef,
    activeIndex,
    selectIndex,
    registerRenderedCount,
    listboxId,
    activeOptionId,
    optionId,
  };

  return <ComboboxContext.Provider value={ctx}>{children}</ComboboxContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Input                                                             */
/* ------------------------------------------------------------------ */

type ComboboxInputProps = ComponentPropsWithRef<"input"> & {
  error?: boolean;
  /** Accessible name for the chevron that opens and closes the listbox. */
  toggleLabel?: string;
  /**
   * Class overrides for the internals this part renders. `className` is the
   * `<input>` — the element the `ref` and every other prop address — so the only
   * slot is the disclosure `<button>` beside it, which no caller can otherwise
   * reach. The union is written out here so an unknown key is a type error
   * rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"toggle">;
};

const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput(
    {
      error,
      className,
      classNames,
      onChange,
      onKeyDown,
      toggleLabel = "Show options",
      ...props
    },
    ref,
  ) {
    const {
      open,
      setOpen,
      inputValue,
      setInputValue,
      refs,
      getReferenceProps,
      listboxId,
      activeOptionId,
      activeIndex,
      selectIndex,
    } = useComboboxContext("Combobox.Input");

    const { invalid, ariaProps } = useFieldError(error);

    function handleFocusOut(event: React.FocusEvent<HTMLDivElement>) {
      const next = event.relatedTarget;
      if (
        next instanceof Node &&
        (event.currentTarget.contains(next) || refs.floating.current?.contains(next))
      ) {
        return;
      }
      setOpen(false);
    }

    return (
      <div
        // slot:(a) the four utilities behind this class (relative, flex,
        // centred, full width) are the coupling that keeps the toggle beside the
        // field and nothing else; the floating listbox anchors to the `<input>`,
        // not to this box. A caller sizing the field does it on `className`,
        // which lands on that input.
        className={cn("combobox-input-wrap", inputWrapClasses)}
        onBlur={handleFocusOut}
      >
        <input
          {...getReferenceProps({
            ref: mergeRefs(ref, refs.setReference),
            value: inputValue,
            className: cn(
              "combobox-input duration-fast",
              inputClasses,
              // One writer for one property — see the note on `inputClasses`.
              "border border-border-strong",
              focusOutlineResetControl,
              focusRingControl,
              invalid && focusRingControlError,
              className,
            ),
            ...ariaProps,
            ...props,
            onChange(event: React.ChangeEvent<HTMLInputElement>) {
              onChange?.(event);
              setInputValue(event.target.value);
              if (!open) setOpen(true);
            },
            onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
              onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === "ArrowDown" && !open) {
                setOpen(true);
                return;
              }
              if (event.key === "Enter" && open && activeIndex != null) {
                event.preventDefault();
                selectIndex(activeIndex);
              }
            },
          })}
          role="combobox"
          aria-expanded={open}
          // `Content` renders nothing while closed, so an unconditional IDREF
          // would point at a node that is not in the document.
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={toggleLabel}
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          className={cn("combobox-toggle", toggleClasses, classNames?.toggle)}
          // Keep DOM focus on the input: `aria-activedescendant` navigation
          // depends on it, and a focus move here reads as a focus-out.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

type ComboboxContentProps = ComponentPropsWithRef<"div"> & {
  /**
   * What the spinner is waiting on, in the caller's language. `Spinner` is
   * decoration without it, so with no label the wait is silent to AT.
   */
  loadingLabel?: string;
  /**
   * Class overrides for the internals this part renders. `className` is the
   * floating surface, so the only slot is the row that replaces the options
   * while the root is `loading` — an element that exists in one state and has no
   * other route. The union is written out here so an unknown key is a type error
   * rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"loading">;
};

const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  function ComboboxContent(
    { children, className, classNames, style, loadingLabel, ...props },
    ref,
  ) {
    const {
      open,
      loading,
      refs,
      floatingStyles,
      getFloatingProps,
      listboxId,
      registerRenderedCount,
      portalRoot,
    } = useComboboxContext("Combobox.Content");

    // Count the rendered options so Root can truncate `listRef` and reset the
    // active option whenever the (consumer-filtered) item set changes. Counting
    // here keeps Root filter-agnostic — it never sees the consumer's filter.
    // While `loading`, the Spinner replaces the children below, so the count of
    // options actually in the document is zero.
    const itemCount = loading ? 0 : countItems(children);
    useEffect(() => {
      registerRenderedCount(itemCount);
    }, [registerRenderedCount, itemCount]);

    if (!open) return null;

    return (
      <FloatingPortal root={portalRoot}>
        <div
          {...getFloatingProps({
            ref: mergeRefs(ref, refs.setFloating),
            className: cn("combobox-content", contentClasses, className),
            style: { ...floatingStyles, ...style },
            // Options are plain divs; without this the press moves DOM focus
            // to <body> and the input never gets it back.
            onMouseDown(event: React.MouseEvent) {
              event.preventDefault();
            },
            ...props,
          })}
          id={listboxId}
          role="listbox"
        >
          {loading ? (
            <div
              className={cn("combobox-loading", loadingClasses, classNames?.loading)}
              role="presentation"
            >
              <Spinner size="sm">{loadingLabel}</Spinner>
            </div>
          ) : (
            children
          )}
        </div>
      </FloatingPortal>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Item                                                              */
/* ------------------------------------------------------------------ */

type ComboboxItemProps = {
  index: number;
  value: string;
  disabled?: boolean;
  /**
   * Text to put in the input when this option is chosen. Defaults to the
   * option's `textContent`, which is wrong the moment the option renders more
   * than the one string that belongs in the field.
   */
  label?: string;
} & ComponentPropsWithRef<"div">;

const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  function ComboboxItem(
    { index, value, disabled = false, label, children, className, onClick, ...props },
    ref,
  ) {
    const {
      selectedValue,
      selectIndex,
      getItemProps,
      listRef,
      itemDataRef,
      activeIndex,
      optionId,
    } = useComboboxContext("Combobox.Item");

    const selected = value === selectedValue;

    const itemRef = useCallback(
      (node: HTMLDivElement | null) => {
        listRef.current[index] = node;
        itemDataRef.current[index] = { value, disabled, node, label };
      },
      [listRef, itemDataRef, index, value, disabled, label],
    );

    return (
      <div
        ref={mergeRefs(ref, itemRef)}
        className={cn("combobox-item", itemClasses, className)}
        {...getItemProps({
          ...props,
          onClick(event: React.MouseEvent<HTMLDivElement>) {
            onClick?.(event);
            if (disabled) return;
            selectIndex(index);
          },
        })}
        id={optionId(index)}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled || undefined}
        data-active={index === activeIndex ? "" : undefined}
      >
        {children}
      </div>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Empty                                                             */
/* ------------------------------------------------------------------ */

type ComboboxEmptyProps = ComponentPropsWithRef<"div">;

const ComboboxEmpty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(
  function ComboboxEmpty({ children, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="presentation"
        className={cn("combobox-empty", emptyClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

/** Counts `Combobox.Item` elements among Content's children, recursing through
 * fragments and wrapper components, so Root can size `listRef` to the rendered
 * options. Keeps Root filter-agnostic. */
function countItems(children: ReactNode): number {
  let count = 0;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === ComboboxItem) {
      count += 1;
      return;
    }
    const nested = (child.props as { children?: ReactNode }).children;
    if (nested != null) count += countItems(nested);
  });
  return count;
}

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const Combobox = Object.assign(ComboboxRoot, {
  Input: ComboboxInput,
  Content: ComboboxContent,
  Item: ComboboxItem,
  Empty: ComboboxEmpty,
});
