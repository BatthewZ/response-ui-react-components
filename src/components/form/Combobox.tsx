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
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { Spinner } from "../ui/Spinner";

import { useFieldError } from "./Field";

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

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
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
      const label = data.node?.textContent ?? data.value;
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

type ComboboxInputProps = ComponentPropsWithRef<"input"> & { error?: boolean };

const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput({ error, className, onChange, onKeyDown, ...props }, ref) {
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

    return (
      <div className="combobox-input-wrap">
        <input
          {...getReferenceProps({
            ref: mergeRefs(ref, refs.setReference),
            value: inputValue,
            className: cn("combobox-input", invalid && "combobox-input-error", className),
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
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Close" : "Open"}
          className="combobox-toggle"
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

type ComboboxContentProps = ComponentPropsWithRef<"div">;

const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  function ComboboxContent({ children, className, style, ...props }, ref) {
    const {
      open,
      loading,
      refs,
      floatingStyles,
      getFloatingProps,
      listboxId,
      registerRenderedCount,
    } = useComboboxContext("Combobox.Content");

    // Count the rendered options so Root can truncate `listRef` and reset the
    // active option whenever the (consumer-filtered) item set changes. Counting
    // here keeps Root filter-agnostic — it never sees the consumer's filter.
    const itemCount = countItems(children);
    useEffect(() => {
      registerRenderedCount(itemCount);
    }, [registerRenderedCount, itemCount]);

    if (!open) return null;

    return (
      <FloatingPortal>
        <div
          {...getFloatingProps({
            ref: mergeRefs(ref, refs.setFloating),
            className: cn("combobox-content", className),
            style: { ...floatingStyles, ...style },
            ...props,
          })}
          id={listboxId}
          role="listbox"
        >
          {loading ? (
            <div className="combobox-loading" role="presentation">
              <Spinner size="sm" />
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
} & ComponentPropsWithRef<"div">;

const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  function ComboboxItem(
    { index, value, disabled = false, children, className, onClick, ...props },
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
        itemDataRef.current[index] = { value, disabled, node };
      },
      [listRef, itemDataRef, index, value, disabled],
    );

    return (
      <div
        ref={mergeRefs(ref, itemRef)}
        className={cn("combobox-item", className)}
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
        className={cn("combobox-empty", className)}
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
