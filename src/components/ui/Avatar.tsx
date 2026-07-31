"use client";
import {
  Children,
  cloneElement,
  type ComponentPropsWithRef,
  forwardRef,
  isValidElement,
  type ReactElement,
  useState,
} from "react";

import { cn, type SlotClassNames } from "../../util/style";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type AvatarStatus = "online" | "offline" | "away";

const sizeClassMap: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
};

const initialsTextMap: Record<AvatarSize, string> = {
  xs: "text-body-3",
  sm: "text-body-3",
  md: "text-body-2",
  lg: "text-body-1",
  xl: "text-h3",
};

const statusDotSizeMap: Record<AvatarSize, string> = {
  xs: "size-2",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
  xl: "size-3",
};

// `offline` is ink, not a surface: the dot sits on a `ring-surface-0` ring on a
// rung-0 sheet, and a surface rung is defined relative to the ramp rather than
// guaranteed to contrast with one — at rung 3 the dot all but disappears on a
// dark sheet. `--C-BORDER-STRONG` is the ramp's contrast-carrying neutral, so
// it reads in every theme like its two semantic siblings do.
const statusColorMap: Record<AvatarStatus, string> = {
  online: "bg-status-success",
  offline: "bg-border-strong",
  away: "bg-status-warning",
};

const statusLabelMap: Record<AvatarStatus, string> = {
  online: "Online",
  offline: "Offline",
  away: "Away",
};

/** First *character*, not first UTF-16 code unit — an emoji or astral initial
 *  otherwise came out as a lone surrogate. */
function firstChar(word: string): string {
  return Array.from(word)[0] ?? "";
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return firstChar(words[0]).toUpperCase();
  return (firstChar(words[0]) + firstChar(words[1])).toUpperCase();
}

type AvatarProps = {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  /**
   * Text for `status`, folded into the avatar's accessible name. The presence
   * dot is a colour on its own otherwise, and it sits inside a `role="img"`
   * whose children ARIA makes presentational — so the name is the only route.
   */
  statusLabel?: string;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * root — the positioning box `size` sizes — so the slots are the three parts
   * inside it: the clipping disc, the `<img>` and the presence dot. The union is
   * written out here so an unknown key is a type error rather than a silently
   * ignored one.
   *
   * The initials `<span>` is deliberately absent: it carries no class of its
   * own, so `frame` is where its type scale and fallback fill already live.
   */
  classNames?: SlotClassNames<"frame" | "image" | "status">;
} & Omit<ComponentPropsWithRef<"span">, "children">;

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, alt, name, size = "md", status, statusLabel, className, classNames, ...props },
  ref
) {
  // Keyed by the URL that failed, so a recovered or replaced `src` gets a
  // fresh attempt instead of being latched off for the component's lifetime.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;
  const initials = name ? getInitials(name) : "";
  // Blank or whitespace-only names nothing; `alt=""` reads as decorative, the
  // same as it does on an `<img>`.
  const label = (alt ?? name)?.trim() || undefined;
  const statusText = status ? (statusLabel ?? statusLabelMap[status]) : undefined;
  const accessibleName = [label, statusText].filter(Boolean).join(", ") || undefined;

  return (
    <span
      ref={ref}
      // `role="img"` with no accessible name is a nameless image to AT; without
      // one this is a decorative box.
      role={accessibleName ? "img" : undefined}
      aria-label={accessibleName}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        sizeClassMap[size],
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex size-full items-center justify-center overflow-hidden rounded-full",
          !showImage && "bg-surface-2 text-fg-secondary font-semibold",
          !showImage && initialsTextMap[size],
          classNames?.frame
        )}
      >
        {showImage ? (
          <img
            src={src ?? undefined}
            alt={label ?? ""}
            onError={() => setFailedSrc(src ?? null)}
            className={cn("size-full object-cover", classNames?.image)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-surface-0",
            statusDotSizeMap[size],
            statusColorMap[status],
            classNames?.status
          )}
        />
      )}
    </span>
  );
});

// --- AvatarGroup ---

const groupOverlapMap: Record<AvatarSize, string> = {
  xs: "-space-x-1.5",
  sm: "-space-x-2",
  md: "-space-x-2.5",
  lg: "-space-x-3",
  xl: "-space-x-3.5",
};

type AvatarGroupProps = {
  max?: number;
  size?: AvatarSize;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * row itself, so the slots are the two things it wraps a child in: the ring
   * that separates overlapping faces — which lands on **every** visible child —
   * and the `+N` chip. The union is written out here so an unknown key is a type
   * error rather than a silently ignored one.
   *
   * The children are the caller's own `Avatar`s and already take `className`
   * directly; `itemRing` is the wrapper this component adds around each.
   */
  classNames?: SlotClassNames<"itemRing" | "overflow">;
} & ComponentPropsWithRef<"div">;

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { max, size = "md", className, classNames, children, ...props },
  ref
) {
  const childArray = Children.toArray(children) as ReactElement[];
  const visibleCount = max != null && childArray.length > max ? max : childArray.length;
  const overflowCount = childArray.length - visibleCount;

  // `size` sized the overlap and the +N chip but never the avatars themselves,
  // so a sized group rendered default-sized faces. A `size` set on the child
  // still wins.
  const sizedChildren = childArray.slice(0, visibleCount).map((child) =>
    isValidElement<AvatarProps>(child) && child.type === Avatar && child.props.size === undefined
      ? cloneElement(child, { size })
      : child
  );

  return (
    <div ref={ref} className={cn("flex items-center", groupOverlapMap[size], className)} {...props}>
      {sizedChildren.map((child) => (
        <span key={child.key} className={cn("ring-2 ring-surface-0 rounded-full", classNames?.itemRing)}>
          {child}
        </span>
      ))}
      {overflowCount > 0 && (
        <span
          className={cn(
            // Rung 2, the same fill as an initials fallback above — the +N chip
            // is one of the faces, so it cannot sit on a different rung.
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-secondary font-semibold ring-2 ring-surface-0",
            sizeClassMap[size],
            initialsTextMap[size],
            classNames?.overflow
          )}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
});
