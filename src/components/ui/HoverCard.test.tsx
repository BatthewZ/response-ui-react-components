import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HoverCard } from "./HoverCard";

describe("HoverCard", () => {
  it("renders trigger children", () => {
    render(
      <HoverCard>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    expect(screen.getByText("@octocat")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <HoverCard>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    expect(screen.queryByText("Card body")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on hover after the open delay", async () => {
    const user = userEvent.setup();

    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    await user.hover(screen.getByText("@octocat"));

    expect(await screen.findByText("Card body")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on unhover", async () => {
    const user = userEvent.setup();

    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    const trigger = screen.getByText("@octocat");
    await user.hover(trigger);
    expect(await screen.findByText("Card body")).toBeInTheDocument();

    await user.unhover(trigger);
    await waitFor(() => {
      expect(screen.queryByText("Card body")).not.toBeInTheDocument();
    });
  });

  it("opens on focus (keyboard a11y)", async () => {
    const user = userEvent.setup();

    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCard.Trigger asChild>
          <button>@octocat</button>
        </HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "@octocat" })).toHaveFocus();
    expect(await screen.findByText("Card body")).toBeInTheDocument();
  });

  it("respects the controlled open prop", () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <HoverCard open={false} onOpenChange={onOpenChange}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    expect(screen.queryByText("Card body")).not.toBeInTheDocument();

    rerender(
      <HoverCard open onOpenChange={onOpenChange}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    expect(screen.getByText("Card body")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("forwards asChild trigger props onto the child element", () => {
    render(
      <HoverCard open>
        <HoverCard.Trigger asChild>
          <button>@octocat</button>
        </HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    const trigger = screen.getByRole("button", { name: "@octocat" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls");
  });

  it("composes an asChild child's own onPointerEnter instead of replacing it", async () => {
    const user = userEvent.setup();
    const childEnter = vi.fn();

    render(
      <HoverCard>
        <HoverCard.Trigger asChild>
          <button onPointerEnter={childEnter}>@octocat</button>
        </HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>
    );

    await user.hover(screen.getByRole("button", { name: "@octocat" }));

    expect(childEnter).toHaveBeenCalledTimes(1);
  });

  it("names the card by its trigger and describes the trigger by the card", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>,
    );

    const trigger = screen.getByRole("button", { name: "@octocat" });
    await user.hover(trigger);

    const card = await screen.findByRole("dialog");
    // An unnamed dialog is announced as "dialog" and its contents never read.
    expect(card).toHaveAccessibleName("@octocat");
    expect(trigger.getAttribute("aria-describedby")).toBe(card.id);
  });

  it("does not override a name the caller gave the card", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content aria-label="About octocat">Card body</HoverCard.Content>
      </HoverCard>,
    );

    await user.hover(screen.getByRole("button", { name: "@octocat" }));

    expect(await screen.findByRole("dialog")).toHaveAccessibleName("About octocat");
  });

  it("gives the default trigger something that can hold focus", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0}>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>,
    );

    // `aria-expanded` is invalid on a role-less span, and `useFocus` is dead
    // on an element that never takes focus.
    await user.tab();
    const trigger = screen.getByRole("button", { name: "@octocat" });
    expect(trigger).toHaveFocus();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

/**
 * #128, the hover-card half — see `Popover.test.tsx` for the full set,
 * including the reduced-motion branch this hook shares.
 */
describe("fade timing", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--MOTION-DURATION-ENTER");
  });

  it("#128: takes its open duration from --MOTION-DURATION-ENTER", async () => {
    document.documentElement.style.setProperty("--MOTION-DURATION-ENTER", "380ms");

    render(
      <HoverCard open>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content>Card body</HoverCard.Content>
      </HoverCard>,
    );

    const panel = await screen.findByRole("dialog");
    await waitFor(() => expect(panel.style.transitionDuration).toBe("380ms"));
  });
});

/**
 * The arrow, and its one slot. `HoverCard` ships no stylesheet, so the arrow is
 * utilities like the card itself — which makes its slot merge a true
 * tailwind-merge one: a caller's `size-*` *replaces* the base size rather than
 * sitting beside it, unlike the BEM-classed `Popover` and `Tooltip`.
 */
describe("arrow", () => {
  const ARROW_BASE =
    "absolute size-r5 rotate-45 bg-inherit border border-inherit " +
    "data-[side=top]:border-r-0 data-[side=top]:border-b-0 " +
    "data-[side=bottom]:border-t-0 data-[side=bottom]:border-l-0 " +
    "data-[side=left]:border-t-0 data-[side=left]:border-r-0 " +
    "data-[side=right]:border-b-0 data-[side=right]:border-l-0";

  function openWith(props: Record<string, unknown>) {
    return render(
      <HoverCard open>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content {...props}>Card body</HoverCard.Content>
      </HoverCard>
    );
  }

  /** The arrow is the only element the card gives a `data-side`. */
  async function findArrow() {
    const panel = await screen.findByRole("dialog");
    return { panel, arrow: panel.querySelector<HTMLElement>("[data-side]") };
  }

  it("renders no arrow unless asked for one", async () => {
    openWith({});

    const { arrow } = await findArrow();
    expect(arrow).toBeNull();
  });

  /**
   * The falsifier for the middleware wiring: `left` is present only because
   * `HoverCard` hands `arrowRef` to `useFloating`, which is what adds
   * floating-ui's `arrow` middleware and fills `middlewareData.arrow`. Drop the
   * `arrowRef` from that call and the element still renders — pinned, but never
   * centred — so this assertion is the one that reddens.
   */
  it("renders the arrow and positions it from the middleware", async () => {
    openWith({ arrow: true });

    const { arrow } = await findArrow();
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    // Default placement is `bottom`, so the arrow sits on the card's top edge.
    expect(arrow).toHaveAttribute("data-side", "top");
    expect(arrow?.style.top).toBe("0px");
    expect(arrow?.style.translate).toBe("0 -50%");
    expect(arrow?.style.left).not.toBe("");
  });

  it("pins the arrow to the edge facing the trigger, not to the placement", async () => {
    render(
      <HoverCard open placement="right">
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        <HoverCard.Content arrow>Card body</HoverCard.Content>
      </HoverCard>
    );

    const { arrow } = await findArrow();
    expect(arrow).toHaveAttribute("data-side", "left");
    expect(arrow?.style.left).toBe("0px");
    expect(arrow?.style.translate).toBe("-50% 0");
  });

  it("lands classNames.arrow on the arrow, beside the base classes", async () => {
    openWith({ arrow: true, classNames: { arrow: "size-r3" } });

    const { arrow } = await findArrow();
    const cls = arrow?.getAttribute("class") ?? "";
    expect(cls).toContain("bg-inherit");
    expect(cls).toContain("size-r3");
    // Two utilities in one group: the caller's wins outright, which is the point.
    expect(cls).not.toContain("size-r5");
  });

  it("leaves the arrow on its base classes alone when no slot is passed", async () => {
    openWith({ arrow: true });

    const { arrow } = await findArrow();
    expect(arrow?.getAttribute("class")).toBe(ARROW_BASE);
  });

  it("does not put the slot class on the card itself", async () => {
    openWith({ arrow: true, classNames: { arrow: "size-r3" } });

    const { panel } = await findArrow();
    expect(panel.className).not.toContain("size-r3");
  });

  /**
   * The reason for a per-component inline slot union rather than a
   * `Record<string, string>` helper: an unknown key is a *type* error, not a
   * silent no-op. The `@ts-expect-error` is the assertion — it fails if
   * TypeScript ever stops rejecting the key. Do not "clean it up".
   */
  it("rejects an unknown slot key at compile time", async () => {
    render(
      <HoverCard open>
        <HoverCard.Trigger>@octocat</HoverCard.Trigger>
        {/* @ts-expect-error — `pointer` is not a slot; only untyped JS gets here. */}
        <HoverCard.Content arrow classNames={{ pointer: "size-r3" }}>
          Card body
        </HoverCard.Content>
      </HoverCard>
    );

    const { arrow } = await findArrow();
    expect(arrow?.getAttribute("class")).toBe(ARROW_BASE);
  });

  it("does not leak arrow or classNames onto the DOM", async () => {
    openWith({ arrow: true, classNames: { arrow: "size-r3" } });

    const { panel } = await findArrow();
    expect(panel.hasAttribute("classnames")).toBe(false);
    expect(panel.hasAttribute("arrow")).toBe(false);
  });
});
