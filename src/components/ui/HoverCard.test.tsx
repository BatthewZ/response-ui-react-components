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
