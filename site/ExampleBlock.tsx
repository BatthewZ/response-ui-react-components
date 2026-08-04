import {
  Component,
  type ComponentType,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import {
  Alert,
  CodeBlock,
  RouterAdapterProvider,
  type RouterLinkComponent,
  type RouterLinkProps,
} from "../src";

/**
 * One `<!-- example:Name -->` block: the component running, above the exact fence the
 * doc carries. Two renderings of one module — `gen-docs` injected the code from the
 * same file this imports — so the snippet a reader copies is the snippet that produced
 * what they are looking at.
 */

/**
 * Per-example error isolation. The library's own `ErrorBoundary` is a page-level
 * component with a full-screen fallback; rendering 567 examples needs a block-sized one,
 * so a single throwing example degrades to a visible marker instead of blanking the page
 * — and stays visible, rather than being a component that quietly never appeared.
 */
class ExampleBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Alert variant="error">
          <strong>This example threw while rendering.</strong>{" "}
          {this.state.error.message}
        </Alert>
      );
    }
    return this.props.children;
  }
}

/**
 * A plain `<a>`, which is what `useLink()` falls back to with no adapter mounted.
 *
 * The site mounts its own adapter for its chrome, and context does not stop at a visual
 * boundary — without this reset, an example would inherit it and `AppShell.SidebarLink`
 * would render the site's router on the very page documenting that it renders "a plain
 * `<a href>` by default". Examples that need a router bring their own provider inside
 * this one, exactly as an app would.
 */
const PreviewLink: RouterLinkComponent = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function PreviewLink({ to, replace: _replace, href: _href, children, ...rest }, ref) {
    return (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    );
  },
);

const PREVIEW_ADAPTER = { Link: PreviewLink, usePathname: () => "/" };

/**
 * A demo link points at a route this site does not have, so letting the browser follow
 * it would replace the docs with a 404. The example's own handlers have already run by
 * the time this fires — React dispatches from the target outward — so a demo that
 * changes state on click still works; only the navigation is dropped.
 */
function swallowNavigation(event: MouseEvent<HTMLDivElement>) {
  const anchor = (event.target as HTMLElement).closest?.("a");
  if (anchor?.getAttribute("href")) event.preventDefault();
}

/**
 * Stands in for an image an example names but this site does not host.
 *
 * Deliberately a placeholder and not a photograph. The examples write the path an app
 * would write — `/images/alpine-ridge.jpg` — because that is the idiomatic snippet to
 * copy, and pointing them at real files would either put a stranger's CDN into the
 * library's documentation or teach a path no reader's app has. So the file genuinely is
 * absent, and Hero, MediaCard, Carousel, Parallax and Spotlight are precisely the
 * components whose point is the image. This fills the box, keeps the layout the example
 * is demonstrating, and looks like what it is.
 */
const IMAGE_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30" preserveAspectRatio="none">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#94a3b8" stop-opacity=".38"/>
           <stop offset="1" stop-color="#64748b" stop-opacity=".22"/>
         </linearGradient>
       </defs>
       <rect width="40" height="30" fill="url(#g)"/>
       <g fill="none" stroke="#64748b" stroke-opacity=".5" stroke-width=".7">
         <rect x="14" y="11" width="12" height="9" rx="1"/>
         <path d="M14 17.5l3.4-3 3 2.6 2.6-2.2 2.9 2.5"/>
       </g>
       <circle cx="17.6" cy="13.6" r=".9" fill="#64748b" fill-opacity=".5"/>
     </svg>`.replace(/\s+/g, " "),
  );

/**
 * Image errors do not bubble, so this listens in the capture phase from the preview
 * container — one listener per example rather than one per `<img>`, which also catches
 * images an example mounts later.
 */
function usePlaceholderForMissingImages() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onError = (event: Event) => {
      const image = event.target;
      // `dataset` guard: assigning `src` on a data URI that somehow fails would
      // otherwise loop.
      if (!(image instanceof HTMLImageElement) || image.dataset.placeholder) return;
      image.dataset.placeholder = "true";
      image.src = IMAGE_PLACEHOLDER;
    };

    node.addEventListener("error", onError, true);
    return () => node.removeEventListener("error", onError, true);
  }, []);

  return ref;
}

export function ExampleBlock({
  name,
  code,
  language,
  examples,
}: {
  name: string;
  code: string;
  language: string;
  examples: Record<string, ComponentType>;
}) {
  const Example = examples[name];
  const previewRef = usePlaceholderForMissingImages();

  return (
    /* No gap: the preview and its code are one object, joined by the code block's
       squared top edge. A gap here reopens the seam the border removal closed. */
    <figure className="my-r4 flex flex-col">
      <div
        ref={previewRef}
        className="example-preview flex min-w-0 flex-wrap items-start gap-r4 rounded-t-lg border border-border-default p-r3"
        onClick={swallowNavigation}
      >
        {Example ? (
          <RouterAdapterProvider value={PREVIEW_ADAPTER}>
            <ExampleBoundary>
              <Example />
            </ExampleBoundary>
          </RouterAdapterProvider>
        ) : (
          <Alert variant="error">
            <strong>No example named &quot;{name}&quot;.</strong>{" "}
            The doc references it but the examples module does not export it. Run{" "}
            <code>bun run docs:examples</code>.
          </Alert>
        )}
      </div>
      <CodeBlock
        code={code}
        language={language}
        className="rounded-t-none border-t-0"
        filename={name}
      />
    </figure>
  );
}
