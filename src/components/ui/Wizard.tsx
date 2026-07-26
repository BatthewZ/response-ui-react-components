"use client";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { cn } from "../../util/style";

import { Button } from "./Button";
import { Stepper } from "./Stepper";

/* ------------------------------------------------------------------ */
/*  useWizard — headless step orchestration                            */
/* ------------------------------------------------------------------ */

export interface UseWizardOptions {
  /** Total number of steps. */
  count: number;
  /** Controlled active step index. */
  step?: number;
  /** Uncontrolled initial step. @default 0 */
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Fired when `next()` is called on the last step. */
  onComplete?: () => void;
}

export interface UseWizardReturn {
  /** Current index, `0`…`count`. The terminal `count` means "all steps done". */
  activeStep: number;
  isFirst: boolean;
  /** True on the last actionable step (`count - 1`), not the completed state. */
  isLast: boolean;
  /** True once advanced past the last step — every step renders as done. */
  isComplete: boolean;
  /** Advance a step; on the last step, enter the completed state and fire `onComplete`. */
  next: () => void;
  /** Go back a step (no-op on the first; from the completed state, returns to the last step). */
  back: () => void;
  /** Jump to an arbitrary in-range step. */
  goTo: (step: number) => void;
}

/**
 * Headless multi-step flow controller. Owns nothing but the active index
 * (controllable), exposing `next`/`back`/`goTo` plus `isFirst`/`isLast`. Drive
 * any UI with it — `Wizard` below is one such consumer.
 */
export function useWizard({
  count,
  step,
  defaultStep = 0,
  onStepChange,
  onComplete,
}: UseWizardOptions): UseWizardReturn {
  const [activeStep, setActiveStep] = useControllableState<number>({
    value: step,
    defaultValue: defaultStep,
    onChange: onStepChange,
  });

  const isFirst = activeStep <= 0;
  const isLast = activeStep === count - 1;
  const isComplete = activeStep >= count;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), count - 1);
      setActiveStep(clamped);
    },
    [count, setActiveStep],
  );

  const next = useCallback(() => {
    if (activeStep >= count) return; // already complete — no-op
    // Advancing off the last step lands on `count`, the terminal "all done"
    // index: every step's `index < activeStep`, so the last one flips to done.
    setActiveStep(activeStep + 1);
  }, [activeStep, count, setActiveStep]);

  // `onComplete` follows the *state*, not the request. Fired inside `next` it
  // ran even when a controlled parent refused the advance, and a parent that
  // kept refusing could be told the flow had completed on every press.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const wasComplete = useRef(isComplete);
  useEffect(() => {
    if (isComplete && !wasComplete.current) onCompleteRef.current?.();
    wasComplete.current = isComplete;
  }, [isComplete]);

  const back = useCallback(() => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  }, [activeStep, setActiveStep]);

  return { activeStep, isFirst, isLast, isComplete, next, back, goTo };
}

/* ------------------------------------------------------------------ */
/*  Wizard — Stepper-driven flow with content + nav footer             */
/* ------------------------------------------------------------------ */

export interface WizardStep {
  title: string;
  description?: string;
  content: ReactNode;
}

export type WizardProps = {
  steps: WizardStep[];
  /** Controlled active step index. */
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Fired when the final step's "Finish" is pressed. */
  onComplete?: () => void;
  orientation?: "horizontal" | "vertical";
  /** Allow clicking a completed step in the header to jump back. @default true */
  allowBackNavigation?: boolean;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  className?: string;
  /**
   * Not a Wizard prop — the change channel is `onStepChange`.
   *
   * Declared `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check: `Omit` alone let `{...form.field("x")}` land a handler
   * on the root `<div>`, where a step's own inputs would fire it with a DOM
   * `ChangeEvent`. The destructure below keeps the key off the element too.
   */
  onChange?: never;
} & Omit<ComponentPropsWithRef<"div">, "onChange" | "children">;

/**
 * A guided multi-step flow: the `Stepper` header tracks progress, the active
 * step's `content` renders below, and a footer wires Back / Next (and Finish on
 * the last step). Step state is controllable for cross-step validation — gate
 * `onStepChange`/`onComplete` on your own checks. For full control over layout,
 * use {@link useWizard} directly instead.
 */
export function Wizard({
  steps,
  step,
  defaultStep = 0,
  onStepChange,
  onComplete,
  orientation = "horizontal",
  allowBackNavigation = true,
  backLabel = "Back",
  nextLabel = "Next",
  finishLabel = "Finish",
  className,
  onChange: _onChange,
  ...props
}: WizardProps) {
  const wizard = useWizard({
    count: steps.length,
    step,
    defaultStep,
    onStepChange,
    onComplete,
  });

  // In the terminal completed state `activeStep === steps.length`, so clamp for
  // content lookup — the last step's panel stays visible while its indicator
  // shows done.
  const activeIndex = Math.min(wizard.activeStep, steps.length - 1);
  const active = steps[activeIndex];

  // Only *earlier* steps are reachable from the header. Clamped to `activeIndex`
  // rather than `activeStep` so the completed state does not make the last
  // marker clickable — pressing it would silently un-complete the flow.
  const { activeStep, goTo } = wizard;
  const isStepClickable = useCallback(
    (index: number) => index < Math.min(activeStep, steps.length - 1),
    [activeStep, steps.length],
  );
  // Depends on the two stable pieces of `wizard`, not on `wizard` itself — that
  // is a fresh object literal every render, so the memo never held.
  const onStepClick = useMemo(() => {
    if (!allowBackNavigation) return undefined;
    return (index: number) => goTo(index);
  }, [allowBackNavigation, goTo]);

  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const isInitialRef = useRef(true);
  // Advancing a step replaces the panel with no announcement and no focus move,
  // which is silent for assistive tech. Focusing the named panel is what tells a
  // screen reader user where they now are.
  useEffect(() => {
    if (isInitialRef.current) {
      isInitialRef.current = false;
      return;
    }
    contentRef.current?.focus();
  }, [activeIndex]);

  return (
    <div className={cn("wizard", className)} {...props}>
      <Stepper
        activeStep={wizard.activeStep}
        orientation={orientation}
        onStepClick={onStepClick}
        isStepClickable={isStepClickable}
      >
        {steps.map((s) => (
          <Stepper.Step key={s.title} title={s.title} description={s.description} />
        ))}
      </Stepper>

      {/* Keyed so each step's content remounts: without it React reconciles
          adjacent steps whose content shares a root type, and state bleeds. */}
      <div
        key={activeIndex}
        ref={contentRef}
        id={contentId}
        role="group"
        aria-label={active?.title}
        tabIndex={-1}
        className="wizard__content"
      >
        {active?.content}
      </div>

      <div className="wizard__footer">
        <Button
          type="button"
          variant="ghost"
          onClick={wizard.back}
          disabled={wizard.isFirst}
        >
          {backLabel}
        </Button>
        <Button
          type="button"
          onClick={wizard.next}
          disabled={wizard.isComplete}
        >
          {wizard.isLast || wizard.isComplete ? finishLabel : nextLabel}
        </Button>
      </div>
    </div>
  );
}
