import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  buildMonthGrid,
  clampDate,
  formatDate,
  getDateFieldOrder,
  getMonthLabel,
  getWeekdayNames,
  isAfter,
  isBefore,
  isSameDay,
  parseDateInput,
  startOfDay,
  startOfMonth,
} from "./date";

describe("isSameDay", () => {
  it("ignores time of day", () => {
    const a = new Date(2026, 5, 13, 0, 0, 0);
    const b = new Date(2026, 5, 13, 23, 59, 59);
    expect(isSameDay(a, b)).toBe(true);
  });

  it("distinguishes different days", () => {
    expect(isSameDay(new Date(2026, 5, 13), new Date(2026, 5, 14))).toBe(false);
  });

  it("distinguishes same day-of-month across months/years", () => {
    expect(isSameDay(new Date(2026, 5, 13), new Date(2026, 6, 13))).toBe(false);
    expect(isSameDay(new Date(2025, 5, 13), new Date(2026, 5, 13))).toBe(false);
  });
});

describe("startOfDay", () => {
  it("zeroes the time component", () => {
    const result = startOfDay(new Date(2026, 5, 13, 14, 30, 45, 123));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getDate()).toBe(13);
  });
});

describe("startOfMonth", () => {
  it("returns the first of the month at midnight", () => {
    const result = startOfMonth(new Date(2026, 5, 13, 14, 30));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5);
    expect(result.getHours()).toBe(0);
  });
});

describe("addDays", () => {
  it("adds days", () => {
    expect(isSameDay(addDays(new Date(2026, 5, 13), 5), new Date(2026, 5, 18))).toBe(true);
  });

  it("crosses month boundaries", () => {
    expect(isSameDay(addDays(new Date(2026, 0, 31), 1), new Date(2026, 1, 1))).toBe(true);
  });

  it("subtracts with negative n", () => {
    expect(isSameDay(addDays(new Date(2026, 1, 1), -1), new Date(2026, 0, 31))).toBe(true);
  });

  it("preserves time of day", () => {
    const result = addDays(new Date(2026, 5, 13, 9, 15), 1);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(15);
  });
});

describe("addMonths", () => {
  it("clamps Jan 31 + 1 month to Feb 28 in a non-leap year", () => {
    const result = addMonths(new Date(2026, 0, 31), 1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  it("clamps Jan 31 + 1 month to Feb 29 in a leap year", () => {
    const result = addMonths(new Date(2024, 0, 31), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it("does not spill into the following month", () => {
    const result = addMonths(new Date(2026, 0, 31), 1);
    expect(result.getMonth()).not.toBe(2); // never March
  });

  it("adds months normally when no overflow", () => {
    const result = addMonths(new Date(2026, 5, 15), 2);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getDate()).toBe(15);
  });

  it("subtracts with negative n and crosses year boundary", () => {
    const result = addMonths(new Date(2026, 1, 15), -3);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(10); // November
  });
});

describe("clampDate", () => {
  const min = new Date(2026, 0, 1);
  const max = new Date(2026, 11, 31);

  it("returns the lower bound when below min", () => {
    expect(clampDate(new Date(2025, 5, 1), min, max).getTime()).toBe(min.getTime());
  });

  it("returns the upper bound when above max", () => {
    expect(clampDate(new Date(2027, 5, 1), min, max).getTime()).toBe(max.getTime());
  });

  it("returns the date unchanged when within range", () => {
    const d = new Date(2026, 5, 13);
    expect(clampDate(d, min, max).getTime()).toBe(d.getTime());
  });

  it("ignores omitted bounds", () => {
    const d = new Date(2000, 0, 1);
    expect(clampDate(d).getTime()).toBe(d.getTime());
    expect(clampDate(d, undefined, max).getTime()).toBe(d.getTime());
  });
});

describe("isBefore / isAfter", () => {
  it("compares at day granularity, ignoring time", () => {
    const morning = new Date(2026, 5, 13, 1, 0);
    const evening = new Date(2026, 5, 13, 23, 0);
    expect(isBefore(morning, evening)).toBe(false);
    expect(isAfter(evening, morning)).toBe(false);
  });

  it("orders distinct days", () => {
    expect(isBefore(new Date(2026, 5, 13), new Date(2026, 5, 14))).toBe(true);
    expect(isAfter(new Date(2026, 5, 14), new Date(2026, 5, 13))).toBe(true);
  });
});

describe("buildMonthGrid", () => {
  // June 2026: the 1st is a Monday.
  const june2026 = new Date(2026, 5, 1);

  it("returns 6 rows of 7 days", () => {
    const grid = buildMonthGrid(june2026);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
    }
  });

  it("includes correct leading/trailing days with weekStartsOn=0 (Sunday)", () => {
    const grid = buildMonthGrid(june2026, 0);
    // June 1 2026 is a Monday, so the Sunday-starting grid begins May 31 2026.
    expect(isSameDay(grid[0][0], new Date(2026, 4, 31))).toBe(true);
    // 6 rows * 7 = 42 days; last cell is 41 days after the start.
    expect(isSameDay(grid[5][6], new Date(2026, 6, 11))).toBe(true);
  });

  it("includes correct first visible day with weekStartsOn=1 (Monday)", () => {
    const grid = buildMonthGrid(june2026, 1);
    // June 1 2026 is itself a Monday, so the Monday-starting grid begins exactly on June 1.
    expect(isSameDay(grid[0][0], new Date(2026, 5, 1))).toBe(true);
    expect(isSameDay(grid[5][6], new Date(2026, 6, 12))).toBe(true);
  });

  it("contains every day of the target month", () => {
    const grid = buildMonthGrid(june2026, 0).flat();
    for (let day = 1; day <= 30; day++) {
      expect(grid.some((d) => isSameDay(d, new Date(2026, 5, day)))).toBe(true);
    }
  });
});

describe("getWeekdayNames", () => {
  it("returns 7 names", () => {
    expect(getWeekdayNames("en-US")).toHaveLength(7);
  });

  it("orders Sunday-first by default", () => {
    expect(getWeekdayNames("en-US", "long")).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
  });

  it("orders Monday-first with weekStartsOn=1", () => {
    expect(getWeekdayNames("en-US", "long", 1)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });
});

describe("getMonthLabel", () => {
  it("formats month and year for en-US", () => {
    expect(getMonthLabel(new Date(2026, 5, 13), "en-US")).toBe("June 2026");
  });
});

describe("formatDate", () => {
  it("formats with provided options", () => {
    const result = formatDate(new Date(2026, 5, 13), "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    expect(result).toBe("06/13/2026");
  });
});

describe("getDateFieldOrder", () => {
  it("returns month/day/year for en-US", () => {
    expect(getDateFieldOrder("en-US")).toEqual(["month", "day", "year"]);
  });

  it("returns day/month/year for en-GB", () => {
    expect(getDateFieldOrder("en-GB")).toEqual(["day", "month", "year"]);
  });
});

describe("parseDateInput", () => {
  it("parses M/D/Y order for en-US", () => {
    const result = parseDateInput("6/13/2026", "en-US");
    expect(result).not.toBeNull();
    expect(isSameDay(result!, new Date(2026, 5, 13))).toBe(true);
  });

  it("parses D/M/Y order for en-GB", () => {
    const result = parseDateInput("13/6/2026", "en-GB");
    expect(result).not.toBeNull();
    expect(isSameDay(result!, new Date(2026, 5, 13))).toBe(true);
  });

  it("expands a 2-digit year into the 2000s", () => {
    const result = parseDateInput("6/13/26", "en-US");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
  });

  it("round-trips with formatDate for en-US (M/D/Y)", () => {
    const original = new Date(2026, 5, 13);
    const text = formatDate(original, "en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parsed = parseDateInput(text, "en-US");
    expect(parsed).not.toBeNull();
    expect(isSameDay(parsed!, original)).toBe(true);
  });

  it("round-trips with formatDate for en-GB (D/M/Y)", () => {
    const original = new Date(2026, 5, 13);
    const text = formatDate(original, "en-GB", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parsed = parseDateInput(text, "en-GB");
    expect(parsed).not.toBeNull();
    expect(isSameDay(parsed!, original)).toBe(true);
  });

  it("returns null for an out-of-calendar date (13/45/2020 en-US)", () => {
    expect(parseDateInput("13/45/2020", "en-US")).toBeNull();
  });

  it("returns null when day exceeds days-in-month", () => {
    // Feb 30 does not exist.
    expect(parseDateInput("2/30/2026", "en-US")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseDateInput("not a date", "en-US")).toBeNull();
    expect(parseDateInput("", "en-US")).toBeNull();
    expect(parseDateInput("6/13", "en-US")).toBeNull();
  });
});
