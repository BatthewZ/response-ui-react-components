import { fireEvent,render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvatarUpload } from "./AvatarUpload";

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
  return { createObjectURL, revokeObjectURL };
}

function displayedImg() {
  return document.querySelector("img");
}

describe("AvatarUpload", () => {
  it("renders avatar placeholder when no image", () => {
    render(<AvatarUpload name="Jane Doe" />);
    const avatar = screen.getByRole("img", { name: "Jane Doe" });
    expect(avatar).toBeInTheDocument();
  });

  it("renders with button role and accessible label", () => {
    render(<AvatarUpload />);
    expect(screen.getByRole("button", { name: "Change avatar" })).toBeInTheDocument();
  });

  it("shows current avatar image when provided", () => {
    render(<AvatarUpload src="https://example.com/avatar.jpg" name="Jane Doe" />);
    // The Avatar component renders a <span role="img"> wrapping an <img> element
    const imgs = screen.getAllByRole("img", { name: "Jane Doe" });
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    // Find the actual <img> element with the src attribute
    const imgEl = document.querySelector("img[src='https://example.com/avatar.jpg']");
    expect(imgEl).toBeInTheDocument();
  });

  it("click triggers file selection", async () => {
    const user = userEvent.setup();
    render(<AvatarUpload />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(inputEl, "click");

    await user.click(screen.getByRole("button", { name: "Change avatar" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("forwards className prop", () => {
    render(<AvatarUpload className="custom-avatar" />);
    const button = screen.getByRole("button", { name: "Change avatar" });
    expect(button.className).toContain("custom-avatar");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AvatarUpload ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("has a hidden file input", () => {
    render(<AvatarUpload />);
    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(inputEl).toBeInTheDocument();
    expect(inputEl.type).toBe("file");
  });

  it("forwards accept attribute when provided", () => {
    render(<AvatarUpload accept={["image/png", "image/jpeg"]} />);
    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(inputEl.getAttribute("accept")).toBe("image/png,image/jpeg");
  });

  it("calls onUpload with selected file", async () => {
    const onUpload = vi.fn().mockResolvedValue({ url: "https://example.com/uploaded.jpg" });
    const onUploadComplete = vi.fn();
    render(<AvatarUpload onUpload={onUpload} onUploadComplete={onUploadComplete} />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });

    // Simulate file selection.
    const user = userEvent.setup();
    await user.upload(inputEl, file);

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(file);
    expect(onUploadComplete).toHaveBeenCalledTimes(1);
    expect(onUploadComplete).toHaveBeenCalledWith({ url: "https://example.com/uploaded.jpg" });
  });

  it("displays validation error for disallowed file type", async () => {
    render(<AvatarUpload accept={["image/png"]} />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["x"], "x.gif", { type: "image/gif" });

    // Bypass userEvent's accept filter — we want to assert *our* validation runs.
    Object.defineProperty(inputEl, "files", { value: [file], configurable: true });
    fireEvent.change(inputEl);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("not allowed");
  });

  /* ------------------------------------------------------------------ */
  /*  `accept` grammar (#379) — same grammar as the input's attribute    */
  /* ------------------------------------------------------------------ */

  describe("accept matching", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** Bypasses userEvent's own accept filter so *our* validation is what runs. */
    function pickFile(accept: readonly string[], file: File) {
      const { createObjectURL } = stubObjectUrls();
      const onUploadError = vi.fn();
      render(<AvatarUpload name="Jane Doe" accept={accept} onUploadError={onUploadError} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      Object.defineProperty(inputEl, "files", { value: [file], configurable: true });
      fireEvent.change(inputEl);

      // Acceptance is observable: an accepted file gets an optimistic preview.
      const accepted = createObjectURL.mock.calls.length === 1;
      return { accepted, onUploadError, previewed: displayedImg()?.getAttribute("src") };
    }

    it("accepts a wildcard MIME rule", () => {
      const r = pickFile(["image/*"], new File(["x"], "photo.png", { type: "image/png" }));
      expect(r.accepted).toBe(true);
      expect(r.previewed).toBe("blob:mock/1");
      expect(r.onUploadError).toHaveBeenCalledTimes(0);
    });

    it("accepts */* for any file", () => {
      const r = pickFile(["*/*"], new File(["x"], "mystery.bin", { type: "" }));
      expect(r.accepted).toBe(true);
      expect(r.onUploadError).toHaveBeenCalledTimes(0);
    });

    it("accepts an extension rule case-insensitively", () => {
      const r = pickFile([".pdf"], new File(["x"], "Report.PDF", { type: "application/pdf" }));
      expect(r.accepted).toBe(true);
      expect(r.onUploadError).toHaveBeenCalledTimes(0);
    });

    it("accepts a typeless file on its extension alone", () => {
      const r = pickFile([".heic"], new File(["x"], "snap.heic", { type: "" }));
      expect(r.accepted).toBe(true);
      expect(r.onUploadError).toHaveBeenCalledTimes(0);
    });

    it("still rejects a file no rule matches", () => {
      const r = pickFile(["image/*", ".pdf"], new File(["x"], "notes.txt", { type: "text/plain" }));
      expect(r.accepted).toBe(false);
      expect(r.onUploadError).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert").textContent).toContain("not allowed");
    });

    it("rejects a typeless file when only MIME rules are given", () => {
      const r = pickFile(["image/*"], new File(["x"], "mystery.bin", { type: "" }));
      expect(r.accepted).toBe(false);
      expect(r.onUploadError).toHaveBeenCalledTimes(1);
    });

    it("still accepts an exact MIME rule", () => {
      const r = pickFile(["image/png"], new File(["x"], "photo.png", { type: "image/png" }));
      expect(r.accepted).toBe(true);
      expect(r.onUploadError).toHaveBeenCalledTimes(0);
    });
  });

  it("displays error when onUpload throws", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("Upload failed"));
    render(<AvatarUpload onUpload={onUpload} />);

    const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });

    const user = userEvent.setup();
    await user.upload(inputEl, file);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Upload failed");
  });

  describe("object URL lifecycle", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("displays and keeps the optimistic preview when there is no onUpload", async () => {
      const { createObjectURL, revokeObjectURL } = stubObjectUrls();
      render(<AvatarUpload src="https://example.com/old.jpg" name="Jane Doe" />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      const file = new File(["x"], "x.png", { type: "image/png" });
      await userEvent.setup().upload(inputEl, file);

      const objectUrl = createObjectURL.mock.results[0]?.value as string;
      expect(displayedImg()?.getAttribute("src")).toBe(objectUrl);
      expect(revokeObjectURL).not.toHaveBeenCalled();

      await Promise.resolve();
      expect(displayedImg()?.getAttribute("src")).toBe(objectUrl);
      expect(revokeObjectURL).not.toHaveBeenCalled();
    });

    it("revokes the preview URL on unmount", async () => {
      const { createObjectURL, revokeObjectURL } = stubObjectUrls();
      const { unmount } = render(<AvatarUpload name="Jane Doe" />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      await userEvent.setup().upload(inputEl, new File(["x"], "x.png", { type: "image/png" }));

      const objectUrl = createObjectURL.mock.results[0]?.value as string;
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();

      unmount();
      // Exactly one revoke: a double-revoke would mean the effect cleanup ran twice.
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
    });

    it("revokes the previous preview URL when a second file is picked", async () => {
      const { createObjectURL, revokeObjectURL } = stubObjectUrls();
      render(<AvatarUpload name="Jane Doe" />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      const user = userEvent.setup();
      await user.upload(inputEl, new File(["a"], "a.png", { type: "image/png" }));
      await user.upload(inputEl, new File(["b"], "b.png", { type: "image/png" }));

      const [first, second] = createObjectURL.mock.results.map((r) => r.value as string);
      expect(revokeObjectURL.mock.calls).toEqual([[first]]);
      expect(displayedImg()?.getAttribute("src")).toBe(second);
    });

    it("revokes the preview URL after a successful upload swaps in the result", async () => {
      const { createObjectURL, revokeObjectURL } = stubObjectUrls();
      const onUpload = vi.fn().mockResolvedValue({ url: "https://example.com/uploaded.jpg" });
      render(<AvatarUpload name="Jane Doe" onUpload={onUpload} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      await userEvent.setup().upload(inputEl, new File(["x"], "x.png", { type: "image/png" }));

      const objectUrl = createObjectURL.mock.results[0]?.value as string;
      expect(displayedImg()?.getAttribute("src")).toBe("https://example.com/uploaded.jpg");
      // One optimistic preview in, one revoked out — no leak, no double-revoke.
      expect(onUpload).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
    });
  });

  describe("caller handlers compose with the picker trigger", () => {
    it("runs a caller onClick and still opens the picker", () => {
      const onClick = vi.fn();
      render(<AvatarUpload onClick={onClick} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      const clickSpy = vi.spyOn(inputEl, "click");

      fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it.each(["Enter", " "])("runs a caller onKeyDown and still opens the picker (%s)", (key) => {
      const onKeyDown = vi.fn();
      render(<AvatarUpload onKeyDown={onKeyDown} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      const clickSpy = vi.spyOn(inputEl, "click");

      fireEvent.keyDown(screen.getByRole("button", { name: "Change avatar" }), { key });

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it("lets a caller preventDefault suppress the picker", () => {
      render(<AvatarUpload onClick={(e) => e.preventDefault()} />);

      const inputEl = document.querySelector("input[type='file']") as HTMLInputElement;
      const clickSpy = vi.spyOn(inputEl, "click");

      fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
