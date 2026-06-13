/**
 * className helpers for this package.
 *
 * The universal token list (responsive spacing, semantic colors, text scales)
 * lives in `@batthewz/response-ui-tw-merge` so it can be consumed independently
 * of React. This module re-exports those helpers for ergonomic imports inside
 * this package — but the exported `cn` is NOT the bare re-export: this package
 * owns its domain color tokens (trend + chart), defined in `./tokens.css`, and
 * those are no longer part of tw-merge's built-in list. So `cn` is built with
 * `createCn` to teach `tailwind-merge` about them, otherwise `bg-trend-up` /
 * `bg-chart-3` (used by `StatCard.Trend`, `Sparkline`, etc.) wouldn't dedupe.
 *
 * Prefer importing from `@batthewz/response-ui-tw-merge` directly in new code
 * outside this package.
 */
import { createCn } from "@batthewz/response-ui-tw-merge";

export const cn = createCn({
  theme: {
    color: [
      "trend-up",
      "trend-up-bg",
      "trend-down",
      "trend-down-bg",
      "chart-1",
      "chart-2",
      "chart-3",
      "chart-4",
      "chart-5",
    ],
  },
});

export {
  createCn,
  mergeExtension,
  tailwindMergeExtension,
  twMerge,
} from "@batthewz/response-ui-tw-merge";
