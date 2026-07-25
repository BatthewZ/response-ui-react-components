/**
 * Whether `file` satisfies at least one entry of `accept`, using the SAME
 * grammar as the `accept` attribute of `<input type="file">` — which is where
 * the very same array is also sent. An entry is one of:
 *
 * - a filename extension — `.pdf`
 * - a wildcard MIME type — `image/*`, or the catch-all wildcard (`*` for both
 *   the type and the subtype), which matches anything
 * - an exact MIME type — `image/png`
 *
 * Entries and the file are compared case-insensitively; surrounding whitespace
 * in an entry is ignored. An empty `accept` list accepts everything.
 *
 * A file whose `type` is `""` — routine for archives and anything the browser
 * cannot sniff — is matched ONLY by an extension entry or the catch-all. MIME
 * entries never match it: there is nothing to compare, and guessing would
 * either let everything through or block a file the OS dialog already offered.
 *
 * Internal on purpose — an implementation detail shared by the upload
 * components, not part of the package's public surface.
 */
export function matchesAccept(file: File, accept: readonly string[]): boolean {
  if (accept.length === 0) return true;

  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return accept.some((raw) => {
    const entry = raw.trim().toLowerCase();
    if (!entry) return false;
    if (entry.startsWith(".")) return name.endsWith(entry);
    if (entry === "*/*") return true;
    if (entry.endsWith("/*")) return type.startsWith(entry.slice(0, -1));
    return type === entry;
  });
}
