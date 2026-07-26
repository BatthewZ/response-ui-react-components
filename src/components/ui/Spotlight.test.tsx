import { render, screen } from "@testing-library/react";
import { createRef, useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Spotlight } from "./Spotlight";

// Parallax's scroll listener and rAF loop are not what these tests are about;
// the stub records the knobs Spotlight.Image forwards to it.
vi.mock("../animation/Parallax", () => ({
  Parallax: ({
    children,
    rate,
    clamp,
    className,
  }: {
    children: React.ReactNode;
    rate?: number;
    clamp?: number;
    className?: string;
  }) => (
    <div data-testid="parallax" data-rate={rate} data-clamp={clamp} className={className}>
      {children}
    </div>
  ),
}));

// The real ScrollReveal only applies its animation class once an
// IntersectionObserver fires, so the chosen direction is invisible in jsdom.
// The stub keeps the pre-reveal class and records the direction.
vi.mock("../animation/ScrollReveal", () => ({
  ScrollReveal: ({ children, animation }: { children: React.ReactNode; animation?: string }) => (
    <div className="scroll-reveal-hidden" data-animation={animation}>
      {children}
    </div>
  ),
}));

describe("Spotlight", () => {
  it("renders a container with the spotlight class", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Content>Hello</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    expect(container.querySelector(".spotlight")).toBeInTheDocument();
  });

  it("renders featured content inside Spotlight.Content", () => {
    render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Content>
            <h2>Featured Article</h2>
            <p>Description of the feature.</p>
          </Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Featured Article" })).toBeInTheDocument();
    expect(screen.getByText("Description of the feature.")).toBeInTheDocument();
  });

  it("renders an image via Spotlight.Image", () => {
    render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Image src="/hero.jpg" alt="Hero image" />
          <Spotlight.Content>Content</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    const img = screen.getByRole("img", { name: "Hero image" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/hero.jpg");
  });

  it("renders image with presentation role when no alt is provided", () => {
    render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Image src="/bg.jpg" />
          <Spotlight.Content>Content</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    expect(screen.getByRole("presentation")).toBeInTheDocument();
  });

  it("applies spotlight-item--reversed class when reversed prop is set", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item reversed>
          <Spotlight.Content>Reversed</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    const item = container.querySelector(".spotlight-item");
    expect(item?.className).toContain("spotlight-item--reversed");
  });

  it("does not apply reversed class by default", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Content>Normal</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    const item = container.querySelector(".spotlight-item");
    expect(item?.className).not.toContain("spotlight-item--reversed");
  });

  it("applies spotlight-content class to content", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Content>Text</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    expect(container.querySelector(".spotlight-content")).toBeInTheDocument();
  });

  it("applies spotlight-image class to image wrapper", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Image src="/photo.jpg" alt="Photo" />
        </Spotlight.Item>
      </Spotlight>,
    );
    expect(container.querySelector(".spotlight-image")).toBeInTheDocument();
  });

  it("forwards className to the root container", () => {
    const { container } = render(
      <Spotlight className="custom-spotlight" animate={false}>
        <Spotlight.Item>
          <Spotlight.Content>Text</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    const root = container.querySelector(".spotlight");
    expect(root?.className).toContain("custom-spotlight");
  });

  it("forwards className to an item", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item className="item-custom">
          <Spotlight.Content>Text</Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>,
    );
    const item = container.querySelector(".spotlight-item");
    expect(item?.className).toContain("item-custom");
  });
  /* ------------------------------------------------------------------ */
  /*  #193 / #196 / #197 / #198 / #199                                   */
  /* ------------------------------------------------------------------ */

  // #193 — every other prop landed on the wrapper div, never on the <img>.
  it("#193: forwards imgProps to the <img>, not the wrapper", () => {
    const { container } = render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Image
            src="/photo.jpg"
            alt="A photo"
            data-slot="frame"
            imgProps={{
              loading: "lazy",
              width: 800,
              height: 600,
              srcSet: "/photo@2x.jpg 2x",
              sizes: "50vw",
              decoding: "async",
            }}
          />
        </Spotlight.Item>
      </Spotlight>,
    );

    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "800");
    expect(img).toHaveAttribute("height", "600");
    expect(img).toHaveAttribute("srcset", "/photo@2x.jpg 2x");
    expect(img).toHaveAttribute("sizes", "50vw");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("src", "/photo.jpg");

    // The rest of the bag still lands on the wrapper.
    expect(container.querySelector(".spotlight-image")).toHaveAttribute("data-slot", "frame");
  });

  // #196 — parallaxRate was forwarded but Parallax's clamp was unreachable.
  it("#196: forwards parallaxClamp through to Parallax", () => {
    render(
      <Spotlight animate={false}>
        <Spotlight.Item>
          <Spotlight.Image src="/photo.jpg" alt="A photo" parallax parallaxClamp={40} />
        </Spotlight.Item>
      </Spotlight>,
    );
    expect(screen.getByTestId("parallax")).toHaveAttribute("data-clamp", "40");
  });

  // #197 — the reveal direction knew the index but not `reversed`.
  describe("#197 · reversed flips the reveal with the columns", () => {
    function revealClassOf(reversed: boolean, position: "first" | "second") {
      const { container } = render(
        <Spotlight>
          <Spotlight.Item reversed={reversed}>
            <Spotlight.Image src="/a.jpg" alt="A" />
            <Spotlight.Content>First</Spotlight.Content>
          </Spotlight.Item>
          <Spotlight.Item reversed={reversed}>
            <Spotlight.Image src="/b.jpg" alt="B" />
            <Spotlight.Content>Second</Spotlight.Content>
          </Spotlight.Item>
        </Spotlight>,
      );
      const contents = container.querySelectorAll(".spotlight-content");
      const target = contents[position === "first" ? 0 : 1];
      return (target.parentElement as HTMLElement).dataset.animation;
    }

    it("uses opposite directions for a reversed and an unreversed first row", () => {
      const plain = revealClassOf(false, "first");
      const flipped = revealClassOf(true, "first");
      expect(plain).not.toBe(flipped);
    });

    it("keeps the second row opposite to the first at either setting", () => {
      expect(revealClassOf(false, "first")).not.toBe(revealClassOf(false, "second"));
      expect(revealClassOf(true, "first")).not.toBe(revealClassOf(true, "second"));
    });
  });

  // #198 — the ref target was chosen by the root's `animate`, two levels up.
  describe("#198 · Content's ref always lands on .spotlight-content", () => {
    it.each([true, false])("with animate=%s", (animate) => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Spotlight animate={animate}>
          <Spotlight.Item>
            <Spotlight.Content ref={ref}>Copy</Spotlight.Content>
          </Spotlight.Item>
        </Spotlight>,
      );
      expect(ref.current?.className).toContain("spotlight-content");
    });
  });

  // #199 — the row context was keyed by index, so a reorder remounted it.
  it("#199: keeps row identity across a reorder", () => {
    const mounts = vi.fn();

    function Row({ label }: { label: string }) {
      const seen = useRef(false);
      useEffect(() => {
        if (!seen.current) {
          seen.current = true;
          mounts(label);
        }
      }, [label]);
      return (
        <Spotlight.Item>
          <Spotlight.Image src={`/${label}.jpg`} alt={label} />
          <Spotlight.Content>{label}</Spotlight.Content>
        </Spotlight.Item>
      );
    }

    function Page({ labels }: { labels: string[] }) {
      return (
        <Spotlight animate={false}>
          {labels.map((label) => (
            <Row key={label} label={label} />
          ))}
        </Spotlight>
      );
    }

    const { rerender } = render(<Page labels={["a", "b"]} />);
    mounts.mockClear();

    rerender(<Page labels={["b", "a"]} />);

    expect(mounts).not.toHaveBeenCalled();
  });
});
