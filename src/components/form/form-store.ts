// Framework-agnostic form store. Holds values/errors/touched, runs Standard
// Schema validation, and exposes subscribe/getSnapshot so React components can
// bind to it via `useSyncExternalStore`. No React imports live here.

import { getPath, setPath } from "./form-path";
import {
  issuesToErrors,
  type StandardSchemaIssue,
  type StandardSchemaV1,
} from "./standard-schema";

export type ValidationMode = "onSubmit" | "onBlur" | "onChange" | "onTouched" | "all";
export type ReValidateMode = "onChange" | "onBlur";

export interface FormStoreOptions<T> {
  defaultValues: T;
  schema?: StandardSchemaV1<unknown, T>;
  mode?: ValidationMode;
  reValidateMode?: ReValidateMode;
  criteriaMode?: "firstError" | "all";
}

/** Per-field view bound by a subscribing field component. Stable across changes. */
export interface FieldSnapshot {
  value: unknown;
  errors: string[];
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
}

/** Whole-form view bound by `useFormState`. Stable across changes. */
export interface FormStateSnapshot {
  isSubmitting: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

const EMPTY_ERRORS: string[] = [];

/** Return a new record without `key`, or the original record if absent. */
function omitKey<V>(record: Record<string, V>, key: string): Record<string, V> {
  if (!(key in record)) return record;
  const { [key]: _omitted, ...rest } = record;
  return rest;
}

/**
 * Rewrite `<prefix><index>` / `<prefix><index>.rest` keys through `moved`
 * (old index → new index, `-1` = the row is gone, so its entry is dropped).
 * Keys outside the prefix, and indices `moved` says nothing about, pass through.
 */
function remapIndexedKeys<V>(
  record: Record<string, V>,
  prefix: string,
  moved: ReadonlyMap<number, number>,
): Record<string, V> {
  const out: Record<string, V> = {};
  const remapped: Array<[string, V]> = [];
  for (const [key, value] of Object.entries(record)) {
    if (!key.startsWith(prefix)) {
      out[key] = value;
      continue;
    }
    const rest = key.slice(prefix.length);
    const dot = rest.indexOf(".");
    const segment = dot === -1 ? rest : rest.slice(0, dot);
    const to = /^\d+$/.test(segment) ? moved.get(Number(segment)) : undefined;
    if (to === undefined) out[key] = value;
    else if (to !== -1) {
      remapped.push([`${prefix}${to}${dot === -1 ? "" : rest.slice(dot)}`, value]);
    }
  }
  // Applied last so a real row always beats a pass-through key that happens to
  // sit at the index it moved into — otherwise the winner is key-order luck.
  for (const [key, value] of remapped) out[key] = value;
  return out;
}

const fieldSnapshotEqual = (a: FieldSnapshot, b: FieldSnapshot): boolean =>
  Object.is(a.value, b.value) &&
  a.error === b.error &&
  a.touched === b.touched &&
  a.dirty === b.dirty &&
  a.errors.length === b.errors.length &&
  a.errors.every((message, i) => message === b.errors[i]);

const formStateEqual = (a: FormStateSnapshot, b: FormStateSnapshot): boolean =>
  a.isSubmitting === b.isSubmitting &&
  a.isSubmitted === b.isSubmitted &&
  a.isSubmitSuccessful === b.isSubmitSuccessful &&
  a.isValidating === b.isValidating &&
  a.isValid === b.isValid &&
  a.isDirty === b.isDirty &&
  a.submitCount === b.submitCount;

export interface ValidationOutcome<T> {
  valid: boolean;
  /** Coerced schema output when valid, else the raw current values. */
  output: T;
}

export class FormStore<T> {
  private values: T;
  private defaults: T;
  private readonly schema?: StandardSchemaV1<unknown, T>;
  private readonly criteriaMode: "firstError" | "all";

  /** Errors from the most recent schema validation, keyed by field name. */
  private schemaErrors: Record<string, string[]> = {};
  /** Errors set imperatively (server/manual). Take precedence; survive a pass. */
  private manualErrors: Record<string, string[]> = {};
  private touched: Record<string, boolean> = {};

  private isSubmitting = false;
  private isSubmitSuccessful = false;
  private isValidating = false;
  private submitCount = 0;

  /** Field elements registered for `focusFirstError`, in registration order. */
  private readonly fieldRefs = new Map<string, HTMLElement | null>();
  /** Stable ids per field-array name, kept parallel to the array's items. */
  private readonly arrayIds = new Map<string, number[]>();
  private nextArrayId = 1;

  private readonly listeners = new Set<() => void>();
  private readonly fieldCache = new Map<string, FieldSnapshot>();
  private formStateCache: FormStateSnapshot | null = null;
  /** Monotonic counter bumped on every change — a stable whole-store snapshot. */
  private version = 0;

  constructor(options: FormStoreOptions<T>) {
    this.defaults = options.defaultValues;
    this.values = options.defaultValues;
    this.schema = options.schema;
    this.criteriaMode = options.criteriaMode ?? "firstError";
  }

  // — subscription ————————————————————————————————————————————————

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  /** Stable snapshot of the whole store — changes on every mutation. */
  getVersion = (): number => this.version;

  // — reads ——————————————————————————————————————————————————————

  getValues = (): T => this.values;
  getValue = (name: string): unknown => getPath(this.values, name);

  private isFieldDirty(name: string): boolean {
    return !Object.is(getPath(this.values, name), getPath(this.defaults, name));
  }

  /**
   * Surfaced errors for a field: manual errors always win; schema errors show
   * once the field has been interacted with (touched, changed) or the form was
   * submitted — so we never flash errors at a field the user hasn't reached.
   */
  private surfacedErrors(name: string): string[] {
    if (this.manualErrors[name]) return this.manualErrors[name];
    const surfaceable =
      this.submitCount > 0 || this.touched[name] === true || this.isFieldDirty(name);
    if (surfaceable && this.schemaErrors[name]) return this.schemaErrors[name];
    return EMPTY_ERRORS;
  }

  /** Map of every surfaced field error — for `onInvalid` callbacks. */
  getErrors = (): Record<string, string[]> => {
    const names = new Set<string>([
      ...Object.keys(this.schemaErrors),
      ...Object.keys(this.manualErrors),
    ]);
    const out: Record<string, string[]> = {};
    for (const name of names) {
      const errors = this.surfacedErrors(name);
      if (errors.length > 0) out[name] = errors;
    }
    return out;
  };

  private get isValid(): boolean {
    return (
      Object.keys(this.schemaErrors).length === 0 &&
      Object.keys(this.manualErrors).length === 0
    );
  }

  private get isDirty(): boolean {
    return !Object.is(this.values, this.defaults);
  }

  getFieldSnapshot = (name: string): FieldSnapshot => {
    const errors = this.surfacedErrors(name);
    const next: FieldSnapshot = {
      value: getPath(this.values, name),
      errors,
      error: errors[0],
      touched: this.touched[name] === true,
      dirty: this.isFieldDirty(name),
    };
    const prev = this.fieldCache.get(name);
    if (prev && fieldSnapshotEqual(prev, next)) return prev;
    this.fieldCache.set(name, next);
    return next;
  };

  getFormState = (): FormStateSnapshot => {
    const next: FormStateSnapshot = {
      isSubmitting: this.isSubmitting,
      isSubmitted: this.submitCount > 0,
      isSubmitSuccessful: this.isSubmitSuccessful,
      isValidating: this.isValidating,
      isValid: this.isValid,
      isDirty: this.isDirty,
      submitCount: this.submitCount,
    };
    if (this.formStateCache && formStateEqual(this.formStateCache, next)) {
      return this.formStateCache;
    }
    this.formStateCache = next;
    return next;
  };

  // — writes —————————————————————————————————————————————————————

  setValue = (
    name: string,
    value: unknown,
    options: { shouldTouch?: boolean } = {},
  ): void => {
    this.values = setPath(this.values, name, value);
    // A user-supplied value supersedes any manual error on that field.
    this.manualErrors = omitKey(this.manualErrors, name);
    if (options.shouldTouch) this.touched[name] = true;
    this.emit();
  };

  setTouched = (name: string, touched = true): void => {
    if (this.touched[name] === touched) return;
    this.touched[name] = touched;
    this.emit();
  };

  setError = (name: string, message: string | string[]): void => {
    this.manualErrors = {
      ...this.manualErrors,
      [name]: Array.isArray(message) ? message : [message],
    };
    this.touched[name] = true;
    this.emit();
  };

  clearErrors = (name?: string): void => {
    if (name === undefined) {
      this.manualErrors = {};
      this.schemaErrors = {};
    } else {
      this.manualErrors = omitKey(this.manualErrors, name);
      this.schemaErrors = omitKey(this.schemaErrors, name);
    }
    this.emit();
  };

  reset = (values?: T): void => {
    this.values = values ?? this.defaults;
    if (values !== undefined) this.defaults = values;
    this.schemaErrors = {};
    this.manualErrors = {};
    this.touched = {};
    this.submitCount = 0;
    this.isSubmitting = false;
    this.isSubmitSuccessful = false;
    this.isValidating = false;
    this.arrayIds.clear();
    this.emit();
  };

  resetField = (name: string): void => {
    this.values = setPath(this.values, name, getPath(this.defaults, name));
    this.manualErrors = omitKey(this.manualErrors, name);
    this.schemaErrors = omitKey(this.schemaErrors, name);
    delete this.touched[name];
    this.emit();
  };

  setSubmitting = (value: boolean): void => {
    this.isSubmitting = value;
    this.emit();
  };

  // — validation —————————————————————————————————————————————————

  /** Run the schema over current values, update errors, return the outcome. */
  async validate(): Promise<ValidationOutcome<T>> {
    if (!this.schema) {
      return { valid: this.isValid, output: this.values };
    }

    this.isValidating = true;
    this.emit();

    let result: Awaited<ReturnType<StandardSchemaV1<unknown, T>["~standard"]["validate"]>>;
    try {
      result = await this.schema["~standard"].validate(this.values);
    } finally {
      this.isValidating = false;
    }

    if (result.issues) {
      this.schemaErrors = issuesToErrors(
        result.issues as ReadonlyArray<StandardSchemaIssue>,
        this.criteriaMode,
      );
      this.emit();
      return { valid: false, output: this.values };
    }

    this.schemaErrors = {};
    this.emit();
    return { valid: true, output: result.value };
  }

  /** Mark a submit attempt (surfaces all errors) and validate. */
  async submit(): Promise<ValidationOutcome<T>> {
    this.submitCount += 1;
    this.isSubmitting = true;
    this.emit();
    const outcome = await this.validate();
    return {
      valid: outcome.valid && Object.keys(this.manualErrors).length === 0,
      output: outcome.output,
    };
  }

  setSubmitSuccessful = (value: boolean): void => {
    this.isSubmitSuccessful = value;
    this.emit();
  };

  // — focus ——————————————————————————————————————————————————————

  registerRef = (name: string, element: HTMLElement | null): void => {
    if (element === null) this.fieldRefs.delete(name);
    else this.fieldRefs.set(name, element);
  };

  focusFirstError = (): void => {
    for (const [name, element] of this.fieldRefs) {
      if (element && this.surfacedErrors(name).length > 0) {
        element.focus();
        return;
      }
    }
  };

  // — field arrays ———————————————————————————————————————————————

  private idsFor(name: string, length: number): number[] {
    let ids = this.arrayIds.get(name);
    if (!ids) {
      ids = [];
      this.arrayIds.set(name, ids);
    }
    while (ids.length < length) ids.push(this.nextArrayId++);
    if (ids.length > length) ids.length = length;
    return ids;
  }

  getArrayIds = (name: string): number[] => {
    const array = this.getValue(name);
    return [...this.idsFor(name, Array.isArray(array) ? array.length : 0)];
  };

  private readArray(name: string): unknown[] {
    const array = this.getValue(name);
    return Array.isArray(array) ? array : [];
  }

  /** Copy of the ids for `name`, normalised to the array's current length. */
  private currentIds(name: string): number[] {
    return [...this.idsFor(name, this.readArray(name).length)];
  }

  /**
   * Move each row's error/touched entries to the row's new index. Errors and
   * `touched` are keyed by dotted path (`links.0.url`), so a mutation that only
   * rewrote `values` would leave a message pinned to whichever row inherited
   * the index. The stable ids are the single source of truth for where a row
   * went: an id that moved takes its state along, an id that vanished takes its
   * state with it.
   */
  private remapArrayKeys(name: string, prevIds: number[], nextIds: number[]): void {
    const moved = new Map<number, number>();
    let changed = false;
    prevIds.forEach((id, from) => {
      const to = nextIds.indexOf(id);
      moved.set(from, to);
      if (to !== from) changed = true;
    });
    if (!changed) return;

    const prefix = `${name}.`;
    this.schemaErrors = remapIndexedKeys(this.schemaErrors, prefix, moved);
    this.manualErrors = remapIndexedKeys(this.manualErrors, prefix, moved);
    this.touched = remapIndexedKeys(this.touched, prefix, moved);
  }

  private commitArray(
    name: string,
    next: unknown[],
    ids: number[],
    prevIds: number[],
  ): void {
    this.remapArrayKeys(name, prevIds, ids);
    this.arrayIds.set(name, ids);
    this.values = setPath(this.values, name, next);
    this.emit();
  }

  arrayAppend = (name: string, value: unknown): void => {
    const current = this.readArray(name);
    const prevIds = this.currentIds(name);
    this.commitArray(
      name,
      [...current, value],
      [...prevIds, this.nextArrayId++],
      prevIds,
    );
  };

  arrayPrepend = (name: string, value: unknown): void => {
    const current = this.readArray(name);
    const prevIds = this.currentIds(name);
    this.commitArray(
      name,
      [value, ...current],
      [this.nextArrayId++, ...prevIds],
      prevIds,
    );
  };

  arrayInsert = (name: string, index: number, value: unknown): void => {
    const current = this.readArray(name);
    const prevIds = this.currentIds(name);
    const next = [...current.slice(0, index), value, ...current.slice(index)];
    const nextIds = [
      ...prevIds.slice(0, index),
      this.nextArrayId++,
      ...prevIds.slice(index),
    ];
    this.commitArray(name, next, nextIds, prevIds);
  };

  arrayRemove = (name: string, index: number): void => {
    const current = this.readArray(name);
    const prevIds = this.currentIds(name);
    this.commitArray(
      name,
      current.filter((_, i) => i !== index),
      prevIds.filter((_, i) => i !== index),
      prevIds,
    );
  };

  arrayMove = (name: string, from: number, to: number): void => {
    const next = this.readArray(name).slice();
    const prevIds = this.currentIds(name);
    const ids = prevIds.slice();
    const [item] = next.splice(from, 1);
    const [id] = ids.splice(from, 1);
    next.splice(to, 0, item);
    ids.splice(to, 0, id);
    this.commitArray(name, next, ids, prevIds);
  };

  arraySwap = (name: string, a: number, b: number): void => {
    const next = this.readArray(name).slice();
    const prevIds = this.currentIds(name);
    const ids = prevIds.slice();
    [next[a], next[b]] = [next[b], next[a]];
    [ids[a], ids[b]] = [ids[b], ids[a]];
    this.commitArray(name, next, ids, prevIds);
  };

  arrayUpdate = (name: string, index: number, value: unknown): void => {
    const next = this.readArray(name).slice();
    next[index] = value;
    const prevIds = this.currentIds(name);
    const nextIds = prevIds.slice();
    while (nextIds.length < next.length) nextIds.push(this.nextArrayId++);
    this.commitArray(name, next, nextIds, prevIds);
  };

  arrayReplace = (name: string, values: unknown[]): void => {
    // Every row is new, so no id survives — the array's stale error/touched
    // entries go with the rows they described.
    const prevIds = this.currentIds(name);
    const nextIds = values.map(() => this.nextArrayId++);
    this.commitArray(name, [...values], nextIds, prevIds);
  };
}

export function createFormStore<T>(options: FormStoreOptions<T>): FormStore<T> {
  return new FormStore<T>(options);
}
