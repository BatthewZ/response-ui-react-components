import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Drawer } from "./Drawer";

// jsdom does not implement HTMLDialogElement.showModal / close, so we polyfill them.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
});

type RenderProps = {
  open?: boolean;
  onClose?: () => void;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
};

function renderDrawer(props: RenderProps = {}) {
  const { open = false, onClose = vi.fn(), ...rest } = props;
  return {
    onClose,
    ...render(
      <Drawer open={open} onClose={onClose} {...rest}>
        <h2>Drawer Title</h2>
        <p>Drawer description text</p>
      </Drawer>,
    ),
  };
}

describe("Drawer", () => {
  it("calls showModal (open attribute set) when open is true", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    renderDrawer({ open: true });

    expect(showModal).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    showModal.mockRestore();
  });

  it("has role='dialog' (native dialog element)", () => {
    renderDrawer({ open: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when Escape (cancel event) is fired", () => {
    const onClose = vi.fn();
    renderDrawer({ open: true, onClose });

    const dialog = screen.getByRole("dialog");
    const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("defaults data-side to 'right'", () => {
    renderDrawer({ open: true });

    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right");
  });

  it("reflects the side prop on data-side", () => {
    const sides = ["left", "right", "top", "bottom"] as const;
    for (const side of sides) {
      const { unmount } = renderDrawer({ open: true, side });
      expect(screen.getByRole("dialog")).toHaveAttribute("data-side", side);
      unmount();
    }
  });

  it("renders children inside the drawer", () => {
    render(
      <Drawer open={true} onClose={vi.fn()}>
        <h2>My Title</h2>
        <button>Close</button>
      </Drawer>,
    );

    expect(screen.getByRole("heading", { name: "My Title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("does not show / calls close when open is false", () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, "close");
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open={true} onClose={onClose}>
        <p>Content</p>
      </Drawer>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");

    rerender(
      <Drawer open={false} onClose={onClose}>
        <p>Content</p>
      </Drawer>,
    );

    expect(close).toHaveBeenCalled();
    expect(dialog).not.toHaveAttribute("open");
    close.mockRestore();
  });

  it("forwards className to the dialog element", () => {
    renderDrawer({ open: true, className: "custom-drawer" });

    expect(screen.getByRole("dialog")).toHaveClass("custom-drawer");
  });
});
