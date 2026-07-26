import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Popover } from "./Popover";

function renderPopover(props: Record<string, unknown> = {}) {
  return render(
    <Popover {...props}>
      <Popover.Trigger>Toggle popover</Popover.Trigger>
      <Popover.Content>
        <p>Popover body content</p>
      </Popover.Content>
    </Popover>,
  );
}

describe("Popover", () => {
  it("does not show content when closed", () => {
    renderPopover();

    expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
  });

  it("opens popover when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    expect(await screen.findByText("Popover body content")).toBeInTheDocument();
  });

  it("closes popover when trigger is clicked again", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Toggle popover" });

    await user.click(trigger);
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();

    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
    });
  });

  it("closes popover on Escape", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();
    });
  });

  it("trigger has aria-expanded='false' initially", () => {
    renderPopover();

    expect(screen.getByRole("button", { name: "Toggle popover" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("trigger has aria-expanded='true' when open", async () => {
    const user = userEvent.setup();
    renderPopover();

    const trigger = screen.getByRole("button", { name: "Toggle popover" });
    await user.click(trigger);
    await screen.findByText("Popover body content");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("trigger has aria-haspopup='dialog'", () => {
    renderPopover();

    expect(screen.getByRole("button", { name: "Toggle popover" })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  });

  it("respects controlled open prop", () => {
    const { rerender } = render(
      <Popover open={false} onOpenChange={() => {}}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    expect(screen.queryByText("Popover body content")).not.toBeInTheDocument();

    rerender(
      <Popover open={true} onOpenChange={() => {}}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    expect(screen.getByText("Popover body content")).toBeInTheDocument();
  });

  it("calls onOpenChange in controlled mode", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Popover open={false} onOpenChange={onOpenChange}>
        <Popover.Trigger>Toggle popover</Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("moves focus to the panel when opened", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));

    // The panel holds no tab stop of its own, so the focus manager gives it
    // tabindex="0" and focuses it — which is why .popover-content must paint a
    // replacement ring under its `outline: none` (ledger #129). The move is queued,
    // hence waitFor rather than a bare assertion.
    const panel = await screen.findByRole("dialog");
    expect(panel).toHaveAttribute("tabindex", "0");
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it("leaves the rest of the page reachable while open", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Outside the popover</button>
        <Popover>
          <Popover.Trigger>Toggle popover</Popover.Trigger>
          <Popover.Content>
            <p>Popover body content</p>
          </Popover.Content>
        </Popover>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    await screen.findByText("Popover body content");

    // A popover is not a modal dialog. A focus trap marks everything outside the
    // portal aria-hidden + inert, which erases both of these from the accessibility
    // tree — `getByRole` refuses to see an aria-hidden subtree, so it fails then.
    expect(screen.getByRole("button", { name: "Outside the popover" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle popover" })).toBeInTheDocument();
  });

  it("composes an asChild child's own onClick instead of replacing it", async () => {
    const user = userEvent.setup();
    const childClick = vi.fn();

    render(
      <Popover>
        <Popover.Trigger asChild>
          <button onClick={childClick}>Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <p>Popover body content</p>
        </Popover.Content>
      </Popover>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));

    // Both must happen: the caller's handler AND the component's own behaviour.
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Popover body content")).toBeInTheDocument();
  });
});
