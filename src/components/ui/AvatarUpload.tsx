"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { matchesAccept } from "../../util/accept";
import { focusRingGroup } from "../../util/focus";
import { cn } from "../../util/style";

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

export const AvatarUpload = forwardRef<HTMLDivElement, AvatarUploadProps>(function AvatarUpload(
  {
    src,
    name,
    size = "xl",
    onUpload,
    onUploadComplete,
    onUploadError,
    accept,
    maxSize,
    className,
    onClick,
    onKeyDown,
    ...props
  },
  ref,
) {
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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || uploading) return;
      inputRef.current?.click();
    },
    [onClick, uploading],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || uploading) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
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
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label="Change avatar"
      className={cn("group relative inline-flex cursor-pointer", containerSizeMap[size], className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {/* Avatar display */}
      <Avatar src={displaySrc} name={name} size={size} className="size-full" />

      {/* Hover overlay */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full",
          "bg-black/50 text-white opacity-0 transition-opacity duration-fast",
          "group-hover:opacity-100 group-focus-visible:opacity-100",
          uploading && "opacity-100",
        )}
        aria-hidden="true"
      >
        {uploading ? (
          <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <CameraIcon />
        )}
      </span>

      {/* Focus ring */}
      <span
        className={cn("pointer-events-none absolute inset-0 rounded-full", focusRingGroup)}
        aria-hidden="true"
      />

      {/* Error tooltip */}
      {error && (
        <span
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-status-error px-2 py-1 text-body-3 text-fg-inverse"
          role="alert"
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
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
});
