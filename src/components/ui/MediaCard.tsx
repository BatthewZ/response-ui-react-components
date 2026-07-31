"use client";
import { type ComponentPropsWithRef, createContext, forwardRef, useContext } from "react";

import { cn } from "../../util/style";

type Orientation = "portrait" | "landscape" | "square";

const OrientationContext = createContext<Orientation>("portrait");

/**
 * The BEM names survive as declaration-free markers; the utility beside each one
 * is what paints it.
 *
 * All three ratios are read as custom properties rather than by token name, even
 * though `aspect-wide` / `aspect-square` do resolve: `verify:component-docs` has
 * no `aspect` entry in its prefix→namespace table, so a name-resolved
 * `aspect-wide` reaches `--ASPECT-WIDE` through no route the gate can see, and
 * `media-card.md` could not tabulate the two ratios at all. The bracket spelling
 * is resolvable, uniform with `--MEDIA-ASPECT-POSTER` (which is in no namespace
 * either), and compiles identically.
 */
const orientationClass: Record<Orientation, string> = {
  portrait: "media-card__image-container--portrait aspect-[var(--MEDIA-ASPECT-POSTER)]",
  landscape: "media-card__image-container--landscape aspect-[var(--ASPECT-WIDE)]",
  square: "media-card__image-container--square aspect-[var(--ASPECT-SQUARE)]",
};

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `MediaCard.css` is gone; every rule it held is here. Each constant is one flat
 * string literal because the docs and focus guards resolve hoisted constants
 * textually and a composed one would not resolve.
 *
 * The lift is `translate` + `scale`, the individual transform properties, not a
 * `transform` shorthand — which is what Tailwind's `translate-y-*` and `scale-*`
 * set. Two consequences, both deliberate: the transition list has to name
 * `translate` and `scale` (transitioning `transform` would animate nothing), and
 * the lift is applied before the scale rather than after it, so the card rises
 * by exactly `--MEDIA-CARD-HOVER-LIFT` instead of by that times the scale. The
 * difference at the shipped values is 0.005rem.
 *
 * Tabbing into a control inside the card is the keyboard's version of hovering
 * it, so `focus-within:` earns the same affordance. `motion-reduce:` utilities
 * are emitted last inside `@layer utilities`, in one `@media` block after every
 * unqualified one (measured with `probe-utility-exists.mjs --css`), so the
 * reduced-motion pair wins at equal specificity — a media query adds none.
 */
const mediaCardClasses =
  "relative overflow-hidden rounded-lg shadow-sm transition-[translate,scale,box-shadow] duration-[var(--MOTION-DURATION-ENTER)] ease-[var(--MOTION-EASE-ENTER)] hover:scale-[var(--MEDIA-CARD-HOVER-SCALE)] hover:translate-y-[var(--MEDIA-CARD-HOVER-LIFT)] hover:shadow-lg focus-within:scale-[var(--MEDIA-CARD-HOVER-SCALE)] focus-within:translate-y-[var(--MEDIA-CARD-HOVER-LIFT)] focus-within:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus motion-reduce:transition-[box-shadow] motion-reduce:hover:translate-none motion-reduce:hover:scale-100";

const mediaCardImageBoxClasses = "relative w-full overflow-hidden";

const mediaCardOverlayClasses =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--OVERLAY-GRADIENT-END),var(--OVERLAY-GRADIENT-START))]";

/**
 * Content sits on top of a dark overlay — force light text in all themes. The
 * `text-fg-primary` is what makes the re-declared variables reach an unstyled
 * child; without it they inherit the ambient page ink over the scrim. Six
 * custom-property writes rather than one `color`, because the descendants that
 * have to be re-inked are `Text`, `Badge` and the rest, each reading its own
 * `--C-TEXT-*` — and a custom property's read site here IS a `color` property,
 * so a utility can set it.
 *
 * Written as arbitrary properties on the element `className` addresses, so a
 * caller's own `[--C-TEXT-PRIMARY:…]` collapses against these in `cn()` rather
 * than racing them in the cascade.
 */
const mediaCardContentClasses =
  "media-card__content absolute inset-x-0 bottom-0 z-10 p-r3 text-fg-primary [--C-TEXT-PRIMARY:oklch(1_0_0)] [--C-TEXT-SECONDARY:oklch(1_0_0_/_0.7)] [--C-TEXT-MUTED:oklch(1_0_0_/_0.5)] [--C-TEXT-INVERSE:oklch(1_0_0)] [--C-TEXT-ON-PRIMARY:oklch(1_0_0)] [--C-TEXT-ON-ACCENT:oklch(1_0_0)]";

/**
 * The action layer spans the whole card so its content can be centred; without
 * `pointer-events-none` it would sit on top of everything and swallow the
 * pointer, and `*:pointer-events-auto` hands hit-testing back to the controls
 * inside it.
 *
 * `> *` and `*:` are not the same rule in a different syntax: `*:` emits
 * `:is(.cls > *)` at 0,1,0 and is sorted AFTER a child's own bare utility, so
 * from `@layer utilities` the parent wins where the stylesheet let the child win
 * (`memory/css-to-utilities.md`). Enumerated rather than assumed before
 * converting: nothing in this package sets `pointer-events` from
 * `@layer components` on anything that could be an action control — the eight
 * live instances are a search icon, a colour-picker readout, slider tracks, a
 * switch thumb, a file-upload hint, two Tabs internals and a Rating overlay —
 * and the two written as utilities (`Accordion`, `Select`) use `disabled:`, at
 * 0,2,0, which out-ranks this. A consumer's own unlayered CSS beats
 * `@layer utilities` either way.
 */
const mediaCardActionClasses =
  "media-card__action absolute inset-0 z-10 flex items-center justify-center pointer-events-none *:pointer-events-auto";

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
      <article ref={ref} className={cn("media-card", mediaCardClasses, className)} {...props}>
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
      className={cn(
        "media-card__image-container",
        mediaCardImageBoxClasses,
        orientationClass[orientation],
        className
      )}
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
        className={cn("media-card__overlay", mediaCardOverlayClasses, className)}
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
        className={cn(mediaCardContentClasses, className)}
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
      className={cn(mediaCardActionClasses, className)}
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
