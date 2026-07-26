import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

// A component that throws on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Normal content</div>;
}

// Suppress console.error for expected error boundary triggers
function suppressConsoleError() {
  const original = console.error;
  console.error = vi.fn();
  return () => {
    console.error = original;
  };
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("does not show fallback UI when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("catches errors and shows fallback UI", () => {
    const restore = suppressConsoleError();

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Normal content")).not.toBeInTheDocument();

    restore();
  });

  it("displays the error description in the fallback", () => {
    const restore = suppressConsoleError();

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();

    restore();
  });

  it("renders a 'Try again' button in the fallback", () => {
    const restore = suppressConsoleError();

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    restore();
  });

  it("resets and re-renders children when 'Try again' is clicked", async () => {
    const restore = suppressConsoleError();
    const user = userEvent.setup();

    // We need a stateful wrapper to control throw behavior
    let shouldThrow = true;

    function Wrapper() {
      if (shouldThrow) {
        throw new Error("Boom");
      }
      return <div>Recovered content</div>;
    }

    render(
      <ErrorBoundary>
        <Wrapper />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Stop throwing before retrying
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();

    restore();
  });

  it("catches errors from deeply nested components", () => {
    const restore = suppressConsoleError();

    function DeepChild(): never {
      throw new Error("Deep error");
    }

    render(
      <ErrorBoundary>
        <div>
          <div>
            <DeepChild />
          </div>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    restore();
  });

  it("renders a caller-supplied fallback instead of the built-in one", () => {
    const restore = suppressConsoleError();

    render(
      <ErrorBoundary fallback={<p>Inline failure</p>}>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Inline failure")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();

    restore();
  });

  it("hands the reset callback to a function fallback", async () => {
    const restore = suppressConsoleError();
    const user = userEvent.setup();

    function Harness() {
      return (
        <ErrorBoundary
          fallback={(reset) => (
            <button onClick={reset}>Retry inline</button>
          )}
        >
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
    }

    const { rerender } = render(
      <ErrorBoundary fallback={(reset) => <button onClick={reset}>Retry inline</button>}>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole("button", { name: "Retry inline" }));
    rerender(<Harness />);

    expect(screen.getByText("Normal content")).toBeInTheDocument();

    restore();
  });

  it("does not force the fallback to fill the viewport", () => {
    const restore = suppressConsoleError();

    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    // A boundary around a card or a table cell is the common case.
    expect(container.querySelector(".min-h-screen")).toBeNull();

    restore();
  });

  it("uses design tokens, not raw Tailwind defaults, in the fallback", () => {
    const restore = suppressConsoleError();

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    const heading = screen.getByRole("heading", { name: "Something went wrong" });
    expect(heading.className).toContain("text-h3");
    expect(heading.className).toContain("mb-r5");
    expect(heading.className).not.toContain("text-2xl");

    restore();
  });

  it("composes Button for the retry rather than re-implementing it", () => {
    const restore = suppressConsoleError();

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    const retry = screen.getByRole("button", { name: "Try again" });
    // Button's own recipe: the filled focus ring and the size-md padding scale.
    expect(retry.className).toContain("focus-visible:ring-border-focus");
    expect(retry.className).toContain("gap-[var(--BUTTON-GAP-MD)]");
    expect(retry.className).not.toContain("px-4 py-2");

    restore();
  });
});
