import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Avatar, AvatarGroup } from "./Avatar";

describe("Avatar", () => {
  it("renders image when src is provided", () => {
    render(<Avatar src="/photo.jpg" alt="Jane Doe" />);
    const imgs = screen.getAllByRole("img", { name: "Jane Doe" });
    // Outer span[role="img"] and inner <img> both match
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    const innerImg = imgs.find((el) => el.tagName === "IMG");
    expect(innerImg).toBeDefined();
    expect(innerImg).toHaveAttribute("src", "/photo.jpg");
  });

  it("shows fallback initials when no src is provided", () => {
    render(<Avatar name="Jane Doe" />);
    const avatar = screen.getByRole("img", { name: "Jane Doe" });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent("JD");
  });

  it("shows single initial for single-word name", () => {
    render(<Avatar name="Jane" />);
    expect(screen.getByRole("img", { name: "Jane" })).toHaveTextContent("J");
  });

  it("size variants apply correct classes", () => {
    const { rerender } = render(<Avatar name="A B" size="xs" />);
    expect(screen.getByRole("img").className).toContain("size-6");

    rerender(<Avatar name="A B" size="sm" />);
    expect(screen.getByRole("img").className).toContain("size-8");

    rerender(<Avatar name="A B" size="md" />);
    expect(screen.getByRole("img").className).toContain("size-10");

    rerender(<Avatar name="A B" size="lg" />);
    expect(screen.getByRole("img").className).toContain("size-12");

    rerender(<Avatar name="A B" size="xl" />);
    expect(screen.getByRole("img").className).toContain("size-16");
  });

  it("forwards className prop", () => {
    render(<Avatar name="Test" className="custom-class" />);
    expect(screen.getByRole("img").className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar name="Test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toBe(screen.getByRole("img"));
  });

  // #55 — the error latch was per-mount, so a recovered URL never rendered again.
  describe("#55 · the image error latch follows the src", () => {
    it("falls back to initials when the image fails", () => {
      render(<Avatar src="/broken.jpg" name="Jane Doe" />);
      fireEvent.error(document.querySelector("img")!);
      expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveTextContent("JD");
    });

    it("tries again when the src changes", () => {
      const { rerender } = render(<Avatar src="/broken.jpg" name="Jane Doe" />);
      fireEvent.error(document.querySelector("img")!);
      expect(document.querySelector("img")).toBeNull();

      rerender(<Avatar src="/works.jpg" name="Jane Doe" />);
      expect(document.querySelector("img")).toHaveAttribute("src", "/works.jpg");
    });
  });

  // #57 — the presence dot carried its meaning in colour alone.
  describe("#57 · status reaches the accessible name", () => {
    it("appends the status to the name", () => {
      render(<Avatar name="Ada Lovelace" status="online" />);
      expect(screen.getByRole("img", { name: "Ada Lovelace, Online" })).toBeInTheDocument();
    });

    it("takes statusLabel over the English default", () => {
      render(<Avatar name="Ada Lovelace" status="away" statusLabel="Absente" />);
      expect(screen.getByRole("img", { name: "Ada Lovelace, Absente" })).toBeInTheDocument();
    });

    it("names a status-only avatar", () => {
      render(<Avatar status="offline" />);
      expect(screen.getByRole("img", { name: "Offline" })).toBeInTheDocument();
    });
  });

  // #58 — role="img" used to survive with nothing to announce.
  describe("#58 · role='img' only where there is a name", () => {
    it.each([
      ["neither alt nor name", {}],
      ["a whitespace-only name", { name: "   " }],
      ["an empty alt over a real name", { alt: "", name: "Ada Lovelace" }],
    ])("drops the role with %s", (_case, props) => {
      const { container } = render(<Avatar {...props} />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(container.firstElementChild).not.toHaveAttribute("aria-label");
    });
  });

  // #62 — indexing by UTF-16 code unit split an astral first character.
  describe("#62 · initials are whole characters", () => {
    it("keeps an astral first character intact", () => {
      // Astral letters have no case mapping, so they survive `toUpperCase`
      // unchanged — what must not survive is a lone surrogate half.
      render(<Avatar name="𝒜lice 𝒷rown" />);
      expect(screen.getByRole("img")).toHaveTextContent("𝒜𝒷");
    });

    it("still upper-cases ordinary initials", () => {
      render(<Avatar name="jane doe" />);
      expect(screen.getByRole("img")).toHaveTextContent("JD");
    });
  });
});

describe("AvatarGroup", () => {
  // #59 — size sized only the overlap and the +N chip.
  it("sizes the avatars it contains", () => {
    render(
      <AvatarGroup size="xl">
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarGroup>,
    );
    for (const avatar of screen.getAllByRole("img")) {
      expect(avatar.className).toContain("size-16");
    }
  });

  it("leaves a size set on the child alone", () => {
    render(
      <AvatarGroup size="xl">
        <Avatar name="A B" size="xs" />
      </AvatarGroup>,
    );
    expect(screen.getByRole("img").className).toContain("size-6");
  });

  it("sizes the overflow chip to match", () => {
    render(
      <AvatarGroup size="lg" max={1}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarGroup>,
    );
    expect(screen.getByRole("img").className).toContain("size-12");
    expect(screen.getByText("+1").className).toContain("size-12");
  });
});
