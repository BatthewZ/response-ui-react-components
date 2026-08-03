import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Dialog, DialogBody, DialogHeader } from "./Dialog";

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
      // Per spec, closing fires `close`. The component listens for it, so the
      // polyfill has to emit it or the test would be checking nothing.
      this.dispatchEvent(new Event("close"));
    };
  }
});

function renderDialog(props: { open?: boolean; onClose?: () => void; className?: string } = {}) {
  const { open = false, onClose = vi.fn(), ...rest } = props;
  return {
    onClose,
    ...render(
      <Dialog open={open} onClose={onClose} {...rest}>
        <h2>Dialog Title</h2>
        <p>Dialog description text</p>
      </Dialog>,
    ),
  };
}

describe("Dialog", () => {
  it("does not render content when open is false", () => {
    renderDialog({ open: false });

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).not.toHaveAttribute("open");
  });

  it("renders content when open is true", () => {
    renderDialog({ open: true });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByText("Dialog Title")).toBeInTheDocument();
    expect(screen.getByText("Dialog description text")).toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed", async () => {
    const onClose = vi.fn();

    renderDialog({ open: true, onClose });

    const dialog = screen.getByRole("dialog");

    // Dispatch a cancel event, which is what native dialog emits on Escape
    const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has role='dialog' (native dialog element)", () => {
    renderDialog({ open: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("forwards className to dialog element", () => {
    renderDialog({ open: true, className: "custom-dialog" });

    expect(screen.getByRole("dialog")).toHaveClass("custom-dialog");
  });

  it("opens and closes when open prop changes", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open={false} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).not.toHaveAttribute("open");

    rerender(
      <Dialog open={true} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    expect(dialog).toHaveAttribute("open");

    rerender(
      <Dialog open={false} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    expect(dialog).not.toHaveAttribute("open");
  });

  it("renders children inside the dialog", () => {
    render(
      <Dialog open={true} onClose={vi.fn()}>
        <h2>My Title</h2>
        <p>Some description</p>
        <button>Close</button>
      </Dialog>,
    );

    expect(screen.getByRole("heading", { name: "My Title" })).toBeInTheDocument();
    expect(screen.getByText("Some description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("reports a close the element performed itself, and can then reopen", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(true);
      const ref = useRef<HTMLDialogElement>(null);
      return (
        <>
          <button onClick={() => ref.current?.close()}>Close natively</button>
          <button onClick={() => setOpen(true)}>Reopen</button>
          <Dialog ref={ref} open={open} onClose={() => setOpen(false)}>
            <p>Body</p>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");

    // `ref.close()` stands in for `<form method="dialog">`: the element closes
    // itself without the `open` prop being told.
    await user.click(screen.getByRole("button", { name: "Close natively" }));
    expect(dialog).not.toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Reopen" }));
    expect(dialog).toHaveAttribute("open");
  });

  it("does not call onClose for a close it performed itself", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open={true} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    rerender(
      <Dialog open={false} onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    expect(onClose).not.toHaveBeenCalled();
  });

  it("reads the scrim from --OVERLAY-SCRIM-COLOR, as Drawer.css does", () => {
    renderDialog({ open: true });

    expect(screen.getByRole("dialog").className).toContain(
      "backdrop:bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]",
    );
  });

  it("guards its entrance animation for prefers-reduced-motion", () => {
    renderDialog({ open: true });

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("animate-fade-in");
    expect(dialog.className).toContain("motion-reduce:animate-none");
  });

  it("prevents default on cancel event so browser does not close dialog", () => {
    renderDialog({ open: true });

    const dialog = screen.getByRole("dialog");
    const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    // The cancel event should have been preventDefault'd
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("only declares its column layout while open", () => {
    renderDialog({ open: true });

    // The qualifier is the whole point: a bare `flex` here would beat the user
    // agent's `dialog:not([open]) { display: none }` and render every closed
    // dialog in the library inline on the page.
    const className = screen.getByRole("dialog").className;
    expect(className).toContain("open:flex");
    expect(className).toContain("open:flex-col");
    expect(className).not.toMatch(/(^|\s)flex(\s|$)/);
  });

  describe("light dismiss", () => {
    // jsdom lays nothing out, so the panel's box has to be supplied for the
    // inside/outside test to have anything to compare a press against.
    const PANEL = { left: 100, top: 100, right: 300, bottom: 200 };
    const OUTSIDE = { clientX: 50, clientY: 50 };
    const INSIDE = { clientX: 200, clientY: 150 };

    function withPanelRect(dialog: HTMLElement) {
      dialog.getBoundingClientRect = () =>
        ({
          ...PANEL,
          width: PANEL.right - PANEL.left,
          height: PANEL.bottom - PANEL.top,
          x: PANEL.left,
          y: PANEL.top,
          toJSON() {},
        }) as DOMRect;
    }

    function openWith(props: { lightDismiss?: boolean; onClose: () => void; onClick?: (e: React.MouseEvent<HTMLDialogElement>) => void }) {
      render(
        <Dialog open {...props}>
          <p>Content</p>
        </Dialog>,
      );
      const dialog = screen.getByRole("dialog");
      withPanelRect(dialog);
      return dialog;
    }

    it("is off unless asked for", () => {
      const onClose = vi.fn();
      const dialog = openWith({ onClose });

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes on a press that starts and ends on the scrim", () => {
      const onClose = vi.fn();
      const dialog = openWith({ onClose, lightDismiss: true });

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("stays open for a press on the panel's own padding", () => {
      const onClose = vi.fn();
      const dialog = openWith({ onClose, lightDismiss: true });

      fireEvent.pointerDown(dialog, INSIDE);
      fireEvent.click(dialog, INSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("stays open when a drag that began inside is released on the scrim", () => {
      const onClose = vi.fn();
      const dialog = openWith({ onClose, lightDismiss: true });

      fireEvent.pointerDown(screen.getByText("Content"), INSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("still runs a caller's own onClick", () => {
      const onClose = vi.fn();
      const onClick = vi.fn();
      const dialog = openWith({ onClose, lightDismiss: true, onClick });

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("lets a caller opt out by preventing the click", () => {
      const onClose = vi.fn();
      const dialog = openWith({
        onClose,
        lightDismiss: true,
        onClick: (event) => event.preventDefault(),
      });

      fireEvent.pointerDown(dialog, OUTSIDE);
      fireEvent.click(dialog, OUTSIDE);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("DialogHeader", () => {
    it("renders no close control unless given one", () => {
      render(
        <DialogHeader>
          <h2>Terms</h2>
        </DialogHeader>,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("calls onClose from the control it renders", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <DialogHeader onClose={onClose}>
          <h2>Terms</h2>
        </DialogHeader>,
      );

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("names the control, and falls back rather than shipping an empty name", () => {
      const { rerender } = render(<DialogHeader onClose={vi.fn()} closeLabel="Fermer" />);
      expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();

      rerender(<DialogHeader onClose={vi.fn()} closeLabel="" />);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("refuses to shrink, so the body is what gives", () => {
      render(<DialogHeader data-testid="head">Title</DialogHeader>);

      expect(screen.getByTestId("head")).toHaveClass("shrink-0");
    });

    it("forwards className and the rest", () => {
      render(
        <DialogHeader className="border-b" data-testid="head" id="head-id">
          Title
        </DialogHeader>,
      );

      const head = screen.getByTestId("head");
      expect(head).toHaveClass("border-b");
      expect(head).toHaveAttribute("id", "head-id");
    });
  });

  describe("DialogBody", () => {
    it("is the part that scrolls, and can shrink below its content to do it", () => {
      render(<DialogBody data-testid="body">Long content</DialogBody>);

      const body = screen.getByTestId("body");
      expect(body).toHaveClass("overflow-y-auto");
      // Without `min-h-0` a flex item's floor is its content, so the panel would
      // grow past the viewport instead of this scrolling.
      expect(body).toHaveClass("min-h-0");
      expect(body).toHaveClass("flex-1");
      // The library's visually-hidden text is `position: absolute` with no
      // offsets; with no positioned ancestor it escapes this clip entirely.
      expect(body).toHaveClass("relative");
    });

    it("forwards className and the rest", () => {
      render(
        <DialogBody className="px-r4" data-testid="body" id="body-id">
          Content
        </DialogBody>,
      );

      const body = screen.getByTestId("body");
      expect(body).toHaveClass("px-r4");
      expect(body).toHaveAttribute("id", "body-id");
    });
  });
});
