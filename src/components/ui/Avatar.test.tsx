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

describe("Avatar slots", () => {
  const frame = (root: HTMLElement) => root.firstElementChild as HTMLElement;

  it("lands classNames.frame on the clipping disc, beside the base classes", () => {
    render(<Avatar name="Jane Doe" classNames={{ frame: "rounded-lg" }} />);
    const cls = frame(screen.getByRole("img")).getAttribute("class") ?? "";
    expect(cls).toContain("overflow-hidden");
    expect(cls).toContain("rounded-lg");
  });

  it("lands classNames.image on the <img>, beside the base classes", () => {
    render(<Avatar src="/photo.jpg" alt="Jane" classNames={{ image: "object-contain" }} />);
    const img = screen
      .getAllByRole("img", { name: "Jane" })
      .find((el) => el.tagName === "IMG") as HTMLElement;
    // `object-contain` is the same tailwind-merge group as the base
    // `object-cover`, so it replaces it — which is the point of the slot.
    // `size-full` is the half that has to survive.
    expect(img.getAttribute("class")).toContain("size-full");
    expect(img.getAttribute("class")).toContain("object-contain");
    expect(img.getAttribute("class")).not.toContain("object-cover");
  });

  it("lands classNames.status on the presence dot, beside the base classes", () => {
    const { container } = render(
      <Avatar name="Jane Doe" status="online" classNames={{ status: "ring-4" }} />,
    );
    const dot = container.querySelector(".bg-status-success") as HTMLElement;
    expect(dot.getAttribute("class")).toContain("rounded-full");
    expect(dot.getAttribute("class")).toContain("ring-4");
  });

  it("leaves the internals on their base classes when no slot is passed", () => {
    render(<Avatar src="/photo.jpg" alt="Jane" />);
    const img = screen
      .getAllByRole("img", { name: "Jane" })
      .find((el) => el.tagName === "IMG") as HTMLElement;
    expect(img.getAttribute("class")).toBe("size-full object-cover");
  });

  it("does not put a slot class on the root", () => {
    render(
      <Avatar
        name="Jane Doe"
        status="online"
        classNames={{ frame: "rounded-lg", image: "object-contain", status: "ring-4" }}
      />,
    );
    const root = screen.getByRole("img");
    expect(root.className).not.toContain("rounded-lg");
    expect(root.className).not.toContain("object-contain");
    expect(root.className).not.toContain("ring-4");
  });

  /**
   * The reason the slot union is written out per component rather than typed
   * `Record<string, string>`: an unknown key is a *type* error, not a silent
   * no-op. The `@ts-expect-error` is the assertion — it fails if TypeScript ever
   * stops rejecting the key. Do not "clean it up".
   */
  it("rejects an unknown slot key at compile time", () => {
    render(
      // @ts-expect-error — `initials` is not a slot; only untyped JS gets here.
      <Avatar name="Jane Doe" classNames={{ initials: "text-lg" }} />,
    );
    expect(frame(screen.getByRole("img")).getAttribute("class")).not.toContain("text-lg");
  });

  it("does not leak classNames onto the DOM", () => {
    render(<Avatar name="Jane Doe" classNames={{ frame: "rounded-lg" }} />);
    expect(screen.getByRole("img").hasAttribute("classnames")).toBe(false);
  });
});

describe("AvatarGroup slots", () => {
  /**
   * The merge is `cn(base, slot)` and `cn` is tailwind-merge, so a same-group
   * slot class *replaces* the base one — which is the capability here, since
   * widening the separating ring is the obvious thing to want — while a class
   * from another group stacks. Both halves live in one test on purpose: they are
   * two readings of the same merge, and splitting them would make deleting that
   * merge redden two tests for one defect.
   */
  it("lands classNames.itemRing on every visible child's ring", () => {
    const { container } = render(
      <AvatarGroup classNames={{ itemRing: "shadow-lg" }}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarGroup>,
    );
    const rings = Array.from(container.querySelectorAll("div > span.ring-surface-0"));
    expect(rings).toHaveLength(2);
    for (const ring of rings) {
      expect(ring.getAttribute("class")).toContain("rounded-full");
      expect(ring.getAttribute("class")).toContain("shadow-lg");
    }

    const { container: widened } = render(
      <AvatarGroup classNames={{ itemRing: "ring-4" }}>
        <Avatar name="A B" />
      </AvatarGroup>,
    );
    const cls =
      widened.querySelector("div > span.ring-surface-0")?.getAttribute("class") ?? "";
    expect(cls).toContain("ring-4");
    expect(cls).not.toContain("ring-2");
  });

  it("lands classNames.overflow on the +N chip, beside the base classes", () => {
    render(
      <AvatarGroup max={1} classNames={{ overflow: "bg-status-info-bg" }}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarGroup>,
    );
    const chip = screen.getByText("+1");
    expect(chip.className).toContain("rounded-full");
    expect(chip.className).toContain("bg-status-info-bg");
  });

  it("leaves the ring on its base classes when no slot is passed", () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar name="A B" />
      </AvatarGroup>,
    );
    expect(container.querySelector("div > span.ring-surface-0")?.getAttribute("class")).toBe(
      "ring-2 ring-surface-0 rounded-full",
    );
  });

  it("does not put a slot class on the row", () => {
    const { container } = render(
      <AvatarGroup max={1} classNames={{ itemRing: "ring-4", overflow: "bg-status-info-bg" }}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarGroup>,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).not.toContain("ring-4");
    expect(row.className).not.toContain("bg-status-info-bg");
  });

  it("rejects an unknown slot key at compile time", () => {
    const { container } = render(
      // @ts-expect-error — `item` is not a slot; only untyped JS gets here.
      <AvatarGroup classNames={{ item: "ring-4" }}>
        <Avatar name="A B" />
      </AvatarGroup>,
    );
    expect(container.querySelector("div > span.ring-surface-0")?.getAttribute("class")).not.toContain(
      "ring-4",
    );
  });

  it("does not leak classNames onto the DOM", () => {
    const { container } = render(
      <AvatarGroup classNames={{ itemRing: "ring-4" }}>
        <Avatar name="A B" />
      </AvatarGroup>,
    );
    expect((container.firstElementChild as HTMLElement).hasAttribute("classnames")).toBe(false);
  });
});
