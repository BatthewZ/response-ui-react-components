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
} & ComponentPropsWithRef<"ol">;

const StepperRoot = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  {
    activeStep,
    orientation = "horizontal",
    onStepClick,
    className,
    children,
    ...props
  },
  ref,
) {
  const items = Children.toArray(children);

  return (
    <StepperContext.Provider value={{ activeStep, orientation, onStepClick }}>
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
  const { activeStep, orientation, onStepClick } = useStepperContext();
  const index = useContext(StepIndexContext);

  const status: StepStatus =
    index < activeStep ? "done" : index === activeStep ? "active" : "upcoming";

  const indicatorContent: ReactNode =
    icon ?? (status === "done" ? <Check aria-hidden="true" /> : index + 1);

  return (
    <li
      ref={ref}
      className={cn("stepper-step", className)}
      data-status={status}
      data-orientation={orientation}
      aria-current={status === "active" ? "step" : undefined}
      {...props}
    >
      {onStepClick ? (
        <button
          type="button"
          className="stepper-indicator"
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
