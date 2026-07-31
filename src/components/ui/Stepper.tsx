"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
} from "react";
import { Check } from "lucide-react";

import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type StepperOrientation = "horizontal" | "vertical";

type StepStatus = "done" | "active" | "upcoming";

/**
 * The status words, merged over by `statusLabels`. `upcoming` is silent by
 * default — it is the absence of progress rather than a state to announce, and
 * its marker still reads its own numeral.
 */
const defaultStatusLabels: Partial<Record<StepStatus, string>> = {
  done: "completed",
  active: "current step",
};

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Stepper.css` keeps its geometry tokens, the connector and the marker's svg
 * rule, and says why at source; everything else this component draws is here.
 * Every BEM name survives as a declaration-free marker (AGENTS.md §"Class names
 * outlive their declarations"), and each constant is one flat string literal
 * because `verify:component-docs` and `verify:focus-affordance` resolve hoisted
 * constants textually.
 *
 * The `[data-status]` and `[data-orientation]` rules are resolved in JS rather
 * than as `in-[…]:` variants: those match ANY ancestor carrying the attribute,
 * so a Stepper nested inside a step would take the outer step's status. Both
 * values are already props here.
 */
const stepperRootClasses = "flex list-none m-0 p-0";

const rootOrientationClass: Record<StepperOrientation, string> = {
  horizontal: "flex-row items-start",
  vertical: "flex-col",
};

const stepClasses = "relative flex gap-r5";

const stepOrientationClass: Record<StepperOrientation, string> = {
  horizontal: "flex-1 flex-col items-center text-center",
  vertical: "flex-row items-start pb-r3 last:pb-0",
};

/**
 * The marker. `box-border` is stated rather than inherited from a reset: the
 * active step thickens the ring, and under content-box that would grow the chip
 * past `--_stepper-indicator-size` and pull it off the connector's centre line,
 * which is positioned from that variable.
 *
 * "Hollow", but it cannot be `transparent`: the chip masks the connector line
 * running behind it (`relative z-1`), so it needs an opaque rung. Rung 2 is
 * recessed and reads hollow; rung 1 is raised and would read as a chip sitting
 * on top. Base, active and upcoming must all match — those states differ by
 * ring, not fill.
 */
const stepIndicatorClasses =
  "relative z-1 flex-none box-border inline-flex items-center justify-center size-[var(--_stepper-indicator-size)] rounded-full border-[length:var(--_stepper-line-width)] border-border-default bg-surface-2 text-fg-muted text-body-3 font-bold";

/**
 * The clickable marker. `padding: 0` and `font-family: inherit` were in the
 * stylesheet's `button.stepper-indicator` rule and are NOT restated: Tailwind
 * Preflight already gives `<button>` `margin: 0`, `padding: 0`, `font: inherit`,
 * `color: inherit`, `background-color: transparent`, `background-image: none`
 * and `border: 0 solid` — checked against `node_modules/tailwindcss/preflight.css`
 * — which is the same reliance `Button.tsx` already ships with no reset at all.
 * What Preflight does NOT give is the pointer cursor and the transition, so
 * those are here.
 */
const indicatorButtonClasses =
  "cursor-pointer transition-[border-color,background-color] duration-150 ease-[ease] motion-reduce:transition-none hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

/**
 * Status, on the marker. Each entry is passed AFTER `stepIndicatorClasses`, so
 * tailwind-merge resolves border/background/colour the modifier's way — the
 * base-vs-modifier pair converted together rather than half of it.
 *
 * done: covered ground — a filled --C-PRIMARY brand chip with a check glyph,
 * lettered and ringed in --C-TEXT-ON-PRIMARY. Per the contrast contract a fill
 * token is only guaranteed to contrast its on-* partner, never the surface;
 * pairing the fill with --C-TEXT-ON-PRIMARY (and using it for the ring) keeps
 * the chip legible even where --C-PRIMARY ≈ surface — there the ring/glyph
 * provably contrast the surface, while staying a quiet halo in themes where the
 * fill already pops.
 *
 * active: "you are here" — NOT yet covered, so it stays an UNFILLED ring rather
 * than a brand chip. The hollow (surface) fill sets it apart from the filled
 * done steps; the HEAVIER ring sets it apart from the thin upcoming ones without
 * asking anyone to see a colour. It uses the progress ink, a text token, because
 * the ring is a stroke on the surface.
 *
 * upcoming restates the base deliberately, so the three states read as three
 * complete recipes rather than two plus a default.
 */
const indicatorStatusClass: Record<StepStatus, string> = {
  done: "border-fg-on-primary bg-primary text-fg-on-primary",
  active:
    "border-[length:var(--_stepper-active-line-width)] border-[var(--stepper-progress-color)] bg-surface-2 text-[var(--stepper-progress-color)]",
  upcoming: "border-border-default bg-surface-2 text-fg-muted",
};

const stepContentClasses = "flex flex-col gap-r6";

const stepTitleClasses = "text-body-2 font-bold text-fg-primary";

/** Base-vs-modifier again, and again both halves convert. */
const titleUpcomingClasses = "text-fg-muted";

const stepDescriptionClasses = "text-body-3 text-fg-secondary";

type StepperContextValue = {
  activeStep: number;
  orientation: StepperOrientation;
  onStepClick?: (index: number) => void;
  isStepClickable: (index: number) => boolean;
  statusLabels: Partial<Record<StepStatus, string>>;
};

const StepperContext = createContext<StepperContextValue | null>(null);

/* Per-item index context (Timeline-style) */
const StepIndexContext = createContext<number>(0);

function useStepperContext() {
  const ctx = useContext(StepperContext);
  if (!ctx)
    throw new Error("Stepper.Step must be used within <Stepper>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Stepper (root)                                                     */
/* ------------------------------------------------------------------ */

type StepperProps = {
  activeStep: number;
  orientation?: StepperOrientation;
  onStepClick?: (index: number) => void;
  /**
   * Which steps `onStepClick` actually acts on. Only those render as buttons —
   * without it a handler that ignores half its indices still left every step a
   * focusable, do-nothing tab stop. @default every step
   */
  isStepClickable?: (index: number) => boolean;
  /**
   * Words for each step's status. Merged over the defaults, so
   * `{ done: "abgeschlossen" }` translates one and `{ done: "" }` drops it.
   * They live on the root rather than on a step because they are the same three
   * words for the whole track — and because a step's rest props land on its
   * `<li>`, never on the marker that carries the name.
   *
   * `active` reaches only the clickable marker's accessible name: the default
   * marker's `<li>` already carries `aria-current="step"`, and a hidden word
   * beside it would announce the state twice.
   * @default { done: "completed", active: "current step" }
   */
  statusLabels?: Partial<Record<StepStatus, string>>;
} & ComponentPropsWithRef<"ol">;

const StepperRoot = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  {
    activeStep,
    orientation = "horizontal",
    onStepClick,
    isStepClickable = () => true,
    statusLabels,
    className,
    children,
    ...props
  },
  ref,
) {
  const items = Children.toArray(children);
  const labels = { ...defaultStatusLabels, ...statusLabels };

  return (
    <StepperContext.Provider
      value={{ activeStep, orientation, onStepClick, isStepClickable, statusLabels: labels }}
    >
      <ol
        ref={ref}
        className={cn("stepper", stepperRootClasses, rootOrientationClass[orientation], className)}
        data-orientation={orientation}
        {...props}
      >
        {items.map((child, index) => (
          <StepIndexContext.Provider key={index} value={index}>
            {child}
          </StepIndexContext.Provider>
        ))}
      </ol>
    </StepperContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Stepper.Step                                                       */
/* ------------------------------------------------------------------ */

type StepProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  /**
   * Class overrides for the parts this step renders. `className` is the `<li>`,
   * so these reach the marker, its text block and the rule that joins it to the
   * next step — none of which a caller can otherwise address.
   *
   * `indicator` lands on the marker in both of its forms: a `<button>` where the
   * step is clickable, a `<span>` where it is not. Which one renders is the
   * root's `onStepClick`/`isStepClickable` decision, not the caller's, so one key
   * has to cover both or the class disappears when a flow becomes navigable.
   */
  classNames?: SlotClassNames<
    "indicator" | "itemBody" | "title" | "description" | "connector"
  >;
} & Omit<ComponentPropsWithRef<"li">, "title">;

const Step = forwardRef<HTMLLIElement, StepProps>(function Step(
  { title, description, icon, className, classNames, ...props },
  ref,
) {
  const { activeStep, orientation, onStepClick, isStepClickable, statusLabels } =
    useStepperContext();
  const index = useContext(StepIndexContext);
  const clickable = onStepClick != null && isStepClickable(index);

  const status: StepStatus =
    index < activeStep ? "done" : index === activeStep ? "active" : "upcoming";

  const indicatorContent: ReactNode =
    icon ?? (status === "done" ? <Check aria-hidden="true" /> : index + 1);

  const statusText = statusLabels[status];

  // The indicator's own content is a number or an aria-hidden glyph, so a
  // clickable one is unnamed (done) or announces a bare digit (active/upcoming)
  // unless we name it. `aria-current` sits on the <li>, not the control, so the
  // status has to be part of the name to reach a screen reader on the button.
  const indicatorLabel = [title, statusText].filter(Boolean).join(", ");

  // One channel, two carriers: the same word, in the name where there is a
  // control to name and as visually-hidden text where there is not. It is
  // withheld from the current step because `aria-current="step"` on the <li>
  // already reaches assistive tech, and adding a second channel to something
  // already announced is worse than adding none.
  const hiddenStatus = status !== "active" && statusText ? statusText : null;

  return (
    <li
      ref={ref}
      className={cn(
        "stepper-step",
        stepClasses,
        stepOrientationClass[orientation],
        className
      )}
      data-status={status}
      data-orientation={orientation}
      aria-current={status === "active" ? "step" : undefined}
      {...props}
    >
      {clickable && onStepClick ? (
        <button
          type="button"
          className={cn(
            "stepper-indicator",
            stepIndicatorClasses,
            indicatorButtonClasses,
            indicatorStatusClass[status],
            classNames?.indicator
          )}
          aria-label={indicatorLabel}
          onClick={() => onStepClick(index)}
        >
          {indicatorContent}
        </button>
      ) : (
        <span
          className={cn(
            "stepper-indicator",
            stepIndicatorClasses,
            indicatorStatusClass[status],
            classNames?.indicator
          )}
        >
          {indicatorContent}
          {hiddenStatus && (
            <span
              // slot:(a) the class *is* the visually-hidden mechanism. The
              // status word is on screen already — the filled chip and the check
              // say it without colour — so this is the text twin, not decoration,
              // and a caller utility arriving here would print it beside the
              // numeral. `Stepper.css` used to hand-roll the clip so the
              // component's styling stayed in one file; that rule no longer
              // holds, so it is Tailwind's `sr-only` now (same declarations,
              // `clip` where the hand-rolled copy used `clip-path`).
              className="stepper-status sr-only"
            >
              {hiddenStatus}
            </span>
          )}
        </span>
      )}
      <span className={cn("stepper-content", stepContentClasses, classNames?.itemBody)}>
        <span
          className={cn(
            "stepper-title",
            stepTitleClasses,
            status === "upcoming" && titleUpcomingClasses,
            classNames?.title
          )}
        >
          {title}
        </span>
        {description && (
          <span
            className={cn("stepper-description", stepDescriptionClasses, classNames?.description)}
          >
            {description}
          </span>
        )}
      </span>
      <span className={cn("stepper-connector", classNames?.connector)} aria-hidden="true" />
    </li>
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Stepper = Object.assign(StepperRoot, {
  Step,
});
