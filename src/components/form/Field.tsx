"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useSyncExternalStore,
} from "react";

import { cn } from "../../util/style";

import { useFormContext } from "./use-form";

type FieldContextValue = {
  errorId: string;
  /** Resolved error content (explicit prop or form-derived). */
  error?: ReactNode;
  /** Whether the field is in an error state. */
  invalid: boolean;
};
const FieldContext = createContext<FieldContextValue | null>(null);
export const useFieldContext = () => useContext(FieldContext);

const noopSubscribe = () => () => {};

/** Subscribe to a form field's error via context, falling back to none. */
function useFormFieldError(name: string | undefined): string | undefined {
  const form = useFormContext();
  const subscribe = form ? form.store.subscribe : noopSubscribe;
  const getSnapshot = useCallback(
    () => (form && name ? form.store.getFieldSnapshot(name).error : undefined),
    [form, name],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Resolve a field's invalid/described-by ARIA props from an explicit flag or Field context. */
export function useFieldError(error?: boolean) {
  const field = useFieldContext();
  const invalid = error ?? field?.invalid ?? false;
  return {
    invalid,
    ariaProps: {
      "aria-invalid": invalid ? ("true" as const) : undefined,
      "aria-describedby": invalid && field?.errorId ? field.errorId : undefined,
    },
  };
}

/** Returns aria-invalid and aria-describedby props for a form control inside a Field. */
export function useFieldErrorProps(error?: boolean) {
  return useFieldError(error).ariaProps;
}

type FieldProps = {
  /** Field name — inside a `FormProvider`, wires this field's error automatically. */
  name?: string;
  /** Explicit error content. Overrides any form-derived error. */
  error?: ReactNode;
} & Omit<ComponentPropsWithRef<"div">, "name">;

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, name, error, ...props },
  ref
) {
  const id = useId();
  const errorId = `${id}-error`;
  const formError = useFormFieldError(name);
  const resolvedError = error ?? formError;
  const invalid = resolvedError != null && resolvedError !== false && resolvedError !== "";
  return (
    <FieldContext value={{ errorId, error: resolvedError, invalid }}>
      <div ref={ref} className={cn("flex flex-col gap-r6", className)} {...props} />
    </FieldContext>
  );
});
