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
 *
 * `cn(className)` with no base class is not a no-op, which is why the roots that
 * paint nothing still call it: the merge collapses the CALLER'S OWN conflicting
 * utilities last-wins, so `className="p-r3 p-r5"` reaches the DOM as `p-r5`
 * rather than as both with stylesheet order picking the winner. Every root in
 * the package behaves the same way as a result.
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

/**
 * Per-slot class overrides for the internals a component renders.
 *
 * `S` is the component's OWN slot union, written inline at the prop
 * (`classNames?: SlotClassNames<"trendIcon">`), never a shared list: that is what
 * makes an unknown key a type error and a known one autocomplete. A helper that
 * accepted `Record<string, string>` would restore neither.
 *
 * There is no `root` key — `className` is the root. Two writers for one element
 * is `CLAUDE.md` rule 3. Values are class strings only; where a caller needs
 * handlers or `aria-*` on an internal, that is a `<thing>Props` hatch.
 */
export type SlotClassNames<S extends string> = Partial<Record<S, string>>;
