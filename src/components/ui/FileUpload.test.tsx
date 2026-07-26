import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { FileUpload } from "./FileUpload";

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any` (same helper as AppShell.test.tsx).
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

describe("FileUpload", () => {
  it("renders dropzone area with button role", () => {
    render(<FileUpload />);
    expect(screen.getByRole("button", { name: "Upload file" })).toBeInTheDocument();
  });

  it("renders drag & drop text", () => {
    render(<FileUpload />);
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    expect(screen.getByText("browse")).toBeInTheDocument();
  });

  it("click opens file picker (clicking triggers hidden input)", async () => {
    const user = userEvent.setup();
    render(<FileUpload />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(inputEl, "click");

    await user.click(screen.getByRole("button", { name: "Upload file" }));
    // The hidden input's own click bubbles back to the dropzone; if that were not
    // stopped, one user click would open the picker twice.
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("runs a caller onClick and still opens the file picker", async () => {
    const user = userEvent.setup();
    const track = vi.fn();
    render(<FileUpload onClick={track} />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(inputEl, "click");

    await user.click(screen.getByRole("button", { name: "Upload file" }));
    expect(track).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it.each(["{Enter}", " "])(
    "runs a caller onKeyDown and still opens the file picker via %s",
    async (key) => {
      const user = userEvent.setup();
      const track = vi.fn();
      render(<FileUpload onKeyDown={track} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      const clickSpy = vi.spyOn(inputEl, "click");

      await user.tab();
      expect(screen.getByRole("button", { name: "Upload file" })).toHaveFocus();
      await user.keyboard(key);
      expect(track).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    },
  );

  it("runs caller drag handlers and still toggles the drag-over state", () => {
    const onDragOver = vi.fn();
    const onDragLeave = vi.fn();
    render(<FileUpload onDragOver={onDragOver} onDragLeave={onDragLeave} />);
    const zone = screen.getByRole("button", { name: "Upload file" });

    fireEvent.dragOver(zone);
    expect(onDragOver).toHaveBeenCalledTimes(1);
    expect(zone.className).toContain("file-upload--drag-over");

    fireEvent.dragLeave(zone);
    expect(onDragLeave).toHaveBeenCalledTimes(1);
    expect(zone.className).not.toContain("file-upload--drag-over");
  });

  it("skips its own click behaviour when the caller prevents default", async () => {
    const user = userEvent.setup();
    render(<FileUpload onClick={(e) => e.preventDefault()} />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(inputEl, "click");

    await user.click(screen.getByRole("button", { name: "Upload file" }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("shows max size text when maxSize is provided", () => {
    render(<FileUpload maxSize={5 * 1024 * 1024} />);
    expect(screen.getByText("Max file size: 5.0 MB")).toBeInTheDocument();
  });

  it("shows custom hint text", () => {
    render(<FileUpload hint="Only PNG files" />);
    expect(screen.getByText("Only PNG files")).toBeInTheDocument();
  });

  it("displays error message when present", () => {
    render(<FileUpload error="File too large" />);
    expect(screen.getByText("File too large")).toBeInTheDocument();
  });

  it("hides hint when error is present", () => {
    render(<FileUpload maxSize={1024} error="Something went wrong" />);
    expect(screen.queryByText(/max file size/i)).not.toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("displays success message when present", () => {
    render(<FileUpload success="Upload complete!" />);
    expect(screen.getByText("Upload complete!")).toBeInTheDocument();
  });

  it("disabled state sets aria-disabled", () => {
    render(<FileUpload disabled />);
    expect(screen.getByRole("button", { name: "Upload file" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("disabled state prevents file picker from opening", async () => {
    const user = userEvent.setup();
    render(<FileUpload disabled />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(inputEl, "click");

    await user.click(screen.getByRole("button", { name: "Upload file" }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("disabled state sets tabIndex to -1", () => {
    render(<FileUpload disabled />);
    expect(screen.getByRole("button", { name: "Upload file" })).toHaveAttribute("tabindex", "-1");
  });

  it("forwards className prop", () => {
    render(<FileUpload className="custom-upload" />);
    const dropzone = screen.getByRole("button", { name: "Upload file" });
    expect(dropzone.className).toContain("custom-upload");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FileUpload ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("shows uploading state text", () => {
    render(<FileUpload uploading />);
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(screen.queryByText(/drag & drop/i)).not.toBeInTheDocument();
  });

  it("applies accept attribute to hidden input", () => {
    render(<FileUpload accept={["image/png", "image/jpeg"]} />);
    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(inputEl).toHaveAttribute("accept", "image/png,image/jpeg");
  });

  it("sets multiple attribute on hidden input", () => {
    render(<FileUpload multiple />);
    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(inputEl).toHaveAttribute("multiple");
  });

  it("disables hidden input when disabled", () => {
    render(<FileUpload disabled />);
    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(inputEl).toBeDisabled();
  });

  /* ------------------------------------------------------------------ */
  /*  Drop pipeline — the caller's onDrop must not replace ours          */
  /* ------------------------------------------------------------------ */

  describe("drop", () => {
    const dropped = new File(["x"], "notes.txt", { type: "text/plain" });

    function dropOnZone() {
      fireEvent.drop(screen.getByRole("button", { name: "Upload file" }), {
        dataTransfer: { files: [dropped] },
      });
    }

    it("reports dropped files", () => {
      const onFilesSelected = vi.fn();
      render(<FileUpload multiple onFilesSelected={onFilesSelected} />);

      dropOnZone();
      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([dropped]);
    });

    it("runs a caller onDrop and still reports the dropped files", () => {
      const onFilesSelected = vi.fn();
      const onDrop = vi.fn();
      render(<FileUpload multiple onFilesSelected={onFilesSelected} onDrop={onDrop} />);

      dropOnZone();
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledTimes(1);
    });

    it("survives an onDrop arriving inside a spread bag TypeScript cannot see", () => {
      const onFilesSelected = vi.fn();
      const onDrop = vi.fn();
      render(
        <FileUpload
          multiple
          onFilesSelected={onFilesSelected}
          {...untypedProps({ onDrop, "data-slot": "dropzone" })}
        />,
      );

      dropOnZone();
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      // The rest of the bag is still forwarded.
      expect(screen.getByRole("button", { name: "Upload file" })).toHaveAttribute(
        "data-slot",
        "dropzone",
      );
    });

    it("skips its own drop behaviour when the caller prevents default", () => {
      const onFilesSelected = vi.fn();
      render(
        <FileUpload
          multiple
          onFilesSelected={onFilesSelected}
          onDrop={(e) => e.preventDefault()}
        />,
      );

      dropOnZone();
      expect(onFilesSelected).toHaveBeenCalledTimes(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  `accept` grammar (#408) — same grammar as the input's attribute    */
  /* ------------------------------------------------------------------ */

  describe("accept matching", () => {
    /** Bypasses userEvent's own accept filter so *our* validation is what runs. */
    function pickFiles(accept: string[], files: File[]) {
      const onFilesSelected = vi.fn();
      render(<FileUpload accept={accept} multiple onFilesSelected={onFilesSelected} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      Object.defineProperty(inputEl, "files", { value: files, configurable: true });
      fireEvent.change(inputEl);

      return onFilesSelected;
    }

    it("accepts a wildcard MIME rule", () => {
      const file = new File(["x"], "photo.png", { type: "image/png" });
      const onFilesSelected = pickFiles(["image/*"], [file]);

      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });

    it("accepts */* for any file", () => {
      const file = new File(["x"], "mystery.bin", { type: "" });
      const onFilesSelected = pickFiles(["*/*"], [file]);

      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });

    it("accepts an extension rule case-insensitively", () => {
      const file = new File(["x"], "Report.PDF", { type: "application/pdf" });
      const onFilesSelected = pickFiles([".pdf"], [file]);

      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });

    it("accepts a typeless file on its extension alone", () => {
      const file = new File(["x"], "snap.heic", { type: "" });
      const onFilesSelected = pickFiles([".heic"], [file]);

      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });

    it("filters out files no rule matches and keeps the rest", () => {
      const png = new File(["x"], "photo.png", { type: "image/png" });
      const txt = new File(["x"], "notes.txt", { type: "text/plain" });
      const onFilesSelected = pickFiles(["image/*"], [png, txt]);

      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([png]);
    });

    it("emits nothing when every file is rejected", () => {
      const onFilesSelected = pickFiles(
        ["image/*", ".pdf"],
        [new File(["x"], "notes.txt", { type: "text/plain" })],
      );

      expect(onFilesSelected).toHaveBeenCalledTimes(0);
    });

    it("rejects a typeless file when only MIME rules are given", () => {
      const onFilesSelected = pickFiles(
        ["image/*"],
        [new File(["x"], "mystery.bin", { type: "" })],
      );

      expect(onFilesSelected).toHaveBeenCalledTimes(0);
    });

    it("still accepts an exact MIME rule", () => {
      const file = new File(["x"], "photo.png", { type: "image/png" });
      const onFilesSelected = pickFiles(["image/png"], [file]);

      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  #409 — a rejection is reported, not swallowed                      */
  /* ------------------------------------------------------------------ */

  describe("#409 · rejected files are observable", () => {
    function pick(ui: React.ReactElement, files: File[]) {
      render(ui);
      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      Object.defineProperty(inputEl, "files", { value: files, configurable: true });
      fireEvent.change(inputEl);
    }

    it("calls onFilesRejected with the file and the reason it failed accept", () => {
      const onFilesRejected = vi.fn();
      const txt = new File(["x"], "notes.txt", { type: "text/plain" });
      pick(<FileUpload accept={["image/*"]} onFilesRejected={onFilesRejected} />, [txt]);

      expect(onFilesRejected).toHaveBeenCalledTimes(1);
      expect(onFilesRejected).toHaveBeenCalledWith([{ file: txt, reason: "type" }]);
    });

    it("calls onFilesRejected with reason 'size' when maxSize is what failed", () => {
      const onFilesRejected = vi.fn();
      const big = new File(["0123456789"], "big.png", { type: "image/png" });
      pick(<FileUpload maxSize={4} onFilesRejected={onFilesRejected} />, [big]);

      expect(onFilesRejected).toHaveBeenCalledWith([{ file: big, reason: "size" }]);
    });

    it("shows an internal message naming the rejected file", () => {
      pick(<FileUpload accept={["image/*"]} />, [new File(["x"], "notes.txt", { type: "text/plain" })]);
      expect(screen.getByRole("alert")).toHaveTextContent(/notes\.txt/);
    });

    it("lets the error prop override the internal rejection message", () => {
      pick(<FileUpload accept={["image/*"]} error="Server said no" />, [
        new File(["x"], "notes.txt", { type: "text/plain" }),
      ]);
      expect(screen.getByRole("alert")).toHaveTextContent("Server said no");
      expect(screen.queryByText(/notes\.txt/)).not.toBeInTheDocument();
    });

    it("clears the internal message once a valid file is chosen", () => {
      render(<FileUpload accept={["image/*"]} />);
      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;

      Object.defineProperty(inputEl, "files", {
        value: [new File(["x"], "notes.txt", { type: "text/plain" })],
        configurable: true,
      });
      fireEvent.change(inputEl);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      Object.defineProperty(inputEl, "files", {
        value: [new File(["x"], "photo.png", { type: "image/png" })],
        configurable: true,
      });
      fireEvent.change(inputEl);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  #411 / #412 / #410 / #418 — the preview state                      */
  /* ------------------------------------------------------------------ */

  describe("preview state", () => {
    const a = new File(["a"], "a.txt", { type: "text/plain" });
    const b = new File(["b"], "b.txt", { type: "text/plain" });
    const c = new File(["c"], "c.txt", { type: "text/plain" });

    // #411 — removing one file used to fall back to onClear and drop all of them.
    it("renders no per-file remove control when onRemoveFile is absent", () => {
      const onClear = vi.fn();
      render(<FileUpload files={[a, b, c]} onClear={onClear} />);

      expect(screen.queryByRole("button", { name: "Remove b.txt" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    });

    it("removes only the file whose control was pressed", async () => {
      const user = userEvent.setup();
      const onRemoveFile = vi.fn();
      const onClear = vi.fn();
      render(<FileUpload files={[a, b, c]} onRemoveFile={onRemoveFile} onClear={onClear} />);

      await user.click(screen.getByRole("button", { name: "Remove b.txt" }));
      expect(onRemoveFile).toHaveBeenCalledWith(1);
      expect(onClear).not.toHaveBeenCalled();
    });

    // #412 — three real buttons inside a role="button" are presentational to ARIA.
    it("drops the button role from the dropzone once a preview is on screen", () => {
      render(<FileUpload files={[a]} onClear={vi.fn()} />);

      expect(screen.queryByRole("button", { name: "Upload file" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    });

    // #410 — `uploading` used to leave an inert preview with no explanation.
    it("marks the root busy and disables the preview actions while uploading", () => {
      const { container } = render(
        <FileUpload files={[a]} uploading onClear={vi.fn()} onRemoveFile={vi.fn()} />,
      );

      expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("button", { name: "Replace" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Remove a.txt" })).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent("Uploading...");
    });

    // #418 — `success` was gated on the empty state; `error` was not.
    it("renders the success message with files present", () => {
      render(<FileUpload files={[a]} success="Saved" />);
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  #413 — the messages are announced and described                    */
  /* ------------------------------------------------------------------ */

  describe("#413 · messages reach assistive tech", () => {
    it("gives the error an alert role and points the dropzone at it", () => {
      const { container } = render(<FileUpload error="File too large" />);
      const alert = screen.getByRole("alert");

      expect(alert).toHaveTextContent("File too large");
      expect(container.firstElementChild).toHaveAttribute("aria-describedby", alert.id);
    });

    it("gives the success message a status role and describes the dropzone", () => {
      const { container } = render(<FileUpload success="Upload complete!" />);
      const status = screen.getByRole("status");

      expect(status).toHaveTextContent("Upload complete!");
      expect(container.firstElementChild).toHaveAttribute("aria-describedby", status.id);
    });

    it("never names an id that is not in the document", () => {
      const { container } = render(
        <FileUpload files={[new File(["a"], "a.txt", { type: "text/plain" })]} hint="Only PNG" />,
      );
      const describedBy = container.firstElementChild!.getAttribute("aria-describedby");
      for (const id of (describedBy ?? "").split(" ").filter(Boolean)) {
        expect(document.getElementById(id)).not.toBeNull();
      }
    });

    it("describes the dropzone with the hint when there is no message", () => {
      const { container } = render(<FileUpload hint="Only PNG files" />);
      const describedBy = container.firstElementChild!.getAttribute("aria-describedby");

      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toHaveTextContent("Only PNG files");
    });
  });
});
