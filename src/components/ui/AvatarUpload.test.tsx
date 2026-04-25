import { fireEvent,render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { AvatarUpload } from "./AvatarUpload";

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
    expect(clickSpy).toHaveBeenCalled();
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

    expect(onUpload).toHaveBeenCalledWith(file);
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
});
