/**
 * The library's focus affordance, expressed as Tailwind utilities — the
 * counterpart to the `:focus-visible` rules in `src/components/**\/*.css`, for
 * the components that carry no stylesheet of their own.
 *
 * Three decisions are settled here rather than re-argued per component:
 *
 * - **The keying is a partition by element category, and it is deliberate.**
 *   Buttons ring on `focus-visible:`; native form controls ring on `focus:`.
 *   A browser matches `:focus-visible` on a clicked *text* field but not on a
 *   clicked checkbox, radio, button or (in some engines) `<select>` — so
 *   `:focus-visible` alone cannot say "every form control rings under the
 *   mouse, no button does", which is the rule this library wants. `:focus` on
 *   the control half says it outright. The two names below carry the category
 *   so the split cannot be re-read as drift and unified away: it was, once,
 *   and the eight doc sentences that recorded the intent were deleted with it.
 * - **`ring-offset-0`.** Tailwind's ring offset paints a solid band of
 *   `--tw-ring-offset-color` — themed to `--C-SURFACE-0` by
 *   `response-ui-css/src/base.css:41-48` — so a non-zero offset is correct only
 *   where the control sits on surface-0, and reads as a halo anywhere else. The
 *   CSS layer never paints a gap: its box-shadow rings are flush
 *   (`box-shadow: 0 0 0 2px var(--C-BORDER-FOCUS)`) and its outline rings use
 *   `outline-offset`, which is transparent. Offset 0 asks nothing of the offset
 *   colour at all.
 * - **No recipe resets the UA outline.** Whether a control replaces the
 *   browser's outline or keeps it alongside the ring is a per-component call and
 *   has never been uniform — `Input`, `Select`, `Textarea`, `OTPInput` and
 *   `Radio` replace it; `Checkbox`, `Button`, `IconButton`
 *   and `Collapsible.Trigger` keep the UA outline, which is contrast-adaptive
 *   and survives forced-colours mode. A site that resets pairs the matching
 *   `focusOutlineReset*` below with its recipe, so the reset and the ring always
 *   answer to the same variant.
 *
 * The rest ring is declared transparent so the colour transitions rather than
 * appearing instantly — which is why every consumer also carries `duration-fast`.
 *
 * Each constant is one flat string literal on purpose: `scripts/verify-focus-affordance.mjs`
 * resolves hoisted class constants textually, and a `${…}`-composed one would not
 * resolve, blinding the guard to every site that consumes it.
 */

/** Buttons and other elements that take focus themselves and draw no border. */
export const focusRingButton =
  "ring-2 ring-transparent focus-visible:ring-border-focus focus-visible:ring-offset-0";

/**
 * Buttons that paint a fill. Identical to `focusRingButton` but for the offset,
 * which restores the 2px band of `--C-SURFACE-0` between the fill and the ring.
 *
 * Measured across the four themes, the ring sits at 1.31:1 against
 * `--C-STATUS-ERROR` and 1.76:1 against `--C-SECONDARY`, but never below 2.72:1
 * against the band. A fill therefore needs the separation; a transparent control
 * is already clear of its surface (2.52:1 at worst) and would only gain a halo,
 * since the band is surface-0 wherever the control actually sits.
 */
export const focusRingButtonFilled =
  "ring-2 ring-transparent focus-visible:ring-border-focus focus-visible:ring-offset-2";

/** Outline reset for a `focusRingButton` site, keyed to match it. */
export const focusOutlineResetButton = "focus-visible:outline-none";

/** Native form controls: the ring plus the swap of the border they draw. */
export const focusRingControl =
  "ring-2 ring-transparent focus:ring-border-focus focus:ring-offset-0 focus:border-border-focus";

/** Outline reset for a `focusRingControl` site, keyed to match it. */
export const focusOutlineResetControl = "focus:outline-none";

/** Invalid state for `focusRingControl` — recolours border and ring together. */
export const focusRingControlError =
  "border-status-error focus:ring-status-error focus:border-status-error";

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
