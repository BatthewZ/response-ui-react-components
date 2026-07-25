// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Portal } from "./Portal";
import { ToastProvider } from "./ToastContext";

describe("ToastProvider server rendering", () => {
  it("runs in an environment with no document", () => {
    expect(typeof document).toBe("undefined");
  });

  it("does not throw when server-rendered", () => {
    expect(() =>
      renderToStaticMarkup(
        <ToastProvider>
          <p>app tree</p>
        </ToastProvider>
      )
    ).not.toThrow();
  });

  it("still renders its children on the server", () => {
    expect(
      renderToStaticMarkup(
        <ToastProvider>
          <p>app tree</p>
        </ToastProvider>
      )
    ).toBe("<p>app tree</p>");
  });

  it("matches Portal, which already omits its content on the server", () => {
    expect(
      renderToStaticMarkup(
        <Portal>
          <p>portalled</p>
        </Portal>
      )
    ).toBe("");
  });
});
