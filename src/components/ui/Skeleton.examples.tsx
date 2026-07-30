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
      <Skeleton variant="rectangular" height="8rem" />
      <Skeleton variant="rounded" height="8rem" />
      <Skeleton variant="circular" width={40} height={40} />
    </>
  );
}

/** A paragraph placeholder — a short final line stops it reading as a solid block. */
export function TextBlock() {
  return (
    <div className="flex flex-col gap-r6">
      <Skeleton />
      <Skeleton />
      <Skeleton width="65%" />
    </div>
  );
}

/** Match each box to the element it stands in for, so nothing reflows when the data lands. */
export function CommentPlaceholder() {
  return (
    <Card>
      <div className="flex items-start gap-r5">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex flex-1 flex-col gap-r6">
          <Skeleton width="35%" />
          <Skeleton />
          <Skeleton width="70%" />
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
      <Skeleton aria-hidden width="35%" />
      <Skeleton aria-hidden />
      <Skeleton aria-hidden width="70%" />
    </div>
  );
}

/** The `h-48` is LIVE, and Phase 1 is why. `height` is the one dimension `Skeleton`
 *  leaves to CSS when the prop is omitted — `.skeleton { height: 1em }` — and that
 *  rule is now in `@layer components`, below `@layer utilities`, so the utility wins.
 *  `width` is the opposite: it defaults to `"100%"` and always ships as an inline
 *  `style`, which no class beats at any layer, so `w-64` stays inert. */
export function SizedFromClassName() {
  return <Skeleton variant="rounded" width="18rem" className="h-48" />;
}
