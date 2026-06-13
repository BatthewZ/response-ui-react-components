import { Check, Copy } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef, useEffect, useRef, useState } from "react";

import { IconButton } from "./IconButton";

type CopyButtonProps = {
  value: string;
  timeout?: number;
  copiedLabel?: string;
} & Omit<ComponentPropsWithRef<"button">, "value" | "children">;

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  { value, timeout = 2000, copiedLabel = "Copied", onClick, ...props },
  ref
) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (event) => {
    onClick?.(event);
    if (!navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, timeout);
    } catch {
      /* swallow */
    }
  };

  const label = copied ? copiedLabel : "Copy";

  return (
    <IconButton
      ref={ref}
      type="button"
      aria-label={label}
      data-copied={copied || undefined}
      onClick={handleClick}
      {...props}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </IconButton>
  );
});
