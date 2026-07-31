"use client";
import { type ComponentPropsWithRef, createContext, forwardRef, useContext } from "react";

import { cn } from "../../util/style";

type Orientation = "portrait" | "landscape" | "square";

const OrientationContext = createContext<Orientation>("portrait");

const orientationClass: Record<Orientation, string> = {
  portrait: "media-card__image-container--portrait",
  landscape: "media-card__image-container--landscape",
  square: "media-card__image-container--square",
};

/* ------------------------------------------------------------------ */
/*  MediaCard (root)                                                   */
/* ------------------------------------------------------------------ */

type MediaCardProps = {
  orientation?: Orientation;
} & Omit<ComponentPropsWithRef<"article">, "orientation">;

const MediaCardRoot = forwardRef<HTMLElement, MediaCardProps>(function MediaCard(
  { orientation = "portrait", className, children, ...props },
  ref
) {
  return (
    <OrientationContext.Provider value={orientation}>
      <article ref={ref} className={cn("media-card", className)} {...props}>
        {children}
      </article>
    </OrientationContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  MediaCard.Image                                                    */
/* ------------------------------------------------------------------ */

type MediaCardImageProps = {
  src?: string;
  alt: string;
  /**
   * Props for the `<img>` itself. The rest of the bag lands on the aspect box —
   * the outermost element this subcomponent renders — so `loading`, `srcSet`,
   * `sizes`, `decoding`, `onLoad` and an image `ref` all need this. Its
   * `className` merges after the component's own, so `object-contain` beats the
   * default `object-cover`.
   */
  imgProps?: Omit<ComponentPropsWithRef<"img">, "src" | "alt">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const MediaCardImage = forwardRef<HTMLDivElement, MediaCardImageProps>(function MediaCardImage(
  { src, alt, imgProps, className, ...props },
  ref
) {
  const orientation = useContext(OrientationContext);

  return (
    <div
      ref={ref}
      className={cn("media-card__image-container", orientationClass[orientation], className)}
      {...props}
    >
      <img
        loading="lazy"
        {...imgProps}
        src={src}
        alt={alt}
        className={cn("size-full object-cover", imgProps?.className)}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  MediaCard.Overlay                                                  */
/* ------------------------------------------------------------------ */

type MediaCardOverlayProps = ComponentPropsWithRef<"div">;

const MediaCardOverlay = forwardRef<HTMLDivElement, MediaCardOverlayProps>(
  function MediaCardOverlay({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn("media-card__overlay", className)}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  MediaCard.Content                                                  */
/* ------------------------------------------------------------------ */

type MediaCardContentProps = ComponentPropsWithRef<"div">;

const MediaCardContent = forwardRef<HTMLDivElement, MediaCardContentProps>(
  function MediaCardContent({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("media-card__content absolute inset-x-0 bottom-0 z-10 p-r3", className)}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  MediaCard.Badge                                                    */
/* ------------------------------------------------------------------ */

type MediaCardBadgeProps = ComponentPropsWithRef<"div">;

const MediaCardBadge = forwardRef<HTMLDivElement, MediaCardBadgeProps>(function MediaCardBadge(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("absolute top-r5 right-r5 z-10", className)} {...props} />;
});

/* ------------------------------------------------------------------ */
/*  MediaCard.Action                                                   */
/* ------------------------------------------------------------------ */

type MediaCardActionProps = ComponentPropsWithRef<"div">;

const MediaCardAction = forwardRef<HTMLDivElement, MediaCardActionProps>(function MediaCardAction(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "media-card__action absolute inset-0 z-10 flex items-center justify-center",
        className
      )}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const MediaCard = Object.assign(MediaCardRoot, {
  Image: MediaCardImage,
  Overlay: MediaCardOverlay,
  Content: MediaCardContent,
  Badge: MediaCardBadge,
  Action: MediaCardAction,
});
