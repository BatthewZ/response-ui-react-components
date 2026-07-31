import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Hero } from "./Hero";

// Mock animation components to avoid their side-effects in tests
vi.mock("../animation/Parallax", () => ({
  Parallax: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="parallax" {...props}>{children}</div>
  ),
}));

vi.mock("../animation/ScrollReveal", () => ({
  ScrollReveal: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="scroll-reveal" {...props}>{children}</div>
  ),
}));

vi.mock("../animation/Stagger", () => ({
  Stagger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stagger">{children}</div>
  ),
}));

describe("Hero", () => {
  describe("Root", () => {
    it("renders a section element", () => {
      render(<Hero>Content</Hero>);
      const section = screen.getByText("Content").closest("section");
      expect(section).toBeInTheDocument();
    });

    it("applies hero base class", () => {
      render(<Hero data-testid="hero">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero");
    });

    it("applies the default md size class", () => {
      render(<Hero data-testid="hero">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--md");
    });

    it("applies sm size class", () => {
      render(<Hero data-testid="hero" size="sm">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--sm");
    });

    it("applies lg size class", () => {
      render(<Hero data-testid="hero" size="lg">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--lg");
    });

    it("applies full size class", () => {
      render(<Hero data-testid="hero" size="full">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--full");
    });

    it("applies the default end alignment class", () => {
      render(<Hero data-testid="hero">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--align-end");
    });

    it("applies start alignment class", () => {
      render(<Hero data-testid="hero" align="start">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--align-start");
    });

    it("applies center alignment class", () => {
      render(<Hero data-testid="hero" align="center">Content</Hero>);
      expect(screen.getByTestId("hero").className).toContain("hero--align-center");
    });

    // #162 — the scrim used to paint over a bare Hero, dimming its own copy.
    it("renders the overlay by default when a Background is present", () => {
      const { container } = render(
        <Hero>
          <Hero.Background src="/hero.jpg" alt="" />
          Content
        </Hero>,
      );
      const overlay = container.querySelector(".hero__overlay");
      expect(overlay).toBeInTheDocument();
      expect(overlay?.getAttribute("aria-hidden")).toBe("true");
    });

    it("paints no overlay on a Hero with nothing to darken", () => {
      const { container } = render(<Hero>Content</Hero>);
      expect(container.querySelector(".hero__overlay")).not.toBeInTheDocument();
    });

    it("honours an explicit overlay over the Background default", () => {
      const { container: off } = render(
        <Hero overlay={false}>
          <Hero.Background src="/hero.jpg" alt="" />
        </Hero>,
      );
      expect(off.querySelector(".hero__overlay")).not.toBeInTheDocument();

      const { container: on } = render(<Hero overlay>Content</Hero>);
      expect(on.querySelector(".hero__overlay")).toBeInTheDocument();
    });

    it("does not render the overlay when overlay is false", () => {
      const { container } = render(<Hero overlay={false}>Content</Hero>);
      expect(container.querySelector(".hero__overlay")).not.toBeInTheDocument();
    });

    it("merges custom className", () => {
      render(<Hero data-testid="hero" className="my-hero">Content</Hero>);
      const cls = screen.getByTestId("hero").className;
      expect(cls).toContain("hero");
      expect(cls).toContain("my-hero");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLElement>();
      render(<Hero ref={ref}>Content</Hero>);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe("SECTION");
    });
  });

  describe("Background", () => {
    it("renders a div with hero__background class", () => {
      render(<Hero.Background data-testid="bg" />);
      expect(screen.getByTestId("bg").className).toContain("hero__background");
    });

    it("renders an image when src is provided", () => {
      render(<Hero.Background src="/hero.jpg" alt="Hero image" />);
      const img = screen.getByRole("img", { name: "Hero image" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/hero.jpg");
    });

    it("renders image with role=presentation when no alt", () => {
      render(<Hero.Background src="/hero.jpg" />);
      expect(screen.getByRole("presentation")).toBeInTheDocument();
    });

    it("does not render an image when src is not provided", () => {
      const { container } = render(<Hero.Background data-testid="bg" />);
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    it("wraps image in Parallax when parallax is true", () => {
      render(<Hero.Background src="/hero.jpg" parallax />);
      expect(screen.getByTestId("parallax")).toBeInTheDocument();
    });

    it("applies parallax class when parallax is true", () => {
      render(<Hero.Background src="/hero.jpg" parallax data-testid="bg" />);
      expect(screen.getByTestId("bg").className).toContain("hero__background--parallax");
    });

    // #165 — parallax without a src used to mount the client wrapper over nothing.
    it("mounts no Parallax wrapper when there is no src to drift", () => {
      render(<Hero.Background parallax data-testid="bg" />);
      expect(screen.queryByTestId("parallax")).not.toBeInTheDocument();
      expect(screen.getByTestId("bg").className).not.toContain("hero__background--parallax");
    });

    it("does not apply parallax class when parallax is false", () => {
      render(<Hero.Background src="/hero.jpg" data-testid="bg" />);
      expect(screen.getByTestId("bg").className).not.toContain("hero__background--parallax");
    });

    it("merges custom className", () => {
      render(<Hero.Background className="custom-bg" data-testid="bg" />);
      const cls = screen.getByTestId("bg").className;
      expect(cls).toContain("hero__background");
      expect(cls).toContain("custom-bg");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Hero.Background ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Content", () => {
    it("renders a div with hero__content class", () => {
      render(<Hero.Content data-testid="content">Text</Hero.Content>);
      expect(screen.getByTestId("content").className).toContain("hero__content");
    });

    it("renders children directly when animate is false", () => {
      render(<Hero.Content>Plain content</Hero.Content>);
      expect(screen.getByText("Plain content")).toBeInTheDocument();
      expect(screen.queryByTestId("scroll-reveal")).not.toBeInTheDocument();
    });

    // #161 — the composition is all this suite can see. Whether the stagger
    // actually *fires* is a stylesheet question, and vitest runs `css: false`,
    // so no assertion here can reach it: jsdom resolves no `animation-name` and
    // computes `animation-duration: auto`. Measured instead in Firefox 146
    // against the real components with both stylesheets loaded — `.stagger-item`
    // inside `.hero__content` went from `animation-name: none` to
    // `fade`/0.3s/fill both at delays 0s, 0.05s, 0.1s, and the item opacities
    // 80ms after the reveal read 0.80 / 0.43 / 0.00. The rule lives in Hero.css.
    it("wraps children in ScrollReveal and Stagger when animate is true", () => {
      render(<Hero.Content animate>Animated content</Hero.Content>);
      expect(screen.getByTestId("scroll-reveal")).toBeInTheDocument();
      expect(screen.getByTestId("stagger")).toBeInTheDocument();
      expect(screen.getByText("Animated content")).toBeInTheDocument();
    });

    it("merges custom className", () => {
      render(<Hero.Content className="custom-content" data-testid="content">C</Hero.Content>);
      const cls = screen.getByTestId("content").className;
      expect(cls).toContain("hero__content");
      expect(cls).toContain("custom-content");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Hero.Content ref={ref}>Ref</Hero.Content>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Compound usage", () => {
    it("renders a complete hero composition", () => {
      render(
        <Hero data-testid="hero" size="lg" align="center">
          <Hero.Background src="/bg.jpg" alt="Background" />
          <Hero.Content>
            <h1>Welcome</h1>
            <p>Subtitle text</p>
            <button>Get Started</button>
          </Hero.Content>
        </Hero>
      );

      expect(screen.getByTestId("hero")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Background" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
      expect(screen.getByText("Subtitle text")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
    });
  });

  describe("slots", () => {
    it("lands classNames.overlay on the scrim, beside the base class", () => {
      const { container } = render(
        <Hero overlay classNames={{ overlay: "bg-status-error" }}>
          <p>copy</p>
        </Hero>
      );
      const scrim = container.querySelector(".hero__overlay");
      expect(scrim?.getAttribute("class")).toContain("hero__overlay");
      expect(scrim?.getAttribute("class")).toContain("bg-status-error");
    });

    it("leaves the scrim on its base class alone when no slot is passed", () => {
      const { container } = render(
        <Hero overlay>
          <p>copy</p>
        </Hero>
      );
      expect(container.querySelector(".hero__overlay")?.getAttribute("class")).toBe(
        "hero__overlay"
      );
    });

    it("does not put the slot class on the section", () => {
      render(
        <Hero overlay data-testid="hero" classNames={{ overlay: "bg-status-error" }}>
          <p>copy</p>
        </Hero>
      );
      expect(screen.getByTestId("hero").className).not.toContain("bg-status-error");
    });

    /**
     * The reason the slot union is written out per component rather than typed
     * `Record<string, string>`: an unknown key is a *type* error, not a silent
     * no-op. The `@ts-expect-error` is the assertion — it fails if TypeScript
     * ever stops rejecting the key. Do not "clean it up".
     */
    it("rejects an unknown slot key at compile time", () => {
      const { container } = render(
        // @ts-expect-error — `scrim` is not this component's word for it.
        <Hero overlay classNames={{ scrim: "bg-status-error" }}>
          <p>copy</p>
        </Hero>
      );
      expect(container.querySelector(".hero__overlay")?.getAttribute("class")).toBe(
        "hero__overlay"
      );
    });

    it("does not leak classNames onto the DOM", () => {
      render(
        <Hero overlay data-testid="hero" classNames={{ overlay: "bg-status-error" }}>
          <p>copy</p>
        </Hero>
      );
      expect(screen.getByTestId("hero").hasAttribute("classnames")).toBe(false);
    });
  });

  describe("Background imgProps", () => {
    it("merges imgProps.className after the component's own", () => {
      render(<Hero.Background src="/bg.jpg" alt="Bg" imgProps={{ className: "object-top" }} />);
      const img = screen.getByRole("img", { name: "Bg" });
      expect(img.getAttribute("class")).toContain("size-full");
      expect(img.getAttribute("class")).toContain("object-top");
    });

    it("carries loading and srcSet to the <img>, not the wrapper", () => {
      const { container } = render(
        <Hero.Background
          src="/bg.jpg"
          alt="Bg"
          imgProps={{ loading: "eager", srcSet: "/bg@2x.jpg 2x" }}
        />
      );
      const img = screen.getByRole("img", { name: "Bg" });
      expect(img).toHaveAttribute("loading", "eager");
      expect(img).toHaveAttribute("srcset", "/bg@2x.jpg 2x");
      expect(container.querySelector(".hero__background")).not.toHaveAttribute("loading");
    });

    it("leaves the <img> on its base classes when no bag is passed", () => {
      render(<Hero.Background src="/bg.jpg" alt="Bg" />);
      expect(screen.getByRole("img", { name: "Bg" }).getAttribute("class")).toBe(
        "size-full object-cover"
      );
    });

    /**
     * `src` and `alt` are the component's own props and are set *after* the
     * spread, so a bag cannot repoint the image or strip its alternative text.
     */
    it("keeps src and alt out of the bag's reach", () => {
      render(
        <Hero.Background
          src="/bg.jpg"
          alt="Bg"
          // @ts-expect-error — `src` is Omitted from the bag; only untyped JS gets here.
          imgProps={{ src: "/other.jpg" }}
        />
      );
      expect(screen.getByRole("img", { name: "Bg" })).toHaveAttribute("src", "/bg.jpg");
    });
  });
});
