import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
});
