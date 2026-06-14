"use client";
import { type ReactNode } from "react";
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
 * <Repeater form={form} name="links" defaultItem={() => ({ url: "" })} addLabel="Add link">
 *   {({ name }) => (
 *     <Field name={`${name}.url`} className="flex-1">
 *       <Input placeholder="https://…" {...form.field(`${name}.url`)} />
 *       <FieldError />
 *     </Field>
 *   )}
 * </Repeater>
 */
export function Repeater<T extends Record<string, unknown>>({
  form,
  name,
  children,
  defaultItem,
  addLabel = "Add",
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

  return (
    <div className={cn("flex flex-col gap-r4", className)}>
      {array.fields.map((field, index) => {
        const isFirst = index === 0;
        const isLast = index === count - 1;
        return (
          <div key={field.id} className="flex items-start gap-r5">
            <div className="flex-1 min-w-0">
              {children({
                id: field.id,
                name: field.name,
                index,
                count,
                isFirst,
                isLast,
                remove: () => {
                  if (canRemove) array.remove(index);
                },
                moveUp: () => {
                  if (!isFirst) array.move(index, index - 1);
                },
                moveDown: () => {
                  if (!isLast) array.move(index, index + 1);
                },
              })}
            </div>
            <div className="flex items-center gap-r6 pt-r6">
              {reorderable && (
                <>
                  <IconButton
                    type="button"
                    aria-label="Move up"
                    disabled={disabled || isFirst}
                    onClick={() => array.move(index, index - 1)}
                  >
                    <ChevronUp size={16} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    type="button"
                    aria-label="Move down"
                    disabled={disabled || isLast}
                    onClick={() => array.move(index, index + 1)}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </IconButton>
                </>
              )}
              <IconButton
                type="button"
                aria-label="Remove item"
                disabled={disabled || !canRemove}
                onClick={() => array.remove(index)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-r6"
          disabled={disabled || !canAdd}
          onClick={() => array.append(defaultItem())}
        >
          <Plus size={16} aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
