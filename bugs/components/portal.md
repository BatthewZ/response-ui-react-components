# portal — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 47 · Portal — the SSR guard trades a throw for a hydration mismatch (med)

`typeof document === "undefined"` correctly stops the server-renderer throw, but `document`
**is** defined during hydration, so the first client pass contains the portal while the server
emitted nothing. React descends into the portal fiber during the hydration walk, fails to match,
and **regenerates the whole hydration root**, discarding the server HTML.
**Failure scenario:** SSR a page containing an unconditional `<Portal>` → dev logs "Hydration
failed because the server rendered HTML didn't match the client"; production throws minified
React error **#418**. Reproduced independently twice against react-dom 19.2.5, in both dev and
production builds, from byte-identical SSR HTML, and in all five tree positions (between
siblings, first/last/only child, root). Controls confirm the same tree without the portal, and
one rendering `{null}` in its place, both hydrate clean with the server node reused.
Portals gated behind state that starts closed (`AppShell`) hydrate cleanly.
**Fix:** render behind a mounted flag set in an effect rather than a `typeof document` check —
verified to hydrate clean. `portal.md` documents the current behaviour honestly in the meantime.
