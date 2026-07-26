"use client";
import { Check, Copy } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef, useEffect, useRef, useState } from "react";

import { IconButton } from "./IconButton";

type CopyButtonProps = {
  value: string;
  timeout?: number;
  copiedLabel?: string;
  /**
   * Called when the write does not happen — the Clipboard API is missing (an
   * insecure context, usually) or `writeText` rejected. Without it the failure
   * is entirely invisible: the icon never changes and nothing is announced.
   */
  onCopyError?: (error: Error) => void;
} & Omit<ComponentPropsWithRef<"button">, "value" | "children">;

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  { value, timeout = 2000, copiedLabel = "Copied", onCopyError, onClick, ...props },
  ref
) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (event) => {
    onClick?.(event);
    if (!navigator.clipboard?.writeText) {
      onCopyError?.(new Error("Clipboard API unavailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      // The await can outlive the component: unmounting mid-write used to leave
      // a state write and a timer with nothing to clear them.
      if (!mountedRef.current) return;
      setCopied(true);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, timeout);
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      onCopyError?.(error instanceof Error ? error : new Error("Clipboard write failed"));
    }
  };

  // An empty `copiedLabel` used to blank the accessible name for the whole
  // confirmation window; the button keeps its own name instead.
  const confirmation = copied ? copiedLabel : "";
  const label = confirmation || "Copy";

  return (
    <>
      <IconButton
        ref={ref}
        type="button"
        aria-label={label}
        {...props}
        data-copied={copied || undefined}
        onClick={handleClick}
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      </IconButton>
      {/* Outside the button: ARIA makes a button's descendants presentational,
          so a live region nested in one is never announced. */}
      <span className="sr-only" role="status" aria-live="polite">
        {confirmation}
      </span>
    </>
  );
});
