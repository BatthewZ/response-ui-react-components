import { useState } from "react";

import { FileUpload } from "./FileUpload";

/** Controlled: `onFilesSelected` hands you the picked files, `files` hands them back for the preview. */
export function Minimal() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <FileUpload
      files={files}
      onFilesSelected={setFiles}
      onClear={() => setFiles([])}
      hint="PDF or PNG, up to 5 MB"
    />
  );
}

/** `multiple` lets one pick return several files. `onFilesSelected` reports only the newly
 *  picked ones, so append them yourself; `onRemoveFile` gives you the index to drop. */
export function MultipleFiles() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <FileUpload
      multiple
      files={files}
      onFilesSelected={(picked) => setFiles((current) => [...current, ...picked])}
      onRemoveFile={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
      onClear={() => setFiles([])}
      hint="Attach receipts — up to 10 files"
    />
  );
}

/** `accept` is an exact-match list of MIME types and `maxSize` a byte ceiling. With no `hint`
 *  of your own, `maxSize` writes one: "Max file size: 5.0 MB". */
export function RestrictTypesAndSize() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <FileUpload
      accept={["image/png", "image/jpeg", "application/pdf"]}
      maxSize={5 * 1024 * 1024}
      files={files}
      onFilesSelected={setFiles}
      onClear={() => setFiles([])}
    />
  );
}

/** Files the built-in `accept`/`maxSize` filter drops never reach any callback. To tell the
 *  user why, leave both props off, check the files yourself, and drive `error` from that. */
export function ReportingRejections() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <FileUpload
      files={files}
      error={error}
      hint="Signed contract as a PDF, up to 5 MB"
      onFilesSelected={(picked) => {
        const tooLarge = picked.find((file) => file.size > 5 * 1024 * 1024);
        setError(tooLarge ? `${tooLarge.name} is larger than 5 MB.` : null);
        setFiles(tooLarge ? [] : picked);
      }}
      onClear={() => {
        setFiles([]);
        setError(null);
      }}
    />
  );
}

/** The four prompt-state variants. `error` and `success` replace the hint; `uploading` replaces
 *  the prompt; `disabled` dims the zone and takes it out of the tab order. */
export function States() {
  return (
    <>
      <FileUpload uploading />
      <FileUpload success="contract-signed.pdf uploaded." />
      <FileUpload error="That file is larger than 5 MB." />
      <FileUpload disabled hint="Uploads are locked while this project is archived." />
    </>
  );
}

/** `previewMode="compact"` renders every file as a row with a 2.5rem thumbnail, instead of the
 *  large preview `"auto"` gives a single image or video. */
export function CompactPreview() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <FileUpload
      multiple
      previewMode="compact"
      accept={["image/png", "image/jpeg"]}
      files={files}
      onFilesSelected={(picked) => setFiles((current) => [...current, ...picked])}
      onRemoveFile={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
      onClear={() => setFiles([])}
    />
  );
}

/** Rest props are spread after the component's own, so `aria-label` overrides the built-in
 *  "Upload file" — worth doing whenever two dropzones share a page. */
export function CustomLabel() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <FileUpload
      aria-label="Upload signed contract"
      accept={["application/pdf"]}
      files={files}
      onFilesSelected={setFiles}
      onClear={() => setFiles([])}
      hint="Signed PDF only"
    />
  );
}
