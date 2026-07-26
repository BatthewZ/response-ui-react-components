import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CalendarBase } from "./CalendarBase";

const JUNE_2026 = new Date(2026, 5, 15);

/**
 * The props React handed the host element. `Omit` is compile-time only, and
 * `onChange` on a `<div>` renders no attribute and fires only for a descendant
 * form control (the calendar has none) — so this is the only place a key that
 * slipped through a `{...props}` spread is observable.
 */
function hostProps(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
  if (!key) throw new Error("element is not React-rendered");
  return (el as unknown as Record<string, Record<string, unknown>>)[key];
}

/**
 * A caller's bag arriving from a carrier TypeScript cannot see — plain JS, or
 * props forwarded through `any`. `onChange?: never` makes the *typed* spread of
 * the same object a compile error; the runtime destructure is what covers this
 * half, and it is the half a published package cannot assume away.
 */
function untypedProps(bag: Record<string, unknown>): Record<string, never> {
  return bag as Record<string, never>;
}

// CalendarBase is internal — it has no barrel export, so Calendar and
// RangeCalendar are its only consumers. They strip `onChange` themselves, which
// makes this guard unobservable through them; it is asserted here instead.
describe("CalendarBase", () => {
  it("a field()-shaped bag's onChange never reaches the calendar root", () => {
    // The real `field<Date>()` shape. A one-key `{ onChange }` bag is rejected by
    // TS2559 ("no properties in common") and would give a false green.
    const bag = { name: "due", value: JUNE_2026, onChange: vi.fn(), onBlur: vi.fn() };

    const { container } = render(
      <CalendarBase
        defaultMonth={JUNE_2026}
        getDayStatus={() => ({})}
        onDaySelect={vi.fn()}
        {...untypedProps(bag)}
      />,
    );
    const root = container.querySelector(".calendar");

    expect(hostProps(root!)).not.toHaveProperty("onChange");
    expect(hostProps(root!).onBlur).toBe(bag.onBlur);
  });
});
