import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvatarUpload, type AvatarUploadProps, type AvatarUploadResult } from "./AvatarUpload";

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
  /* ------------------------------------------------------------------ */
  /*  #381 / #382                                                        */
  /* ------------------------------------------------------------------ */

  // #381 — the spinner lives in an aria-hidden span and clicks in that window
  // are dropped, with nothing on the root to say the control is working.
  it("#381: marks the root busy and disabled while onUpload is pending", async () => {
    let resolveUpload: (result: { url: string }) => void = () => {};
    const onUpload = vi.fn(
      () =>
        new Promise<{ url: string }>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    render(<AvatarUpload onUpload={onUpload} />);

    const root = screen.getByRole("button", { name: "Change avatar" });
    expect(root).not.toHaveAttribute("aria-busy");

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["x"], "photo.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("aria-disabled", "true");

    await act(async () => {
      resolveUpload({ url: "https://example.com/photo.png" });
    });

    expect(root).not.toHaveAttribute("aria-busy");
    expect(root).not.toHaveAttribute("aria-disabled");
  });

  // #382 — a role="alert" inside a role="button" is an unreliable live region:
  // ARIA makes a button's descendants presentational.
  it("#382: keeps the alert outside the button", async () => {
    render(<AvatarUpload accept={["image/png"]} />);

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
      });
    });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("not allowed");
    expect(alert.closest("[role='button']")).toBeNull();
  });

  /* ------------------------------------------------------------------ */
  /*  #383 — the TResult type parameter survives to onUploadComplete     */
  /* ------------------------------------------------------------------ */

  describe("#383 · the upload result keeps its own shape", () => {
    type Uploaded = AvatarUploadResult & { assetId: string };

    // A type-level assertion is a real check and needs no `@ts-expect-error`:
    // `forwardRef<HTMLDivElement, AvatarUploadProps>` pinned the component to the
    // default `AvatarUploadResult`, which flips this to `false` and fails
    // `bun run typecheck` — the gate this claim actually rests on.
    type CompleteArgOf<T extends AvatarUploadResult> = NonNullable<
      Parameters<typeof AvatarUpload<T>>[0]["onUploadComplete"]
    >;
    const tResultReachesTheComponent: CompleteArgOf<Uploaded> extends (
      data: Uploaded,
    ) => void
      ? true
      : false = true;

    // The props type was already generic; the erasure was in the component. This
    // asserts the declaration side stayed honest so the two cannot drift apart.
    const tResultIsOnTheProps: NonNullable<
      AvatarUploadProps<Uploaded>["onUpload"]
    > extends (file: File) => Promise<Uploaded>
      ? true
      : false = true;

    it("hands onUploadComplete the extra fields onUpload returned", async () => {
      expect(tResultReachesTheComponent).toBe(true);
      expect(tResultIsOnTheProps).toBe(true);

      const seen: string[] = [];
      render(
        <AvatarUpload
          onUpload={(): Promise<Uploaded> =>
            Promise.resolve({ url: "https://cdn.example.com/a.png", assetId: "asset-1" })
          }
          // `data.assetId` is the runtime half of the same claim: it is a
          // compile error the moment the parameter stops flowing.
          onUploadComplete={(data) => seen.push(data.assetId)}
        />,
      );

      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, {
          target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
        });
      });

      expect(seen).toEqual(["asset-1"]);
    });

    it("still takes a ref, which forwardRef used to be the reason for", () => {
      const ref = createRef<HTMLDivElement>();
      render(<AvatarUpload ref={ref} />);
      expect(ref.current).toBe(screen.getByRole("button", { name: "Change avatar" }));
    });
  });

  /* ------------------------------------------------------------------ */
  /*  #384 — the scrim reads the contract token                          */
  /* ------------------------------------------------------------------ */

  // Class-string only. `vitest` runs with `css: false`, so no test here can read
  // a stylesheet or resolve a custom property: what colour the token *is* in a
  // given theme was measured outside this suite, not asserted here.
  it("#384: paints the hover scrim from --OVERLAY-SCRIM-COLOR, as Dialog.tsx does", () => {
    render(<AvatarUpload name="Jane Doe" />);
    const overlay = document.querySelector<HTMLElement>("span.absolute.inset-0.flex")!;

    expect(overlay.className).toContain("bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]");
    expect(overlay.className).not.toContain("bg-black/50");
  });

  /* ------------------------------------------------------------------ */
  /*  #386 — the error tooltip is bounded, dismissable and timed         */
  /* ------------------------------------------------------------------ */

  describe("#386 · the error tooltip", () => {
    const rejected = new File(["x"], "notes.txt", { type: "text/plain" });

    function reject(props: Partial<AvatarUploadProps> = {}) {
      const result = render(<AvatarUpload accept={["image/png"]} {...props} />);
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      act(() => {
        fireEvent.change(input, { target: { files: [rejected] } });
      });
      return result;
    }

    /** The visible tooltip — the `aria-hidden` twin of the sr-only alert. */
    function tooltip() {
      return document.querySelector<HTMLElement>("span[aria-hidden='true'].absolute.-bottom-8");
    }

    // jsdom performs no layout, so the *overflow* itself is not observable here;
    // the width contract that bounds it is.
    it("bounds its width instead of refusing to wrap", () => {
      reject();
      const el = tooltip()!;

      expect(el.className).not.toContain("whitespace-nowrap");
      expect(el.className).toContain("w-max");
      expect(el.className).toContain("max-w-[17.5rem]");
    });

    it("clears itself after errorTimeout", () => {
      vi.useFakeTimers();
      try {
        reject();
        expect(tooltip()).not.toBeNull();

        act(() => {
          vi.advanceTimersByTime(4999);
        });
        expect(tooltip()).not.toBeNull();

        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(tooltip()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps the message up for good when errorTimeout is 0", () => {
      vi.useFakeTimers();
      try {
        reject({ errorTimeout: 0 });
        act(() => {
          vi.advanceTimersByTime(60_000);
        });
        expect(tooltip()).not.toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("dismisses on Escape without opening the picker", () => {
      reject();
      const root = screen.getByRole("button", { name: "Change avatar" });
      const input = document.querySelector("input[type='file']") as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      fireEvent.keyDown(root, { key: "Escape" });

      expect(tooltip()).toBeNull();
      expect(screen.queryByRole("alert")).toBeEmptyDOMElement();
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("dismisses when the picker is re-opened, not only when a file is chosen", () => {
      reject();
      fireEvent.click(screen.getByRole("button", { name: "Change avatar" }));
      expect(tooltip()).toBeNull();
    });
  });

  describe("slots and the avatar hatch", () => {
    const overlay = (container: HTMLElement) =>
      container.querySelector('span[aria-hidden="true"].absolute.inset-0.flex') as HTMLElement;

    it("lands classNames.overlay on the hover scrim, beside the base classes", () => {
      const { container } = render(
        <AvatarUpload name="Jane Doe" classNames={{ overlay: "text-fg-inverse" }} />,
      );
      const cls = overlay(container).getAttribute("class") ?? "";
      expect(cls).toContain("rounded-full");
      expect(cls).toContain("text-fg-inverse");
    });

    it("lands classNames.spinner on the busy ring, beside the base classes", () => {
      const { container } = render(
        <AvatarUpload name="Jane Doe" classNames={{ spinner: "size-8" }} />,
      );
      // Idle: the spinner is not rendered at all.
      expect(container.querySelector(".animate-spin")).toBeNull();

      const { container: busy } = render(
        <AvatarUpload
          name="Jane Doe"
          src="/a.jpg"
          onUpload={() => new Promise<AvatarUploadResult>(() => {})}
          classNames={{ spinner: "size-8" }}
        />,
      );
      const input = busy.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["x"], "a.png", { type: "image/png" });
      act(() => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      const spinner = busy.querySelector(".animate-spin") as HTMLElement;
      expect(spinner.getAttribute("class")).toContain("animate-spin");
      expect(spinner.getAttribute("class")).toContain("size-8");
    });

    it("lands classNames.error on the message bubble, beside the base classes", async () => {
      const { container } = render(
        <AvatarUpload
          name="Jane Doe"
          accept={["image/png"]}
          classNames={{ error: "max-w-none" }}
        />,
      );
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["x"], "a.pdf", { type: "application/pdf" });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      const bubble = container.querySelector(".bg-status-error") as HTMLElement;
      expect(bubble.getAttribute("class")).toContain("bg-status-error");
      expect(bubble.getAttribute("class")).toContain("max-w-none");
    });

    it("leaves the overlay on its base classes when no slot is passed", () => {
      const { container } = render(<AvatarUpload name="Jane Doe" />);
      expect(overlay(container).getAttribute("class")).not.toContain("text-fg-inverse");
      expect(overlay(container).getAttribute("class")).toContain("text-white");
    });

    it("does not put a slot class on the pressable root", () => {
      render(
        <AvatarUpload
          name="Jane Doe"
          classNames={{ overlay: "text-fg-inverse", spinner: "size-8", error: "max-w-none" }}
        />,
      );
      const root = screen.getByRole("button", { name: "Change avatar" });
      expect(root.className).not.toContain("text-fg-inverse");
      expect(root.className).not.toContain("max-w-none");
    });

    /**
     * The reason the slot union is written out per component rather than typed
     * `Record<string, string>`: an unknown key is a *type* error, not a silent
     * no-op. The `@ts-expect-error` is the assertion — it fails if TypeScript
     * ever stops rejecting the key. Do not "clean it up".
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        // @ts-expect-error — `badge` is not this component's word for the overlay.
        <AvatarUpload name="Jane Doe" classNames={{ badge: "text-fg-inverse" }} />,
      );
      expect(overlay(container).getAttribute("class")).not.toContain("text-fg-inverse");
    });

    it("does not leak classNames onto the DOM", () => {
      render(<AvatarUpload name="Jane Doe" classNames={{ overlay: "text-fg-inverse" }} />);
      const root = screen.getByRole("button", { name: "Change avatar" });
      expect(root.hasAttribute("classnames")).toBe(false);
      expect(root.hasAttribute("avatarprops")).toBe(false);
    });

    /**
     * The hatch's precondition, made concrete: this component's own `className`,
     * `ref` and rest props all land on the pressable root, so before `avatarProps`
     * the inner `Avatar` — including its own `classNames` slots — had no route of
     * any kind. The merge is base-first, so a caller's class wins the collision.
     */
    it("merges avatarProps.className after the hardcoded size-full", () => {
      render(
        <AvatarUpload name="Jane Doe" avatarProps={{ className: "rounded-lg" }} />,
      );
      const avatar = screen.getByRole("img", { name: "Jane Doe" });
      expect(avatar.className).toContain("size-full");
      expect(avatar.className).toContain("rounded-lg");
    });

    it("reaches the inner Avatar's own slots through the bag", () => {
      const { container } = render(
        <AvatarUpload
          name="Jane Doe"
          avatarProps={{ classNames: { frame: "rounded-none" } }}
        />,
      );
      const frame = screen.getByRole("img", { name: "Jane Doe" })
        .firstElementChild as HTMLElement;
      expect(frame.getAttribute("class")).toContain("rounded-none");
      expect(container.querySelector('[classnames]')).toBeNull();
    });

    /**
     * `src`, `name` and `size` are this component's to write — `src` is the
     * upload preview and `size` also drives the root's own box — so they are
     * `Omit`ted from the bag and set after the spread.
     *
     * `size` reaching the inner `Avatar` is worth its own assertion because the
     * *geometry* half of it is invisible: `cn("size-6", "size-full")` resolves to
     * `size-full`, so the avatar's own box class is dropped as redundant against
     * a container `containerSizeMap` already sized identically. What survives —
     * and what a reader who concludes "`size` does nothing here" would delete —
     * is the initials type scale.
     */
    it("keeps src, name and size out of the bag's reach", () => {
      render(
        <AvatarUpload
          name="Jane Doe"
          size="xs"
          // @ts-expect-error — all three are Omitted; only untyped JS gets here.
          avatarProps={{ name: "Someone Else", size: "xl" }}
        />,
      );
      const root = screen.getByRole("button", { name: "Change avatar" });
      expect(root.className).toContain("size-6");

      const avatar = screen.getByRole("img", { name: "Jane Doe" });
      const frame = avatar.firstElementChild as HTMLElement;
      // `initialsTextMap.xs`, not `.xl` — the bag did not repoint `size`.
      expect(frame.getAttribute("class")).toContain("text-body-3");
    });
  });
});
