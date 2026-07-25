import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu } from "./ContextMenu";

function renderMenu(
  options: { onSelect?: () => void; onOpenChange?: (open: boolean) => void } = {},
) {
  const onSelect = options.onSelect ?? vi.fn();
  const onOpenChange = options.onOpenChange ?? vi.fn();

  return {
    onSelect,
    onOpenChange,
    ...render(
      <ContextMenu onOpenChange={onOpenChange}>
        <ContextMenu.Trigger>Right-click area</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Label>Actions</ContextMenu.Label>
          <ContextMenu.Item index={0} onSelect={onSelect}>
            Edit
          </ContextMenu.Item>
          <ContextMenu.Item index={1}>Duplicate</ContextMenu.Item>
          <ContextMenu.Divider />
          <ContextMenu.Item index={2}>Delete</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    ),
  };
}

describe("ContextMenu", () => {
  it("does not show content when closed", () => {
    renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on contextmenu and calls preventDefault", async () => {
    renderMenu();

    const trigger = screen.getByText("Right-click area");
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(event, "preventDefault");

    fireEvent(trigger, event);

    expect(preventDefault).toHaveBeenCalled();
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("renders items with role='menuitem' and divider with role='separator'", async () => {
    renderMenu();

    fireEvent.contextMenu(screen.getByText("Right-click area"));
    await screen.findByRole("menu");

    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("navigates items with ArrowDown", async () => {
    renderMenu();

    fireEvent.contextMenu(screen.getByText("Right-click area"));
    const menu = await screen.findByRole("menu");

    fireEvent.keyDown(menu, { key: "ArrowDown" });

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    });
  });

  it("clicking an item fires onSelect and closes the menu", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu();

    fireEvent.contextMenu(screen.getByText("Right-click area"));
    await screen.findByRole("menu");

    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    renderMenu();

    fireEvent.contextMenu(screen.getByText("Right-click area"));
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("re-opens at a new position on a second contextmenu", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByText("Right-click area");

    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10 });
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    fireEvent.contextMenu(trigger, { clientX: 200, clientY: 150 });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  /* -- #113: the trigger has to be reachable from the keyboard at all -- */

  it("#113: the trigger is a tab stop", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.tab();

    expect(screen.getByText("Right-click area")).toHaveFocus();
  });

  it("#113: the ContextMenu key on the focused trigger opens the menu exactly once", async () => {
    const { onOpenChange } = renderMenu();
    const trigger = screen.getByText("Right-click area");
    trigger.focus();

    fireEvent.keyDown(trigger, { key: "ContextMenu" });

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("#113: Shift+F10 opens the menu and suppresses the browser's own", async () => {
    const { onOpenChange } = renderMenu();
    const trigger = screen.getByText("Right-click area");
    trigger.focus();

    // fireEvent returns false when a handler called preventDefault().
    const notPrevented = fireEvent.keyDown(trigger, { key: "F10", shiftKey: true });

    expect(notPrevented).toBe(false);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it("#113: F10 without Shift is left alone", () => {
    const { onOpenChange } = renderMenu();
    const trigger = screen.getByText("Right-click area");
    trigger.focus();

    const notPrevented = fireEvent.keyDown(trigger, { key: "F10" });

    expect(notPrevented).toBe(true);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledTimes(0);
  });

  it("#113: a caller's onKeyDown runs and may opt out with preventDefault", () => {
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => {
      e.preventDefault();
    });
    render(
      <ContextMenu>
        <ContextMenu.Trigger onKeyDown={onKeyDown}>Right-click area</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item index={0}>Edit</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Right-click area");
    trigger.focus();

    fireEvent.keyDown(trigger, { key: "ContextMenu" });

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  /* -- #114: a right-click open must leave focus where the keys are handled -- */

  it("#114: a right-click open leaves focus on the trigger, not <body>", async () => {
    renderMenu();
    const trigger = screen.getByText("Right-click area");

    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10 });
    await screen.findByRole("menu");

    expect(document.activeElement).not.toBe(document.body);
    expect(trigger).toHaveFocus();
  });

  it("#114: arrow keys navigate the menu after a right-click open", async () => {
    renderMenu();
    const trigger = screen.getByText("Right-click area");

    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10 });
    await screen.findByRole("menu");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowDown" });

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    });
  });

  it("#114: typeahead selects an item after a right-click open", async () => {
    renderMenu();
    const trigger = screen.getByText("Right-click area");

    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10 });
    await screen.findByRole("menu");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "d" });

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    });
  });
});
