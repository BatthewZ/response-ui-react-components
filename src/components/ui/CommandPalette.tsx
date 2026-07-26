"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

import { Kbd } from "./Kbd";

export type CommandItem = {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  /** Replaces the default case-insensitive substring filter over label + keywords. */
  filter?: (item: CommandItem, query: string) => boolean;
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
} & Omit<ComponentPropsWithRef<"dialog">, "open">;

/**
 * Default filter: case-insensitive substring match over `label` and `keywords`.
 * An empty/whitespace query matches everything.
 */
function defaultFilter(item: CommandItem, query: string): boolean {
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
export const CommandPalette = forwardRef<HTMLDialogElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open,
      onClose,
      items,
      filter = defaultFilter,
      placeholder = "Type a command or search…",
      emptyMessage = "No results",
      searchLabel = "Search commands",
      listLabel = "Commands",
      statusMessage = defaultStatusMessage,
      className,
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
      const map = new Map<string | undefined, CommandItem[]>();
      for (const item of filtered) {
        const key = item.group;
        if (!map.has(key)) {
          map.set(key, []);
          order.push(key);
        }
        map.get(key)!.push(item);
      }

      const flat: CommandItem[] = [];
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

    const hasResults = ordered.length > 0;
    const activeId = hasResults && isSelectable(activeIndex) ? optionId(activeIndex) : undefined;

    // A listbox owns its options directly, or through a `role="group"` that is
    // itself a direct child. An intervening list element breaks that ownership,
    // so the structure is built from roles rather than from `<ul>`/`<li>`.
    const renderOption = ({ item, index }: { item: CommandItem; index: number }) => {
      // Same predicate as `activeId`: when nothing is selectable `activeIndex`
      // still points at 0, and painting a highlight there would show a cursor no
      // screen reader can follow and that Enter will not act on.
      const active = index === activeIndex && isSelectable(index);
      return (
        <div
          key={item.id}
          id={optionId(index)}
          role="option"
          aria-selected={active}
          aria-disabled={item.disabled || undefined}
          data-active={active || undefined}
          data-disabled={item.disabled || undefined}
          className="command-palette-option"
          onMouseMove={() => {
            if (!item.disabled) setActiveIndex(index);
          }}
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
            onClose();
          }}
        >
          {item.icon != null && (
            <span className="command-palette-option-icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="command-palette-option-label">{item.label}</span>
          {item.shortcut != null && (
            <Kbd className="command-palette-option-shortcut">{item.shortcut}</Kbd>
          )}
        </div>
      );
    };

    return (
      <dialog
        ref={mergedRef}
        // `no-body-scroll` for the same reason Dialog carries it: the scrim is
        // not a scroll blocker, so without it the page scrolls behind the panel.
        className={cn("command-palette no-body-scroll", className)}
        aria-label="Command palette"
        {...props}
      >
        <div className="command-palette-search">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            className="command-palette-input"
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
        <div className="sr-only" role="status" aria-live="polite">
          {open ? statusMessage(ordered.length) : ""}
        </div>

        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={listLabel}
          className="command-palette-list"
        >
          {hasResults ? (
            groups.map(({ group, entries }, groupIndex) => {
              // An ungrouped item belongs to the listbox itself. Wrapping it in
              // a `role="group"` with no name invents a structure with nothing
              // to announce.
              if (group == null) {
                return <Fragment key="__ungrouped__">{entries.map(renderOption)}</Fragment>;
              }
              const headerId = `${baseId}-group-${groupIndex}`;
              return (
                <div
                  key={group}
                  role="group"
                  aria-labelledby={headerId}
                  className="command-palette-group"
                >
                  <div id={headerId} className="command-palette-group-header">
                    {group}
                  </div>
                  {entries.map(renderOption)}
                </div>
              );
            })
          ) : (
            <div role="presentation" className="command-palette-empty">
              {emptyMessage}
            </div>
          )}
        </div>
      </dialog>
    );
  }
);
