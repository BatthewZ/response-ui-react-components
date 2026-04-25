import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The tailwind-merge extension config that teaches twMerge about the design
 * system's custom utilities (responsive spacing r1..r6, semantic colors,
 * heading and body text scales). Re-exported so consumers who add their own
 * tokens can extend it:
 *
 *     import { tailwindMergeExtension } from "@batthewz/response-ui-react-components";
 *     import { extendTailwindMerge } from "tailwind-merge";
 *     const twMerge = extendTailwindMerge({
 *       extend: {
 *         theme: {
 *           ...tailwindMergeExtension.theme,
 *           color: [...tailwindMergeExtension.theme.color, "brand-foo"],
 *         },
 *       },
 *     });
 */
export const tailwindMergeExtension = {
  theme: {
    spacing: ["r1", "r2", "r3", "r4", "r5", "r6"],
    color: [
      "canvas",
      "primary",
      "primary-hover",
      "primary-active",
      "secondary",
      "secondary-hover",
      "accent",
      "accent-hover",
      "surface-0",
      "surface-1",
      "surface-2",
      "surface-3",
      "fg-primary",
      "fg-secondary",
      "fg-muted",
      "fg-inverse",
      "fg-on-primary",
      "fg-on-accent",
      "border-default",
      "border-strong",
      "border-focus",
      "status-error",
      "status-error-bg",
      "status-success",
      "status-success-bg",
      "status-warning",
      "status-warning-bg",
      "status-info",
      "status-info-bg",
    ],
    text: ["h1", "h2", "h3", "h4", "h5", "h6", "body-1", "body-2", "body-3"],
  },
} as const;

export const twMerge = extendTailwindMerge({ extend: tailwindMergeExtension });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
