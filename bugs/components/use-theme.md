# use-theme — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 90 · useTheme — persistence is write-only (high)

`setTheme` writes `localStorage["theme"]`. **Nothing in either package ever reads it back.** A
verifier swept `src/`, `dev/`, `dist/`, `scripts/` and the installed `@batthewz/response-ui-css`:
the only `getItem("theme")` occurrences are a test assertion and a string inside a doc example.
`dev/index.html` ships no bootstrap script; there is no cookie and no build-time restore.

**Failure scenario:** a user picks Grimdark and reloads. `data-theme` is absent, the
`useSyncExternalStore` snapshot falls back to `default`, and the choice is gone. This is not a
flash-of-wrong-theme — it is silent data loss, and the write makes it look supported.

**This one also made the package's own docs false**, which is why it is filed high rather than
medium. `README.md:84` claimed `useTheme` "adds reactive state, `localStorage` persistence, and
SSR-safe hydration"; `AGENTS.md:281` repeated it. Neither is true: the hook holds no React state
(it is `useSyncExternalStore` over the DOM attribute) and nothing restores the key. Both files are
corrected in this pass to describe the one-way write.

**Fix:** the only correct fix is a blocking inline `<script>` in the document head that sets
`data-theme` from storage before first paint — reading it in an effect would restore the choice but
guarantee a flash. Ship that snippet as documented, copy-pasteable code, or the write should be
removed as misleading.
