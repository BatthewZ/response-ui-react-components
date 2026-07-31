"use client";
import {
  type ComponentPropsWithRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { matchesAccept } from "../../util/accept";
import { focusRingGroup } from "../../util/focus";
import { cn, type SlotClassNames } from "../../util/style";

import { Avatar } from "./Avatar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarUploadResult {
  /** URL to display after upload completes (and persist on the user record). */
  url: string;
}

/** Displayed image that overrides `src`; `objectUrl` marks it as ours to revoke. */
type Preview = { url: string; objectUrl: boolean };

export type AvatarUploadProps<TResult extends AvatarUploadResult = AvatarUploadResult> = {
  /** Current avatar image URL. */
  src?: string | null;
  /** User display name (used for initials fallback). */
  name?: string;
  /** Avatar size — defaults to `"xl"`. */
  size?: AvatarSize;
  /**
   * Upload handler. Receives the chosen `File` and must return an object with
   * a `url` for the post-upload preview. Throw or reject to surface an error.
   * If absent, AvatarUpload becomes a presentational picker only.
   */
  onUpload?: (file: File) => Promise<TResult>;
  /** Called after a successful upload with the handler's result. */
  onUploadComplete?: (data: TResult) => void;
  /** Called if `onUpload` throws or validation fails. */
  onUploadError?: (error: Error) => void;
  /**
   * Accepted file rules for client-side validation, in the same grammar as the
   * input's `accept` attribute this array also feeds: exact MIME (`image/png`),
   * wildcard MIME (`image/*`), or extension (`.pdf`). A file with no `type`
   * matches only an extension rule.
   */
  accept?: readonly string[];
  /** Maximum file size in bytes. */
  maxSize?: number;
  /**
   * How long the error tooltip stays on screen, in milliseconds. `0` keeps it up
   * until it is dismissed or the next file is chosen — the pre-#386 behaviour.
   * The `role="alert"` region is announced once regardless of this.
   * @default 5000
   */
  errorTimeout?: number;
  /**
   * Props for the inner [Avatar](Avatar.tsx). This component's own `className`,
   * `ref` and rest props all land on the pressable root, so without this bag the
   * avatar underneath had no route of any kind — including to its own
   * `classNames` slots. `src`, `name` and `size` are omitted because this
   * component owns them: `src` is the upload preview and `size` also drives the
   * root's box.
   *
   * Its `className` merges after `size-full`, so a caller who wants a square
   * avatar can say so.
   */
  avatarProps?: Omit<ComponentPropsWithRef<typeof Avatar>, "src" | "name" | "size">;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * pressable root and `avatarProps` reaches the avatar, so these three are the
   * chrome stacked on top of it. The union is written out here so an unknown key
   * is a type error rather than a silently ignored one.
   *
   * `overlay` is the hover scrim — the same concept, and the same word, as
   * `Hero`'s and `MediaCard`'s. `spinner` and `error` render only while
   * uploading and only while a message is up, respectively.
   */
  classNames?: SlotClassNames<"overlay" | "spinner" | "error">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

/* ------------------------------------------------------------------ */
/*  Size mappings                                                      */
/* ------------------------------------------------------------------ */

const containerSizeMap: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
};

/* ------------------------------------------------------------------ */
/*  Camera icon SVG                                                    */
/* ------------------------------------------------------------------ */

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function validateFile(
  file: File,
  accept?: readonly string[],
  maxSize?: number,
): string | null {
  if (accept && !matchesAccept(file, accept)) {
    return `File type "${file.type || "unknown"}" is not allowed. Accepted: ${accept.join(", ")}.`;
  }
  if (maxSize != null && file.size > maxSize) {
    return `File is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(maxSize)}.`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * A plain generic function component rather than `forwardRef` (#383): a
 * `forwardRef<HTMLDivElement, AvatarUploadProps>` erases `TResult`, so
 * `onUploadComplete` could never see a field `onUpload` returned beyond `url`.
 * React 19 takes `ref` as an ordinary prop, and `ComponentPropsWithRef<"div">`
 * already carries it, so the public shape — `<AvatarUpload ref={…} />` — is
 * unchanged. `DataTable`, `VirtualizedDataTable` and `Repeater` are the other
 * generic components here and none of them is a `forwardRef` either.
 */
export function AvatarUpload<TResult extends AvatarUploadResult = AvatarUploadResult>({
  src,
  name,
  size = "xl",
  onUpload,
  onUploadComplete,
  onUploadError,
  accept,
  maxSize,
  errorTimeout = 5000,
  avatarProps,
  className,
  classNames,
  onClick,
  onKeyDown,
  ref,
  ...props
}: AvatarUploadProps<TResult>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displaySrc = preview?.url ?? src;
  const objectUrl = preview?.objectUrl ? preview.url : null;

  // Revoke only once the DOM has stopped pointing at it: cleanup runs after commit.
  useEffect(() => {
    if (!objectUrl) return undefined;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // #386 — the message used to survive until the *next successful* selection, so
  // opening the picker and cancelling left it sitting over whatever follows.
  // Keyed on `error` so each new message restarts its own clock.
  useEffect(() => {
    if (error == null || errorTimeout <= 0) return undefined;
    const id = setTimeout(() => setError(null), errorTimeout);
    return () => clearTimeout(id);
  }, [error, errorTimeout]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || uploading) return;
      // Re-opening the picker dismisses the previous failure, whether or not
      // this attempt gets as far as choosing a file.
      setError(null);
      inputRef.current?.click();
    },
    [onClick, uploading],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      // Escape dismisses the message without opening anything — the keyboard
      // half of "dismiss", and it works while an upload is in flight.
      if (e.key === "Escape") {
        setError(null);
        return;
      }
      if (uploading) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setError(null);
        inputRef.current?.click();
      }
    },
    [onKeyDown, uploading],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setError(null);

      const validationError = validateFile(file, accept, maxSize);
      if (validationError) {
        setError(validationError);
        onUploadError?.(new Error(validationError));
        return;
      }

      // Show optimistic preview. Revocation is owned by the effect above.
      setPreview({ url: URL.createObjectURL(file), objectUrl: true });

      if (!onUpload) return;

      setUploading(true);
      try {
        const result = await onUpload(file);
        setPreview({ url: result.url, objectUrl: false });
        onUploadComplete?.(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setError(message);
        setPreview(null);
        onUploadError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setUploading(false);
      }
    },
    [accept, maxSize, onUpload, onUploadComplete, onUploadError],
  );

  return (
    <>
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label="Change avatar"
        // While `onUpload` is pending every press is dropped on the floor;
        // without these the control looked idle and simply did nothing.
        aria-busy={uploading || undefined}
        aria-disabled={uploading || undefined}
        className={cn(
          "group relative inline-flex cursor-pointer",
          containerSizeMap[size],
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Avatar display */}
        <Avatar
          {...avatarProps}
          src={displaySrc}
          name={name}
          size={size}
          className={cn("size-full", avatarProps?.className)}
        />

        {/* Hover overlay. The scrim reads the contract's own token, spelled the
            way Dialog.tsx spells it (#384); the fallback covers a consumer who
            skipped the token layer. `text-white` / `border-white` deliberately
            stay literal: the contract has no "ink on an overlay" token, and the
            two candidates are disqualified by measurement — `--C-TEXT-INVERSE`
            is near-black in `tech` and `grimdark`, giving 2.35:1 and 1.52:1
            against the composited scrim (1.05:1 and 1.10:1 over a dark avatar),
            and `--C-TEXT-ON-PRIMARY` is chromatic there and is the wrong role. */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full",
            "bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))] text-white",
            "opacity-0 transition-opacity duration-fast",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
            uploading && "opacity-100",
            classNames?.overlay,
          )}
          aria-hidden="true"
        >
          {uploading ? (
            <span
              className={cn(
                "size-4 animate-spin rounded-full border-2 border-white border-t-transparent",
                classNames?.spinner,
              )}
            />
          ) : (
            <CameraIcon />
          )}
        </span>

        {/* Focus ring */}
        <span
          // slot:(a) the focus-ring shim. Every class on it is the ring itself —
          // the overlay above would clip a ring drawn on the root, so this
          // element exists only to carry `focusRingGroup` at full bleed. A route
          // here is a route to weakening or removing a WCAG 2.4.7 affordance,
          // and there is no other reason to address it.
          className={cn("pointer-events-none absolute inset-0 rounded-full", focusRingGroup)}
          aria-hidden="true"
        />

        {/* Error tooltip — the visible half only. ARIA makes a `button`'s
            descendants presentational, so the live region is a sibling below,
            and nothing interactive (a close button) may live in here either.
            `w-max` keeps a short message on one line, as `whitespace-nowrap`
            used to; `max-w-` then caps it at Tooltip.css's own 17.5rem and lets
            a long `accept` list wrap instead of running off both edges (#386). */}
        {error && (
          <span
            className={cn(
              "absolute -bottom-8 left-1/2 w-max max-w-[17.5rem] -translate-x-1/2 rounded bg-status-error px-2 py-1 text-center text-body-3 text-fg-inverse",
              classNames?.error,
            )}
            aria-hidden="true"
          >
            {error}
          </span>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={accept?.join(",")}
          // Our own `input.click()` bubbles to the root; stop it re-entering the handlers.
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void handleFileChange(e)}
          // slot:(a) the real file input. `sr-only` is what keeps it off screen
          // while leaving it in the accessibility tree and clickable
          // programmatically; anything else either reveals a raw file control
          // beside the avatar or takes it out of the tree entirely. `accept` and
          // `disabled` are the props that configure it.
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Outside the role="button": a live region nested in one is never
          announced, and the root's aria-label wins the name computation. */}
      <span
        // slot:(a) the live region. `sr-only` is the whole mechanism — a route
        // here lets a caller reveal it and print the error twice, beside the
        // bubble that already shows it. The message itself comes from `accept`,
        // `maxSize` and `onUploadError`.
        className="sr-only"
        role="alert"
      >
        {error}
      </span>
    </>
  );
}
