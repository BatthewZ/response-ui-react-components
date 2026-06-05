/**
 * Re-export of the className helpers from `@batthewz/response-ui-tw-merge`.
 *
 * The token list (responsive spacing, semantic colors, text scales) lives in
 * that separate package so it can be consumed independently of React. This
 * module exists purely for ergonomic backwards-compatible imports inside this
 * package.
 *
 * Prefer importing from `@batthewz/response-ui-tw-merge` directly in new code
 * outside this package.
 */
export {
  cn,
  tailwindMergeExtension,
  twMerge,
} from "@batthewz/response-ui-tw-merge";
