"use client";
import {
  type ChangeEvent,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  createFormStore,
  type FieldSnapshot,
  type FormStateSnapshot,
  type FormStore,
  type ReValidateMode,
  type ValidationMode,
} from "./form-store";
import type { StandardSchemaV1 } from "./standard-schema";

/** Props to spread on a form control — works on a native input or a controlled component. */
export interface FieldBindings<V> {
  name: string;
  value: V;
  onChange: (
    eventOrValue:
      | V
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onBlur: () => void;
  ref: (element: HTMLElement | null) => void;
  "aria-invalid": true | undefined;
  disabled?: boolean | undefined;
}

/** Helpers handed to `onSubmit`/`onInvalid` so handlers can react without closing over `form`. */
export interface SubmitHelpers<T> {
  setError: (name: string, message: string | string[]) => void;
  reset: (values?: T) => void;
}

export interface UseFormOptions<T> {
  defaultValues: T;
  /** Any Standard Schema validator (Zod, Valibot, ArkType, …). */
  schema?: StandardSchemaV1<unknown, T>;
  /** Reactive external values — when this object's identity changes, the form re-seeds. */
  values?: T;
  /** When validation first runs. @default "onSubmit" */
  mode?: ValidationMode;
  /** When validation re-runs after the first submit. @default "onChange" */
  reValidateMode?: ReValidateMode;
  /** Keep first vs all messages per field. @default "firstError" */
  criteriaMode?: "firstError" | "all";
  /** Focus the first invalid field after a failed submit. @default true */
  shouldFocusError?: boolean;
  /** Disable every field bound via `field()`. */
  disabled?: boolean;
  onSubmit?: (values: T, helpers: SubmitHelpers<T>) => void | Promise<void>;
  onInvalid?: (errors: Record<string, string[]>) => void;
}

export interface FormApi<T> {
  /** Spread onto your `<form>` element. */
  props: { onSubmit: (event: { preventDefault: () => void }) => void; noValidate: true };
  /** Bind a control by name. Annotate non-string values, e.g. `field<string[]>("tags")`. */
  field: <V = string>(name: string) => FieldBindings<V>;
  setValue: (name: string, value: unknown, options?: { shouldTouch?: boolean }) => void;
  setError: (name: string, message: string | string[]) => void;
  clearErrors: (name?: string) => void;
  reset: (values?: T) => void;
  resetField: (name: string) => void;
  /** Imperatively run validation. Resolves to whether the form is valid. */
  trigger: () => Promise<boolean>;
  /** Read the current value of a field (or the whole values object). */
  watch: {
    (): T;
    (name: string): unknown;
  };
  getValues: () => T;
  getValue: (name: string) => unknown;
  focusFirstError: () => void;
  /** Build a submit handler. Falls back to the `onSubmit`/`onInvalid` options. */
  handleSubmit: (
    onValid?: (values: T, helpers: SubmitHelpers<T>) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void,
  ) => (event?: { preventDefault?: () => void }) => Promise<void>;
  /** Live form-level state (re-renders the component using the form on change). */
  formState: FormStateSnapshot;
  /** Underlying store — used by `useFieldArray`, `useFieldState`, `FormProvider`. */
  store: FormStore<T>;
}

interface FieldHandlers {
  onChange: (eventOrValue: unknown) => void;
  onBlur: () => void;
  ref: (element: HTMLElement | null) => void;
}

function isChangeEvent(
  value: unknown,
): value is ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return (
    value != null &&
    typeof value === "object" &&
    "nativeEvent" in value &&
    "target" in value
  );
}

function extractValue(eventOrValue: unknown): unknown {
  if (!isChangeEvent(eventOrValue)) return eventOrValue;
  const target = eventOrValue.target as HTMLInputElement;
  if (target.type === "checkbox") return target.checked;
  return target.value;
}

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>,
): FormApi<T> {
  const {
    defaultValues,
    schema,
    values,
    mode = "onSubmit",
    reValidateMode = "onChange",
    criteriaMode = "firstError",
    disabled = false,
  } = options;

  // The store is created once; option/callback churn is read through a ref.
  const storeRef = useRef<FormStore<T> | null>(null);
  storeRef.current ??= createFormStore<T>({
    defaultValues,
    schema,
    mode,
    reValidateMode,
    criteriaMode,
  });
  const store = storeRef.current;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Re-render the consuming component on any store change so `field()`,
  // `watch()` and `formState` read fresh values. The version is woven into the
  // returned object's memo deps so `formState` is recomputed on every change.
  const version = useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);

  // Re-seed when the reactive `values` prop changes identity.
  const lastValuesRef = useRef(values);
  useEffect(() => {
    if (values !== undefined && values !== lastValuesRef.current) {
      lastValuesRef.current = values;
      store.reset(values);
    }
  }, [values, store]);

  const handlersRef = useRef(new Map<string, FieldHandlers>());
  const getHandlers = useCallback(
    (name: string): FieldHandlers => {
      const existing = handlersRef.current.get(name);
      if (existing) return existing;

      const handlers: FieldHandlers = {
        onChange: (eventOrValue) => {
          store.setValue(name, extractValue(eventOrValue));
          const { mode: m = "onSubmit", reValidateMode: rv = "onChange" } =
            optionsRef.current;
          const submitted = store.getFormState().isSubmitted;
          const touched = store.getFieldSnapshot(name).touched;
          if (
            m === "onChange" ||
            m === "all" ||
            (m === "onTouched" && touched) ||
            (submitted && rv === "onChange")
          ) {
            void store.validate();
          }
        },
        onBlur: () => {
          store.setTouched(name);
          const { mode: m = "onSubmit", reValidateMode: rv = "onChange" } =
            optionsRef.current;
          const submitted = store.getFormState().isSubmitted;
          if (
            m === "onBlur" ||
            m === "onTouched" ||
            m === "all" ||
            (submitted && rv === "onBlur")
          ) {
            void store.validate();
          }
        },
        ref: (element) => store.registerRef(name, element),
      };
      handlersRef.current.set(name, handlers);
      return handlers;
    },
    [store],
  );

  const field = useCallback(
    (name: string): FieldBindings<unknown> => {
      const snapshot = store.getFieldSnapshot(name);
      const handlers = getHandlers(name);
      return {
        name,
        value: snapshot.value,
        onChange: handlers.onChange,
        onBlur: handlers.onBlur,
        ref: handlers.ref,
        "aria-invalid": snapshot.error !== undefined ? true : undefined,
        disabled: disabled || undefined,
      };
    },
    [store, getHandlers, disabled],
  ) as FormApi<T>["field"];

  const handleSubmit = useCallback<FormApi<T>["handleSubmit"]>(
    (onValid, onInvalid) => async (event) => {
      event?.preventDefault?.();
      const { valid, output } = await store.submit();
      if (!valid) {
        store.setSubmitting(false);
        (onInvalid ?? optionsRef.current.onInvalid)?.(store.getErrors());
        if (optionsRef.current.shouldFocusError !== false) store.focusFirstError();
        return;
      }
      const helpers: SubmitHelpers<T> = { setError: store.setError, reset: store.reset };
      try {
        await (onValid ?? optionsRef.current.onSubmit)?.(output, helpers);
        store.setSubmitSuccessful(true);
      } catch (error) {
        store.setSubmitSuccessful(false);
        throw error;
      } finally {
        store.setSubmitting(false);
      }
    },
    [store],
  );

  const watch = useCallback(
    (name?: string) => (name === undefined ? store.getValues() : store.getValue(name)),
    [store],
  ) as FormApi<T>["watch"];

  const submitProp = useMemo(() => handleSubmit(), [handleSubmit]);

  return useMemo<FormApi<T>>(
    () => ({
      props: { onSubmit: submitProp, noValidate: true },
      field,
      setValue: store.setValue,
      setError: store.setError,
      clearErrors: store.clearErrors,
      reset: store.reset,
      resetField: store.resetField,
      trigger: async () => (await store.validate()).valid,
      watch,
      getValues: store.getValues,
      getValue: store.getValue,
      focusFirstError: store.focusFirstError,
      handleSubmit,
      formState: store.getFormState(),
      store,
    }),
    [store, submitProp, field, watch, handleSubmit, version],
  );
}

// — context ——————————————————————————————————————————————————————

const FormContext = createContext<FormApi<Record<string, unknown>> | null>(null);

export function FormProvider<T extends Record<string, unknown>>({
  form,
  children,
}: {
  form: FormApi<T>;
  children: ReactNode;
}) {
  return (
    <FormContext value={form as unknown as FormApi<Record<string, unknown>>}>
      {children}
    </FormContext>
  );
}

/** Read the nearest `FormProvider`'s form. Returns `null` when outside a provider. */
export function useFormContext<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): FormApi<T> | null {
  return useContext(FormContext) as FormApi<T> | null;
}

// — subscribing hooks (opt-in render isolation) ——————————————————————

/** Subscribe to a single field. Re-renders only when that field's slice changes. */
export function useFieldState<T extends Record<string, unknown>>(
  form: FormApi<T>,
  name: string,
): FieldSnapshot {
  const getSnapshot = useCallback(
    () => form.store.getFieldSnapshot(name),
    [form.store, name],
  );
  return useSyncExternalStore(form.store.subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to form-level state. Re-renders only when a form-level flag changes. */
export function useFormState<T extends Record<string, unknown>>(
  form: FormApi<T>,
): FormStateSnapshot {
  return useSyncExternalStore(
    form.store.subscribe,
    form.store.getFormState,
    form.store.getFormState,
  );
}

// — field arrays ——————————————————————————————————————————————————

export interface FieldArrayItem {
  /** Stable key surviving reorders — use as React `key`. */
  id: number;
  /** Base name for this row's controls, e.g. `items.0`. */
  name: string;
}

export interface UseFieldArrayReturn {
  fields: FieldArrayItem[];
  append: (value: unknown) => void;
  prepend: (value: unknown) => void;
  insert: (index: number, value: unknown) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  swap: (a: number, b: number) => void;
  update: (index: number, value: unknown) => void;
  replace: (values: unknown[]) => void;
}

export function useFieldArray<T extends Record<string, unknown>>({
  form,
  name,
}: {
  form: FormApi<T>;
  name: string;
}): UseFieldArrayReturn {
  const { store } = form;
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);

  const value = store.getValue(name);
  const items = Array.isArray(value) ? value : [];
  const ids = store.getArrayIds(name);
  const fields = items.map((_, index) => ({
    id: ids[index] ?? index,
    name: `${name}.${index}`,
  }));

  // Callbacks are stable per (store, name); `fields` is derived fresh each render.
  const actions = useMemo(
    () => ({
      append: (item: unknown) => store.arrayAppend(name, item),
      prepend: (item: unknown) => store.arrayPrepend(name, item),
      insert: (index: number, item: unknown) => store.arrayInsert(name, index, item),
      remove: (index: number) => store.arrayRemove(name, index),
      move: (from: number, to: number) => store.arrayMove(name, from, to),
      swap: (a: number, b: number) => store.arraySwap(name, a, b),
      update: (index: number, item: unknown) => store.arrayUpdate(name, index, item),
      replace: (values: unknown[]) => store.arrayReplace(name, values),
    }),
    [store, name],
  );

  return { fields, ...actions };
}
