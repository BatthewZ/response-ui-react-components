"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { cn } from "../../util/style";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

import { type FormApi, useFieldArray } from "./use-form";

/** Per-row controls handed to {@link RepeaterProps.children}. */
export interface RepeaterItem {
  /** Stable key surviving reorders — already applied to the row wrapper. */
  id: number;
  /** Base field name for this row, e.g. `links.0`. Compose control names off it. */
  name: string;
  index: number;
  count: number;
  isFirst: boolean;
  isLast: boolean;
  /**
   * The Repeater's `disabled`, so row controls that are not native form
   * elements can honour it too. Native `<input>`/`<select>`/`<button>`
   * descendants are already disabled by the row's `<fieldset>`.
   */
  disabled: boolean;
  /** Remove this row. No-op when at `min`. */
  remove: () => void;
  /** Swap with the previous row. No-op for the first row. */
  moveUp: () => void;
  /** Swap with the next row. No-op for the last row. */
  moveDown: () => void;
}

type RepeaterProps<T extends Record<string, unknown>> = {
  /** The form whose array field this drives. */
  form: FormApi<T>;
  /** Dotted path to the array field, e.g. `links`. */
  name: string;
  /** Renders the editable fields for one row. */
  children: (item: RepeaterItem) => ReactNode;
  /** Factory for a new row's value when "Add" is pressed. */
  defaultItem: () => unknown;
  addLabel?: string;
  /**
   * Accessible name for a row's Remove control. Per row, so the buttons do not
   * all share one name, and overridable, so it can be translated.
   * @default (index) => `Remove item ${index + 1}`
   */
  removeLabel?: (index: number, count: number) => string;
  /** @default (index) => `Move item ${index + 1} up` */
  moveUpLabel?: (index: number, count: number) => string;
  /** @default (index) => `Move item ${index + 1} down` */
  moveDownLabel?: (index: number, count: number) => string;
  /**
   * Sentence announced in the component's one polite live region when a row is
   * added. `count` is the row count after the change. Return `""` to say
   * nothing.
   * @default (index, count) => `Added item 3. 3 items.`
   */
  addAnnouncement?: (index: number, count: number) => string;
  /** @default (index, count) => `Removed item 2. 2 items.` */
  removeAnnouncement?: (index: number, count: number) => string;
  /** Minimum rows — removal is blocked at this count. @default 0 */
  min?: number;
  /** Maximum rows — adding is blocked at this count. */
  max?: number;
  /** Show up/down reorder controls per row. @default false */
  reorderable?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * The UI layer over {@link useFieldArray}: renders one row per array entry with
 * remove / optional reorder controls and an "Add" button, delegating each row's
 * actual fields to a render-prop child. State lives entirely in the form store —
 * `Repeater` owns no value of its own, so it composes with validation, reset,
 * and submission exactly like any other bound field.
 *
 * @example
 * <FormProvider form={form}>
 *   <form {...form.props}>
 *     <Repeater form={form} name="links" defaultItem={() => ({ url: "" })} addLabel="Add link">
 *       {({ name }) => (
 *         <Field name={`${name}.url`} className="flex-1">
 *           <Input placeholder="https://…" {...form.field(`${name}.url`)} />
 *           <FieldError />
 *         </Field>
 *       )}
 *     </Repeater>
 *   </form>
 * </FormProvider>
 */
export function Repeater<T extends Record<string, unknown>>({
  form,
  name,
  children,
  defaultItem,
  addLabel = "Add",
  removeLabel = (index) => `Remove item ${index + 1}`,
  moveUpLabel = (index) => `Move item ${index + 1} up`,
  moveDownLabel = (index) => `Move item ${index + 1} down`,
  addAnnouncement = (index, count) =>
    `Added item ${index + 1}. ${count} ${count === 1 ? "item" : "items"}.`,
  removeAnnouncement = (index, count) =>
    `Removed item ${index + 1}. ${count} ${count === 1 ? "item" : "items"}.`,
  min = 0,
  max,
  reorderable = false,
  disabled = false,
  className,
}: RepeaterProps<T>) {
  const array = useFieldArray({ form, name });
  const count = array.fields.length;
  const canRemove = count > min;
  const canAdd = max === undefined || count < max;

  const removeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  // Set when a row removes itself: its Remove button is about to unmount, so
  // the successor has to be named before React drops it, or focus falls to
  // <body> with nothing announced.
  const pendingFocus = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const index = pendingFocus.current;
    if (index == null) return;
    pendingFocus.current = null;
    const buttons = removeRefs.current;
    const successor = buttons[index] ?? buttons[index - 1];
    const target =
      successor && !successor.disabled ? successor : addRef.current;
    target?.focus();
  }, [count]);

  function removeRow(index: number) {
    pendingFocus.current = index;
    // The focus move below names the successor control; it never says a row
    // went. Both counts are the ones after the mutation.
    setAnnouncement(removeAnnouncement(index, count - 1));
    array.remove(index);
  }

  function addRow() {
    setAnnouncement(addAnnouncement(count, count + 1));
    array.append(defaultItem());
  }

  return (
    <div className={cn("flex flex-col gap-r4", className)}>
      {/* The rows are a list: without the semantics a screen reader hears a run
          of unrelated fields and cannot tell how many there are or which one it
          is in. */}
      <div role="list" className="flex flex-col gap-r4">
        {array.fields.map((field, index) => {
          const isFirst = index === 0;
          const isLast = index === count - 1;
          return (
            <div key={field.id} role="listitem" className="flex items-start gap-r5">
              {/* A `disabled` fieldset disables every native control inside it,
                  which is the only way `disabled` can reach fields this
                  component does not own. Preflight already strips the UA
                  border/padding/margin; `min-w-0` clears `min-inline-size`. */}
              <fieldset disabled={disabled} className="flex-1 min-w-0">
                {children({
                  id: field.id,
                  name: field.name,
                  index,
                  count,
                  isFirst,
                  isLast,
                  disabled,
                  remove: () => {
                    if (canRemove) removeRow(index);
                  },
                  moveUp: () => {
                    if (!isFirst) array.move(index, index - 1);
                  },
                  moveDown: () => {
                    if (!isLast) array.move(index, index + 1);
                  },
                })}
              </fieldset>
              <div className="flex items-center gap-r6 pt-r6">
                {reorderable && (
                  <>
                    <IconButton
                      type="button"
                      aria-label={moveUpLabel(index, count)}
                      disabled={disabled || isFirst}
                      onClick={() => array.move(index, index - 1)}
                    >
                      <ChevronUp size={16} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      type="button"
                      aria-label={moveDownLabel(index, count)}
                      disabled={disabled || isLast}
                      onClick={() => array.move(index, index + 1)}
                    >
                      <ChevronDown size={16} aria-hidden="true" />
                    </IconButton>
                  </>
                )}
                <IconButton
                  type="button"
                  ref={(node) => {
                    removeRefs.current[index] = node;
                  }}
                  aria-label={removeLabel(index, count)}
                  disabled={disabled || !canRemove}
                  onClick={() => removeRow(index)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <Button
          ref={addRef}
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || !canAdd}
          onClick={addRow}
        >
          <Plus size={16} aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
      {/* One region for the whole repeater, mounted whether or not it holds
          anything: a region created in the same commit as its first text is not
          reliably announced. N rows never become N live regions. */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
