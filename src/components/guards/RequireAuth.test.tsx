import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RequireAuth } from "./RequireAuth";

describe("RequireAuth", () => {
  // Spinner became decoration-by-default when N spinners stopped being N live
  // regions. That left this gate's blocking wait silent: the only thing on
  // screen was an aria-hidden spinner.
  it("announces the wait while the auth check is in flight", () => {
    render(
      <RequireAuth status="loading">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("says it in the caller's language", () => {
    render(
      <RequireAuth status="loading" loadingLabel="Vérification…">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Vérification…");
  });

  it("leaves a caller-supplied loadingFallback entirely alone", () => {
    render(
      <RequireAuth status="loading" loadingFallback={<p>mine</p>}>
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByText("mine")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders children once authenticated", () => {
    render(
      <RequireAuth status="authenticated">
        <p>secret</p>
      </RequireAuth>,
    );

    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
