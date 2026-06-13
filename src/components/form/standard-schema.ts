// Minimal Standard Schema v1 surface (https://github.com/standard-schema/standard-schema).
// We validate against the *interface*, so consumers bring any conforming
// validator (Zod, Valibot, ArkType, …) with no runtime dependency added here.

/** A validator conforming to the Standard Schema v1 contract. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaProps<Input, Output>;
}

export interface StandardSchemaProps<Input, Output> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
  ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  readonly types?: { readonly input: Input; readonly output: Output } | undefined;
}

export type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly value?: undefined; readonly issues: ReadonlyArray<StandardSchemaIssue> };

export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
}

/** Inferred output (post-coercion) type of a Standard Schema. */
export type InferOutput<Schema> =
  Schema extends StandardSchemaV1<unknown, infer Output> ? Output : never;

/** Inferred input type of a Standard Schema. */
export type InferInput<Schema> =
  Schema extends StandardSchemaV1<infer Input, unknown> ? Input : never;

/** Convert an issue path into a dot-path field name (`""` = form-level). */
function pathToName(path: StandardSchemaIssue["path"]): string {
  if (!path || path.length === 0) return "";
  return path
    .map((segment) =>
      typeof segment === "object" && segment !== null ? segment.key : segment,
    )
    .join(".");
}

/**
 * Group Standard Schema issues into a `name → messages` map.
 * With `criteriaMode: "firstError"` only the first message per field is kept.
 */
export function issuesToErrors(
  issues: ReadonlyArray<StandardSchemaIssue>,
  criteriaMode: "firstError" | "all" = "firstError",
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const name = pathToName(issue.path);
    if (criteriaMode === "firstError" && errors[name]) continue;
    (errors[name] ??= []).push(issue.message);
  }
  return errors;
}
