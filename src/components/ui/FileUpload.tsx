"use client";
import {
  type ComponentPropsWithRef,
  type DragEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { formatBytes } from "../../util/format";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FileUploadProps = {
  /** Accepted MIME types (e.g. `["image/png", "image/jpeg"]`). */
  accept?: string[];
  /** Maximum file size in bytes. */
  maxSize?: number;
  /** Allow selecting multiple files. */
  multiple?: boolean;
  /** Called when files are selected (via drop or browse). */
  onFilesSelected?: (files: File[]) => void;
  /** Called when the user clears / removes all files via the built-in preview. */
  onClear?: () => void;
  /** Called when the user removes a single file by index. */
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
  /** Error message to display (overrides internal state). */
  error?: string | null;
  /** Success message to display. */
  success?: string | null;
  /** Whether the component is in an uploading state. */
  uploading?: boolean;
} & Omit<ComponentPropsWithRef<"div">, "onDrop">;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildAcceptString(accept?: string[]): string | undefined {
  return accept && accept.length > 0 ? accept.join(",") : undefined;
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

/* ------------------------------------------------------------------ */
/*  Large media preview (single image/video)                           */
/* ------------------------------------------------------------------ */

function MediaPreviewLarge({
  file,
  previewUrl,
  onRemove,
}: {
  file: File;
  previewUrl: string;
  onRemove?: () => void;
}) {
  const isVideo = file.type.startsWith("video/");

  return (
    <div className="file-upload__media-large">
      {onRemove && (
        <button
          type="button"
          className="file-upload__media-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
        >
          <CloseIcon />
        </button>
      )}

      {isVideo ? (
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
      )}

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
  onRemove,
}: {
  file: File;
  previewUrl: string;
  onRemove?: () => void;
}) {
  const isVideo = file.type.startsWith("video/");

  return (
    <div className="file-upload__media-grid-item">
      {onRemove && (
        <button
          type="button"
          className="file-upload__media-grid-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
        >
          <CloseIcon />
        </button>
      )}

      {isVideo ? (
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
      )}

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
  onRemove,
}: {
  file: File;
  previewUrl?: string | null;
  onRemove?: () => void;
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
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
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
    onClear,
    onRemoveFile,
    files: filesProp,
    previewMode = "auto",
    disabled = false,
    hint,
    error,
    success,
    uploading = false,
    className,
    onClick,
    onKeyDown,
    onDragOver,
    onDragLeave,
    ...props
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const hasFiles = filesProp != null && filesProp.length > 0;

  /* ---- Object URLs for media previews ---- */

  const previewUrls = useMemo(() => {
    if (!filesProp) return new Map<File, string>();
    const map = new Map<File, string>();
    for (const file of filesProp) {
      if (isMediaFile(file)) {
        map.set(file, URL.createObjectURL(file));
      }
    }
    return map;
  }, [filesProp]);

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

  // Revoke old URLs on change / unmount
  useEffect(() => {
    return () => {
      for (const url of previewUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  /* ---- Validation ---- */

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      return files.filter((file) => {
        if (accept && accept.length > 0 && !accept.includes(file.type)) {
          return false;
        }
        if (maxSize != null && file.size > maxSize) {
          return false;
        }
        return true;
      });
    },
    [accept, maxSize],
  );

  /* ---- Handlers ---- */

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      const valid = validateFiles(files);
      if (valid.length > 0) {
        onFilesSelected?.(multiple ? valid : [valid[0]]);
      }
    },
    [validateFiles, onFilesSelected, multiple],
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

  /* ---- Render ---- */

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload file"
      aria-disabled={disabled || undefined}
      className={cn(
        "file-upload",
        hasFiles && "file-upload--has-files",
        dragOver && "file-upload--drag-over",
        uploading && "file-upload--uploading",
        success && !hasFiles && "file-upload--success",
        error && "file-upload--error",
        disabled && "file-upload--disabled",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) handleClick();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!e.defaultPrevented) handleKeyDown(e);
      }}
      onDragOver={(e) => {
        onDragOver?.(e);
        if (!e.defaultPrevented) handleDragOver(e);
      }}
      onDragLeave={(e) => {
        onDragLeave?.(e);
        if (!e.defaultPrevented) handleDragLeave(e);
      }}
      onDrop={handleDrop}
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
              previewUrl={previewUrls.get(mediaFiles[0])!}
              onRemove={onRemoveFile ? () => onRemoveFile(filesProp.indexOf(mediaFiles[0])) : onClear}
            />
          )}

          {/* Multiple media files — grid */}
          {mediaFiles.length > 1 && (
            <div className="file-upload__media-grid">
              {mediaFiles.map((file, i) => (
                <MediaPreviewGrid
                  key={`${file.name}-${file.size}-${i}`}
                  file={file}
                  previewUrl={previewUrls.get(file)!}
                  onRemove={onRemoveFile ? () => onRemoveFile(filesProp.indexOf(file)) : onClear}
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
                  onRemove={onRemoveFile ? () => onRemoveFile(filesProp.indexOf(file)) : onClear}
                />
              ))}
            </div>
          )}

          <div className="file-upload__preview-actions">
            <button
              type="button"
              className="file-upload__preview-replace"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Replace
            </button>
            {onClear && (
              <button
                type="button"
                className="file-upload__preview-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Error message */}
          {error && <p className="file-upload__error">{error}</p>}
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
            <p className="file-upload__text">Uploading...</p>
          ) : (
            <p className="file-upload__text">
              Drag & drop or{" "}
              <span className="file-upload__text-emphasis">browse</span>
            </p>
          )}

          {/* Hint / constraints */}
          {computedHint && !error && !success && (
            <p className="file-upload__hint">{computedHint}</p>
          )}

          {/* Error message */}
          {error && <p className="file-upload__error">{error}</p>}

          {/* Success message */}
          {success && <p className="file-upload__success">{success}</p>}
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
