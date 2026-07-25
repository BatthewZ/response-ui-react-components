# scroll-reveal — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 9 · ScrollReveal — `as` props typed but not forwarded (high)

`ScrollRevealProps<T>` extends `ComponentPropsWithRef<T>`, so the public type accepts every
prop of the rendered element. The implementation destructures only its own named props and
renders `<Tag>` **without** `{...rest}`, so `id`, `data-*`, `aria-*`, and event handlers a
caller passes are silently dropped. The types promise a contract the runtime doesn't honour.
**Fix:** capture and spread `...rest` onto `<Tag>` (same fix as Stagger #10).

### 16 · ScrollReveal — content hidden without IntersectionObserver / JS (med)

The initial state is `opacity:0` (`scroll-reveal-hidden`), cleared only when the observer
fires. If `IntersectionObserver` is unavailable, JS never runs, or SSR output isn't hydrated,
the element stays invisible forever — content loss, not just a missing animation. **Fix:** a
no-JS/no-IO fallback that reveals (e.g. `@media (scripting: none)` or a hydration-safe
default-visible + animate-in).
