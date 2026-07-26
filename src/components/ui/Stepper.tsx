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

import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type StepperOrientation = "horizontal" | "vertical";

type StepperContextValue = {
  activeStep: number;
  orientation: StepperOrientation;
  onStepClick?: (index: number) => void;
  isStepClickable: (index: number) => boolean;
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
} & ComponentPropsWithRef<"ol">;

const StepperRoot = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  {
    activeStep,
    orientation = "horizontal",
    onStepClick,
    isStepClickable = () => true,
    className,
    children,
    ...props
  },
  ref,
) {
  const items = Children.toArray(children);

  return (
    <StepperContext.Provider value={{ activeStep, orientation, onStepClick, isStepClickable }}>
      <ol
        ref={ref}
        className={cn("stepper", className)}
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

type StepStatus = "done" | "active" | "upcoming";

type StepProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
} & Omit<ComponentPropsWithRef<"li">, "title">;

const Step = forwardRef<HTMLLIElement, StepProps>(function Step(
  { title, description, icon, className, ...props },
  ref,
) {
  const { activeStep, orientation, onStepClick, isStepClickable } = useStepperContext();
  const index = useContext(StepIndexContext);
  const clickable = onStepClick != null && isStepClickable(index);

  const status: StepStatus =
    index < activeStep ? "done" : index === activeStep ? "active" : "upcoming";

  const indicatorContent: ReactNode =
    icon ?? (status === "done" ? <Check aria-hidden="true" /> : index + 1);

  // The indicator's own content is a number or an aria-hidden glyph, so a
  // clickable one is unnamed (done) or announces a bare digit (active/upcoming)
  // unless we name it. `aria-current` sits on the <li>, not the control, so the
  // status has to be part of the name to reach a screen reader on the button.
  const indicatorLabel =
    status === "done"
      ? `${title}, completed`
      : status === "active"
        ? `${title}, current step`
        : title;

  return (
    <li
      ref={ref}
      className={cn("stepper-step", className)}
      data-status={status}
      data-orientation={orientation}
      aria-current={status === "active" ? "step" : undefined}
      {...props}
    >
      {clickable && onStepClick ? (
        <button
          type="button"
          className="stepper-indicator"
          aria-label={indicatorLabel}
          onClick={() => onStepClick(index)}
        >
          {indicatorContent}
        </button>
      ) : (
        <span className="stepper-indicator">{indicatorContent}</span>
      )}
      <span className="stepper-content">
        <span className="stepper-title">{title}</span>
        {description && (
          <span className="stepper-description">{description}</span>
        )}
      </span>
      <span className="stepper-connector" aria-hidden="true" />
    </li>
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Stepper = Object.assign(StepperRoot, {
  Step,
});
