"use client";
import { Component, type ReactNode } from "react";

import { Button } from "./Button";

interface Props {
  children: ReactNode;
  /**
   * Replaces the built-in fallback. Given the reset callback, so a custom
   * fallback keeps the retry the default one offers.
   */
  fallback?: ReactNode | ((reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback } = this.props;
    if (fallback !== undefined) {
      return typeof fallback === "function" ? fallback(this.reset) : fallback;
    }

    // Sized by its own content, not by the viewport: a boundary around a card
    // or a table cell is the common case, and `min-h-screen` made the fallback
    // taller than the thing that failed.
    //
    // Rung 0 because this stands in for the card that failed and draws no
    // border — the raised sheet is the only thing giving it an edge on canvas.
    return (
      <div
        // slot:(a) the built-in fallback, which `fallback` replaces outright —
        // and it is handed `reset`, so a replacement keeps the retry rather than
        // trading it for a class. This branch renders only when the caller took
        // neither route, so a key here would name elements a caller who cares
        // about the look never sees. The boundary takes no `className`: it
        // renders `children` untouched until it catches.
        className="flex items-center justify-center bg-surface-0 p-r2"
      >
        <div
          // slot:(a) inside the built-in fallback — replaced wholesale by
          // `fallback`, along with everything below it.
          className="text-center"
        >
          <h1
            // slot:(a) inside the built-in fallback — replaced wholesale by
            // `fallback`, which builds its own heading.
            className="text-h3 font-bold mb-r5"
          >
            Something went wrong
          </h1>
          <p
            // slot:(a) inside the built-in fallback — replaced wholesale by
            // `fallback`, which builds its own message.
            className="text-fg-secondary mb-r3"
          >
            An unexpected error occurred.
          </p>
          <Button onClick={this.reset}>Try again</Button>
        </div>
      </div>
    );
  }
}
