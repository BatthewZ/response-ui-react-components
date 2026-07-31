import { render, screen } from "@testing-library/react";
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
   * The pin on `MediaCard.Image`'s triage-(a) ruling for its aspect box.
   *
   * `className`, `ref` and every rest prop address the `<img>`, which is what
   * the component's docs state. The box around it has one variable — the
   * `orientation` prop on `MediaCard`, which writes the modifier below — so it
   * gets neither a class slot (that would be a second writer for the same thing)
   * nor an `imgProps` hatch (the `<img>` already has a complete route). Moving
   * `className` to the box under the outermost-element house rule would close
   * the residue, but it is breaking and is not this phase's call to make.
   *
   * If that call is ever taken, these two assertions are what must be rewritten
   * rather than deleted.
   */
  it("keeps className on the <img> and the aspect box on its own two classes", () => {
    const { container } = render(
      <MediaCard orientation="landscape">
        <MediaCard.Image src="/a.jpg" alt="A" className="rounded-lg" />
      </MediaCard>,
    );

    expect(container.querySelector("img")?.getAttribute("class")).toContain("rounded-lg");
    expect(container.querySelector(".media-card__image-container")?.getAttribute("class")).toBe(
      "media-card__image-container media-card__image-container--landscape",
    );
  });
});
