/**
 * Dependency-free, locale-aware date utilities.
 *
 * All date arithmetic is performed in LOCAL time via `new Date(year, monthIndex, day)`.
 * We deliberately avoid `toISOString()` and the UTC getters/setters: those operate in
 * UTC and cause off-by-one-day bugs for users in non-UTC timezones.
 */

/** True if `a` and `b` fall on the same calendar day (time of day ignored). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Midnight (00:00:00.000) at the start of `d`'s calendar day, in local time. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Midnight on the first day of `d`'s month, in local time. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** `d` shifted by `n` days (may be negative). Preserves the time of day. */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

/**
 * `d` shifted by `n` months (may be negative), clamping day-of-month overflow:
 * `addMonths(Jan 31, 1)` => Feb 28 (or Feb 29 in a leap year), never spilling into March.
 */
export function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

/** Clamp `d` to `[min, max]`. Bounds are optional; an omitted bound is ignored. */
export function clampDate(d: Date, min?: Date, max?: Date): Date {
  if (min && d.getTime() < min.getTime()) return new Date(min.getTime());
  if (max && d.getTime() > max.getTime()) return new Date(max.getTime());
  return new Date(d.getTime());
}

/** True if `a`'s calendar day is strictly before `b`'s calendar day. */
export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

/** True if `a`'s calendar day is strictly after `b`'s calendar day. */
export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Build a 6-row x 7-column grid of days covering `month`, including leading/trailing
 * days from the adjacent months so every row is full. `weekStartsOn` defaults to 0 (Sunday).
 */
export function buildMonthGrid(month: Date, weekStartsOn: Weekday = 0): Date[][] {
  const first = startOfMonth(month);
  // How many days back to the start of the week containing the 1st.
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const gridStart = addDays(first, -offset);

  const rows: Date[][] = [];
  for (let row = 0; row < 6; row++) {
    const week: Date[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(addDays(gridStart, row * 7 + col));
    }
    rows.push(week);
  }
  return rows;
}

/** A reference week (Sun 2021-01-03 .. Sat 2021-01-09) for deriving weekday names. */
const WEEKDAY_REFERENCE: Date[] = [
  new Date(2021, 0, 3), // Sunday
  new Date(2021, 0, 4), // Monday
  new Date(2021, 0, 5), // Tuesday
  new Date(2021, 0, 6), // Wednesday
  new Date(2021, 0, 7), // Thursday
  new Date(2021, 0, 8), // Friday
  new Date(2021, 0, 9), // Saturday
];

/**
 * Localized weekday names (length 7), ordered starting from `weekStartsOn`.
 * `style` maps to `Intl.DateTimeFormat`'s `weekday` option (default "short").
 */
export function getWeekdayNames(
  locale: string,
  style: "short" | "long" | "narrow" = "short",
  weekStartsOn: Weekday = 0,
): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: style });
  const names: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayIndex = (weekStartsOn + i) % 7;
    names.push(fmt.format(WEEKDAY_REFERENCE[dayIndex]));
  }
  return names;
}

/** Localized month + year label, e.g. "June 2026" for en-US. */
export function getMonthLabel(month: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
}

/** Localized date string via `Intl.DateTimeFormat`. */
export function formatDate(d: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/** Unambiguous reference date used to read field ordering: 22 Dec 3333. */
const FIELD_ORDER_REFERENCE = new Date(3333, 11, 22);

/**
 * The order in which day/month/year fields appear for `locale`, derived from
 * `Intl.DateTimeFormat(...).formatToParts`. e.g. en-US => ["month","day","year"],
 * en-GB => ["day","month","year"].
 */
export function getDateFieldOrder(locale: string): ("day" | "month" | "year")[] {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(FIELD_ORDER_REFERENCE);

  const order: ("day" | "month" | "year")[] = [];
  for (const part of parts) {
    if (part.type === "day" || part.type === "month" || part.type === "year") {
      order.push(part.type);
    }
  }
  return order;
}

/**
 * Parse a user-typed date string into a local `Date`, or `null` if invalid.
 *
 * Splits the input into runs of digits and maps them, in order, to the locale's
 * field order (from `getDateFieldOrder`). A 2-digit year is interpreted as `2000 + yy`.
 * Returns `null` for the wrong number of fields, non-calendar values
 * (month > 12, day > days-in-month), or non-positive values.
 */
export function parseDateInput(text: string, locale: string): Date | null {
  const runs = text.match(/\d+/g);
  if (!runs || runs.length !== 3) return null;

  const order = getDateFieldOrder(locale);
  const fields: Record<"day" | "month" | "year", number> = { day: 0, month: 0, year: 0 };
  for (let i = 0; i < 3; i++) {
    const raw = runs[i];
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) return null;
    const field = order[i];
    // A 2-digit year maps into the 2000s.
    fields[field] = field === "year" && raw.length <= 2 ? 2000 + value : value;
  }

  const { day, month, year } = fields;
  if (month < 1 || month > 12) return null;
  if (day < 1) return null;
  if (year < 1) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;

  return new Date(year, month - 1, day);
}
