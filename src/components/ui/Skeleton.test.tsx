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

  it("width prop applies correctly via inline style", () => {
    render(<Skeleton width={200} data-testid="sk" />);
    expect(screen.getByTestId("sk").style.width).toBe("200px");
  });

  it("height prop applies correctly via inline style", () => {
    render(<Skeleton height="3rem" data-testid="sk" />);
    expect(screen.getByTestId("sk").style.height).toBe("3rem");
  });

  it("defaults width to 100%", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk").style.width).toBe("100%");
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
