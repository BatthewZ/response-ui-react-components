import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MediaCard } from "./MediaCard";

describe("MediaCard", () => {
  it("renders as an article element", () => {
    render(
      <MediaCard>
        <MediaCard.Image src="/photo.jpg" alt="A photo" />
      </MediaCard>,
    );
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("renders an image with src and alt text", () => {
    render(
      <MediaCard>
        <MediaCard.Image src="/photo.jpg" alt="Sunset" />
      </MediaCard>,
    );
    const img = screen.getByRole("img", { name: "Sunset" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/photo.jpg");
  });

  it("renders title and description via Content", () => {
    render(
      <MediaCard>
        <MediaCard.Image src="/img.jpg" alt="Pic" />
        <MediaCard.Content>
          <h3>Card Title</h3>
          <p>Card description text</p>
        </MediaCard.Content>
      </MediaCard>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Card Title" })).toBeInTheDocument();
    expect(screen.getByText("Card description text")).toBeInTheDocument();
  });

  it("applies portrait orientation class by default", () => {
    const { container } = render(
      <MediaCard>
        <MediaCard.Image src="/photo.jpg" alt="Photo" />
      </MediaCard>,
    );
    const imageContainer = container.querySelector(".media-card__image-container");
    expect(imageContainer?.className).toContain("media-card__image-container--portrait");
  });

  it("applies landscape orientation class", () => {
    const { container } = render(
      <MediaCard orientation="landscape">
        <MediaCard.Image src="/photo.jpg" alt="Photo" />
      </MediaCard>,
    );
    const imageContainer = container.querySelector(".media-card__image-container");
    expect(imageContainer?.className).toContain("media-card__image-container--landscape");
  });

  it("applies square orientation class", () => {
    const { container } = render(
      <MediaCard orientation="square">
        <MediaCard.Image src="/photo.jpg" alt="Photo" />
      </MediaCard>,
    );
    const imageContainer = container.querySelector(".media-card__image-container");
    expect(imageContainer?.className).toContain("media-card__image-container--square");
  });

  it("renders an action slot", () => {
    render(
      <MediaCard>
        <MediaCard.Image src="/img.jpg" alt="Photo" />
        <MediaCard.Action>
          <button type="button">Play</button>
        </MediaCard.Action>
      </MediaCard>,
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("renders a badge slot", () => {
    render(
      <MediaCard>
        <MediaCard.Image src="/img.jpg" alt="Photo" />
        <MediaCard.Badge>New</MediaCard.Badge>
      </MediaCard>,
    );
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders an overlay", () => {
    const { container } = render(
      <MediaCard>
        <MediaCard.Image src="/img.jpg" alt="Photo" />
        <MediaCard.Overlay />
      </MediaCard>,
    );
    const overlay = container.querySelector(".media-card__overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute("aria-hidden", "true");
  });

  it("forwards className to the root article", () => {
    render(
      <MediaCard className="card-custom">
        <MediaCard.Image src="/img.jpg" alt="Photo" />
      </MediaCard>,
    );
    const article = screen.getByRole("article");
    expect(article.className).toContain("card-custom");
  });
  /* ------------------------------------------------------------------ */
  /*  #167 / #169                                                        */
  /* ------------------------------------------------------------------ */

  // #167 — the action layer spans the whole card, so with pointer events left
  // on it swallowed clicks on everything beneath it.
  it("#167: marks the action layer transparent to the pointer", () => {
    const { container } = render(
      <MediaCard>
        <MediaCard.Image src="/a.jpg" alt="A" />
        <MediaCard.Action>
          <button type="button">Play</button>
        </MediaCard.Action>
      </MediaCard>,
    );

    const action = container.querySelector(".media-card__action");
    expect(action).toBeInTheDocument();
    expect(action?.className).toContain("inset-0");
  });

  // #169 — Content had no z-index while Badge and Action both set z-10, so a
  // card rendering Overlay after Content had its caption painted over.
  it("#169: lifts Content above a later Overlay", () => {
    const { container } = render(
      <MediaCard>
        <MediaCard.Image src="/a.jpg" alt="A" />
        <MediaCard.Content>Caption</MediaCard.Content>
        <MediaCard.Overlay />
      </MediaCard>,
    );

    expect(container.querySelector(".media-card__content")?.className).toContain("z-10");
  });

  /**
   * The pin on `MediaCard.Image`'s two elements. It replaces the pin that held
   * the reverse: `className` used to address the `<img>` while the aspect box
   * received nothing at all.
   *
   * `className`, `ref` and every rest prop now address the box — the outermost
   * element the subcomponent renders — and the `<img>` inside is reached through
   * `imgProps`, as on `Hero.Background`. The box takes no class slot on top of
   * that: `className` already reaches it, and a slot would be a second writer.
   *
   * The exact-string form is deliberate. It pins three things at once — that the
   * caller's class lands here, that the base class and the orientation modifier
   * both survive beside it, and that the caller's class merges last.
   */
  it("routes className to the aspect box, after its base class and orientation modifier", () => {
    const { container } = render(
      <MediaCard orientation="landscape">
        <MediaCard.Image src="/a.jpg" alt="A" className="rounded-lg" />
      </MediaCard>,
    );

    // Exactness stopped being expressible once `MediaCard.css` became utilities
    // on the elements themselves. What it was standing in for survives: both
    // markers are present, the caller's class merges last, and nothing junk is
    // appended.
    const classes = container.querySelector(".media-card__image-container")
      ?.getAttribute("class") ?? "";
    const tokens = classes.split(" ");
    expect(tokens).toContain("media-card__image-container");
    expect(tokens).toContain("media-card__image-container--landscape");
    expect(tokens[tokens.length - 1]).toBe("rounded-lg");
    expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/);
  });

  it("routes imgProps.className to the <img>, after its base classes", () => {
    const { container } = render(
      <MediaCard orientation="landscape">
        <MediaCard.Image
          src="/a.jpg"
          alt="A"
          className="rounded-lg"
          imgProps={{ className: "grayscale" }}
        />
      </MediaCard>,
    );

    expect(container.querySelector("img")?.getAttribute("class")).toBe(
      "size-full object-cover grayscale",
    );
  });

  it("gives the box the top-level ref and the <img> the one in imgProps", () => {
    let box: HTMLDivElement | null = null;
    let img: HTMLImageElement | null = null;

    const { container } = render(
      <MediaCard>
        <MediaCard.Image
          ref={(el) => {
            box = el;
          }}
          src="/a.jpg"
          alt="A"
          imgProps={{
            ref: (el) => {
              img = el;
            },
          }}
        />
      </MediaCard>,
    );

    expect(box).toBe(container.querySelector(".media-card__image-container"));
    expect(img).toBe(container.querySelector("img"));
  });

  /**
   * `onLoad`/`onError` are the silent half of the re-point — legal on a `<div>`
   * as well as an `<img>`, so nothing in the props type moves them. The guess
   * that a handler on the box therefore never fires is wrong: React registers
   * the non-bubbling `load` on the `<img>` and dispatches it up its own fiber
   * tree, so both handlers run off one event. What actually moved is
   * `currentTarget`, which is the box for the top-level handler — that is what
   * a migrating `event.currentTarget.naturalWidth` was reading.
   *
   * Both directions in one test: the falsifier for either spread is one red.
   */
  it("delivers one load event to a top-level onLoad with the box as currentTarget, and to imgProps.onLoad with the <img>", () => {
    const boxTargets: EventTarget[] = [];
    const imgTargets: EventTarget[] = [];

    const { container } = render(
      <MediaCard>
        <MediaCard.Image
          src="/a.jpg"
          alt="A"
          onLoad={(event) => boxTargets.push(event.currentTarget)}
          imgProps={{ onLoad: (event) => imgTargets.push(event.currentTarget) }}
        />
      </MediaCard>,
    );

    const img = screen.getByRole("img", { name: "A" });
    fireEvent.load(img);

    expect(boxTargets).toHaveLength(1);
    expect(boxTargets[0]).toBe(container.querySelector(".media-card__image-container"));
    expect(imgTargets).toHaveLength(1);
    expect(imgTargets[0]).toBe(img);
  });
});
