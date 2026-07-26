import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("is decoration by default — no role, nothing to announce", () => {
    render(<Spinner data-testid="spinner" />);
    const el = screen.getByTestId("spinner");
    expect(el).not.toHaveAttribute("role");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toBeEmptyDOMElement();
  });

  it("mounts one live region per page, not one per spinner", () => {
    render(
      <div>
        <Spinner>Loading results</Spinner>
        <Spinner />
        <Spinner />
      </div>,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("announces the caller's own words, in the caller's own language", () => {
    render(<Spinner>Envoi en cours…</Spinner>);

    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("Envoi en cours…");
    expect(screen.getByText("Envoi en cours…").className).toContain("sr-only");
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  it("applies the default md size class", () => {
    render(<Spinner data-testid="spinner" />);
    expect(screen.getByTestId("spinner").className).toContain("size-6");
  });

  it("applies the sm size class", () => {
    render(<Spinner size="sm" data-testid="spinner" />);
    expect(screen.getByTestId("spinner").className).toContain("size-4");
  });

  it("applies the lg size class", () => {
    render(<Spinner size="lg" data-testid="spinner" />);
    expect(screen.getByTestId("spinner").className).toContain("size-8");
  });

  it("applies base animation classes, guarded for reduced motion", () => {
    render(<Spinner data-testid="spinner" />);
    const el = screen.getByTestId("spinner");
    expect(el.className).toContain("animate-spin");
    expect(el.className).toContain("rounded-full");
    // The CSS package guards animation classes, not the `animate-*` utilities.
    expect(el.className).toContain("motion-reduce:animate-none");
  });

  it("merges custom className", () => {
    render(<Spinner className="my-spinner" data-testid="spinner" />);
    const el = screen.getByTestId("spinner");
    expect(el.className).toContain("my-spinner");
    expect(el.className).toContain("animate-spin");
  });

  it("forwards ref to the div element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Spinner ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through additional HTML attributes", () => {
    render(<Spinner data-testid="my-spinner" id="spinner-1" />);
    const el = screen.getByTestId("my-spinner");
    expect(el.id).toBe("spinner-1");
  });
});
