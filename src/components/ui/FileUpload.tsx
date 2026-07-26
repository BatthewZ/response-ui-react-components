"use client";
import {
  type ComponentPropsWithRef,
  type DragEvent,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { matchesAccept } from "../../util/accept";
import { formatBytes } from "../../util/format";
import { composeEventHandlers } from "../../util/merge-props";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Why `accept` / `maxSize` turned a file away. */
export type FileUploadRejection = {
  file: File;
  reason: "type" | "size";
};

/** Every fixed word FileUpload renders. See {@link DEFAULT_FILE_UPLOAD_LABELS}. */
export type FileUploadLabels = {
  /** Text before the browse affordance in the empty dropzone. */
  prompt?: string;
  /** The emphasised word inside the prompt that reads as the click target. */
  browse?: string;
  /** Replaces the prompt, and captions the preview, while `uploading`. */
  uploading?: string;
  /** Re-opens the picker from the preview. */
  replace?: string;
  /** Clears every file. Only rendered when `onClear` is given. */
  clearAll?: string;
  /** Accessible name of the empty dropzone. */
  dropzone?: string;
};

export const DEFAULT_FILE_UPLOAD_LABELS: Required<FileUploadLabels> = {
  prompt: "Drag & drop or",
  browse: "browse",
  uploading: "Uploading...",
  replace: "Replace",
  clearAll: "Clear all",
  dropzone: "Upload file",
};

const defaultRemoveFileLabel = (file: File) => `Remove ${file.name}`;

type FileUploadProps = {
  /**
   * Accepted file rules, in the same grammar as the input's `accept` attribute
   * this array also feeds: exact MIME (`image/png`), wildcard MIME (`image/*`),
   * or extension (`.pdf`). A file with no `type` matches only an extension rule.
   */
  accept?: string[];
  /** Maximum file size in bytes. */
  maxSize?: number;
  /** Allow selecting multiple files. */
  multiple?: boolean;
  /** Called when files are selected (via drop or browse). */
  onFilesSelected?: (files: File[]) => void;
  /**
   * Called with every file `accept` / `maxSize` turned away, on the same drop or
   * browse that reports the accepted ones. Without it a rejection still shows an
   * internal message; with it the caller can render its own.
   */
  onFilesRejected?: (rejections: FileUploadRejection[]) => void;
  /** Called when the user clears / removes all files via the built-in preview. */
  onClear?: () => void;
  /**
   * Called when the user removes a single file by index. Without it no per-file
   * remove control renders at all — falling back to `onClear` would drop every
   * file when the user asked for one.
   */
  onRemoveFile?: (index: number) => void;
  /** Currently selected files — pass these to enable the built-in preview. */
  files?: File[];
  /**
   * How to render file previews.
   * - `"auto"` (default): images/videos get large previews, other files get compact rows.
   * - `"compact"`: all files render as compact rows regardless of type.
   */
  previewMode?: "auto" | "compact";
  /** Disable the dropzone. */
  disabled?: boolean;
  /** Hint text shown below the main prompt. */
  hint?: string;
  /** Error message to display (overrides the internal rejection message). */
  error?: string | null;
  /** Success message to display. */
  success?: string | null;
  /** Whether the component is in an uploading state. */
  uploading?: boolean;
  /**
   * Overrides for the component's own fixed words. Any key you leave out keeps
   * its English default; `""` renders an empty string rather than the default.
   * `labels.dropzone` is a *default* accessible name — a caller's own
   * `aria-label` arrives in the rest props, which are spread last, and wins.
   */
  labels?: FileUploadLabels;
  /**
   * Accessible name of a file's remove button. A function rather than a `labels`
   * key because the file's name is interpolated into it — the same shape
   * `TagInput` and `Repeater` use for their announcements.
   * @default (file) => `Remove ${file.name}`
   */
  removeFileLabel?: (file: File) => string;
} & Omit<ComponentPropsWithRef<"div">, "children">;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildAcceptString(accept?: string[]): string | undefined {
  return accept && accept.length > 0 ? accept.join(",") : undefined;
}

function describeRejections(
  rejections: FileUploadRejection[],
  maxSize?: number,
): string {
  if (rejections.length > 1) {
    return `${rejections.length} files were not accepted.`;
  }
  const { file, reason } = rejections[0];
  if (reason === "size") {
    const limit = maxSize != null ? ` The maximum is ${formatBytes(maxSize)}.` : "";
    return `"${file.name}" is too large (${formatBytes(file.size)}).${limit}`;
  }
  return `"${file.name}" is not an accepted file type.`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  File-type icon (inline SVG to avoid extra deps)                    */
/* ------------------------------------------------------------------ */

function FileIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

/** Stable identity for the "no previews yet" render. Never mutated. */
const EMPTY_PREVIEWS: ReadonlyMap<File, string> = new Map();

/* ------------------------------------------------------------------ */
/*  Large media preview (single image/video)                           */
/* ------------------------------------------------------------------ */

function MediaPreviewLarge({
  file,
  previewUrl,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  /** Absent for the first paint after selection: the URL is minted in an effect. */
  previewUrl?: string;
  removeLabel: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isVideo = file.type.startsWith("video/");

  return (
    <div className="file-upload__media-large">
      {onRemove && (
        <button
          type="button"
          className="file-upload__media-remove"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon />
        </button>
      )}

      {previewUrl != null &&
        (isVideo ? (
          <video
            src={previewUrl}
            className="file-upload__media-large-content"
            controls
            muted
          />
        ) : (
          <img
            src={previewUrl}
            alt={file.name}
            className="file-upload__media-large-content"
          />
        ))}

      <div className="file-upload__media-caption">
        <span className="file-upload__preview-name" title={file.name}>
          {file.name}
        </span>
        <span className="file-upload__preview-size">
          {formatBytes(file.size)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Media grid item (multiple images/videos)                           */
/* ------------------------------------------------------------------ */

function MediaPreviewGrid({
  file,
  previewUrl,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  /** Absent for the first paint after selection: the URL is minted in an effect. */
  previewUrl?: string;
  removeLabel: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isVideo = file.type.startsWith("video/");

  return (
    <div className="file-upload__media-grid-item">
      {onRemove && (
        <button
          type="button"
          className="file-upload__media-grid-remove"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon />
        </button>
      )}

      {previewUrl != null &&
        (isVideo ? (
          <video
            src={previewUrl}
            className="file-upload__media-grid-content"
            muted
          />
        ) : (
          <img
            src={previewUrl}
            alt={file.name}
            className="file-upload__media-grid-content"
          />
        ))}

      <span className="file-upload__media-grid-name" title={file.name}>
        {file.name}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact file row (all file types)                                  */
/* ------------------------------------------------------------------ */

function FilePreviewItem({
  file,
  previewUrl,
  removeLabel,
  onRemove,
  disabled,
}: {
  file: File;
  previewUrl?: string | null;
  removeLabel: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="file-upload__preview-item">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="file-upload__preview-thumb"
        />
      ) : (
        <span className="file-upload__preview-file-icon">
          <FileIcon />
        </span>
      )}

      <div className="file-upload__preview-info">
        <span className="file-upload__preview-name" title={file.name}>
          {file.name}
        </span>
        <span className="file-upload__preview-size">
          {formatBytes(file.size)}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          className="file-upload__preview-remove"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(function FileUpload(
  {
    accept,
    maxSize,
    multiple = false,
    onFilesSelected,
    onFilesRejected,
    onClear,
    onRemoveFile,
    files: filesProp,
    previewMode = "auto",
    disabled = false,
    hint,
    error,
    success,
    uploading = false,
    labels,
    removeFileLabel = defaultRemoveFileLabel,
    className,
    onClick,
    onKeyDown,
    onDragOver,
    onDragLeave,
    onDrop,
    ...props
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const text = { ...DEFAULT_FILE_UPLOAD_LABELS, ...labels };

  const hasFiles = filesProp != null && filesProp.length > 0;

  /* ---- Object URLs for media previews ---- */

  // Minting belongs in an effect, not in a memo (#416). A memo runs during
  // render, so StrictMode's double render minted two URLs per media file and
  // committed only the second map — the first set leaked for the page's life.
  // The ref is the live set: it is keyed by `File` identity rather than by the
  // `files` array's identity, so an inline `files={[file]}` re-render finds the
  // same File objects and reuses their URLs instead of churning through a fresh
  // mint/revoke pair every time the parent renders.
  const liveUrlsRef = useRef(new Map<File, string>());
  // Seeded from a shared empty map rather than from the ref, so render never
  // reads the mutable set (DataTable's EMPTY_SELECTION, same reason).
  const [previewUrls, setPreviewUrls] = useState<ReadonlyMap<File, string>>(EMPTY_PREVIEWS);

  useEffect(() => {
    const live = liveUrlsRef.current;
    const wanted = new Set((filesProp ?? []).filter(isMediaFile));

    let changed = false;
    for (const file of wanted) {
      if (!live.has(file)) {
        live.set(file, URL.createObjectURL(file));
        changed = true;
      }
    }
    for (const [file, url] of live) {
      if (!wanted.has(file)) {
        URL.revokeObjectURL(url);
        live.delete(file);
        changed = true;
      }
    }
    // A new map only when the contents moved: an unchanged set keeps the same
    // object, so `<img src>` stays byte-identical and the image is not re-decoded.
    if (changed) setPreviewUrls(new Map(live));
  }, [filesProp]);

  // Unmount only — and it is what makes StrictMode's simulated unmount release
  // the first pass's URLs before the effect above re-mints them.
  useEffect(() => {
    const live = liveUrlsRef.current;
    return () => {
      for (const url of live.values()) URL.revokeObjectURL(url);
      live.clear();
    };
  }, []);

  /* ---- Partition files into media vs non-media ---- */

  const useCompact = previewMode === "compact";

  const { mediaFiles, otherFiles } = useMemo(() => {
    if (!filesProp || useCompact) return { mediaFiles: [] as File[], otherFiles: filesProp ?? [] as File[] };
    const media: File[] = [];
    const other: File[] = [];
    for (const file of filesProp) {
      if (isMediaFile(file)) media.push(file);
      else other.push(file);
    }
    return { mediaFiles: media, otherFiles: other };
  }, [filesProp, useCompact]);

  /* ---- Validation ---- */

  const validateFiles = useCallback(
    (files: File[]): { accepted: File[]; rejected: FileUploadRejection[] } => {
      const accepted: File[] = [];
      const rejected: FileUploadRejection[] = [];
      for (const file of files) {
        if (accept && !matchesAccept(file, accept)) {
          rejected.push({ file, reason: "type" });
        } else if (maxSize != null && file.size > maxSize) {
          rejected.push({ file, reason: "size" });
        } else {
          accepted.push(file);
        }
      }
      return { accepted, rejected };
    },
    [accept, maxSize],
  );

  /* ---- Handlers ---- */

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const { accepted, rejected } = validateFiles(Array.from(fileList));

      // A rejection used to be entirely silent: no callback, no message, no state.
      setRejectionMessage(rejected.length > 0 ? describeRejections(rejected, maxSize) : null);
      if (rejected.length > 0) {
        onFilesRejected?.(rejected);
      }

      if (accepted.length > 0) {
        onFilesSelected?.(multiple ? accepted : [accepted[0]]);
      }
    },
    [validateFiles, maxSize, onFilesRejected, onFilesSelected, multiple],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !uploading) setDragOver(true);
    },
    [disabled, uploading],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled || uploading) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, uploading, handleFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) inputRef.current?.click();
  }, [disabled, uploading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled, uploading],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be re-selected.
      e.target.value = "";
    },
    [handleFiles],
  );

  /* ---- Hint text ---- */

  const computedHint = hint ?? (maxSize ? `Max file size: ${formatBytes(maxSize)}` : undefined);

  /* ---- Messages ---- */

  // The `error` prop overrides the internal rejection state, as its doc says.
  const shownError = error ?? rejectionMessage;

  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const successId = `${baseId}-success`;
  // The hint only renders alongside the prompt, so it can only be referenced there.
  const showHint = computedHint != null && !hasFiles && !shownError && !success;
  const describedBy =
    [showHint && hintId, shownError && errorId, success && successId]
      .filter(Boolean)
      .join(" ") || undefined;

  /* ---- Render ---- */

  return (
    <div
      ref={ref}
      // With a preview on screen the dropzone holds real buttons, and ARIA makes
      // every descendant of a `button` presentational — so it is only a button
      // in the empty state, where it is the one thing to press.
      role={hasFiles ? undefined : "button"}
      tabIndex={hasFiles ? undefined : disabled ? -1 : 0}
      aria-label={hasFiles ? undefined : text.dropzone}
      aria-disabled={disabled || undefined}
      aria-busy={uploading || undefined}
      aria-describedby={describedBy}
      className={cn(
        "file-upload",
        hasFiles && "file-upload--has-files",
        dragOver && "file-upload--drag-over",
        uploading && "file-upload--uploading",
        success && "file-upload--success",
        shownError && "file-upload--error",
        disabled && "file-upload--disabled",
        className,
      )}
      onClick={composeEventHandlers(onClick, handleClick)}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
      onDragOver={composeEventHandlers(onDragOver, handleDragOver)}
      onDragLeave={composeEventHandlers(onDragLeave, handleDragLeave)}
      onDrop={composeEventHandlers(onDrop, handleDrop)}
      {...props}
    >
      {hasFiles ? (
        /* ---- Preview state ---- */
        <div
          className="file-upload__preview"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {/* Single media file — large preview */}
          {mediaFiles.length === 1 && (
            <MediaPreviewLarge
              file={mediaFiles[0]}
              previewUrl={previewUrls.get(mediaFiles[0])}
              removeLabel={removeFileLabel(mediaFiles[0])}
              onRemove={
                onRemoveFile ? () => onRemoveFile(filesProp.indexOf(mediaFiles[0])) : undefined
              }
              disabled={uploading}
            />
          )}

          {/* Multiple media files — grid */}
          {mediaFiles.length > 1 && (
            <div className="file-upload__media-grid">
              {mediaFiles.map((file, i) => (
                <MediaPreviewGrid
                  key={`${file.name}-${file.size}-${i}`}
                  file={file}
                  previewUrl={previewUrls.get(file)}
                  removeLabel={removeFileLabel(file)}
                  onRemove={
                    onRemoveFile ? () => onRemoveFile(filesProp.indexOf(file)) : undefined
                  }
                  disabled={uploading}
                />
              ))}
            </div>
          )}

          {/* Non-media / compact files — rows */}
          {otherFiles.length > 0 && (
            <div className="file-upload__preview-list">
              {otherFiles.map((file, i) => (
                <FilePreviewItem
                  key={`${file.name}-${file.size}-${i}`}
                  file={file}
                  previewUrl={previewUrls.get(file)}
                  removeLabel={removeFileLabel(file)}
                  onRemove={
                    onRemoveFile ? () => onRemoveFile(filesProp.indexOf(file)) : undefined
                  }
                  disabled={uploading}
                />
              ))}
            </div>
          )}

          {/* Uploading — otherwise the disabled actions below say nothing */}
          {uploading && (
            <p className="file-upload__hint" role="status">
              {text.uploading}
            </p>
          )}

          <div className="file-upload__preview-actions">
            <button
              type="button"
              className="file-upload__preview-replace"
              disabled={uploading || disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              {text.replace}
            </button>
            {onClear && (
              <button
                type="button"
                className="file-upload__preview-clear"
                disabled={uploading || disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                {text.clearAll}
              </button>
            )}
          </div>

          {/* Error message */}
          {shownError && (
            <p id={errorId} role="alert" className="file-upload__error">
              {shownError}
            </p>
          )}

          {/* Success message */}
          {success && (
            <p id={successId} role="status" className="file-upload__success">
              {success}
            </p>
          )}
        </div>
      ) : (
        /* ---- Empty / prompt state ---- */
        <>
          {/* Icon */}
          <span className="file-upload__icon" aria-hidden="true">
            <UploadIcon />
          </span>

          {/* Main text */}
          {uploading ? (
            <p className="file-upload__text">{text.uploading}</p>
          ) : (
            <p className="file-upload__text">
              {text.prompt}{" "}
              <span className="file-upload__text-emphasis">{text.browse}</span>
            </p>
          )}

          {/* Hint / constraints */}
          {showHint && (
            <p id={hintId} className="file-upload__hint">
              {computedHint}
            </p>
          )}

          {/* Error message */}
          {shownError && (
            <p id={errorId} role="alert" className="file-upload__error">
              {shownError}
            </p>
          )}

          {/* Success message */}
          {success && (
            <p id={successId} role="status" className="file-upload__success">
              {success}
            </p>
          )}
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={buildAcceptString(accept)}
        multiple={multiple}
        disabled={disabled || uploading}
        onChange={handleInputChange}
        // Programmatic click() bubbles back to the dropzone and re-enters its handlers.
        onClick={(e) => e.stopPropagation()}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
});
