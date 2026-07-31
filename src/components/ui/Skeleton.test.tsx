import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("is decoration by default — no role, nothing to announce", () => {
    render(<Skeleton data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el).not.toHaveAttribute("role");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toBeEmptyDOMElement();
  });

  it("a four-skeleton card mounts one live region, not four", () => {
    render(
      <div>
        <Skeleton>Loading profile</Skeleton>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("announces the caller's own words, in the caller's own language", () => {
    render(<Skeleton>Chargement du profil…</Skeleton>);

    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("Chargement du profil…");
    expect(screen.getByText("Chargement du profil…").className).toContain("sr-only");
    // One channel, not two: the old shape carried `aria-label="Loading"` *and*
    // an sr-only "Loading" child, and the label won the name computation, so
    // the child was unreachable markup.
    expect(el).not.toHaveAttribute("aria-label");
  });

  // Geometry moved from inline `width`/`height` props onto `className`. jsdom
  // applies no stylesheets, so these assert the INPUT to the cascade — which
  // declaration reaches the element — and never which one paints. The painted
  // half is measured with real Tailwind + getComputedStyle; see `Skeleton.css`
  // and the notes on `SizedFromClassName`.

  it("defaults to w-full in the class list, not an inline width", () => {
    render(<Skeleton data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("w-full");
    expect(el.style.width).toBe("");
  });

  it("className='w-20' replaces the default — the override the inline default made impossible", () => {
    render(<Skeleton className="w-20" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("w-20");
    // `cn` collapses the conflict rather than emitting both, so there is no
    // source-order coin-flip between the default and the caller.
    expect(el.className).not.toContain("w-full");
    expect(el.style.width).toBe("");
  });

  it("className='h-48' has nothing inline to beat — the CSS default is layered below it", () => {
    render(<Skeleton className="h-48" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("h-48");
    expect(el.style.height).toBe("");
  });

  it("emits no height of its own, so `.skeleton { height: 1em }` is what applies", () => {
    render(<Skeleton data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.style.height).toBe("");
    expect(el.className).not.toMatch(/(^|\s)h-/);
  });

  it("style still wins — the hatch for a width only known at runtime", () => {
    render(<Skeleton style={{ width: 200 }} className="w-20" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.style.width).toBe("200px");
    expect(el.className).toContain("w-20");
  });

  it("size-4 collapses both axes at once", () => {
    render(<Skeleton className="size-4" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("size-4");
    expect(el.className).not.toContain("w-full");
  });

  it("circular emits no inline geometry, so aspect-ratio derives the height from the width", () => {
    render(<Skeleton variant="circular" className="w-10" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("skeleton--circular");
    expect(el.className).toContain("w-10");
    expect(el.getAttribute("style")).toBeNull();
  });

  it("text variant applies correct class", () => {
    render(<Skeleton variant="text" data-testid="sk" />);
    expect(screen.getByTestId("sk").className).toContain("skeleton--text");
  });

  it("circular variant applies correct class", () => {
    render(<Skeleton variant="circular" data-testid="sk" />);
    expect(screen.getByTestId("sk").className).toContain("skeleton--circular");
  });

  it("rectangular variant applies base skeleton class", () => {
    render(<Skeleton variant="rectangular" data-testid="sk" />);
    expect(screen.getByTestId("sk").className).toContain("skeleton");
  });

  it("rounded variant applies correct class", () => {
    render(<Skeleton variant="rounded" data-testid="sk" />);
    expect(screen.getByTestId("sk").className).toContain("skeleton--rounded");
  });

  it("forwards className prop", () => {
    render(<Skeleton className="custom-class" data-testid="sk" />);
    expect(screen.getByTestId("sk").className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Skeleton ref={ref} data-testid="sk" />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toBe(screen.getByTestId("sk"));
  });
});
