/**
 * The library's focus affordance, expressed as Tailwind utilities — the
 * counterpart to the `:focus-visible` rules in `src/components/**\/*.css`, for
 * the components that carry no stylesheet of their own.
 *
 * Two decisions are settled here rather than re-argued per component:
 *
 * - **`focus-visible`, never `focus`.** Not one rule in the 43 component
 *   stylesheets is keyed on plain `:focus`, including the CSS-authored text
 *   inputs (`.combobox-input`, `.colorpicker-hex`) and toggles (`.switch`).
 *   `:focus-visible` already gives each control type the right answer: browsers
 *   match it on a mouse-clicked text field and not on a clicked button or
 *   checkbox, so one keying covers both.
 * - **`ring-offset-0`.** Tailwind's ring offset paints a solid band of
 *   `--tw-ring-offset-color` — themed to `--C-SURFACE-0` by
 *   `response-ui-css/src/base.css:41-48` — so a non-zero offset is correct only
 *   where the control sits on surface-0, and reads as a halo anywhere else. The
 *   CSS layer never paints a gap: its box-shadow rings are flush
 *   (`box-shadow: 0 0 0 2px var(--C-BORDER-FOCUS)`) and its outline rings use
 *   `outline-offset`, which is transparent. Offset 0 asks nothing of the offset
 *   colour at all.
 *
 * The rest ring is declared transparent so the colour transitions rather than
 * appearing instantly — which is why every consumer also carries `duration-fast`.
 *
 * Each constant is one flat string literal on purpose: `scripts/verify-focus-affordance.mjs`
 * resolves hoisted class constants textually, and a `${…}`-composed one would not
 * resolve, blinding the guard to every site that consumes it.
 */

/** Buttons and other elements that take focus themselves and draw no border. */
export const focusRing =
  "ring-2 ring-transparent focus-visible:outline-none focus-visible:ring-border-focus focus-visible:ring-offset-0";

/** Form controls: `focusRing` plus the swap of the border they draw. */
export const focusRingControl =
  "ring-2 ring-transparent focus-visible:outline-none focus-visible:ring-border-focus focus-visible:ring-offset-0 focus-visible:border-border-focus";

/** Invalid state for `focusRingControl` — recolours border and ring together. */
export const focusRingControlError =
  "border-status-error focus-visible:ring-status-error focus-visible:border-status-error";

/**
 * Wrapper boxes that own the border and ring for an input nested inside them.
 * The box is not itself focusable, so `:focus-visible` can never match it —
 * `:focus-within` is the mechanism, as in `MultiSelect.css:25`.
 */
export const focusRingWithin =
  "ring-2 ring-transparent focus-within:ring-border-focus focus-within:ring-offset-0 focus-within:border-border-focus";

/** Invalid state for `focusRingWithin`. */
export const focusRingWithinError =
  "border-status-error focus-within:ring-status-error focus-within:border-status-error";

/**
 * Ring painted on an overlay element while an ancestor `.group` holds focus,
 * for controls whose focusable node cannot carry the ring itself.
 */
export const focusRingGroup =
  "ring-2 ring-transparent group-focus-visible:ring-border-focus group-focus-visible:ring-offset-0";
