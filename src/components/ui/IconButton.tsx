import { type ComponentPropsWithRef, forwardRef } from "react";

import { focusRingButton } from "../../util/focus";
import { cn } from "../../util/style";

// An icon carries no name, so one of the two ARIA name sources is required — but
// either will do. `aria-labelledby` wins the name computation when both are present.
// Intersected, not `Omit`ed: a key is optional in an intersection only when it is
// optional in every member, so the required half of each union member wins over
// React's optional `AriaAttributes` one, and both keys still reach the <button>.
// Arm order is the error message: TypeScript reports the *last* union member as the
// one with the missing key, and a caller who passed neither almost always wanted
// `aria-label`.
type IconButtonProps = (
  | { "aria-label"?: string; "aria-labelledby": string }
  | { "aria-label": string; "aria-labelledby"?: string }
) &
  ComponentPropsWithRef<"button">;

const baseClasses =
  "inline-flex items-center justify-center rounded-md p-r5 text-fg-secondary hover:bg-surface-2 active:bg-surface-3 active:scale-95 motion-reduce:active:scale-100 duration-fast cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, ...props },
  ref
) {
  // The type demands a name source; only a runtime check can tell whether the one
  // supplied says anything. A `string` that is empty at the call site typechecks,
  // and so does one that is only empty on some renders. Whether the ids in a
  // non-empty `aria-labelledby` resolve is the DOM's business, not ours.
  const blank = (v: string | undefined) => v === undefined || v.trim() === "";
  if (blank(props["aria-label"]) && blank(props["aria-labelledby"])) {
    console.warn(
      "IconButton: no accessible name. Pass a non-empty `aria-label`, or an " +
        "`aria-labelledby` naming the element that labels this button — an icon-only " +
        "button with neither is unusable with a screen reader."
    );
  }

  // Before the spread so a caller can still opt into "submit"; without it a
  // bare <button> defaults to type="submit" and every icon button inside a
  // form submits it.
  return (
    <button ref={ref} type="button" className={cn(baseClasses, focusRingButton, className)} {...props} />
  );
});
