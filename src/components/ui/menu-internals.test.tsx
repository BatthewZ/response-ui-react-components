import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu } from "./ContextMenu";
import { DropdownMenu } from "./DropdownMenu";

/**
 * `DropdownMenu.Item` and `ContextMenu.Item` are both `MenuItem` from this
 * module, so every disabled-item guarantee is asserted through both public
 * entry points.
 */

function renderDropdown(handlers: { onClick: () => void; onSelect: () => void }) {
  return render(
    <DropdownMenu>
      <DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item index={0}>Edit</DropdownMenu.Item>
        <DropdownMenu.Item
          index={1}
          disabled
          onClick={handlers.onClick}
          onSelect={handlers.onSelect}
        >
          Delete account
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>,
  );
}

function renderContextMenu(handlers: { onClick: () => void; onSelect: () => void }) {
  return render(
    <ContextMenu>
      <ContextMenu.Trigger>Right-click area</ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item index={0}>Edit</ContextMenu.Item>
        <ContextMenu.Item
          index={1}
          disabled
          onClick={handlers.onClick}
          onSelect={handlers.onSelect}
        >
          Delete account
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>,
  );
}

async function openDropdown() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Open menu" }));
  await screen.findByRole("menu");
  return user;
}

async function openContextMenu() {
  const user = userEvent.setup();
  fireEvent.contextMenu(screen.getByText("Right-click area"));
  await screen.findByRole("menu");
  return user;
}

describe("MenuItem — disabled items are inert", () => {
  it("fires neither onClick nor onSelect via DropdownMenu.Item", async () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    renderDropdown({ onClick, onSelect });
    const user = await openDropdown();

    await user.click(screen.getByRole("menuitem", { name: "Delete account" }));

    expect(onClick).toHaveBeenCalledTimes(0);
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("fires neither onClick nor onSelect via ContextMenu.Item", async () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    renderContextMenu({ onClick, onSelect });
    const user = await openContextMenu();

    await user.click(screen.getByRole("menuitem", { name: "Delete account" }));

    expect(onClick).toHaveBeenCalledTimes(0);
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("fires nothing when a disabled item is activated by keyboard", async () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    renderDropdown({ onClick, onSelect });
    const user = await openDropdown();

    const item = screen.getByRole("menuitem", { name: "Delete account" });
    item.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(0);
    expect(onSelect).toHaveBeenCalledTimes(0);
  });

  it("leaves the menu open when a disabled item is clicked", async () => {
    renderDropdown({ onClick: vi.fn(), onSelect: vi.fn() });
    const user = await openDropdown();

    await user.click(screen.getByRole("menuitem", { name: "Delete account" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("keeps disabled items focusable: aria-disabled, never the native attribute", async () => {
    renderDropdown({ onClick: vi.fn(), onSelect: vi.fn() });
    await openDropdown();

    const item = screen.getByRole("menuitem", { name: "Delete account" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).not.toBeDisabled();

    item.focus();
    expect(item).toHaveFocus();
  });

  it("still fires onClick and onSelect for enabled items", async () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item index={0} onClick={onClick} onSelect={onSelect}>
            Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    const user = await openDropdown();

    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("a disabled item suppresses the DOM default too (#118, adversarial)", () => {
  it("does not navigate when the disabled item wraps a link", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item index={0} disabled>
            <a href="#gone" onClick={onNavigate}>
              Delete account
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const link = screen.getByRole("link", { name: "Delete account" });

    const evt = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(evt);

    // The caller's handler may run — it is on their own element — but the
    // activation must not survive the disabled item as a navigation.
    expect(evt.defaultPrevented).toBe(true);
  });
});
