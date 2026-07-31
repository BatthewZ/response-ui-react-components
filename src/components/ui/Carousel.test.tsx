import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Carousel } from "./Carousel";

// jsdom does not provide ResizeObserver; stub it with a class that keeps its
// callback so a test can re-run the carousel's scroll-state measurement.
const resizeCallbacks: ResizeObserverCallback[] = [];

class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    resizeCallbacks.push(callback);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  resizeCallbacks.length = 0;
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * jsdom lays nothing out, so the rail always measures 0×0 and both arrows read
 * as end-of-rail. Give the track real dimensions and re-run the measurement.
 */
function makeScrollable(track: HTMLElement, scrollLeft = 0) {
  Object.defineProperty(track, "clientWidth", { value: 300, configurable: true });
  Object.defineProperty(track, "scrollWidth", { value: 900, configurable: true });
  track.scrollLeft = scrollLeft;
  act(() => {
    for (const callback of resizeCallbacks) {
      callback([], null as unknown as ResizeObserver);
    }
  });
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Helper to find the carousel root element via its aria-roledescription. */
function getCarouselRoot(): HTMLElement {
  const el = document.querySelector("[aria-roledescription='carousel']");
  if (!el) throw new Error("Could not find carousel root");
  return el as HTMLElement;
}

describe("Carousel", () => {
  it("renders slides", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
          <Carousel.Item>Slide 3</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    expect(screen.getByText("Slide 1")).toBeInTheDocument();
    expect(screen.getByText("Slide 2")).toBeInTheDocument();
    expect(screen.getByText("Slide 3")).toBeInTheDocument();
  });

  it("has aria-roledescription='carousel' on root", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const root = getCarouselRoot();
    expect(root).toHaveAttribute("aria-roledescription", "carousel");
  });

  it("slides have aria-roledescription='slide'", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const slides = screen
      .getAllByRole("group")
      .filter((el) => el.getAttribute("aria-roledescription") === "slide");
    expect(slides).toHaveLength(2);
  });

  it("renders Previous and Next buttons", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("Next button calls scrollBy on the track", async () => {
    const user = userEvent.setup();
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;
    makeScrollable(track);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(scrollBySpy).toHaveBeenCalledOnce();
    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });

  it("Previous button calls scrollBy on the track", async () => {
    const user = userEvent.setup();
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;
    makeScrollable(track, 300);

    await user.click(screen.getByRole("button", { name: "Previous" }));

    expect(scrollBySpy).toHaveBeenCalledOnce();
    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });

  it("renders title when provided", () => {
    render(
      <Carousel title="Featured items">
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    expect(screen.getByText("Featured items")).toBeInTheDocument();
  });

  it("uses aria-labelledby when title is provided", () => {
    render(
      <Carousel title="Featured items">
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const titleEl = screen.getByText("Featured items");
    const root = getCarouselRoot();
    expect(root).toHaveAttribute("aria-labelledby", titleEl.id);
  });

  it("uses aria-label='Carousel' when no title is provided", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const root = getCarouselRoot();
    expect(root).toHaveAttribute("aria-label", "Carousel");
  });

  it("track has role='region' with aria-label='Carousel items'", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    expect(screen.getByRole("region", { name: "Carousel items" })).toBeInTheDocument();
  });

  it("supports keyboard navigation with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;
    // jsdom has no layout, so clientWidth is 0 and every scroll delta would be
    // 0 — the direction of travel is only observable with a width stubbed in.
    Object.defineProperty(track, "clientWidth", { configurable: true, value: 300 });

    // Focus the carousel root (it has tabIndex={0})
    const root = getCarouselRoot();
    root.focus();

    await user.keyboard("{ArrowRight}");
    expect(scrollBySpy).toHaveBeenCalledTimes(1);
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 300, behavior: "smooth" });

    scrollBySpy.mockClear();

    await user.keyboard("{ArrowLeft}");
    expect(scrollBySpy).toHaveBeenCalledTimes(1);
    expect(scrollBySpy).toHaveBeenCalledWith({ left: -300, behavior: "smooth" });
  });

  /* -- #425: the root must compose the caller's onKeyDown, not be replaced by it -- */

  it("#425: a caller's onKeyDown on the root runs and still scrolls the rail", async () => {
    const onKeyDown = vi.fn();
    const user = userEvent.setup();
    render(
      <Carousel onKeyDown={onKeyDown}>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;

    getCarouselRoot().focus();

    await user.keyboard("{ArrowRight}");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(scrollBySpy).toHaveBeenCalledTimes(1);
    expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));

    onKeyDown.mockClear();
    scrollBySpy.mockClear();

    await user.keyboard("{ArrowLeft}");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(scrollBySpy).toHaveBeenCalledTimes(1);
  });

  it("#425: a caller's onKeyDown may opt out of arrow scrolling with preventDefault", async () => {
    const user = userEvent.setup();
    render(
      <Carousel onKeyDown={(e) => e.preventDefault()}>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;

    getCarouselRoot().focus();
    await user.keyboard("{ArrowRight}");

    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  /* -- #186: arrow keys belong to the focused control, not the rail -- */

  function renderWithField() {
    const result = render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>
            <input aria-label="Note" defaultValue="abc" />
            <button type="button">Buy</button>
          </Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );
    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;
    Object.defineProperty(track, "clientWidth", { configurable: true, value: 300 });
    return { ...result, scrollBySpy };
  }

  it("#186: arrow keys typed in a field inside a slide do not page the rail", () => {
    const { scrollBySpy } = renderWithField();
    const input = screen.getByLabelText("Note");
    input.focus();

    // fireEvent returns false when a handler called preventDefault() — the caret
    // only moves while the default survives.
    expect(fireEvent.keyDown(input, { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "ArrowRight" })).toBe(true);

    expect(scrollBySpy).toHaveBeenCalledTimes(0);
  });

  it("#186: arrow keys on a button inside a slide do not page the rail", () => {
    const { scrollBySpy } = renderWithField();
    screen.getByRole("button", { name: "Buy" }).focus();

    fireEvent.keyDown(screen.getByRole("button", { name: "Buy" }), { key: "ArrowRight" });

    expect(scrollBySpy).toHaveBeenCalledTimes(0);
  });

  it("#186: arrow keys on the root itself still page the rail", () => {
    const { scrollBySpy } = renderWithField();
    const root = getCarouselRoot();
    root.focus();

    fireEvent.keyDown(root, { key: "ArrowRight" });

    expect(scrollBySpy).toHaveBeenCalledTimes(1);
    expect(scrollBySpy).toHaveBeenCalledWith({ left: 300, behavior: "smooth" });
  });
  /* ------------------------------------------------------------------ */
  /*  #187 / #188 / #189 / #190 / #191 / #192                            */
  /* ------------------------------------------------------------------ */

  describe("#187 · a mousedown on the track leaves native focus alone", () => {
    it("does not preventDefault on a left mousedown", () => {
      renderWithField();
      const track = screen.getByRole("region", { name: "Carousel items" });
      const input = screen.getByLabelText("Note");

      const event = createEvent.mouseDown(input, { button: 0, bubbles: true });
      fireEvent(input, event);

      // preventDefault on mousedown is what suppressed focus and caret placement.
      expect(event.defaultPrevented).toBe(false);
      expect(track.className).toContain("carousel-track");
    });

    it("still cancels the native image drag", () => {
      renderWithField();
      const track = screen.getByRole("region", { name: "Carousel items" });

      const event = createEvent.dragStart(track);
      fireEvent(track, event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("#188 · end-of-rail arrows leave the tab order", () => {
    it("disables both arrows when the rail cannot move", () => {
      render(
        <Carousel>
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );

      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    });

    it("enables the arrow whose direction has somewhere to go", () => {
      render(
        <Carousel>
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
            <Carousel.Item>Slide 2</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      makeScrollable(screen.getByRole("region", { name: "Carousel items" }));

      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    });
  });

  describe("the drag state is an attribute, not a BEM modifier", () => {
    /**
     * `.carousel-track--dragging` was a component-layer modifier of a base rule
     * that is now a utility. A base in `@layer utilities` beats a modifier in
     * `@layer components`, so `cursor-grab` would have won whatever the DOM said.
     * `data-dragging` emits at 0,2,0 against the base's 0,1,0 and wins on
     * specificity instead. Breaking: a consumer styling the old class must
     * retarget `[data-dragging]`.
     */
    it("marks and clears data-dragging across a press", () => {
      render(
        <Carousel>
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      const track = screen.getByRole("region", { name: "Carousel items" });

      expect(track).not.toHaveAttribute("data-dragging");
      fireEvent.mouseDown(track, { button: 0, clientX: 10 });
      expect(track).toHaveAttribute("data-dragging", "true");
      fireEvent.mouseUp(window);
      expect(track).not.toHaveAttribute("data-dragging");
      expect(track.className).not.toContain("carousel-track--dragging");
    });

    it("ignores a non-left press", () => {
      render(
        <Carousel>
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      const track = screen.getByRole("region", { name: "Carousel items" });

      fireEvent.mouseDown(track, { button: 2, clientX: 10 });
      expect(track).not.toHaveAttribute("data-dragging");
    });
  });

  /**
   * The end-of-rail arrow used to render as a half-visible ghost:
   * `.carousel-arrow[data-hidden="true"] { opacity: 0 }` sat in
   * `@layer components` and `IconButton`'s own `disabled:opacity-50` beat it from
   * `@layer utilities`. As a utility on the same element the two are both 0,2,0
   * and the attribute variant is emitted last, so the fade-out is restored.
   * `cn()` keeps both because tailwind-merge only collapses utilities that share
   * a modifier.
   */
  it("carries the hidden-state utilities on the arrows", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );
    for (const name of ["Previous", "Next"]) {
      const classes = screen.getByRole("button", { name }).className.split(" ");
      expect(classes).toContain("data-[hidden=true]:opacity-0");
      expect(classes).toContain("data-[hidden=true]:pointer-events-none");
      expect(classes).toContain("disabled:opacity-50");
    }
  });

  // #189 — aria-roledescription and a name are prohibited on the implicit
  // `generic` role, so a conforming reader announced neither.
  it("#189: the root carries a real role alongside its roledescription", () => {
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const root = getCarouselRoot();
    expect(root).toHaveAttribute("role", "group");
    expect(root).toHaveAttribute("aria-label", "Carousel");
  });

  // #190 — an explicit behavior: "smooth" outranks the reduced-motion CSS block.
  it("#190: scrolls instantly when the user asked for reduced motion", async () => {
    stubReducedMotion(true);
    const user = userEvent.setup();
    render(
      <Carousel>
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
          <Carousel.Item>Slide 2</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    const track = screen.getByRole("region", { name: "Carousel items" });
    const scrollBySpy = vi.fn();
    track.scrollBy = scrollBySpy;
    makeScrollable(track);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });

  // #191 — `scrollLeft > 0` and a positive step are both LTR-only.
  describe("#191 · right-to-left", () => {
    it("enables Previous from a negative scrollLeft", () => {
      render(
        <Carousel>
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
            <Carousel.Item>Slide 2</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      const track = screen.getByRole("region", { name: "Carousel items" });
      track.dir = "rtl";
      makeScrollable(track, -300);

      expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    });

    it("advances toward the negative end", async () => {
      const user = userEvent.setup();
      render(
        <Carousel>
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
            <Carousel.Item>Slide 2</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      const track = screen.getByRole("region", { name: "Carousel items" });
      track.dir = "rtl";
      const scrollBySpy = vi.fn();
      track.scrollBy = scrollBySpy;
      makeScrollable(track);

      await user.click(screen.getByRole("button", { name: "Next" }));

      expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({ left: -300 }));
    });
  });

  // #192 — the arrow labels were hard-coded English with no way in.
  it("#192: renames the arrows through prevLabel / nextLabel", () => {
    render(
      <Carousel prevLabel="Précédent" nextLabel="Suivant">
        <Carousel.Track>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Track>
      </Carousel>,
    );

    expect(screen.getByRole("button", { name: "Précédent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  describe("slots", () => {
    type CarouselSlots = NonNullable<ComponentProps<typeof Carousel>["classNames"]>;

    const withSlots = (classNames: CarouselSlots) =>
      render(
        <Carousel title="Featured" classNames={classNames} data-testid="carousel">
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );

    it("lands classNames.title on the heading row, beside the base class", () => {
      const { container } = withSlots({ title: "text-h2" });
      const title = container.querySelector(".carousel-title");
      expect(title?.getAttribute("class")).toContain("carousel-title");
      expect(title?.getAttribute("class")).toContain("text-h2");
    });

    it("lands classNames.viewport on the scrollport, beside the base class", () => {
      const { container } = withSlots({ viewport: "px-r3" });
      const viewport = container.querySelector(".carousel-viewport");
      expect(viewport?.getAttribute("class")).toContain("carousel-viewport");
      expect(viewport?.getAttribute("class")).toContain("px-r3");
    });

    /**
     * `prev` and `next` are separate keys because they are separate roles.
     * Asserting each lands on its own control and *not* on the other is what
     * makes that a capability rather than a naming preference.
     */
    it("lands classNames.prev and classNames.next on their own arrows only", () => {
      withSlots({ prev: "bg-status-error", next: "bg-status-info" });
      const prev = screen.getByRole("button", { name: "Previous" });
      const next = screen.getByRole("button", { name: "Next" });

      expect(prev.className).toContain("carousel-arrow--prev");
      expect(prev.className).toContain("bg-status-error");
      expect(prev.className).not.toContain("bg-status-info");

      expect(next.className).toContain("carousel-arrow--next");
      expect(next.className).toContain("bg-status-info");
      expect(next.className).not.toContain("bg-status-error");
    });

    /**
     * This used to assert the class attribute equalled the marker exactly, which
     * stopped being expressible once `Carousel.css` became utilities on the
     * elements themselves. The falsifier is unchanged: an absent slot appends
     * *nothing* — no `undefined`, no `null`, no empty token.
     */
    it("leaves the internals on their base classes when no slot is passed", () => {
      const { container } = render(
        <Carousel title="Featured">
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      for (const marker of ["carousel-title", "carousel-viewport"]) {
        const classes = container.querySelector(`.${marker}`)?.getAttribute("class") ?? "";
        expect(classes.split(" ")).toContain(marker);
        expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
      }
    });

    it("does not put a slot class on the root", () => {
      withSlots({
        title: "text-h2",
        viewport: "px-r3",
        prev: "bg-status-error",
        next: "bg-status-info",
      });
      const root = screen.getByTestId("carousel");
      expect(root.className).toContain("carousel");
      expect(root.className).not.toContain("text-h2");
      expect(root.className).not.toContain("px-r3");
    });

    /**
     * The reason the slot union is written out per component rather than typed
     * `Record<string, string>`: an unknown key is a *type* error, not a silent
     * no-op. The `@ts-expect-error` is the assertion — it fails if TypeScript
     * ever stops rejecting the key. Do not "clean it up".
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        <Carousel
          title="Featured"
          // @ts-expect-error — `track` is a subcomponent, not a slot.
          classNames={{ track: "gap-r3" }}
        >
          <Carousel.Track>
            <Carousel.Item>Slide 1</Carousel.Item>
          </Carousel.Track>
        </Carousel>,
      );
      expect(
        container.querySelector(".carousel-track")?.getAttribute("class")?.split(" "),
      ).not.toContain("gap-r3");
    });

    it("does not leak classNames onto the DOM", () => {
      withSlots({ title: "text-h2" });
      expect(screen.getByTestId("carousel").hasAttribute("classnames")).toBe(false);
    });
  });
});
