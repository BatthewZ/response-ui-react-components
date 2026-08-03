"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLightDismiss } from "../../hooks/use-light-dismiss";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";

import { Kbd } from "./Kbd";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `CommandPalette.css` keeps its two `@keyframes` and nothing else; every rule
 * it drew is here. Each constant is one flat string literal because the docs and
 * focus guards resolve hoisted constants textually and a composed one would not
 * resolve.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the entrance is an arbitrary
 * `animation` shorthand naming the keyframes and both tokens; `ease-enter` and
 * `duration-motion-duration-enter` generate nothing.
 *
 * `p-0`, `m-0` and `list`'s `margin: 0` are not restated: Preflight zeroes
 * padding and margin on every element including `<dialog>`, which is what the UA
 * `padding: 1em` was being reset against.
 */
const paletteClasses =
  "mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-lg border border-border-default bg-surface-0 text-fg-primary shadow-lg animate-[command-palette-in_var(--MOTION-DURATION-ENTER)_var(--MOTION-EASE-ENTER)] backdrop:bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))] backdrop:animate-[command-palette-backdrop-in_var(--MOTION-DURATION-ENTER)_var(--MOTION-EASE-ENTER)] motion-reduce:animate-none motion-reduce:backdrop:animate-none";

const paletteSearchClasses = "border-b border-border-default";

/**
 * The input is the only element that ever holds DOM focus here — options are
 * virtually focused via `aria-activedescendant` — so the reset cannot be left
 * without a replacement. Inset so the ring stays inside the full-bleed search
 * row.
 *
 * `outline-solid` is the third class the reset needs: `outline-none` writes
 * `--tw-outline-style: none` and every `outline-<width>` utility reads that
 * property back, so without it `focus-visible:outline-2` computes
 * `outline-style: none` and paints nothing.
 */
const paletteInputClasses =
  "w-full px-r3 py-r4 text-body-1 text-fg-primary outline-none placeholder:text-fg-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

/** `overscroll-contain` keeps a scroll that reaches the end of this list off the
 *  page behind the scrim, which is not itself a scroll blocker. */
const paletteListClasses = "max-h-96 overflow-y-auto overscroll-contain p-r6";

const paletteGroupHeaderClasses =
  "px-r5 py-r6 text-body-3 font-semibold tracking-[0.04em] text-fg-muted uppercase";

/**
 * Virtual focus: DOM focus stays on the search input, so `:focus-visible` never
 * matches an option and the keyboard cursor has to be drawn from the attribute
 * instead. The `--C-SURFACE-2` step alone is 1.08–1.16:1 against the palette fill
 * across the four themes — a fill-vs-fill cue no re-tint can rescue — so the
 * ring, not the wash, is what marks the option. Same ring the rest of the library
 * draws on `:focus-visible`, and `data-active:` emits at 0,2,0 so it wins on
 * specificity rather than on where Tailwind sorts it.
 */
const paletteOptionClasses =
  "flex cursor-pointer items-center gap-r4 rounded-md p-r5 text-body-2 text-fg-primary transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none data-active:bg-surface-2 data-active:outline-2 data-active:-outline-offset-2 data-active:outline-border-focus data-disabled:cursor-not-allowed data-disabled:text-fg-muted data-disabled:opacity-60";

const paletteOptionIconClasses = "inline-flex shrink-0 items-center justify-center text-fg-secondary";

const paletteOptionLabelClasses = "min-w-0 flex-1 truncate text-left";

const paletteOptionShortcutClasses = "ml-auto shrink-0";

const paletteEmptyClasses = "px-r5 py-r3 text-center text-body-2 text-fg-muted";

export type CommandPaletteItem = {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * What the root hands its children function, once per row of its **own**
 * filtered and grouped list. `items` is the only writer of the data; this is the
 * only writer of a row's content.
 */
export interface CommandPaletteRenderArgs {
  item: CommandPaletteItem;
  /** Position in the rendered order — filtered, then grouped. */
  index: number;
  /** Whether this row currently holds the virtual keyboard cursor. */
  active: boolean;
}

/**
 * Row identity, set by the root around each `children` call. `CommandPalette.Item`
 * reads everything from it, so a consumer supplies a row's content and never its
 * `id`, `role`, ARIA state or handlers — and cannot render a row that is not one
 * of the root's own.
 */
const RowContext = createContext<
  (CommandPaletteRenderArgs & {
    optionId: (index: number) => string;
    setActiveIndex: (index: number) => void;
    onClose: () => void;
  }) | null
>(null);

type CommandPaletteProps = {
  open: boolean;
  /**
   * Called on Escape, on selecting a command, and on a pointer press that both
   * starts and ends on the scrim outside the panel.
   */
  onClose: () => void;
  items: CommandPaletteItem[];
  /** Replaces the default case-insensitive substring filter over label + keywords. */
  filter?: (item: CommandPaletteItem, query: string) => boolean;
  /**
   * Composes one result row. Optional: omitted, the root renders the standard
   * icon / label / shortcut row.
   *
   * It is a **function**, called by the root once per row of the list it has
   * already filtered and grouped — so `items` stays the single writer of the
   * data. Return a `CommandPalette.Item`: it carries the row's `id`, `role`,
   * `aria-selected`, active state and select handler, none of which a consumer
   * can supply or get wrong.
   */
  children?: (args: CommandPaletteRenderArgs) => ReactNode;
  placeholder?: string;
  emptyMessage?: ReactNode;
  /**
   * Accessible name for the search field. Rest props land on the `<dialog>`, so
   * without this nothing a caller passes can name the input.
   */
  searchLabel?: string;
  /** Accessible name for the results listbox. */
  listLabel?: string;
  /** Announced whenever the result count changes. */
  statusMessage?: (count: number) => string;
  /**
   * Class overrides for the internals the root renders. `className` is the
   * `<dialog>` — the palette surface itself — and the result row is reached
   * through `CommandPalette.Item`, so the slots are the chrome around them. The
   * three `item*` keys land on the **default** row; a row you compose yourself
   * is yours to class. The union is written out here so an unknown key is a type
   * error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<
    | "search"
    | "input"
    | "list"
    | "group"
    | "groupHeader"
    | "empty"
    | "itemIcon"
    | "itemLabel"
    | "itemShortcut"
  >;
} & Omit<ComponentPropsWithRef<"dialog">, "open" | "children">;

/**
 * Default filter: case-insensitive substring match over `label` and `keywords`.
 * An empty/whitespace query matches everything.
 */
function defaultFilter(item: CommandPaletteItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  if (item.label.toLowerCase().includes(q)) return true;
  return (item.keywords ?? []).some((kw) => kw.toLowerCase().includes(q));
}

function defaultStatusMessage(count: number): string {
  return count === 1 ? "1 command" : `${count} commands`;
}

/**
 * CommandPalette — a ⌘K-style command launcher built on a native `<dialog>`.
 *
 * NOTE: The ⌘K (or Ctrl+K) key binding is the CONSUMER's responsibility. This
 * component does NOT register a global key listener. Wire it up yourself, e.g.:
 *
 *   useEffect(() => {
 *     const onKey = (e: KeyboardEvent) => {
 *       if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
 *         e.preventDefault();
 *         setOpen((o) => !o);
 *       }
 *     };
 *     window.addEventListener("keydown", onKey);
 *     return () => window.removeEventListener("keydown", onKey);
 *   }, []);
 *
 * Virtual focus: DOM focus stays on the search input at all times. The active
 * option is tracked via `activeIndex` over the *rendered* order — filtered,
 * then grouped — and surfaced through `aria-activedescendant`. Disabled items
 * are skipped.
 */
const CommandPaletteRoot = forwardRef<HTMLDialogElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open,
      onClose,
      items,
      filter = defaultFilter,
      children,
      placeholder = "Type a command or search…",
      emptyMessage = "No results",
      searchLabel = "Search commands",
      listLabel = "Commands",
      statusMessage = defaultStatusMessage,
      className,
      classNames,
      onClick,
      onPointerDown,
      ...props
    },
    forwardedRef
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const mergedRef = useMemo(
      () => mergeRefs(forwardedRef, dialogRef),
      [forwardedRef]
    );

    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const optionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId]);

    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const snappedQueryRef = useRef<string | null>(null);

    const filtered = useMemo(
      () => items.filter((item) => filter(item, query)),
      [items, filter, query]
    );

    // Grouping is what the user sees, so it is also what the keyboard walks:
    // `ordered` is the render order, and every index below indexes into it.
    // Indexing the pre-grouping list instead moves the highlight out of visual
    // order the moment one group's members are not contiguous in `items`.
    // Groups appear in first-seen order; ungrouped items render on their own.
    const { groups, ordered } = useMemo(() => {
      const order: (string | undefined)[] = [];
      const map = new Map<string | undefined, CommandPaletteItem[]>();
      for (const item of filtered) {
        const key = item.group;
        if (!map.has(key)) {
          map.set(key, []);
          order.push(key);
        }
        map.get(key)!.push(item);
      }

      const flat: CommandPaletteItem[] = [];
      const built = order.map((key) => {
        const entries = map.get(key)!.map((item) => {
          const index = flat.length;
          flat.push(item);
          return { item, index };
        });
        return { group: key, entries };
      });
      return { groups: built, ordered: flat };
    }, [filtered]);

    const isSelectable = useCallback(
      (index: number) => {
        const item = ordered[index];
        return item != null && !item.disabled;
      },
      [ordered]
    );

    // First selectable index at/after `from`, walking `dir`. Returns -1 if none.
    const findSelectable = useCallback(
      (from: number, dir: 1 | -1): number => {
        for (let i = from; i >= 0 && i < ordered.length; i += dir) {
          if (isSelectable(i)) return i;
        }
        return -1;
      },
      [ordered.length, isSelectable]
    );

    // Open/close the native dialog imperatively, mirroring Dialog.tsx.
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (open && !dialog.open) {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    }, [open]);

    // Native dialog emits `cancel` on Escape; route it to onClose.
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const handleCancel = (e: Event) => {
        e.preventDefault();
        onClose();
      };
      dialog.addEventListener("cancel", handleCancel);
      return () => dialog.removeEventListener("cancel", handleCancel);
    }, [onClose]);

    // On open: reset query + active index and focus the input.
    useEffect(() => {
      if (!open) return;
      setQuery("");
      setActiveIndex(0);
      snappedQueryRef.current = null;
      // Focus after the dialog has been shown.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }, [open]);

    // Whenever the query changes, snap active to the first selectable option.
    // Keyed on the query itself, not on the effect re-running: `findSelectable`
    // is derived from the `items`/`filter` props, so an inline array literal or
    // inline arrow gives it a new identity on every parent re-render, and
    // re-snapping there throws away wherever the user had arrowed to.
    useEffect(() => {
      if (snappedQueryRef.current === query) return;
      snappedQueryRef.current = query;
      const first = findSelectable(0, 1);
      setActiveIndex(first === -1 ? 0 : first);
    }, [query, findSelectable]);

    // Scroll the active option into view as it changes.
    useEffect(() => {
      if (!open) return;
      const el = listRef.current?.querySelector<HTMLElement>(
        `#${CSS.escape(optionId(activeIndex))}`
      );
      el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open, optionId]);

    const moveActive = useCallback(
      (dir: 1 | -1) => {
        if (ordered.length === 0) return;
        const next = findSelectable(activeIndex + dir, dir);
        if (next !== -1) {
          setActiveIndex(next);
          return;
        }
        // Wrap to the far end.
        const wrapFrom = dir === 1 ? 0 : ordered.length - 1;
        const wrapped = findSelectable(wrapFrom, dir);
        if (wrapped !== -1) setActiveIndex(wrapped);
      },
      [activeIndex, ordered.length, findSelectable]
    );

    const selectActive = useCallback(() => {
      const item = ordered[activeIndex];
      if (!item || item.disabled) return;
      item.onSelect();
      onClose();
    }, [ordered, activeIndex, onClose]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            moveActive(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            moveActive(-1);
            break;
          case "Home":
            e.preventDefault();
            setActiveIndex((prev) => {
              const first = findSelectable(0, 1);
              return first === -1 ? prev : first;
            });
            break;
          case "End":
            e.preventDefault();
            setActiveIndex((prev) => {
              const last = findSelectable(ordered.length - 1, -1);
              return last === -1 ? prev : last;
            });
            break;
          case "Enter":
            e.preventDefault();
            selectActive();
            break;
          default:
            break;
        }
      },
      [moveActive, findSelectable, ordered.length, selectActive]
    );

    // Light dismiss, shared with Dialog: a press on the scrim is dispatched at
    // the `<dialog>` itself, so the tell is geometry rather than containment, and
    // both ends of the press have to land outside. The hook holds why.
    const { onPointerDown: handlePointerDown, onClick: handleClick } = useLightDismiss({
      ref: dialogRef,
      onDismiss: onClose,
      onPointerDown,
      onClick,
    });

    const hasResults = ordered.length > 0;
    const activeId = hasResults && isSelectable(activeIndex) ? optionId(activeIndex) : undefined;

    /** The row the root renders when no children function is given. */
    const defaultRow = ({ item }: CommandPaletteRenderArgs) => (
      <Item>
        {item.icon != null && (
          <span
            className={cn("command-palette-option-icon", paletteOptionIconClasses, classNames?.itemIcon)}
            aria-hidden="true"
          >
            {item.icon}
          </span>
        )}
        <span className={cn("command-palette-option-label", paletteOptionLabelClasses, classNames?.itemLabel)}>
          {item.label}
        </span>
        {item.shortcut != null && (
          <Kbd className={cn("command-palette-option-shortcut", paletteOptionShortcutClasses, classNames?.itemShortcut)}>
            {item.shortcut}
          </Kbd>
        )}
      </Item>
    );

    // A listbox owns its options directly, or through a `role="group"` that is
    // itself a direct child. An intervening list element breaks that ownership,
    // so the structure is built from roles rather than from `<ul>`/`<li>`, and
    // the root keeps rendering it: the children function is invoked *inside* a
    // row, never over the tree.
    const renderRow = ({ item, index }: { item: CommandPaletteItem; index: number }) => {
      // Same predicate as `activeId`: when nothing is selectable `activeIndex`
      // still points at 0, and painting a highlight there would show a cursor no
      // screen reader can follow and that Enter will not act on.
      const active = index === activeIndex && isSelectable(index);
      const args: CommandPaletteRenderArgs = { item, index, active };
      return (
        <RowContext.Provider
          key={item.id}
          value={{ ...args, optionId, setActiveIndex, onClose }}
        >
          {(children ?? defaultRow)(args)}
        </RowContext.Provider>
      );
    };

    return (
      <dialog
        ref={mergedRef}
        // `no-body-scroll` for the same reason Dialog carries it: the scrim is
        // not a scroll blocker, so without it the page scrolls behind the panel.
        className={cn("command-palette no-body-scroll", paletteClasses, className)}
        aria-label="Command palette"
        {...props}
        // After the spread: a caller's own handler is composed in above rather
        // than replacing these, so passing one cannot silently kill light dismiss.
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <div className={cn("command-palette-search", paletteSearchClasses, classNames?.search)}>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            className={cn("command-palette-input", paletteInputClasses, classNames?.input)}
            placeholder={placeholder}
            aria-label={searchLabel}
            value={query}
            autoComplete="off"
            spellCheck={false}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Mounted whether or not there are results, so a changed count arrives
            as a change *inside* an existing region. Filtering otherwise swaps
            the option list and the empty message with no announcement at all. */}
        <div
          // slot:(a) `sr-only` is the whole mechanism here, not decoration: the
          // region has to be in the accessibility tree and out of the visual
          // flow. A route to this class lets a caller drop it and print the
          // result count above the search field.
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          {open ? statusMessage(ordered.length) : ""}
        </div>

        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={listLabel}
          className={cn("command-palette-list", paletteListClasses, classNames?.list)}
        >
          {hasResults ? (
            groups.map(({ group, entries }, groupIndex) => {
              // An ungrouped item belongs to the listbox itself. Wrapping it in
              // a `role="group"` with no name invents a structure with nothing
              // to announce.
              if (group == null) {
                return <Fragment key="__ungrouped__">{entries.map(renderRow)}</Fragment>;
              }
              const headerId = `${baseId}-group-${groupIndex}`;
              return (
                <div
                  key={group}
                  role="group"
                  aria-labelledby={headerId}
                  // The gap between groups was `.command-palette-group +
                  // .command-palette-group`, a rule about DOM adjacency. It is
                  // computed here instead of hard-coding the BEM name into a
                  // `[.command-palette-group+&]:` variant: entries render in
                  // order and each is either a group box or a non-empty fragment
                  // of ungrouped rows, so "the previous entry is a group" is
                  // exactly "the previous element sibling is a group box".
                  // `not-first:` would NOT be the same rule — a group preceded by
                  // ungrouped rows is not first and took no margin.
                  className={cn(
                    "command-palette-group",
                    groups[groupIndex - 1]?.group != null && "mt-r5",
                    classNames?.group
                  )}
                >
                  <div
                    id={headerId}
                    className={cn(
                      "command-palette-group-header",
                      paletteGroupHeaderClasses,
                      classNames?.groupHeader,
                    )}
                  >
                    {group}
                  </div>
                  {entries.map(renderRow)}
                </div>
              );
            })
          ) : (
            <div
              role="presentation"
              className={cn("command-palette-empty", paletteEmptyClasses, classNames?.empty)}
            >
              {emptyMessage}
            </div>
          )}
        </div>
      </dialog>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Item                                                              */
/* ------------------------------------------------------------------ */

type CommandPaletteItemProps = ComponentPropsWithRef<"div">;

/**
 * One result row. It takes no data prop: the row it is comes from the children
 * call it was returned from, which is what keeps `items` the only writer of the
 * list. Rendered anywhere else it throws rather than producing an option the
 * palette does not know about.
 *
 * Declared under its compound key rather than a `CommandPalette`-prefixed one —
 * `CommandPaletteItem` is the exported *data* type. The function name is what
 * devtools shows.
 */
const Item = forwardRef<HTMLDivElement, CommandPaletteItemProps>(
  function CommandPaletteItem(
    { children, className, onClick, onMouseMove, ...props },
    ref
  ) {
    const row = useContext(RowContext);
    if (!row) {
      throw new Error(
        "CommandPalette.Item must be returned from CommandPalette's children function — it is one of the palette's own rows, not a row you author."
      );
    }
    const { item, index, active, optionId, setActiveIndex, onClose } = row;

    return (
      <div
        {...props}
        ref={ref}
        id={optionId(index)}
        role="option"
        aria-selected={active}
        aria-disabled={item.disabled || undefined}
        data-active={active || undefined}
        data-disabled={item.disabled || undefined}
        className={cn("command-palette-option", paletteOptionClasses, className)}
        onMouseMove={(event) => {
          onMouseMove?.(event);
          if (!item.disabled) setActiveIndex(index);
        }}
        onClick={(event) => {
          onClick?.(event);
          if (item.disabled) return;
          item.onSelect();
          onClose();
        }}
      >
        {children}
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const CommandPalette = Object.assign(CommandPaletteRoot, { Item });
