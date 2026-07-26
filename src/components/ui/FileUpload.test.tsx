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
});
