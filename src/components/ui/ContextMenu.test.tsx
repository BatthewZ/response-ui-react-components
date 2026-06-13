import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu } from "./ContextMenu";

function renderMenu(
  options: { onSelect?: () => void } = {},
) {
  const onSelect = options.onSelect ?? vi.fn();

  return {
    onSelect,
    ...render(
      <ContextMenu>
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
});
