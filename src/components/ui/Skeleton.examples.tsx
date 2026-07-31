import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

/** The default: a full-width `text` placeholder, one line tall, pulsing. */
export function Minimal() {
  return <Skeleton />;
}

/** Four shapes. Only `text` brings a height of its own — the other three collapse without one. */
export function Variants() {
  return (
    <>
      <Skeleton variant="text" />
      <Skeleton variant="rectangular" className="h-32" />
      <Skeleton variant="rounded" className="h-32" />
      <Skeleton variant="circular" className="w-10" />
    </>
  );
}

/** A paragraph placeholder — a short final line stops it reading as a solid block. */
export function TextBlock() {
  return (
    <div className="flex flex-col gap-r6">
      <Skeleton />
      <Skeleton />
      <Skeleton className="w-[65%]" />
    </div>
  );
}

/** Match each box to the element it stands in for, so nothing reflows when the data lands. */
export function CommentPlaceholder() {
  return (
    <Card>
      <div className="flex items-start gap-r5">
        <Skeleton variant="circular" className="w-10" />
        <div className="flex flex-1 flex-col gap-r6">
          <Skeleton className="w-[35%]" />
          <Skeleton />
          <Skeleton className="w-[70%]" />
        </div>
      </div>
    </Card>
  );
}

/** Each Skeleton is its own live region — hide them all and announce the wait once yourself. */
export function AnnounceOnce() {
  return (
    <div role="status" className="flex flex-col gap-r6">
      <span className="sr-only">Loading recent comments</span>
      <Skeleton aria-hidden className="w-[35%]" />
      <Skeleton aria-hidden />
      <Skeleton aria-hidden className="w-[70%]" />
    </div>
  );
}

/** Both dimensions come from `className` now, and both are live. `w-72` out-merges the
 *  `w-full` in the root class list via `cn`; `h-48` beats `.skeleton { height: 1em }`,
 *  which is in `@layer components`, below `@layer utilities`. Neither route existed for
 *  width before the size props were dropped — an inline `100%` shipped on every render. */
export function SizedFromClassName() {
  return <Skeleton variant="rounded" className="h-48 w-72" />;
}
