"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
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
 * option is tracked via `activeIndex` over the flattened filtered list and
 * surfaced through `aria-activedescendant`. Disabled items are skipped.
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
      className,
      ...props
    },
    forwardedRef
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const mergedRef = useMemo(
      () => mergeRefs(forwardedRef, dialogRef),
      [forwardedRef]
    );

    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const optionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId]);

    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    // Flattened, filtered list (preserves item order; grouping is presentational).
    const filtered = useMemo(
      () => items.filter((item) => filter(item, query)),
      [items, filter, query]
    );

    // Ordered, grouped view for rendering. Groups appear in first-seen order;
    // ungrouped items render under an undefined-keyed group with no header.
    const groups = useMemo(() => {
      const order: (string | undefined)[] = [];
      const map = new Map<string | undefined, { item: CommandItem; index: number }[]>();
      filtered.forEach((item, index) => {
        const key = item.group;
        if (!map.has(key)) {
          map.set(key, []);
          order.push(key);
        }
        map.get(key)!.push({ item, index });
      });
      return order.map((key) => ({ group: key, entries: map.get(key)! }));
    }, [filtered]);

    const isSelectable = useCallback(
      (index: number) => {
        const item = filtered[index];
        return item != null && !item.disabled;
      },
      [filtered]
    );

    // First selectable index at/after `from`, walking `dir`. Returns -1 if none.
    const findSelectable = useCallback(
      (from: number, dir: 1 | -1): number => {
        for (let i = from; i >= 0 && i < filtered.length; i += dir) {
          if (isSelectable(i)) return i;
        }
        return -1;
      },
      [filtered.length, isSelectable]
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
      // Focus after the dialog has been shown.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }, [open]);

    // Whenever the query changes, snap active to the first selectable option.
    useEffect(() => {
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
        if (filtered.length === 0) return;
        const next = findSelectable(activeIndex + dir, dir);
        if (next !== -1) {
          setActiveIndex(next);
          return;
        }
        // Wrap to the far end.
        const wrapFrom = dir === 1 ? 0 : filtered.length - 1;
        const wrapped = findSelectable(wrapFrom, dir);
        if (wrapped !== -1) setActiveIndex(wrapped);
      },
      [activeIndex, filtered.length, findSelectable]
    );

    const selectActive = useCallback(() => {
      const item = filtered[activeIndex];
      if (!item || item.disabled) return;
      item.onSelect();
      onClose();
    }, [filtered, activeIndex, onClose]);

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
              const last = findSelectable(filtered.length - 1, -1);
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
      [moveActive, findSelectable, filtered.length, selectActive]
    );

    const hasResults = filtered.length > 0;
    const activeId = hasResults && isSelectable(activeIndex) ? optionId(activeIndex) : undefined;

    return (
      <dialog
        ref={mergedRef}
        className={cn("command-palette", className)}
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

        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Commands"
          className="command-palette-list"
        >
          {hasResults ? (
            groups.map(({ group, entries }, groupIndex) => {
              const headerId = group != null ? `${baseId}-group-${groupIndex}` : undefined;
              return (
              <li
                key={group ?? "__ungrouped__"}
                role="group"
                aria-labelledby={headerId}
                className="command-palette-group"
              >
                {group != null && (
                  <div id={headerId} className="command-palette-group-header">
                    {group}
                  </div>
                )}
                <ul className="command-palette-group-items">
                  {entries.map(({ item, index }) => {
                    // Same predicate as `activeId`: when nothing is
                    // selectable `activeIndex` still points at 0, and painting
                    // a highlight there would show a cursor no screen reader
                    // can follow and that Enter will not act on.
                    const active = index === activeIndex && isSelectable(index);
                    return (
                      <li
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
                      </li>
                    );
                  })}
                </ul>
              </li>
              );
            })
          ) : (
            <li role="presentation" className="command-palette-empty">
              {emptyMessage}
            </li>
          )}
        </ul>
      </dialog>
    );
  }
);
