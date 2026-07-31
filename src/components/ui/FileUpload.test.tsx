import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef, StrictMode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  /* ------------------------------------------------------------------ */
  /*  #416 — object URLs are minted in an effect, not during render      */
  /* ------------------------------------------------------------------ */

  describe("#416 · object-URL lifecycle", () => {
    /** jsdom implements neither `createObjectURL` nor `revokeObjectURL`. */
    function stubObjectUrls() {
      let created = 0;
      const createObjectURL = vi.fn(() => `blob:mock/${++created}`);
      const revokeObjectURL = vi.fn();
      vi.stubGlobal(
        "URL",
        class StubURL extends URL {
          static createObjectURL = createObjectURL;
          static revokeObjectURL = revokeObjectURL;
        },
      );
      /** Every URL handed out and never handed back — the leak, counted. */
      const leaked = () => {
        const revoked = new Set(revokeObjectURL.mock.calls.map((c) => c[0] as string));
        return createObjectURL.mock.results
          .map((r) => r.value as string)
          .filter((url) => !revoked.has(url));
      };
      return { createObjectURL, revokeObjectURL, leaked };
    }

    const image = new File(["x"], "photo.png", { type: "image/png" });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("leaks nothing under StrictMode's double render", () => {
      const { leaked } = stubObjectUrls();
      const { unmount } = render(
        <StrictMode>
          <FileUpload files={[image]} />
        </StrictMode>,
      );

      // Exactly one URL is live while the preview is on screen…
      expect(leaked()).toHaveLength(1);
      expect(screen.getByAltText("photo.png")).toHaveAttribute("src", leaked()[0]);

      unmount();
      // …and none survives the unmount.
      expect(leaked()).toEqual([]);
    });

    it("mints one URL for a file, however often an inline files={[file]} re-renders", () => {
      const { createObjectURL, revokeObjectURL } = stubObjectUrls();

      let bump = () => {};
      function Host() {
        const [, setN] = useState(0);
        bump = () => setN((n) => n + 1);
        // A fresh array literal every render — the shape that used to churn.
        return <FileUpload files={[image]} />;
      }
      render(<Host />);

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const url = createObjectURL.mock.results[0].value as string;

      act(() => bump());
      act(() => bump());

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();
      expect(screen.getByAltText("photo.png")).toHaveAttribute("src", url);
    });

    it("revokes a file's URL once it leaves the selection", () => {
      const { createObjectURL, revokeObjectURL } = stubObjectUrls();
      const second = new File(["y"], "other.png", { type: "image/png" });

      const { rerender } = render(<FileUpload files={[image, second]} />);
      expect(createObjectURL).toHaveBeenCalledTimes(2);
      const [firstUrl] = createObjectURL.mock.results.map((r) => r.value as string);

      rerender(<FileUpload files={[second]} />);

      expect(revokeObjectURL.mock.calls).toEqual([[firstUrl]]);
      expect(createObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  #420 — every built-in word has an override path                    */
  /* ------------------------------------------------------------------ */

  describe("#420 · built-in copy is overridable", () => {
    const doc = new File(["a"], "notes.txt", { type: "text/plain" });

    it("translates the empty dropzone's prompt and accessible name", () => {
      render(
        <FileUpload
          labels={{ prompt: "Glisser-déposer ou", browse: "parcourir", dropzone: "Téléverser" }}
        />,
      );

      const zone = screen.getByRole("button", { name: "Téléverser" });
      expect(zone).toHaveTextContent("Glisser-déposer ou parcourir");
      expect(zone).not.toHaveTextContent("Drag & drop or");
    });

    it("translates the preview actions and the uploading caption", () => {
      render(
        <FileUpload
          files={[doc]}
          uploading
          onClear={vi.fn()}
          labels={{ replace: "Remplacer", clearAll: "Tout effacer", uploading: "Envoi…" }}
        />,
      );

      expect(screen.getByRole("button", { name: "Remplacer" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tout effacer" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Envoi…");
    });

    it("interpolates the file name through removeFileLabel", () => {
      render(
        <FileUpload
          files={[doc]}
          onRemoveFile={vi.fn()}
          removeFileLabel={(file) => `Supprimer ${file.name}`}
        />,
      );

      expect(screen.getByRole("button", { name: "Supprimer notes.txt" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remove notes.txt" })).not.toBeInTheDocument();
    });

    it("keeps a caller's own aria-label winning over labels.dropzone", () => {
      render(<FileUpload labels={{ dropzone: "Téléverser" }} aria-label="Avatar" />);
      expect(screen.getByRole("button", { name: "Avatar" })).toBeInTheDocument();
    });

    it("lets a label be emptied rather than defaulted", () => {
      render(<FileUpload labels={{ prompt: "" }} />);
      const zone = screen.getByRole("button", { name: "Upload file" });
      expect(zone).not.toHaveTextContent("Drag & drop or");
      expect(zone).toHaveTextContent("browse");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Slots, render props and the state attributes                       */
  /* ------------------------------------------------------------------ */

  describe("slots", () => {
    type Slots = NonNullable<ComponentProps<typeof FileUpload>["classNames"]>;

    const txt = new File(["x"], "notes.txt", { type: "text/plain" });
    const png = new File(["x"], "photo.png", { type: "image/png" });
    const png2 = new File(["x"], "other.png", { type: "image/png" });

    /** jsdom implements neither `createObjectURL` nor `revokeObjectURL`. */
    function stubObjectUrls() {
      let created = 0;
      vi.stubGlobal(
        "URL",
        class StubURL extends URL {
          static createObjectURL = vi.fn(() => `blob:mock/${++created}`);
          static revokeObjectURL = vi.fn();
        },
      );
    }

    afterEach(() => vi.unstubAllGlobals());

    const cls = (container: HTMLElement, selector: string) =>
      container.querySelector(selector)?.getAttribute("class") ?? "";

    /* ---- The empty / prompt state ---- */

    /**
     * One test per slot key, and every key asserted in exactly one test —
     * otherwise deleting one merge reddens several tests for one defect and the
     * extra reds say nothing. The four keys that address an element in *both*
     * states get their two renders inside their own test for the same reason.
     */
    it("lands the prompt-state slots on their own elements, beside the base class", () => {
      const { container } = render(
        <FileUpload
          classNames={{ icon: "text-status-info", text: "text-h3", textEmphasis: "underline" }}
        />,
      );
      const cases: [string, string][] = [
        [".file-upload__icon", "text-status-info"],
        [".file-upload__text", "text-h3"],
        [".file-upload__text-emphasis", "underline"],
      ];
      for (const [selector, extra] of cases) {
        expect(cls(container, selector), selector).toContain(selector.slice(1));
        expect(cls(container, selector), selector).toContain(extra);
      }
    });

    /* ---- The preview state ---- */

    it("lands the preview-state slots on their own elements, beside the base class", () => {
      stubObjectUrls();
      const { container } = render(
        <FileUpload
          files={[txt]}
          onClear={() => {}}
          classNames={{
            preview: "gap-r3",
            actions: "justify-end",
            replace: "underline",
            clear: "italic",
          }}
        />,
      );

      const cases: [string, string][] = [
        [".file-upload__preview", "gap-r3"],
        [".file-upload__preview-actions", "justify-end"],
        [".file-upload__preview-replace", "underline"],
        [".file-upload__preview-clear", "italic"],
      ];
      for (const [selector, extra] of cases) {
        expect(cls(container, selector), selector).toContain(selector.slice(1));
        expect(cls(container, selector), selector).toContain(extra);
      }
    });

    /* ---- The four keys that address two elements each ---- */

    /**
     * `list` addresses both preview containers, because they are one concept the
     * component picks between from the file list. Several media files plus one
     * other renders both at once. If that ever splits into two keys, this is the
     * test that has to move rather than be deleted.
     */
    it("lands classNames.list on the media grid and the row list alike", () => {
      stubObjectUrls();
      const { container } = render(
        <FileUpload files={[png, png2, txt]} classNames={{ list: "grid-cols-4" }} />,
      );
      for (const selector of [".file-upload__media-grid", ".file-upload__preview-list"]) {
        expect(cls(container, selector), selector).toContain(selector.slice(1));
        expect(cls(container, selector), selector).toContain("grid-cols-4");
      }
    });

    it("lands classNames.hint on the constraints line and the uploading caption", () => {
      stubObjectUrls();
      const prompt = render(<FileUpload hint="PNG up to 2MB" classNames={{ hint: "italic" }} />);
      const preview = render(
        <FileUpload files={[txt]} uploading classNames={{ hint: "italic" }} />,
      );
      for (const container of [prompt.container, preview.container]) {
        expect(cls(container, ".file-upload__hint")).toContain("file-upload__hint");
        expect(cls(container, ".file-upload__hint")).toContain("italic");
      }
    });

    it("lands classNames.error on the message in both states", () => {
      stubObjectUrls();
      const prompt = render(<FileUpload error="Too big" classNames={{ error: "font-bold" }} />);
      const preview = render(
        <FileUpload files={[txt]} error="Too big" classNames={{ error: "font-bold" }} />,
      );
      for (const container of [prompt.container, preview.container]) {
        expect(cls(container, ".file-upload__error")).toContain("file-upload__error");
        expect(cls(container, ".file-upload__error")).toContain("font-bold");
      }
    });

    it("lands classNames.success on the message in both states", () => {
      stubObjectUrls();
      const prompt = render(
        <FileUpload success="Uploaded" classNames={{ success: "font-bold" }} />,
      );
      const preview = render(
        <FileUpload files={[txt]} success="Uploaded" classNames={{ success: "font-bold" }} />,
      );
      for (const container of [prompt.container, preview.container]) {
        expect(cls(container, ".file-upload__success")).toContain("file-upload__success");
        expect(cls(container, ".file-upload__success")).toContain("font-bold");
      }
    });

    /* ---- Companions ---- */

    it("leaves the internals on their base classes when no slot is passed", () => {
      const { container } = render(<FileUpload hint="PNG up to 2MB" />);
      for (const selector of [
        ".file-upload__icon",
        ".file-upload__text",
        ".file-upload__text-emphasis",
        ".file-upload__hint",
      ]) {
        expect(cls(container, selector), selector).toBe(selector.slice(1));
      }
    });

    it("does not put a slot class on the dropzone root", () => {
      render(
        <FileUpload
          hint="PNG up to 2MB"
          classNames={{ icon: "text-status-info", text: "text-h3", hint: "italic" }}
        />,
      );
      const zone = screen.getByRole("button", { name: "Upload file" });
      expect(zone.className).toContain("file-upload");
      expect(zone.className).not.toContain("text-status-info");
      expect(zone.className).not.toContain("text-h3");
      expect(zone.className).not.toContain("italic");
    });

    /**
     * The reason the slot union is written out per component rather than typed
     * `Record<string, string>`: an unknown key is a *type* error, not a silent
     * no-op. The `@ts-expect-error` is the assertion — it fails if TypeScript
     * ever stops rejecting the key. Do not "clean it up".
     *
     * `thumb` is the pointed one: it names an element inside the preview
     * components, which are `renderFile`'s, not a slot's.
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        // @ts-expect-error — `thumb` lives inside a preview; use `renderFile`.
        <FileUpload hint="PNG up to 2MB" classNames={{ thumb: "rounded-lg" }} />,
      );
      expect(cls(container, ".file-upload__hint")).toBe("file-upload__hint");
    });

    it("does not leak classNames onto the DOM", () => {
      render(<FileUpload classNames={{ icon: "text-status-info" }} />);
      const zone = screen.getByRole("button", { name: "Upload file" });
      expect(zone.hasAttribute("classnames")).toBe(false);
      expect(zone.hasAttribute("renderpreview")).toBe(false);
      expect(zone.hasAttribute("renderfile")).toBe(false);
    });

    /* ---- The state attributes ---- */

    it("mirrors each root modifier class as a data-* attribute", () => {
      stubObjectUrls();
      const { container } = render(
        <FileUpload files={[txt]} uploading disabled error="Bad" success="Good" />,
      );
      const zone = container.querySelector(".file-upload") as HTMLElement;

      for (const [attr, modifier] of [
        ["data-has-files", "file-upload--has-files"],
        ["data-uploading", "file-upload--uploading"],
        ["data-disabled", "file-upload--disabled"],
        ["data-error", "file-upload--error"],
        ["data-success", "file-upload--success"],
      ] as const) {
        expect(zone.getAttribute(attr), attr).toBe("true");
        expect(zone.className, modifier).toContain(modifier);
      }
    });

    it("omits a state attribute rather than writing false", () => {
      render(<FileUpload />);
      const zone = screen.getByRole("button", { name: "Upload file" });
      for (const attr of [
        "data-has-files",
        "data-drag-over",
        "data-uploading",
        "data-disabled",
        "data-error",
        "data-success",
      ]) {
        expect(zone.hasAttribute(attr), attr).toBe(false);
      }
    });

    it("sets data-drag-over while a drag is over the zone", () => {
      render(<FileUpload />);
      const zone = screen.getByRole("button", { name: "Upload file" });
      fireEvent.dragOver(zone);
      expect(zone.getAttribute("data-drag-over")).toBe("true");
      expect(zone.className).toContain("file-upload--drag-over");
    });
  });

  describe("renderPreview / renderFile", () => {
    const txt = new File(["x"], "notes.txt", { type: "text/plain" });
    const png = new File(["x"], "photo.png", { type: "image/png" });
    const png2 = new File(["x"], "other.png", { type: "image/png" });

    function stubObjectUrls() {
      let created = 0;
      vi.stubGlobal(
        "URL",
        class StubURL extends URL {
          static createObjectURL = vi.fn(() => `blob:mock/${++created}`);
          static revokeObjectURL = vi.fn();
        },
      );
    }

    afterEach(() => vi.unstubAllGlobals());

    it("replaces the large media preview and reports layout: large", () => {
      stubObjectUrls();
      const seen: string[] = [];
      const { container } = render(
        <FileUpload
          files={[png]}
          renderPreview={(item) => {
            seen.push(item.layout);
            return <p data-testid="custom">{item.file.name}</p>;
          }}
        />,
      );

      // The object URL is minted in an effect, so the renderer runs again once
      // it lands — assert what it was told, not how often.
      expect(seen.length).toBeGreaterThan(0);
      expect(new Set(seen)).toEqual(new Set(["large"]));
      expect(screen.getByTestId("custom")).toHaveTextContent("photo.png");
      expect(container.querySelector(".file-upload__media-large")).toBeNull();
      // The chrome around it is still the component's.
      expect(container.querySelector(".file-upload__preview")).not.toBeNull();
    });

    it("replaces every grid cell and reports layout: grid", () => {
      stubObjectUrls();
      const seen: string[] = [];
      const { container } = render(
        <FileUpload
          files={[png, png2]}
          renderPreview={(item) => {
            seen.push(item.layout);
            return <p className="custom-cell">{item.file.name}</p>;
          }}
        />,
      );

      expect(seen.length).toBeGreaterThan(0);
      expect(new Set(seen)).toEqual(new Set(["grid"]));
      expect(container.querySelectorAll(".custom-cell")).toHaveLength(2);
      expect(container.querySelector(".file-upload__media-grid-item")).toBeNull();
      // The grid container the cells sit in stays this component's, and keeps
      // its slot.
      expect(container.querySelector(".file-upload__media-grid")).not.toBeNull();
    });

    it("replaces the compact row and keeps the list container", () => {
      stubObjectUrls();
      const { container } = render(
        <FileUpload
          files={[txt]}
          renderFile={(item) => <p className="custom-row">{item.file.name}</p>}
        />,
      );

      expect(container.querySelector(".custom-row")).toHaveTextContent("notes.txt");
      expect(container.querySelector(".file-upload__preview-item")).toBeNull();
      // The container the rows sit in is still the component's, base class and
      // all — the slot that reaches it is asserted in the slots block above.
      expect(container.querySelector(".file-upload__preview-list")?.getAttribute("class")).toBe(
        "file-upload__preview-list",
      );
    });

    /**
     * A render prop hands over *content*, never the component's own wiring. The
     * preview region keeps its class, its `role="presentation"` and — the one
     * that actually bites — its click/keydown stoppers, which are what keep a
     * press inside a preview from re-opening the file picker.
     */
    it("keeps the preview region's own class, role and event guards", async () => {
      stubObjectUrls();
      const user = userEvent.setup();
      const onClear = vi.fn();
      const clickSpy = vi.fn();
      const { container } = render(
        <FileUpload
          files={[txt]}
          onClear={onClear}
          onClick={clickSpy}
          renderFile={(item) => <button type="button">open {item.file.name}</button>}
        />,
      );

      const preview = container.querySelector(".file-upload__preview") as HTMLElement;
      expect(preview.getAttribute("class")).toBe("file-upload__preview");
      expect(preview.getAttribute("role")).toBe("presentation");

      await user.click(screen.getByRole("button", { name: "open notes.txt" }));
      expect(clickSpy).not.toHaveBeenCalled();
    });

    /**
     * `index` is the argument `onRemoveFile` is called with, and it is not
     * derivable from the partitioned lists a renderer is handed one file at a
     * time — which is why the item carries both it and a bound `remove`.
     */
    it("hands the renderer a working remove and the file's index in files", async () => {
      stubObjectUrls();
      const user = userEvent.setup();
      const onRemoveFile = vi.fn();
      const indices: number[] = [];
      render(
        <FileUpload
          files={[png, txt]}
          onRemoveFile={onRemoveFile}
          renderFile={(item) => {
            indices.push(item.index);
            return (
              <button type="button" onClick={item.remove}>
                {item.removeLabel}
              </button>
            );
          }}
        />,
      );

      // `notes.txt` is the second entry of `files`, though it is the *first*
      // compact row — the media file ahead of it went to the other branch. That
      // gap is the whole reason `index` is on the item.
      expect(new Set(indices)).toEqual(new Set([1]));
      await user.click(screen.getByRole("button", { name: "Remove notes.txt" }));
      expect(onRemoveFile).toHaveBeenCalledWith(1);
    });

    it("omits remove entirely when onRemoveFile was not given", () => {
      stubObjectUrls();
      let sawRemove: unknown = "unset";
      render(
        <FileUpload
          files={[txt]}
          renderFile={(item) => {
            sawRemove = item.remove;
            return <p>{item.file.name}</p>;
          }}
        />,
      );
      expect(sawRemove).toBeUndefined();
    });

    it("passes the object URL through for a media file and nothing for a text one", () => {
      stubObjectUrls();
      let mediaUrl: string | undefined;
      let textUrl: string | undefined = "unset";
      render(
        <FileUpload
          files={[png, txt]}
          renderPreview={(item) => {
            mediaUrl = item.previewUrl;
            return null;
          }}
          renderFile={(item) => {
            textUrl = item.previewUrl;
            return null;
          }}
        />,
      );
      expect(mediaUrl).toMatch(/^blob:mock\//);
      expect(textUrl).toBeUndefined();
    });

    it("sends every file to renderFile under previewMode=compact", () => {
      stubObjectUrls();
      const names: string[] = [];
      render(
        <FileUpload
          files={[png, txt]}
          previewMode="compact"
          renderPreview={() => <p>never</p>}
          renderFile={(item) => {
            names.push(item.file.name);
            return null;
          }}
        />,
      );
      expect(new Set(names)).toEqual(new Set(["photo.png", "notes.txt"]));
      expect(screen.queryByText("never")).toBeNull();
    });

    it("keeps the built-in previews when neither prop is given", () => {
      stubObjectUrls();
      const { container } = render(<FileUpload files={[txt]} />);
      expect(container.querySelector(".file-upload__preview-item")).not.toBeNull();
    });
  });
});
