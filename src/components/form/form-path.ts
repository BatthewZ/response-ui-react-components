// Dot-path get/set helpers for form values. Used by the form store and
// `useFieldArray` so field names like `items.0.name` address nested state.
// Immutable: `setPath` returns a new object/array along the touched path and
// shares untouched branches by reference (so per-field snapshot diffing stays
// cheap and stable).

type AnyRecord = Record<string, unknown>;

const isIndex = (key: string): boolean => /^\d+$/.test(key);

/** Read the value at a dot path. Returns `undefined` for a missing branch. */
export function getPath(source: unknown, name: string): unknown {
  if (!name) return source;
  let current: unknown = source;
  for (const key of name.split(".")) {
    if (current == null) return undefined;
    current = (current as AnyRecord)[key];
  }
  return current;
}

/** Return a shallow clone of `node` suited to the next path segment. */
function cloneBranch(node: unknown, nextKey: string): unknown {
  if (Array.isArray(node)) return node.slice();
  if (node != null && typeof node === "object") return { ...(node as AnyRecord) };
  // Branch is missing/primitive — materialise a container matching the key kind.
  return isIndex(nextKey) ? [] : {};
}

/**
 * Return a new structure with `value` written at the dot path, cloning only the
 * nodes along that path. Untouched siblings keep their identity.
 */
export function setPath<T>(source: T, name: string, value: unknown): T {
  if (!name) return value as T;
  const keys = name.split(".");
  const root = cloneBranch(source, keys[0]) as AnyRecord;

  let cursor: AnyRecord = root;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const cloned = cloneBranch(cursor[key], keys[i + 1]) as AnyRecord;
    cursor[key] = cloned;
    cursor = cloned;
  }
  cursor[keys[keys.length - 1]] = value;
  return root as T;
}
